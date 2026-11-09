using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace HootApi.Tests;

public class HealthCheckTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public HealthCheckTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetHealth_ReturnsOk_WithHealthyStatus()
    {
        // Act: Make an in-memory HTTP request to the running API
        var response = await _client.GetAsync("/api/health");

        // Assert: We expect HTTP 200 OK
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("healthy", content);
    }
}
