using HootApi.Data;
using HootApi.Dtos;
using HootApi.Middleware;
using HootApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HootApi.Controllers;

[ApiController]
[Route("api/items/{itemId}/purchases")]
public class PurchasesController : ControllerBase
{
    private readonly HootDbContext _db;

    public PurchasesController(HootDbContext db)
    {
        _db = db;
    }

    private Guid GetHouseholdId()
    {
        return (Guid)HttpContext.Items[HouseholdContextMiddleware.ContextItemKey]!;
    }

    [HttpGet]
    public async Task<ActionResult<List<PurchaseResponse>>> GetPurchases(string itemId)
    {
        var householdId = GetHouseholdId();

        var itemExists = await _db.Items.AnyAsync(i => i.Id == itemId && i.HouseholdId == householdId);
        if (!itemExists)
        {
            return NotFound();
        }

        var purchases = await _db.Purchases
            .Where(p => p.ItemId == itemId && p.HouseholdId == householdId)
            .OrderBy(p => p.Date)
            .Select(p => new PurchaseResponse(
                p.Id,
                p.ItemId,
                p.Date,
                p.Quantity,
                p.Price,
                p.EarlyRestock,
                p.EffectiveStartDate,
                p.FeedbackVerdict,
                p.FeedbackPredictedDate,
                p.CreatedAt,
                p.UpdatedAt
            ))
            .ToListAsync();

        return Ok(purchases);
    }

    [HttpGet("{purchaseId}")]
    public async Task<ActionResult<PurchaseResponse>> GetPurchaseById(string itemId, string purchaseId)
    {
        var householdId = GetHouseholdId();

        var purchase = await _db.Purchases
            .FirstOrDefaultAsync(p => p.Id == purchaseId && p.ItemId == itemId && p.HouseholdId == householdId);

        if (purchase == null)
        {
            return NotFound();
        }

        return Ok(new PurchaseResponse(
            purchase.Id,
            purchase.ItemId,
            purchase.Date,
            purchase.Quantity,
            purchase.Price,
            purchase.EarlyRestock,
            purchase.EffectiveStartDate,
            purchase.FeedbackVerdict,
            purchase.FeedbackPredictedDate,
            purchase.CreatedAt,
            purchase.UpdatedAt
        ));
    }

    [HttpPost]
    public async Task<ActionResult<PurchaseResponse>> LogPurchase(string itemId, [FromBody] LogPurchaseRequest request)
    {
        var householdId = GetHouseholdId();

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.HouseholdId == householdId);
        if (item == null)
        {
            return NotFound();
        }

        var purchaseId = string.IsNullOrWhiteSpace(request.Id)
            ? $"purchase-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString("N")[..5]}"
            : request.Id;

        var purchase = new Purchase
        {
            Id = purchaseId,
            ItemId = itemId,
            HouseholdId = householdId,
            Date = request.Date,
            Quantity = request.Quantity,
            Price = request.Price,
            EarlyRestock = request.EarlyRestock,
            EffectiveStartDate = request.EffectiveStartDate,
            FeedbackVerdict = request.FeedbackVerdict,
            FeedbackPredictedDate = request.FeedbackPredictedDate,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            IsDeleted = false
        };

        // Update item's UpdatedAt timestamp for sync tracking
        item.UpdatedAt = DateTimeOffset.UtcNow;

        _db.Purchases.Add(purchase);
        await _db.SaveChangesAsync();

        var response = new PurchaseResponse(
            purchase.Id,
            purchase.ItemId,
            purchase.Date,
            purchase.Quantity,
            purchase.Price,
            purchase.EarlyRestock,
            purchase.EffectiveStartDate,
            purchase.FeedbackVerdict,
            purchase.FeedbackPredictedDate,
            purchase.CreatedAt,
            purchase.UpdatedAt
        );

        return CreatedAtAction(nameof(GetPurchaseById), new { itemId, purchaseId = purchase.Id }, response);
    }
}
