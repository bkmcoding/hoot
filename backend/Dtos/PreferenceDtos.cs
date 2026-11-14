namespace HootApi.Dtos;

/// <summary>
/// Incoming request payload for updating household UI and layout preferences.
/// </summary>
public record SavePreferenceRequest(
    string? Density,
    string? DashboardView,
    List<string>? AisleOrder,
    List<string>? OutOfStockItemIds
);

/// <summary>
/// Outgoing response payload representing household preferences.
/// </summary>
public record HouseholdPreferenceResponse(
    string Density,
    string DashboardView,
    List<string> AisleOrder,
    List<string> OutOfStockItemIds,
    DateTimeOffset UpdatedAt
);
