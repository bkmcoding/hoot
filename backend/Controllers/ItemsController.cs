using HootApi.Data;
using HootApi.Dtos;
using HootApi.Middleware;
using HootApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HootApi.Controllers;

[ApiController]
[Route("api/items")]
public class ItemsController : ControllerBase
{
    private readonly HootDbContext _db;

    public ItemsController(HootDbContext db)
    {
        _db = db;
    }

    private Guid GetHouseholdId()
    {
        return (Guid)HttpContext.Items[HouseholdContextMiddleware.ContextItemKey]!;
    }

    [HttpGet]
    public async Task<ActionResult<List<ItemResponse>>> GetItems()
    {
        var householdId = GetHouseholdId();
        var items = await _db.Items
            .Where(i => i.HouseholdId == householdId)
            .OrderBy(i => i.Name)
            .Select(item => new ItemResponse(
                item.Id,
                item.Name,
                item.Category,
                item.Unit,
                item.ReorderThresholdDays,
                item.IsOneTime,
                item.Completed,
                item.CreatedAt,
                item.UpdatedAt
            ))
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ItemResponse>> GetItemById(string id)
    {
        var householdId = GetHouseholdId();
        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == id && i.HouseholdId == householdId);
        if (item == null)
        {
            return NotFound();
        }

        return Ok(new ItemResponse(
            item.Id,
            item.Name,
            item.Category,
            item.Unit,
            item.ReorderThresholdDays,
            item.IsOneTime,
            item.Completed,
            item.CreatedAt,
            item.UpdatedAt
        ));
    }

    [HttpPost]
    public async Task<ActionResult<ItemResponse>> CreateItem([FromBody] CreateItemRequest request)
    {
        var householdId = GetHouseholdId();
        var trimmedName = request.Name.Trim();
        var normalizedName = trimmedName.ToLower();

        // Check for case-insensitive duplicates within the same household
        var isDuplicate = await _db.Items.AnyAsync(i =>
            i.HouseholdId == householdId &&
            i.Name.ToLower() == normalizedName);

        if (isDuplicate)
        {
            return Conflict(new
            {
                error = "Duplicate item name.",
                detail = $"An item named '{trimmedName}' already exists in this household."
            });
        }

        // Assign client ID if provided, or generate deterministic slugged ID
        var itemId = string.IsNullOrWhiteSpace(request.Id)
            ? $"item-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString("N")[..5]}"
            : request.Id;

        var item = new Item
        {
            Id = itemId,
            HouseholdId = householdId,
            Name = trimmedName,
            Category = request.Category.Trim(),
            Unit = request.Unit?.Trim() ?? string.Empty,
            ReorderThresholdDays = request.IsOneTime ? 0 : request.ReorderThresholdDays,
            IsOneTime = request.IsOneTime,
            Completed = false,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            IsDeleted = false
        };

        _db.Items.Add(item);
        await _db.SaveChangesAsync();

        var response = new ItemResponse(
            item.Id,
            item.Name,
            item.Category,
            item.Unit,
            item.ReorderThresholdDays,
            item.IsOneTime,
            item.Completed,
            item.CreatedAt,
            item.UpdatedAt
        );

        return CreatedAtAction(nameof(GetItemById), new { id = item.Id }, response);
    }
}
