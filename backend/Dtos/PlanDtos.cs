namespace HootApi.Dtos;

/// <summary>
/// Incoming request payload for creating or updating a trip plan.
/// </summary>
public record SavePlanRequest(
    string? Id,
    DateOnly TargetDate,
    List<string>? SelectedItemIds,
    bool Completed = false
);

/// <summary>
/// Outgoing response payload representing a trip plan.
/// </summary>
public record TripPlanResponse(
    string Id,
    DateOnly TargetDate,
    List<string> SelectedItemIds,
    bool Completed,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);
