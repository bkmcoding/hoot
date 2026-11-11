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
}
