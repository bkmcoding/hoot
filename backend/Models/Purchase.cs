namespace HootApi.Models;

/// <summary>
/// Domain model representing a purchase transaction for a tracked staple in Hoot.
/// </summary>
public class Purchase
{
    public string Id { get; set; } = string.Empty;
    public string ItemId { get; set; } = string.Empty;
    public Guid HouseholdId { get; set; }
    public DateOnly Date { get; set; }
    public decimal Quantity { get; set; } = 1;
    public decimal Price { get; set; } = 0;

    // Early restock adjustment ("Still had some")
    public bool EarlyRestock { get; set; } = false;
    public DateOnly? EffectiveStartDate { get; set; }

    // Restock checks feedback ("Was Hoot right?")
    public string? FeedbackVerdict { get; set; }
    public DateOnly? FeedbackPredictedDate { get; set; }

    // Sync & Audit tracking
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public bool IsDeleted { get; set; } = false;

    // Navigation property back to the parent item
    public Item? Item { get; set; }
}
