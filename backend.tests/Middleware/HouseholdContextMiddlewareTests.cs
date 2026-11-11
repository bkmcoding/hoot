using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace HootApi.Tests.Middleware;

public class HouseholdContextMiddlewareTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HouseholdContextMiddlewareTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Request_WithoutHouseholdHeader_ReturnsBadRequest()
    {
        // Act: Call an endpoint without the X-Household-Id header
        var response = await _client.GetAsync("/api/test-context");

        // Assert: Middleware should block this at the front door with HTTP 400
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        
        var message = await response.Content.ReadAsStringAsync();
        Assert.Contains("Missing or empty X-Household-Id", message);
    }

    [Fact]
    public async Task Request_WithInvalidGuidHeader_ReturnsBadRequest()
    {
        // Arrange
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/test-context");
        request.Headers.Add("X-Household-Id", "not-a-valid-uuid");

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        
        var message = await response.Content.ReadAsStringAsync();
        Assert.Contains("Invalid X-Household-Id format", message);
    }

    [Fact]
    public async Task Request_WithValidGuidHeader_PassesThrough_AndSetsContext()
    {
        // Arrange: A valid UUID
        var validId = Guid.NewGuid();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/test-context");
        request.Headers.Add("X-Household-Id", validId.ToString());

        // Act
        var response = await _client.SendAsync(request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        var data = await response.Content.ReadFromJsonAsync<TestContextResponse>();
        Assert.NotNull(data);
        Assert.Equal(validId.ToString(), data.HouseholdId);
    }

    [Fact]
    public async Task HealthCheck_IsExempt_FromHouseholdHeaderRequirement()
    {
        // Act: /api/health should never require X-Household-Id
        var response = await _client.GetAsync("/api/health");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private record TestContextResponse(string? HouseholdId);
}
