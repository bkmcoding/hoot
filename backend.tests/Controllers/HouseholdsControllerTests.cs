using System.Net;
using System.Net.Http.Json;
using HootApi.Dtos;
using HootApi.Tests.Helpers;
using Xunit;

namespace HootApi.Tests.Controllers;

public class HouseholdsControllerTests : IClassFixture<HootTestFactory>
{
    private readonly HttpClient _client;
    private readonly Guid _householdId = Guid.NewGuid();

    public HouseholdsControllerTests(HootTestFactory factory)
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
    public async Task ResetDemo_Starter_Seeds8ItemsAnd14Purchases()
    {
        // Act: Reset demo to starter household
        var household = Guid.NewGuid();
        using var postReq = CreateRequest(HttpMethod.Post, "/api/households/reset-demo?sample=starter", null, household);
        var response = await _client.SendAsync(postReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.Content.ReadFromJsonAsync<List<ItemResponse>>();
        Assert.NotNull(items);
        Assert.Equal(8, items.Count);

        // Check staples and one-times
        var staples = items.Where(i => !i.IsOneTime).ToList();
        var oneTimes = items.Where(i => i.IsOneTime).ToList();
        Assert.Equal(6, staples.Count);
        Assert.Equal(2, oneTimes.Count);

        // Verify purchase history for milk (should have 3 purchases)
        using var getMilkPurchases = CreateRequest(HttpMethod.Get, "/api/items/item-milk/purchases", null, household);
        var milkResponse = await _client.SendAsync(getMilkPurchases);
        Assert.Equal(HttpStatusCode.OK, milkResponse.StatusCode);
        var milkPurchases = await milkResponse.Content.ReadFromJsonAsync<List<PurchaseResponse>>();
        Assert.NotNull(milkPurchases);
        Assert.Equal(3, milkPurchases.Count);
    }

    [Fact]
    public async Task ResetDemo_Busy_Seeds44Items()
    {
        // Act: Reset demo to busy household
        var household = Guid.NewGuid();
        using var postReq = CreateRequest(HttpMethod.Post, "/api/households/reset-demo?sample=busy", null, household);
        var response = await _client.SendAsync(postReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.Content.ReadFromJsonAsync<List<ItemResponse>>();
        Assert.NotNull(items);
        Assert.Equal(44, items.Count);

        var staples = items.Where(i => !i.IsOneTime).ToList();
        var oneTimes = items.Where(i => i.IsOneTime).ToList();
        Assert.Equal(38, staples.Count);
        Assert.Equal(6, oneTimes.Count);
    }

    [Fact]
    public async Task ResetDemo_ClearsPreviousDataBeforeSeeding()
    {
        // Arrange: Create a custom item first
        var household = Guid.NewGuid();
        var custom = new CreateItemRequest(null, "Custom Old Item", "Pantry", "each", 7);
        using var createReq = CreateRequest(HttpMethod.Post, "/api/items", custom, household);
        await _client.SendAsync(createReq);

        // Act: Reset demo
        using var resetReq = CreateRequest(HttpMethod.Post, "/api/households/reset-demo?sample=starter", null, household);
        await _client.SendAsync(resetReq);

        // Assert: Custom item should not exist in the seeded household
        using var getReq = CreateRequest(HttpMethod.Get, "/api/items", null, household);
        var getResponse = await _client.SendAsync(getReq);
        var items = await getResponse.Content.ReadFromJsonAsync<List<ItemResponse>>();
        Assert.NotNull(items);
        Assert.Equal(8, items.Count);
        Assert.DoesNotContain(items, i => i.Name == "Custom Old Item");
    }
}
