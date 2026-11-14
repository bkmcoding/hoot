using System.Net;
using System.Net.Http.Json;
using HootApi.Dtos;
using HootApi.Tests.Helpers;
using Xunit;

namespace HootApi.Tests.Controllers;

public class PlansControllerTests : IClassFixture<HootTestFactory>
{
    private readonly HttpClient _client;
    private readonly Guid _householdId = Guid.NewGuid();

    public PlansControllerTests(HootTestFactory factory)
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
    public async Task SavePlan_CreateNew_ReturnsCreated201()
    {
        // Arrange
        var targetDate = new DateOnly(2026, 11, 20);
        var payload = new SavePlanRequest(
            Id: null,
            TargetDate: targetDate,
            SelectedItemIds: new List<string> { "item-milk", "item-eggs" },
            Completed: false
        );

        using var request = CreateRequest(HttpMethod.Post, "/api/plans", payload);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var plan = await response.Content.ReadFromJsonAsync<TripPlanResponse>();
        Assert.NotNull(plan);
        Assert.False(string.IsNullOrWhiteSpace(plan.Id));
        Assert.Equal(targetDate, plan.TargetDate);
        Assert.Equal(2, plan.SelectedItemIds.Count);
        Assert.Contains("item-milk", plan.SelectedItemIds);
        Assert.False(plan.Completed);
    }

    [Fact]
    public async Task SavePlan_UpdateExisting_ReturnsOk200()
    {
        // Arrange: Create initial plan
        var initialDate = new DateOnly(2026, 11, 22);
        var initialPayload = new SavePlanRequest(null, initialDate, new List<string> { "item-1" }, false);
        using var createReq = CreateRequest(HttpMethod.Post, "/api/plans", initialPayload);
        var createResponse = await _client.SendAsync(createReq);
        var created = await createResponse.Content.ReadFromJsonAsync<TripPlanResponse>();
        Assert.NotNull(created);

        // Act: Update the plan with a new date and added items
        var newDate = new DateOnly(2026, 11, 25);
        var updatePayload = new SavePlanRequest(created.Id, newDate, new List<string> { "item-1", "item-2" }, true);
        using var updateReq = CreateRequest(HttpMethod.Post, "/api/plans", updatePayload);
        var updateResponse = await _client.SendAsync(updateReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadFromJsonAsync<TripPlanResponse>();
        Assert.NotNull(updated);
        Assert.Equal(created.Id, updated.Id);
        Assert.Equal(newDate, updated.TargetDate);
        Assert.Equal(2, updated.SelectedItemIds.Count);
        Assert.True(updated.Completed);
    }

    [Fact]
    public async Task GetPlans_ReturnsChronologicalPlans_ForHousehold()
    {
        // Arrange
        var household = Guid.NewGuid();
        var date1 = new DateOnly(2026, 11, 15);
        var date2 = new DateOnly(2026, 11, 30);

        // Save date2 first, then date1
        using var req2 = CreateRequest(HttpMethod.Post, "/api/plans", new SavePlanRequest(null, date2, new List<string>(), false), household);
        await _client.SendAsync(req2);

        using var req1 = CreateRequest(HttpMethod.Post, "/api/plans", new SavePlanRequest(null, date1, new List<string>(), false), household);
        await _client.SendAsync(req1);

        // Act
        using var getReq = CreateRequest(HttpMethod.Get, "/api/plans", null, household);
        var response = await _client.SendAsync(getReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var plans = await response.Content.ReadFromJsonAsync<List<TripPlanResponse>>();
        Assert.NotNull(plans);
        Assert.Equal(2, plans.Count);
        Assert.Equal(date1, plans[0].TargetDate);
        Assert.Equal(date2, plans[1].TargetDate);
    }

    [Fact]
    public async Task DeletePlan_SoftDeletesPlan_AndHidesFromQueries()
    {
        // Arrange
        var payload = new SavePlanRequest(null, new DateOnly(2026, 11, 18), new List<string> { "item-bread" }, false);
        using var createReq = CreateRequest(HttpMethod.Post, "/api/plans", payload);
        var createResponse = await _client.SendAsync(createReq);
        var plan = await createResponse.Content.ReadFromJsonAsync<TripPlanResponse>();
        Assert.NotNull(plan);

        // Act: Delete plan
        using var deleteReq = CreateRequest(HttpMethod.Delete, $"/api/plans/{plan.Id}");
        var deleteResponse = await _client.SendAsync(deleteReq);
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Verify: Not returned in list
        using var listReq = CreateRequest(HttpMethod.Get, "/api/plans");
        var listResponse = await _client.SendAsync(listReq);
        var list = await listResponse.Content.ReadFromJsonAsync<List<TripPlanResponse>>();
        Assert.NotNull(list);
        Assert.DoesNotContain(list, p => p.Id == plan.Id);

        // Verify: Direct lookup returns 404
        using var singleReq = CreateRequest(HttpMethod.Get, $"/api/plans/{plan.Id}");
        var singleResponse = await _client.SendAsync(singleReq);
        Assert.Equal(HttpStatusCode.NotFound, singleResponse.StatusCode);
    }
}
