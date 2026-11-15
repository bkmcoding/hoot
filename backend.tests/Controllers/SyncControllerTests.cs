using System.Net;
using System.Net.Http.Json;
using HootApi.Dtos;
using HootApi.Tests.Helpers;
using Xunit;

namespace HootApi.Tests.Controllers;

public class SyncControllerTests : IClassFixture<HootTestFactory>
{
    private readonly HttpClient _client;
    private readonly Guid _householdId = Guid.NewGuid();

    public SyncControllerTests(HootTestFactory factory)
    {
        _client = factory.CreateClient();
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string uri, object? body = null, Guid? householdId = null)
    {
        var request = new HttpRequestMessage(method, uri);
        request.Headers.Add("X-Household-Id", (householdId ?? _householdId).ToString());
        if (body != null)
        {
            request.Content = JsonContent.Create(body);
        }
        return request;
    }

    [Fact]
    public async Task GetDelta_NoSinceParam_ReturnsAllActiveEntities()
    {
        // Arrange
        var household = Guid.NewGuid();

        // 1. Create item
        var itemReq = new CreateItemRequest(Id: "sync-item-1", Name: "Oat Milk", Category: "Dairy", Unit: "carton", ReorderThresholdDays: 7);
        using var createItem = CreateRequest(HttpMethod.Post, "/api/items", itemReq, household);
        var itemRes = await _client.SendAsync(createItem);
        Assert.Equal(HttpStatusCode.Created, itemRes.StatusCode);

        // 2. Create purchase
        var purchaseReq = new LogPurchaseRequest(Id: "sync-purch-1", Date: new DateOnly(2026, 3, 1), Quantity: 2, Price: 4.50m);
        using var createPurch = CreateRequest(HttpMethod.Post, "/api/items/sync-item-1/purchases", purchaseReq, household);
        var purchRes = await _client.SendAsync(createPurch);
        Assert.Equal(HttpStatusCode.Created, purchRes.StatusCode);

        // 3. Create plan
        var planReq = new SavePlanRequest(Id: "sync-plan-1", TargetDate: new DateOnly(2026, 3, 10), SelectedItemIds: new() { "sync-item-1" });
        using var createPlan = CreateRequest(HttpMethod.Post, "/api/plans", planReq, household);
        var planRes = await _client.SendAsync(createPlan);
        Assert.Equal(HttpStatusCode.Created, planRes.StatusCode);

        // 4. Update preference
        var prefReq = new SavePreferenceRequest(Density: "dense", DashboardView: "calendar", AisleOrder: new() { "Produce", "Dairy" }, OutOfStockItemIds: new());
        using var createPref = CreateRequest(HttpMethod.Put, "/api/preferences", prefReq, household);
        var prefRes = await _client.SendAsync(createPref);
        Assert.Equal(HttpStatusCode.OK, prefRes.StatusCode);

        // Act: Delta sync with no since parameter
        using var syncReq = CreateRequest(HttpMethod.Get, "/api/sync", null, household);
        var syncRes = await _client.SendAsync(syncReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, syncRes.StatusCode);
        var delta = await syncRes.Content.ReadFromJsonAsync<SyncDeltaResponse>();
        Assert.NotNull(delta);
        Assert.Contains(delta.Items, i => i.Id == "sync-item-1" && !i.IsDeleted);
        Assert.Contains(delta.Purchases, p => p.Id == "sync-purch-1" && !p.IsDeleted);
        Assert.Contains(delta.Plans, p => p.Id == "sync-plan-1" && !p.IsDeleted);
        Assert.NotNull(delta.Preferences);
        Assert.Equal("dense", delta.Preferences.Density);
        Assert.Equal("calendar", delta.Preferences.DashboardView);
    }

    [Fact]
    public async Task GetDelta_WithSinceParam_ReturnsOnlyModifiedEntitiesAndTombstones()
    {
        // Arrange
        var household = Guid.NewGuid();

        // Create Item A and Item B
        var itemA = new CreateItemRequest("item-a", "Item Alpha", "Pantry", "can", 10);
        using var rA = CreateRequest(HttpMethod.Post, "/api/items", itemA, household);
        await _client.SendAsync(rA);

        // Snapshot timestamp before modifying Item B and soft-deleting Item A
        var cutoff = DateTimeOffset.UtcNow.AddMilliseconds(-10);
        await Task.Delay(50); // slight time gap

        var itemB = new CreateItemRequest("item-b", "Item Beta", "Pantry", "box", 5);
        using var rB = CreateRequest(HttpMethod.Post, "/api/items", itemB, household);
        await _client.SendAsync(rB);

        // Soft delete Item A
        using var delA = CreateRequest(HttpMethod.Delete, "/api/items/item-a", null, household);
        var delRes = await _client.SendAsync(delA);
        Assert.Equal(HttpStatusCode.NoContent, delRes.StatusCode);

        // Act: Sync since cutoff
        var sinceIso = Uri.EscapeDataString(cutoff.ToString("O"));
        using var syncReq = CreateRequest(HttpMethod.Get, $"/api/sync?since={sinceIso}", null, household);
        var syncRes = await _client.SendAsync(syncReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, syncRes.StatusCode);
        var delta = await syncRes.Content.ReadFromJsonAsync<SyncDeltaResponse>();
        Assert.NotNull(delta);

        // Item A should be returned as a tombstone (IsDeleted == true)
        var tombstoneA = delta.Items.FirstOrDefault(i => i.Id == "item-a");
        Assert.NotNull(tombstoneA);
        Assert.True(tombstoneA.IsDeleted);

        // Item B should be returned active (IsDeleted == false)
        var activeB = delta.Items.FirstOrDefault(i => i.Id == "item-b");
        Assert.NotNull(activeB);
        Assert.False(activeB.IsDeleted);
    }

    [Fact]
    public async Task GetDelta_IsolatesHouseholds()
    {
        // Arrange
        var householdA = Guid.NewGuid();
        var householdB = Guid.NewGuid();

        var itemA = new CreateItemRequest("item-isolated-a", "Secret Item", "Pantry", "unit", 10);
        using var createReq = CreateRequest(HttpMethod.Post, "/api/items", itemA, householdA);
        await _client.SendAsync(createReq);

        // Act
        using var syncReqB = CreateRequest(HttpMethod.Get, "/api/sync", null, householdB);
        var responseB = await _client.SendAsync(syncReqB);

        // Assert
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
        var deltaB = await responseB.Content.ReadFromJsonAsync<SyncDeltaResponse>();
        Assert.NotNull(deltaB);
        Assert.DoesNotContain(deltaB.Items, i => i.Id == "item-isolated-a");
    }

    [Fact]
    public async Task BatchSync_NewEntities_AppliesSuccessfully()
    {
        // Arrange
        var household = Guid.NewGuid();
        var clientTimestamp = DateTimeOffset.UtcNow;

        var batch = new BatchSyncRequest(
            Items: new List<ItemSyncMutation>
            {
                new("batch-item-1", "upsert", Name: "Fresh Spinach", Category: "Produce", Unit: "bag", ReorderThresholdDays: 5, IsOneTime: false, Completed: false, UpdatedAt: clientTimestamp),
                new("batch-item-2", "upsert", Name: "Paper Napkins", Category: "Household", Unit: "pack", ReorderThresholdDays: 0, IsOneTime: true, Completed: false, UpdatedAt: clientTimestamp)
            },
            Purchases: new List<PurchaseSyncMutation>
            {
                new("batch-purch-1", "batch-item-1", "upsert", Date: new DateOnly(2026, 3, 2), Quantity: 1, Price: 2.99m, EarlyRestock: false, UpdatedAt: clientTimestamp)
            },
            Plans: new List<PlanSyncMutation>
            {
                new("batch-plan-1", "upsert", TargetDate: new DateOnly(2026, 3, 15), SelectedItemIds: new() { "batch-item-1", "batch-item-2" }, Completed: false, UpdatedAt: clientTimestamp)
            },
            Preferences: new PreferenceSyncMutation(
                Density: "dense",
                DashboardView: "list",
                AisleOrder: new() { "Produce", "Household" },
                OutOfStockItemIds: new() { "batch-item-2" },
                UpdatedAt: clientTimestamp
            )
        );

        // Act
        using var postReq = CreateRequest(HttpMethod.Post, "/api/sync/batch", batch, household);
        var response = await _client.SendAsync(postReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<BatchSyncResult>();
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal(5, result.AppliedCount); // 2 items + 1 purchase + 1 plan + 1 preference = 5
        Assert.Equal(0, result.ConflictCount);
        Assert.Empty(result.Conflicts);

        // Verify entities can now be read via standard endpoints
        using var getItemReq = CreateRequest(HttpMethod.Get, "/api/items/batch-item-1", null, household);
        var getItemRes = await _client.SendAsync(getItemReq);
        Assert.Equal(HttpStatusCode.OK, getItemRes.StatusCode);
        var item = await getItemRes.Content.ReadFromJsonAsync<ItemResponse>();
        Assert.NotNull(item);
        Assert.Equal("Fresh Spinach", item.Name);

        using var getPlanReq = CreateRequest(HttpMethod.Get, "/api/plans", null, household);
        var getPlanRes = await _client.SendAsync(getPlanReq);
        Assert.Equal(HttpStatusCode.OK, getPlanRes.StatusCode);
        var plans = await getPlanRes.Content.ReadFromJsonAsync<List<TripPlanResponse>>();
        Assert.NotNull(plans);
        Assert.Contains(plans, p => p.Id == "batch-plan-1" && p.SelectedItemIds.Contains("batch-item-2"));
    }

    [Fact]
    public async Task BatchSync_UpdatesWithLww_AppliesWhenClientNewer()
    {
        // Arrange: Create an item via API
        var household = Guid.NewGuid();
        var createReq = new CreateItemRequest("lww-item-1", "Original Butter", "Dairy", "stick", 14);
        using var r1 = CreateRequest(HttpMethod.Post, "/api/items", createReq, household);
        var res1 = await _client.SendAsync(r1);
        Assert.Equal(HttpStatusCode.Created, res1.StatusCode);
        var created = await res1.Content.ReadFromJsonAsync<ItemResponse>();
        Assert.NotNull(created);

        // Newer client timestamp
        var newerTimestamp = created.UpdatedAt.AddSeconds(10);
        var batch = new BatchSyncRequest(
            Items: new List<ItemSyncMutation>
            {
                new("lww-item-1", "upsert", Name: "Salted Butter", Category: "Dairy", Unit: "stick", ReorderThresholdDays: 14, IsOneTime: false, Completed: false, UpdatedAt: newerTimestamp)
            }
        );

        // Act
        using var batchReq = CreateRequest(HttpMethod.Post, "/api/sync/batch", batch, household);
        var batchRes = await _client.SendAsync(batchReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, batchRes.StatusCode);
        var result = await batchRes.Content.ReadFromJsonAsync<BatchSyncResult>();
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal(1, result.AppliedCount);
        Assert.Equal(0, result.ConflictCount);

        // Check updated item
        using var getReq = CreateRequest(HttpMethod.Get, "/api/items/lww-item-1", null, household);
        var getRes = await _client.SendAsync(getReq);
        var item = await getRes.Content.ReadFromJsonAsync<ItemResponse>();
        Assert.NotNull(item);
        Assert.Equal("Salted Butter", item.Name);
    }

    [Fact]
    public async Task BatchSync_StaleUpdate_RejectsAndRecordsConflict()
    {
        // Arrange: Create an item via API
        var household = Guid.NewGuid();
        var createReq = new CreateItemRequest("stale-item-1", "Current Name", "Pantry", "bag", 7);
        using var r1 = CreateRequest(HttpMethod.Post, "/api/items", createReq, household);
        var res1 = await _client.SendAsync(r1);
        Assert.Equal(HttpStatusCode.Created, res1.StatusCode);
        var created = await res1.Content.ReadFromJsonAsync<ItemResponse>();
        Assert.NotNull(created);

        // Stale client timestamp (older than server CreatedAt/UpdatedAt)
        var staleTimestamp = created.UpdatedAt.AddSeconds(-30);
        var batch = new BatchSyncRequest(
            Items: new List<ItemSyncMutation>
            {
                new("stale-item-1", "upsert", Name: "Overwritten Name", Category: "Pantry", Unit: "bag", ReorderThresholdDays: 7, IsOneTime: false, Completed: false, UpdatedAt: staleTimestamp)
            }
        );

        // Act
        using var batchReq = CreateRequest(HttpMethod.Post, "/api/sync/batch", batch, household);
        var batchRes = await _client.SendAsync(batchReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, batchRes.StatusCode);
        var result = await batchRes.Content.ReadFromJsonAsync<BatchSyncResult>();
        Assert.NotNull(result);
        Assert.False(result.Success); // Failed because conflicts occurred
        Assert.Equal(0, result.AppliedCount);
        Assert.Equal(1, result.ConflictCount);
        Assert.Single(result.Conflicts);
        Assert.Equal("Item", result.Conflicts[0].Entity);
        Assert.Equal("stale-item-1", result.Conflicts[0].Id);

        // Verify entity was NOT overwritten
        using var getReq = CreateRequest(HttpMethod.Get, "/api/items/stale-item-1", null, household);
        var getRes = await _client.SendAsync(getReq);
        var item = await getRes.Content.ReadFromJsonAsync<ItemResponse>();
        Assert.NotNull(item);
        Assert.Equal("Current Name", item.Name);
    }

    [Fact]
    public async Task BatchSync_Deletions_AppliesSoftDeleteTombstone()
    {
        // Arrange: Create an item
        var household = Guid.NewGuid();
        var createReq = new CreateItemRequest("delete-sync-1", "To Be Deleted", "Pantry", "box", 7);
        using var r1 = CreateRequest(HttpMethod.Post, "/api/items", createReq, household);
        var res1 = await _client.SendAsync(r1);
        Assert.Equal(HttpStatusCode.Created, res1.StatusCode);
        var created = await res1.Content.ReadFromJsonAsync<ItemResponse>();
        Assert.NotNull(created);

        // Newer deletion mutation
        var deleteTimestamp = created.UpdatedAt.AddSeconds(5);
        var batch = new BatchSyncRequest(
            Items: new List<ItemSyncMutation>
            {
                new("delete-sync-1", "delete", UpdatedAt: deleteTimestamp)
            }
        );

        // Act
        using var batchReq = CreateRequest(HttpMethod.Post, "/api/sync/batch", batch, household);
        var batchRes = await _client.SendAsync(batchReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, batchRes.StatusCode);
        var result = await batchRes.Content.ReadFromJsonAsync<BatchSyncResult>();
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal(1, result.AppliedCount);

        // Verify item is now 404 from active query
        using var getReq = CreateRequest(HttpMethod.Get, "/api/items/delete-sync-1", null, household);
        var getRes = await _client.SendAsync(getReq);
        Assert.Equal(HttpStatusCode.NotFound, getRes.StatusCode);
    }

    [Fact]
    public async Task BatchSync_EmptyPayload_ReturnsSuccess()
    {
        // Arrange
        var household = Guid.NewGuid();
        var batch = new BatchSyncRequest();

        // Act
        using var batchReq = CreateRequest(HttpMethod.Post, "/api/sync/batch", batch, household);
        var batchRes = await _client.SendAsync(batchReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, batchRes.StatusCode);
        var result = await batchRes.Content.ReadFromJsonAsync<BatchSyncResult>();
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal(0, result.AppliedCount);
        Assert.Equal(0, result.ConflictCount);
        Assert.Empty(result.Conflicts);
    }

    [Fact]
    public async Task BatchSync_MultipleMutationsForSameEntity_InSingleBatch()
    {
        // Arrange: Client creates an item and updates it within the same offline batch
        var household = Guid.NewGuid();
        var t1 = DateTimeOffset.UtcNow;
        var t2 = t1.AddSeconds(1);

        var batch = new BatchSyncRequest(
            Items: new List<ItemSyncMutation>
            {
                new("multi-mut-1", "upsert", Name: "Coffee Beans", Category: "Pantry", Unit: "bag", ReorderThresholdDays: 14, IsOneTime: false, Completed: false, UpdatedAt: t1),
                new("multi-mut-1", "upsert", Name: "Espresso Beans", Category: "Pantry", Unit: "bag", ReorderThresholdDays: 14, IsOneTime: false, Completed: true, UpdatedAt: t2)
            }
        );

        // Act
        using var batchReq = CreateRequest(HttpMethod.Post, "/api/sync/batch", batch, household);
        var batchRes = await _client.SendAsync(batchReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, batchRes.StatusCode);
        var result = await batchRes.Content.ReadFromJsonAsync<BatchSyncResult>();
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal(2, result.AppliedCount);

        // Verify the final state has Espresso Beans and Completed == true
        using var getReq = CreateRequest(HttpMethod.Get, "/api/items/multi-mut-1", null, household);
        var getRes = await _client.SendAsync(getReq);
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        var item = await getRes.Content.ReadFromJsonAsync<ItemResponse>();
        Assert.NotNull(item);
        Assert.Equal("Espresso Beans", item.Name);
        Assert.True(item.Completed);
    }

    [Fact]
    public async Task BatchSync_SoftDeletePurchaseAndPlan_AppliesTombstones()
    {
        // Arrange: Create item, purchase, and plan
        var household = Guid.NewGuid();
        var itemReq = new CreateItemRequest("del-test-item", "Eggs", "Dairy", "carton", 7);
        using var rItem = CreateRequest(HttpMethod.Post, "/api/items", itemReq, household);
        await _client.SendAsync(rItem);

        var purchReq = new LogPurchaseRequest("del-test-purch", new DateOnly(2026, 3, 1), 1, 3.50m);
        using var rPurch = CreateRequest(HttpMethod.Post, "/api/items/del-test-item/purchases", purchReq, household);
        await _client.SendAsync(rPurch);

        var planReq = new SavePlanRequest("del-test-plan", new DateOnly(2026, 3, 10), new() { "del-test-item" });
        using var rPlan = CreateRequest(HttpMethod.Post, "/api/plans", planReq, household);
        await _client.SendAsync(rPlan);

        // Act: Batch delete purchase and plan
        var now = DateTimeOffset.UtcNow.AddSeconds(5);
        var batch = new BatchSyncRequest(
            Purchases: new List<PurchaseSyncMutation>
            {
                new("del-test-purch", "del-test-item", "delete", UpdatedAt: now)
            },
            Plans: new List<PlanSyncMutation>
            {
                new("del-test-plan", "delete", UpdatedAt: now)
            }
        );

        using var batchReq = CreateRequest(HttpMethod.Post, "/api/sync/batch", batch, household);
        var batchRes = await _client.SendAsync(batchReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, batchRes.StatusCode);
        var result = await batchRes.Content.ReadFromJsonAsync<BatchSyncResult>();
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal(2, result.AppliedCount);

        // Verify purchase and plan are hidden from normal endpoints
        using var getPurchReq = CreateRequest(HttpMethod.Get, "/api/items/del-test-item/purchases", null, household);
        var getPurchRes = await _client.SendAsync(getPurchReq);
        var purchases = await getPurchRes.Content.ReadFromJsonAsync<List<PurchaseResponse>>();
        Assert.NotNull(purchases);
        Assert.DoesNotContain(purchases, p => p.Id == "del-test-purch");

        using var getPlansReq = CreateRequest(HttpMethod.Get, "/api/plans", null, household);
        var getPlansRes = await _client.SendAsync(getPlansReq);
        var plans = await getPlansRes.Content.ReadFromJsonAsync<List<TripPlanResponse>>();
        Assert.NotNull(plans);
        Assert.DoesNotContain(plans, p => p.Id == "del-test-plan");
    }
}
