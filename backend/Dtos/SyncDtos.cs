namespace HootApi.Dtos;

/// <summary>
/// DTO representing an item in the delta sync stream.
/// Includes IsDeleted flag so clients can process tombstone deletions.
/// </summary>
public record SyncItemDto(
    string Id,
    string Name,
    string Category,
    string Unit,
    int ReorderThresholdDays,
    bool IsOneTime,
    bool Completed,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    bool IsDeleted
);

/// <summary>
/// DTO representing a purchase in the delta sync stream.
/// Includes IsDeleted flag so clients can process tombstone deletions.
/// </summary>
public record SyncPurchaseDto(
    string Id,
    string ItemId,
    DateOnly Date,
    decimal Quantity,
    decimal Price,
    bool EarlyRestock,
    DateOnly? EffectiveStartDate,
    string? FeedbackVerdict,
    DateOnly? FeedbackPredictedDate,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    bool IsDeleted
);

/// <summary>
/// DTO representing a trip plan in the delta sync stream.
/// Includes IsDeleted flag so clients can process tombstone deletions.
/// </summary>
public record SyncPlanDto(
    string Id,
    DateOnly TargetDate,
    List<string> SelectedItemIds,
    bool Completed,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    bool IsDeleted
);

/// <summary>
/// Outgoing response for GET /api/sync?since={isoTimestamp}.
/// Returns all mutated entities and soft-deleted tombstones since the provided timestamp.
/// </summary>
public record SyncDeltaResponse(
    DateTimeOffset ServerTimestamp,
    List<SyncItemDto> Items,
    List<SyncPurchaseDto> Purchases,
    List<SyncPlanDto> Plans,
    HouseholdPreferenceResponse? Preferences
);

/// <summary>
/// Individual item mutation for batch synchronization.
/// Action can be "upsert" or "delete".
/// </summary>
public record ItemSyncMutation(
    string Id,
    string Action,
    string? Name = null,
    string? Category = null,
    string? Unit = null,
    int? ReorderThresholdDays = null,
    bool? IsOneTime = null,
    bool? Completed = null,
    DateTimeOffset UpdatedAt = default
);

/// <summary>
/// Individual purchase mutation for batch synchronization.
/// Action can be "upsert" or "delete".
/// </summary>
public record PurchaseSyncMutation(
    string Id,
    string ItemId,
    string Action,
    DateOnly? Date = null,
    decimal? Quantity = null,
    decimal? Price = null,
    bool? EarlyRestock = null,
    DateOnly? EffectiveStartDate = null,
    string? FeedbackVerdict = null,
    DateOnly? FeedbackPredictedDate = null,
    DateTimeOffset UpdatedAt = default
);

/// <summary>
/// Individual plan mutation for batch synchronization.
/// Action can be "upsert" or "delete".
/// </summary>
public record PlanSyncMutation(
    string Id,
    string Action,
    DateOnly? TargetDate = null,
    List<string>? SelectedItemIds = null,
    bool? Completed = null,
    DateTimeOffset UpdatedAt = default
);

/// <summary>
/// Preference mutation for batch synchronization.
/// </summary>
public record PreferenceSyncMutation(
    string? Density = null,
    string? DashboardView = null,
    List<string>? AisleOrder = null,
    List<string>? OutOfStockItemIds = null,
    DateTimeOffset UpdatedAt = default
);

/// <summary>
/// Incoming batch synchronization payload for POST /api/sync/batch.
/// Contains collections of mutations performed offline.
/// </summary>
public record BatchSyncRequest(
    List<ItemSyncMutation>? Items = null,
    List<PurchaseSyncMutation>? Purchases = null,
    List<PlanSyncMutation>? Plans = null,
    PreferenceSyncMutation? Preferences = null
);

/// <summary>
/// Recorded conflict when an offline mutation was rejected due to Last-Write-Wins (LWW).
/// </summary>
public record SyncConflict(
    string Entity,
    string Id,
    string Reason,
    DateTimeOffset ExistingUpdatedAt,
    DateTimeOffset RejectedUpdatedAt
);

/// <summary>
/// Outgoing result for POST /api/sync/batch.
/// </summary>
public record BatchSyncResult(
    bool Success,
    int AppliedCount,
    int ConflictCount,
    DateTimeOffset ServerTimestamp,
    List<SyncConflict> Conflicts
);
