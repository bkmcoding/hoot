using System.Text.RegularExpressions;
using HootApi.Data;
using HootApi.Dtos;
using HootApi.Models;
using Microsoft.EntityFrameworkCore;

namespace HootApi.Services;

public class DemoSeedService
{
    private readonly HootDbContext _db;

    public DemoSeedService(HootDbContext db)
    {
        _db = db;
    }

    public async Task<List<ItemResponse>> ResetDemoAsync(Guid householdId, string sample = "starter")
    {
        // 1. Remove existing household items, purchases, plans, preferences
        var existingItems = await _db.Items.IgnoreQueryFilters().Where(i => i.HouseholdId == householdId).ToListAsync();
        var existingPurchases = await _db.Purchases.IgnoreQueryFilters().Where(p => p.HouseholdId == householdId).ToListAsync();
        var existingPlans = await _db.Plans.IgnoreQueryFilters().Where(p => p.HouseholdId == householdId).ToListAsync();
        var existingPrefs = await _db.Preferences.Where(p => p.HouseholdId == householdId).ToListAsync();

        _db.Purchases.RemoveRange(existingPurchases);
        _db.Items.RemoveRange(existingItems);
        _db.Plans.RemoveRange(existingPlans);
        _db.Preferences.RemoveRange(existingPrefs);

        await _db.SaveChangesAsync();

        // 2. Seed default preference
        _db.Preferences.Add(new HouseholdPreference
        {
            HouseholdId = householdId,
            Density = "spacious",
            DashboardView = "list",
            AisleOrder = new List<string>(),
            OutOfStockItemIds = new List<string>(),
            UpdatedAt = DateTimeOffset.UtcNow
        });

        // 3. Seed requested dataset
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var isBusy = string.Equals(sample, "busy", StringComparison.OrdinalIgnoreCase);

        var (items, purchases) = isBusy 
            ? BuildBusySample(householdId, today) 
            : BuildStarterSample(householdId, today);

        _db.Items.AddRange(items);
        _db.Purchases.AddRange(purchases);

        await _db.SaveChangesAsync();

        // 4. Return items in ItemResponse format
        return items
            .OrderBy(i => i.Name)
            .Select(i => new ItemResponse(
                i.Id,
                i.Name,
                i.Category,
                i.Unit,
                i.ReorderThresholdDays,
                i.IsOneTime,
                i.Completed,
                i.CreatedAt,
                i.UpdatedAt
            ))
            .ToList();
    }

    private static (List<Item>, List<Purchase>) BuildStarterSample(Guid householdId, DateOnly today)
    {
        var items = new List<Item>
        {
            new() { Id = "item-milk", HouseholdId = householdId, Name = "Milk", Category = "Pantry", Unit = "half-gallon", ReorderThresholdDays = 10, IsOneTime = false, Completed = false, CreatedAt = ToTimestamp(today.AddDays(-25)) },
            new() { Id = "item-eggs", HouseholdId = householdId, Name = "Eggs", Category = "Pantry", Unit = "dozen", ReorderThresholdDays = 14, IsOneTime = false, Completed = false, CreatedAt = ToTimestamp(today.AddDays(-32)) },
            new() { Id = "item-paper-towels", HouseholdId = householdId, Name = "Paper towels", Category = "Household", Unit = "6-roll pack", ReorderThresholdDays = 21, IsOneTime = false, Completed = false, CreatedAt = ToTimestamp(today.AddDays(-45)) },
            new() { Id = "item-dish-soap", HouseholdId = householdId, Name = "Dish soap", Category = "Cleaning", Unit = "bottle", ReorderThresholdDays = 30, IsOneTime = false, Completed = false, CreatedAt = ToTimestamp(today.AddDays(-30)) },
            new() { Id = "item-toothpaste", HouseholdId = householdId, Name = "Toothpaste", Category = "Personal care", Unit = "tube", ReorderThresholdDays = 60, IsOneTime = false, Completed = false, CreatedAt = ToTimestamp(today.AddDays(-75)) },
            new() { Id = "item-trash-bags", HouseholdId = householdId, Name = "Trash bags", Category = "Household", Unit = "40-count box", ReorderThresholdDays = 35, IsOneTime = false, Completed = false, CreatedAt = ToTimestamp(today.AddDays(-40)) },
            new() { Id = "item-birthday-candles", HouseholdId = householdId, Name = "Birthday candles", Category = "Household", Unit = "pack", ReorderThresholdDays = 0, IsOneTime = true, Completed = false, CreatedAt = ToTimestamp(today.AddDays(-2)) },
            new() { Id = "item-packing-tape", HouseholdId = householdId, Name = "Packing tape", Category = "Household", Unit = "roll", ReorderThresholdDays = 0, IsOneTime = true, Completed = true, CreatedAt = ToTimestamp(today.AddDays(-9)) }
        };

        var purchases = new List<Purchase>
        {
            new() { Id = "purchase-milk-1", ItemId = "item-milk", HouseholdId = householdId, Date = today.AddDays(-25), Quantity = 1, Price = 4.29m },
            new() { Id = "purchase-milk-2", ItemId = "item-milk", HouseholdId = householdId, Date = today.AddDays(-14), Quantity = 1, Price = 4.49m },
            new() { Id = "purchase-milk-3", ItemId = "item-milk", HouseholdId = householdId, Date = today.AddDays(-5), Quantity = 2, Price = 8.98m },

            new() { Id = "purchase-eggs-1", ItemId = "item-eggs", HouseholdId = householdId, Date = today.AddDays(-32), Quantity = 1, Price = 3.99m },
            new() { Id = "purchase-eggs-2", ItemId = "item-eggs", HouseholdId = householdId, Date = today.AddDays(-18), Quantity = 1, Price = 4.19m },
            new() { Id = "purchase-eggs-3", ItemId = "item-eggs", HouseholdId = householdId, Date = today.AddDays(-6), Quantity = 1, Price = 4.69m },

            new() { Id = "purchase-towels-1", ItemId = "item-paper-towels", HouseholdId = householdId, Date = today.AddDays(-45), Quantity = 1, Price = 9.99m },
            new() { Id = "purchase-towels-2", ItemId = "item-paper-towels", HouseholdId = householdId, Date = today.AddDays(-25), Quantity = 1, Price = 10.49m },
            new() { Id = "purchase-towels-3", ItemId = "item-paper-towels", HouseholdId = householdId, Date = today.AddDays(-9), Quantity = 1, Price = 10.99m },

            new() { Id = "purchase-dish-1", ItemId = "item-dish-soap", HouseholdId = householdId, Date = today.AddDays(-30), Quantity = 1, Price = 3.79m },
            new() { Id = "purchase-dish-2", ItemId = "item-dish-soap", HouseholdId = householdId, Date = today.AddDays(-14), Quantity = 1, Price = 4.09m },

            new() { Id = "purchase-toothpaste-1", ItemId = "item-toothpaste", HouseholdId = householdId, Date = today.AddDays(-75), Quantity = 1, Price = 4.99m },
            new() { Id = "purchase-toothpaste-2", ItemId = "item-toothpaste", HouseholdId = householdId, Date = today.AddDays(-35), Quantity = 1, Price = 5.49m },

            new() { Id = "purchase-trash-1", ItemId = "item-trash-bags", HouseholdId = householdId, Date = today.AddDays(-40), Quantity = 1, Price = 12.49m },
        };

        return (items, purchases);
    }

    private static (List<Item>, List<Purchase>) BuildBusySample(Guid householdId, DateOnly today)
    {
        var items = new List<Item>();
        var purchases = new List<Purchase>();

        // 38 Tracked staples from BUSY_TRACKED
        var specs = GetBusyTrackedSpecs();
        foreach (var spec in specs)
        {
            var slug = Slugify(spec.Name);
            var itemId = $"item-busy-{slug}";
            var gaps = spec.Gaps;
            var purchaseCount = spec.HasNoPurchases ? 0 : gaps.Length + 1;
            var gapsTotal = gaps.Sum();
            var createdAtDaysAgo = spec.CreatedDaysAgo ?? (purchaseCount > 0 ? spec.Last + gapsTotal + 3 : 30);

            var item = new Item
            {
                Id = itemId,
                HouseholdId = householdId,
                Name = spec.Name,
                Category = spec.Category,
                Unit = spec.Unit,
                ReorderThresholdDays = spec.Threshold,
                IsOneTime = false,
                Completed = false,
                CreatedAt = ToTimestamp(today.AddDays(-createdAtDaysAgo)),
                UpdatedAt = DateTimeOffset.UtcNow,
                IsDeleted = false
            };
            items.Add(item);

            for (int i = 0; i < purchaseCount; i++)
            {
                var daysBeforeLatest = gaps.Skip(i).Sum();
                var purchaseDate = today.AddDays(-(spec.Last + daysBeforeLatest));
                var qty = spec.Quantities != null && i < spec.Quantities.Length ? spec.Quantities[i] : 1;
                var price = spec.Price;

                purchases.Add(new Purchase
                {
                    Id = $"purchase-{itemId}-{i + 1}",
                    ItemId = itemId,
                    HouseholdId = householdId,
                    Date = purchaseDate,
                    Quantity = qty,
                    Price = price,
                    CreatedAt = ToTimestamp(purchaseDate),
                    UpdatedAt = DateTimeOffset.UtcNow,
                    IsDeleted = false
                });
            }
        }

        // 6 One-time needs
        var oneTimes = new (string Name, string Category, string Unit, bool Completed, int DaysAgo)[]
        {
            ("Birthday candles", "Household", "pack", false, 5),
            ("AA batteries", "Household", "8-pack", false, 12),
            ("Picture hooks", "Household", "pack", false, 20),
            ("Printer paper", "Household", "ream", false, 8),
            ("Cake mix", "Pantry", "box", true, 30),
            ("Gift bag", "Household", "each", true, 16)
        };

        foreach (var ot in oneTimes)
        {
            var slug = Slugify(ot.Name);
            items.Add(new Item
            {
                Id = $"item-busy-{slug}",
                HouseholdId = householdId,
                Name = ot.Name,
                Category = ot.Category,
                Unit = ot.Unit,
                ReorderThresholdDays = 0,
                IsOneTime = true,
                Completed = ot.Completed,
                CreatedAt = ToTimestamp(today.AddDays(-ot.DaysAgo)),
                UpdatedAt = DateTimeOffset.UtcNow,
                IsDeleted = false
            });
        }

        return (items, purchases);
    }

    private static DateTimeOffset ToTimestamp(DateOnly date) =>
        new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);

    private static string Slugify(string text) =>
        Regex.Replace(text.ToLower().Replace("&", "and"), @"[^a-z0-9]+", "-").Trim('-');

    private record BusyTrackedSpec(
        string Name,
        string Category,
        string Unit,
        int Threshold,
        int Last,
        int[] Gaps,
        decimal Price,
        decimal[]? Quantities = null,
        bool HasNoPurchases = false,
        int? CreatedDaysAgo = null
    );

    private static List<BusyTrackedSpec> GetBusyTrackedSpecs() => new()
    {
        // Pantry (8 items)
        new("Olive oil", "Pantry", "bottle", 45, 50, new[] { 42, 44, 43, 45, 42, 44 }, 14.99m),
        new("Jasmine rice", "Pantry", "5-lb bag", 75, 60, new[] { 78, 74, 76, 80, 72 }, 11.49m),
        new("Pasta", "Pantry", "1-lb box", 30, 20, new[] { 28, 30, 29, 31, 27, 30 }, 1.99m),
        new("Canned tomatoes", "Pantry", "28-oz can", 45, 40, new[] { 44, 46, 43, 45 }, 1.79m, new decimal[] { 1, 2, 1, 2, 1 }),
        new("Peanut butter", "Pantry", "16-oz jar", 45, 30, new[] { 42, 44, 45, 43 }, 4.49m),
        new("Coffee beans", "Pantry", "12-oz bag", 18, 20, new[] { 15, 16, 14, 15, 16, 14, 15, 16, 15 }, 13.99m),
        new("Rolled oats", "Pantry", "42-oz canister", 35, 25, new[] { 34, 33, 36, 35 }, 5.99m),
        new("Flour", "Pantry", "5-lb bag", 120, 100, new[] { 118 }, 4.99m),

        // Dairy & eggs (4 items)
        new("Milk", "Dairy & eggs", "half-gallon", 7, 6, new[] { 6, 7, 6, 7, 7, 6, 7, 6, 7 }, 8.98m, new decimal[] { 1, 1, 1, 2, 1, 1, 2, 1, 1, 2 }),
        new("Eggs", "Dairy & eggs", "dozen", 12, 10, new[] { 12, 13, 11, 12, 12, 13, 12 }, 4.49m),
        new("Greek yogurt", "Dairy & eggs", "32-oz tub", 10, 8, new[] { 9, 10, 10, 9, 11, 10 }, 5.49m),
        new("Butter", "Dairy & eggs", "1-lb block", 21, 16, new[] { 20, 22, 21, 20, 19 }, 4.99m),

        // Produce (5 items)
        new("Bananas", "Produce", "bunch", 5, 5, new[] { 4, 5, 4, 6, 4, 5, 4 }, 1.89m),
        new("Apples", "Produce", "3-lb bag", 12, 6, new[] { 11, 12, 10, 11 }, 4.99m),
        new("Baby spinach", "Produce", "5-oz box", 6, 0, Array.Empty<int>(), 0m, HasNoPurchases: true, CreatedDaysAgo: 4),
        new("Yellow onions", "Produce", "3-lb bag", 14, 7, new[] { 13, 14, 15, 13, 14 }, 3.99m),
        new("Avocados", "Produce", "each", 7, 0, Array.Empty<int>(), 0m, HasNoPurchases: true, CreatedDaysAgo: 3),

        // Bakery (3 items)
        new("Sandwich bread", "Bakery", "loaf", 6, 4, new[] { 5, 6, 5, 5, 6, 5 }, 3.49m),
        new("Bagels", "Bakery", "6-pack", 14, 8, new[] { 12, 13, 14, 13 }, 4.49m),
        new("Flour tortillas", "Bakery", "10-count", 18, 9, new[] { 16, 17, 18, 17 }, 3.29m),

        // Frozen (3 items)
        new("Frozen peas", "Frozen", "16-oz bag", 40, 30, new[] { 36, 38, 37, 35 }, 2.29m),
        new("Frozen berries", "Frozen", "16-oz bag", 45, 45, new[] { 38, 40, 39 }, 4.99m),
        new("Frozen pizza", "Frozen", "each", 21, 12, new[] { 20, 21, 19 }, 7.99m),

        // Beverages (3 items)
        new("Sparkling water", "Beverages", "12-pack", 14, 12, new[] { 13, 14, 13, 14, 13 }, 11.98m, new decimal[] { 1, 1, 2, 1, 1, 2 }),
        new("Orange juice", "Beverages", "half-gallon", 11, 5, new[] { 10, 11, 10, 11 }, 4.29m),
        new("Kombucha", "Beverages", "4-pack", 14, 8, new[] { 15 }, 9.99m),

        // Household (4 items)
        new("Paper towels", "Household", "6-roll pack", 24, 27, new[] { 24, 25, 23, 24, 26, 24, 25, 23, 24 }, 10.99m),
        new("Toilet paper", "Household", "12-roll pack", 30, 20, new[] { 29, 31, 30, 28 }, 12.99m),
        new("Trash bags", "Household", "40-count box", 35, 15, new[] { 28, 30, 27, 29 }, 12.49m),
        new("Aluminum foil", "Household", "75-sq-ft roll", 120, 120, Array.Empty<int>(), 4.99m),

        // Cleaning (4 items)
        new("Dish soap", "Cleaning", "bottle", 30, 40, new[] { 28, 30, 29, 31 }, 4.09m),
        new("Laundry detergent", "Cleaning", "92-oz bottle", 40, 35, new[] { 38, 39, 37 }, 13.99m),
        new("All-purpose cleaner", "Cleaning", "spray bottle", 60, 60, new[] { 55, 58, 56 }, 5.49m),
        new("Dishwasher tablets", "Cleaning", "40-count", 45, 30, new[] { 44, 46 }, 15.99m),

        // Personal care (3 items)
        new("Toothpaste", "Personal care", "tube", 60, 50, new[] { 56, 58, 54 }, 5.49m),
        new("Shampoo", "Personal care", "bottle", 60, 40, new[] { 58, 60, 59, 57 }, 8.99m),
        new("Deodorant", "Personal care", "stick", 120, 90, new[] { 115, 118 }, 6.99m),

        // Pet (1 item)
        new("Dog food", "Pet", "24-lb bag", 42, 18, new[] { 40, 42, 41, 39, 40 }, 32.99m)
    };
}
