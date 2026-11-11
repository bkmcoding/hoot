using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace HootApi.Tests.Helpers;

/// <summary>
/// Custom test factory for WebApplicationFactory.
/// Automatically configures the backend to use an isolated EF Core InMemory database per test class.
/// </summary>
public class HootTestFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = "HootTestDb_" + Guid.NewGuid();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Instruct Program.cs to register InMemory rather than PostgreSQL
        builder.UseSetting("DatabaseProvider", "InMemory");
        builder.UseSetting("InMemoryDbName", _databaseName);
    }
}
