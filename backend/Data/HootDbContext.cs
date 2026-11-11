using Microsoft.EntityFrameworkCore;

namespace HootApi.Data;

/// <summary>
/// Entity Framework Core database context for Hoot.
/// Manages sessions with PostgreSQL and maps domain models to database tables.
/// </summary>
public class HootDbContext : DbContext
{
    public HootDbContext(DbContextOptions<HootDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
    }
}
