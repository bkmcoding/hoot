using System.Net;
using System.Net.Http.Json;
using HootApi.Dtos;
using HootApi.Tests.Helpers;
using Xunit;

namespace HootApi.Tests.Controllers;

public class PurchasesControllerTests : IClassFixture<HootTestFactory>
{
    private readonly HttpClient _client;
    private readonly Guid _householdId = Guid.NewGuid();

    public PurchasesControllerTests(HootTestFactory factory)
    {
        _client = factory.CreateClient();
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string uri, object? body = null)
    {
        var request = new HttpRequestMessage(method, uri);
        request.Headers.Add("X-Household-Id", _householdId.ToString());
        if (body != null)
        {
            request.Content = JsonContent.Create(body);
        }
        return request;
    }

    private async Task<ItemResponse> CreateTestItemAsync(string name = "Eggs")
    {
        var payload = new CreateItemRequest(null, name, "Pantry", "dozen", 14);
        using var request = CreateRequest(HttpMethod.Post, "/api/items", payload);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = await response.Content.ReadFromJsonAsync<ItemResponse>();
        Assert.NotNull(item);
        return item;
    }

    [Fact]
    public async Task LogPurchase_ValidPayload_ReturnsCreated201()
    {
        // Arrange
        var item = await CreateTestItemAsync("Coffee Beans");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var payload = new LogPurchaseRequest(
            Id: null,
            Date: today,
            Quantity: 1,
            Price: 14.99m
        );

        using var request = CreateRequest(HttpMethod.Post, $"/api/items/{item.Id}/purchases", payload);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var purchase = await response.Content.ReadFromJsonAsync<PurchaseResponse>();
        Assert.NotNull(purchase);
        Assert.False(string.IsNullOrWhiteSpace(purchase.Id));
        Assert.Equal(item.Id, purchase.ItemId);
        Assert.Equal(today, purchase.Date);
        Assert.Equal(1, purchase.Quantity);
        Assert.Equal(14.99m, purchase.Price);
    }

    [Fact]
    public async Task LogPurchase_NonExistentItem_ReturnsNotFound404()
    {
        // Arrange
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var payload = new LogPurchaseRequest(null, today, 1, 5.00m);
        using var request = CreateRequest(HttpMethod.Post, "/api/items/non-existent-item/purchases", payload);

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetPurchases_ReturnsChronologicalList_ForItem()
    {
        // Arrange
        var item = await CreateTestItemAsync("Olive Oil");
        var date1 = new DateOnly(2026, 10, 1);
        var date2 = new DateOnly(2026, 10, 15);

        // Log second date first, then first date
        using var req2 = CreateRequest(HttpMethod.Post, $"/api/items/{item.Id}/purchases", new LogPurchaseRequest(null, date2, 1, 18.99m));
        await _client.SendAsync(req2);

        using var req1 = CreateRequest(HttpMethod.Post, $"/api/items/{item.Id}/purchases", new LogPurchaseRequest(null, date1, 1, 17.99m));
        await _client.SendAsync(req1);

        // Act: Fetch purchases
        using var getReq = CreateRequest(HttpMethod.Get, $"/api/items/{item.Id}/purchases");
        var response = await _client.SendAsync(getReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var list = await response.Content.ReadFromJsonAsync<List<PurchaseResponse>>();
        Assert.NotNull(list);
        Assert.Equal(2, list.Count);
        // Verify chronological sorting (date1 before date2)
        Assert.Equal(date1, list[0].Date);
        Assert.Equal(date2, list[1].Date);
    }

    [Fact]
    public async Task UpdateFeedback_ExistingPurchase_ReturnsOk_WithUpdatedValues()
    {
        // Arrange
        var item = await CreateTestItemAsync("Greek Yogurt");
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var initialPayload = new LogPurchaseRequest(null, today, 2, 6.99m);
        using var createReq = CreateRequest(HttpMethod.Post, $"/api/items/{item.Id}/purchases", initialPayload);
        var createResponse = await _client.SendAsync(createReq);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var purchase = await createResponse.Content.ReadFromJsonAsync<PurchaseResponse>();
        Assert.NotNull(purchase);

        // Act: Update feedback ("Still had some" -> early restock)
        var shiftedDate = today.AddDays(3);
        var feedbackPayload = new UpdatePurchaseFeedbackRequest(
            EarlyRestock: true,
            EffectiveStartDate: shiftedDate,
            FeedbackVerdict: "early",
            FeedbackPredictedDate: today
        );

        using var updateReq = CreateRequest(HttpMethod.Put, $"/api/items/{item.Id}/purchases/{purchase.Id}", feedbackPayload);
        var updateResponse = await _client.SendAsync(updateReq);

        // Assert
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadFromJsonAsync<PurchaseResponse>();
        Assert.NotNull(updated);
        Assert.Equal(purchase.Id, updated.Id);
        Assert.True(updated.EarlyRestock);
        Assert.Equal(shiftedDate, updated.EffectiveStartDate);
        Assert.Equal("early", updated.FeedbackVerdict);
        Assert.Equal(today, updated.FeedbackPredictedDate);
    }

    [Fact]
    public async Task UpdateFeedback_NonExistentPurchase_ReturnsNotFound404()
    {
        // Arrange
        var item = await CreateTestItemAsync("Almond Butter");
        var feedbackPayload = new UpdatePurchaseFeedbackRequest(EarlyRestock: true);
        using var updateReq = CreateRequest(HttpMethod.Put, $"/api/items/{item.Id}/purchases/non-existent-purchase", feedbackPayload);

        // Act
        var response = await _client.SendAsync(updateReq);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
