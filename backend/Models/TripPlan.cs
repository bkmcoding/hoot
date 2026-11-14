namespace HootApi.Models;

/// <summary>
/// Domain model representing a scheduled shopping trip plan.
/// </summary>
public class TripPlan
{
    public string Id { get; set; } = string.Empty;
    public Guid HouseholdId { get; set; }
    public DateOnly TargetDate { get; set; }
    public List<string> SelectedItemIds { get; set; } = new();
    public bool Completed { get; set; } = false;

    // Sync & Audit
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public bool IsDeleted { get; set; } = false;
}
