namespace HootApi.Dtos;

/// <summary>
/// Incoming request payload for logging a purchase.
/// </summary>
public record LogPurchaseRequest(
    string? Id,
    DateOnly Date,
    decimal Quantity,
    decimal Price,
    bool EarlyRestock = false,
    DateOnly? EffectiveStartDate = null,
    string? FeedbackVerdict = null,
    DateOnly? FeedbackPredictedDate = null
);

/// <summary>
/// Outgoing response payload representing a logged purchase.
/// </summary>
public record PurchaseResponse(
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
    DateTimeOffset UpdatedAt
);
