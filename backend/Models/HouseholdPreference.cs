namespace HootApi.Models;

/// <summary>
/// Domain model representing UI preferences, view layouts, and custom aisle ordering for a household.
/// </summary>
public class HouseholdPreference
{
    public Guid HouseholdId { get; set; }
    public string Density { get; set; } = "spacious";
    public string DashboardView { get; set; } = "list";
    public List<string> AisleOrder { get; set; } = new();
    public List<string> OutOfStockItemIds { get; set; } = new();
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
