namespace HootApi.Models;

/// <summary>
/// Domain model representing a tracked staple or one-time consumable in Hoot.
/// </summary>
public class Item
{
    public string Id { get; set; } = string.Empty;
    public Guid HouseholdId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;
    public int ReorderThresholdDays { get; set; }
    public bool IsOneTime { get; set; }
    public bool Completed { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public bool IsDeleted { get; set; } = false;

    // Navigation property: One item has many historical purchases
    public List<Purchase> Purchases { get; set; } = new();
}
