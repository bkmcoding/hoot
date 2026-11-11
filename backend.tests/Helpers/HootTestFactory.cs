using System.Linq;
using HootApi.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HootApi.Tests.Helpers;

/// <summary>
/// Custom test factory for WebApplicationFactory.
/// Automatically swaps the PostgreSQL database provider for an isolated EF Core InMemory database.
/// </summary>
public class HootTestFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = "HootTestDb_" + Guid.NewGuid();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove existing PostgreSQL DbContext registration
            var descriptor = services.SingleOrDefault(d =>
                d.ServiceType == typeof(DbContextOptions<HootDbContext>));
            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            // Register InMemory database isolated for this test factory instance
            services.AddDbContext<HootDbContext>(options =>
            {
                options.UseInMemoryDatabase(_databaseName);
            });
        });
    }
}
