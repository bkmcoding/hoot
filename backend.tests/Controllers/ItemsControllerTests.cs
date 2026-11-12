using System.Net;
using System.Net.Http.Json;
using HootApi.Dtos;
using HootApi.Tests.Helpers;
using Xunit;

namespace HootApi.Tests.Controllers;

public class ItemsControllerTests : IClassFixture<HootTestFactory>
{
    private readonly HttpClient _client;
    private readonly Guid _householdId = Guid.NewGuid();

    public ItemsControllerTests(HootTestFactory factory)
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
    public async Task CreateItem_ValidPayload_ReturnsCreated_WithItemResponse()
    {
        // Arrange
        var payload = new CreateItemRequest(
            Id: null, // Let backend assign an ID if none passed
            Name: "Whole milk",
            Category: "Pantry",
            Unit: "half-gallon",
            ReorderThresholdDays: 10,
            IsOneTime: false
        );

        using var request = CreateRequest(HttpMethod.Post, "/api/items", payload);

        // Act
        var response = await _client.SendAsync(request);

        // Assert: Should return 201 Created
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var item = await response.Content.ReadFromJsonAsync<ItemResponse>();
        Assert.NotNull(item);
        Assert.False(string.IsNullOrWhiteSpace(item.Id));
        Assert.Equal("Whole milk", item.Name);
        Assert.Equal("Pantry", item.Category);
        Assert.Equal("half-gallon", item.Unit);
        Assert.Equal(10, item.ReorderThresholdDays);
        Assert.False(item.IsOneTime);
        Assert.False(item.Completed);
    }

    [Fact]
    public async Task CreateItem_DuplicateName_ReturnsConflict409()
    {
        // Arrange: Create initial item
        var initial = new CreateItemRequest(null, "Sourdough Bread", "Bakery", "loaf", 7);
        using var firstRequest = CreateRequest(HttpMethod.Post, "/api/items", initial);
        var firstResponse = await _client.SendAsync(firstRequest);
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        // Act: Attempt to create duplicate with different casing
        var duplicate = new CreateItemRequest(null, "sourdough bread", "Bakery", "loaf", 7);
        using var duplicateRequest = CreateRequest(HttpMethod.Post, "/api/items", duplicate);
        var duplicateResponse = await _client.SendAsync(duplicateRequest);

        // Assert: Should return 409 Conflict
        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);
    }

    [Fact]
    public async Task GetItems_ReturnsAllActiveItems_ForHousehold()
    {
        // Arrange: Create two items for this household
        var household = Guid.NewGuid();
        var item1 = new CreateItemRequest(null, "Apples", "Produce", "bag", 7);
        var item2 = new CreateItemRequest(null, "Bananas", "Produce", "bunch", 5);

        using var req1 = CreateRequest(HttpMethod.Post, "/api/items", item1, household);
        await _client.SendAsync(req1);

        using var req2 = CreateRequest(HttpMethod.Post, "/api/items", item2, household);
        await _client.SendAsync(req2);

        // Act
        using var getRequest = CreateRequest(HttpMethod.Get, "/api/items", null, household);
        var response = await _client.SendAsync(getRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = await response.Content.ReadFromJsonAsync<List<ItemResponse>>();
        Assert.NotNull(items);
        Assert.Equal(2, items.Count);
        Assert.Contains(items, i => i.Name == "Apples");
        Assert.Contains(items, i => i.Name == "Bananas");
    }

    [Fact]
    public async Task GetItems_IsolatesHouseholds()
    {
        // Arrange: Household A creates an item
        var householdA = Guid.NewGuid();
        var householdB = Guid.NewGuid();

        var item = new CreateItemRequest(null, "Cheddar Cheese", "Dairy", "block", 14);
        using var createReq = CreateRequest(HttpMethod.Post, "/api/items", item, householdA);
        await _client.SendAsync(createReq);

        // Act: Household B queries its items
        using var getReqB = CreateRequest(HttpMethod.Get, "/api/items", null, householdB);
        var responseB = await _client.SendAsync(getReqB);

        // Assert: Household B should have 0 items
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
        var itemsB = await responseB.Content.ReadFromJsonAsync<List<ItemResponse>>();
        Assert.NotNull(itemsB);
        Assert.Empty(itemsB);
    }
}
