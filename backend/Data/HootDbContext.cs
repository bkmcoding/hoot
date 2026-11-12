using HootApi.Models;
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

    public DbSet<Item> Items => Set<Item>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Item>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Category).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Unit).HasMaxLength(50);
            entity.HasIndex(e => new { e.HouseholdId, e.Name });

            // Global Query Filter: Exclude soft-deleted records from standard queries
            entity.HasQueryFilter(e => !e.IsDeleted);
        });
    }
}
