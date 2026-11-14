namespace HootApi.Dtos;

/// <summary>
/// Incoming request payload for creating an item.
/// </summary>
public record CreateItemRequest(
    string? Id,
    string Name,
    string Category,
    string? Unit,
    int ReorderThresholdDays,
    bool IsOneTime = false
);

/// <summary>
/// Outgoing response payload representing an item.
/// </summary>
public record ItemResponse(
    string Id,
    string Name,
    string Category,
    string Unit,
    int ReorderThresholdDays,
    bool IsOneTime,
    bool Completed,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);
