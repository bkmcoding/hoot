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
    public DbSet<Purchase> Purchases => Set<Purchase>();

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

            // Global Query Filter: Exclude soft-deleted items across all queries
            entity.HasQueryFilter(e => !e.IsDeleted);
        });

        modelBuilder.Entity<Purchase>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Quantity).HasPrecision(10, 2);
            entity.Property(e => e.Price).HasPrecision(10, 2);
            entity.Property(e => e.FeedbackVerdict).HasMaxLength(20);

            entity.HasOne(e => e.Item)
                  .WithMany(i => i.Purchases)
                  .HasForeignKey(e => e.ItemId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.HouseholdId, e.ItemId, e.Date });

            // Global Query Filter: Exclude soft-deleted purchases across all queries
            entity.HasQueryFilter(e => !e.IsDeleted);
        });
    }
}
