using System.Net;
using System.Net.Http.Json;
using HootApi.Dtos;
using HootApi.Tests.Helpers;
using Xunit;

namespace HootApi.Tests.Controllers;

public class PreferencesControllerTests : IClassFixture<HootTestFactory>
{
    private readonly HttpClient _client;
    private readonly Guid _householdId = Guid.NewGuid();

    public PreferencesControllerTests(HootTestFactory factory)
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
    public async Task GetPreferences_WhenNoneExist_ReturnsDefaults()
    {
        // Act: Fetch preferences for a brand new household
        var freshHousehold = Guid.NewGuid();
        using var request = CreateRequest(HttpMethod.Get, "/api/preferences", null, freshHousehold);
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var pref = await response.Content.ReadFromJsonAsync<HouseholdPreferenceResponse>();
        Assert.NotNull(pref);
        Assert.Equal("spacious", pref.Density);
        Assert.Equal("list", pref.DashboardView);
        Assert.Empty(pref.AisleOrder);
        Assert.Empty(pref.OutOfStockItemIds);
    }

    [Fact]
    public async Task SavePreferences_UpdatesDensityAndAisleOrder_ReturnsOk()
    {
        // Arrange
        var customAisles = new List<string> { "Produce", "Bakery", "Dairy", "Pantry" };
        var payload = new SavePreferenceRequest(
            Density: "dense",
            DashboardView: "calendar",
            AisleOrder: customAisles,
            OutOfStockItemIds: new List<string> { "item-1" }
        );

        using var putRequest = CreateRequest(HttpMethod.Put, "/api/preferences", payload);

        // Act
        var response = await _client.SendAsync(putRequest);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var saved = await response.Content.ReadFromJsonAsync<HouseholdPreferenceResponse>();
        Assert.NotNull(saved);
        Assert.Equal("dense", saved.Density);
        Assert.Equal("calendar", saved.DashboardView);
        Assert.Equal(4, saved.AisleOrder.Count);
        Assert.Contains("Produce", saved.AisleOrder);
        Assert.Single(saved.OutOfStockItemIds);

        // Verify: GET returns the saved preferences
        using var getRequest = CreateRequest(HttpMethod.Get, "/api/preferences");
        var getResponse = await _client.SendAsync(getRequest);
        var fetched = await getResponse.Content.ReadFromJsonAsync<HouseholdPreferenceResponse>();
        Assert.NotNull(fetched);
        Assert.Equal("dense", fetched.Density);
        Assert.Equal("calendar", fetched.DashboardView);
    }

    [Fact]
    public async Task Preferences_IsolateBetweenHouseholds()
    {
        // Arrange: Household A saves dense density
        var householdA = Guid.NewGuid();
        var householdB = Guid.NewGuid();

        using var putA = CreateRequest(HttpMethod.Put, "/api/preferences", new SavePreferenceRequest("dense", "calendar", null, null), householdA);
        await _client.SendAsync(putA);

        // Act: Household B queries its preferences
        using var getB = CreateRequest(HttpMethod.Get, "/api/preferences", null, householdB);
        var responseB = await _client.SendAsync(getB);

        // Assert: Household B still gets defaults ("spacious")
        Assert.Equal(HttpStatusCode.OK, responseB.StatusCode);
        var prefB = await responseB.Content.ReadFromJsonAsync<HouseholdPreferenceResponse>();
        Assert.NotNull(prefB);
        Assert.Equal("spacious", prefB.Density);
        Assert.Equal("list", prefB.DashboardView);
    }
}
