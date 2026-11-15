using HootApi.Data;
using HootApi.Dtos;
using HootApi.Middleware;
using HootApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace HootApi.Controllers;

[ApiController]
[Route("api/sync")]
public class SyncController : ControllerBase
{
    private readonly HootDbContext _db;

    public SyncController(HootDbContext db)
    {
        _db = db;
    }

    private Guid GetHouseholdId()
    {
        return (Guid)HttpContext.Items[HouseholdContextMiddleware.ContextItemKey]!;
    }

    /// <summary>
    /// Delta synchronization endpoint.
    /// Returns entities and soft-deleted tombstones modified since the specified timestamp.
    /// If no timestamp is provided, returns all active entities for initial hydration.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<SyncDeltaResponse>> GetDelta([FromQuery] DateTimeOffset? since = null)
    {
        var householdId = GetHouseholdId();
        var serverTimestamp = DateTimeOffset.UtcNow;

        // Query items: Ignore query filters to include tombstones when since is set
        var itemsQuery = _db.Items.IgnoreQueryFilters().Where(i => i.HouseholdId == householdId);
        if (since.HasValue)
        {
            itemsQuery = itemsQuery.Where(i => i.UpdatedAt > since.Value);
        }
        else
        {
            itemsQuery = itemsQuery.Where(i => !i.IsDeleted);
        }

        var items = await itemsQuery
            .Select(i => new SyncItemDto(
                i.Id,
                i.Name,
                i.Category,
                i.Unit,
                i.ReorderThresholdDays,
                i.IsOneTime,
                i.Completed,
                i.CreatedAt,
                i.UpdatedAt,
                i.IsDeleted
            ))
            .ToListAsync();

        // Query purchases
        var purchasesQuery = _db.Purchases.IgnoreQueryFilters().Where(p => p.HouseholdId == householdId);
        if (since.HasValue)
        {
            purchasesQuery = purchasesQuery.Where(p => p.UpdatedAt > since.Value);
        }
        else
        {
            purchasesQuery = purchasesQuery.Where(p => !p.IsDeleted);
        }

        var purchases = await purchasesQuery
            .Select(p => new SyncPurchaseDto(
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
                p.UpdatedAt,
                p.IsDeleted
            ))
            .ToListAsync();

        // Query plans
        var plansQuery = _db.Plans.IgnoreQueryFilters().Where(p => p.HouseholdId == householdId);
        if (since.HasValue)
        {
            plansQuery = plansQuery.Where(p => p.UpdatedAt > since.Value);
        }
        else
        {
            plansQuery = plansQuery.Where(p => !p.IsDeleted);
        }

        var plans = await plansQuery
            .Select(p => new SyncPlanDto(
                p.Id,
                p.TargetDate,
                p.SelectedItemIds,
                p.Completed,
                p.CreatedAt,
                p.UpdatedAt,
                p.IsDeleted
            ))
            .ToListAsync();

        // Query preferences
        var pref = await _db.Preferences.FirstOrDefaultAsync(p => p.HouseholdId == householdId);
        HouseholdPreferenceResponse? prefDto = null;
        if (pref != null && (!since.HasValue || pref.UpdatedAt > since.Value))
        {
            prefDto = new HouseholdPreferenceResponse(
                pref.Density,
                pref.DashboardView,
                pref.AisleOrder,
                pref.OutOfStockItemIds,
                pref.UpdatedAt
            );
        }

        return Ok(new SyncDeltaResponse(
            serverTimestamp,
            items,
            purchases,
            plans,
            prefDto
        ));
    }

    /// <summary>
    /// Atomic batch synchronization endpoint for offline mutations.
    /// Resolves conflicts using Last-Write-Wins (LWW) based on entity UpdatedAt timestamps.
    /// </summary>
    [HttpPost("batch")]
    public async Task<ActionResult<BatchSyncResult>> BatchSync([FromBody] BatchSyncRequest request)
    {
        var householdId = GetHouseholdId();
        var serverTimestamp = DateTimeOffset.UtcNow;
        var conflicts = new List<SyncConflict>();
        var appliedCount = 0;

        IDbContextTransaction? transaction = null;
        if (_db.Database.IsRelational())
        {
            transaction = await _db.Database.BeginTransactionAsync();
        }

        try
        {
            // 1. Process Item Mutations
            if (request.Items != null)
            {
                foreach (var mutation in request.Items)
                {
                    var existing = _db.Items.Local.FirstOrDefault(i => i.HouseholdId == householdId && i.Id == mutation.Id)
                        ?? await _db.Items.IgnoreQueryFilters().FirstOrDefaultAsync(i => i.HouseholdId == householdId && i.Id == mutation.Id);

                    var mutationTime = mutation.UpdatedAt == default ? serverTimestamp : mutation.UpdatedAt;

                    if (mutation.Action.Equals("delete", StringComparison.OrdinalIgnoreCase))
                    {
                        if (existing != null)
                        {
                            if (mutationTime < existing.UpdatedAt)
                            {
                                conflicts.Add(new SyncConflict("Item", mutation.Id, "Stale delete: server version is newer.", existing.UpdatedAt, mutationTime));
                            }
                            else
                            {
                                existing.IsDeleted = true;
                                existing.UpdatedAt = mutationTime;
                                appliedCount++;
                            }
                        }
                    }
                    else
                    {
                        // Upsert
                        if (existing != null)
                        {
                            if (mutationTime < existing.UpdatedAt)
                            {
                                conflicts.Add(new SyncConflict("Item", mutation.Id, "Stale update: server version is newer.", existing.UpdatedAt, mutationTime));
                            }
                            else
                            {
                                if (mutation.Name != null) existing.Name = mutation.Name.Trim();
                                if (mutation.Category != null) existing.Category = mutation.Category.Trim();
                                if (mutation.Unit != null) existing.Unit = mutation.Unit.Trim();
                                if (mutation.ReorderThresholdDays.HasValue) existing.ReorderThresholdDays = mutation.ReorderThresholdDays.Value;
                                if (mutation.IsOneTime.HasValue) existing.IsOneTime = mutation.IsOneTime.Value;
                                if (mutation.Completed.HasValue) existing.Completed = mutation.Completed.Value;
                                existing.IsDeleted = false;
                                existing.UpdatedAt = mutationTime;
                                appliedCount++;
                            }
                        }
                        else
                        {
                            var newItem = new Item
                            {
                                Id = mutation.Id,
                                HouseholdId = householdId,
                                Name = mutation.Name?.Trim() ?? string.Empty,
                                Category = mutation.Category?.Trim() ?? "Other",
                                Unit = mutation.Unit?.Trim() ?? string.Empty,
                                ReorderThresholdDays = mutation.ReorderThresholdDays ?? 0,
                                IsOneTime = mutation.IsOneTime ?? false,
                                Completed = mutation.Completed ?? false,
                                CreatedAt = mutationTime,
                                UpdatedAt = mutationTime,
                                IsDeleted = false
                            };
                            _db.Items.Add(newItem);
                            appliedCount++;
                        }
                    }
                }
            }

            // 2. Process Purchase Mutations
            if (request.Purchases != null)
            {
                foreach (var mutation in request.Purchases)
                {
                    var existing = _db.Purchases.Local.FirstOrDefault(p => p.HouseholdId == householdId && p.Id == mutation.Id)
                        ?? await _db.Purchases.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.HouseholdId == householdId && p.Id == mutation.Id);

                    var mutationTime = mutation.UpdatedAt == default ? serverTimestamp : mutation.UpdatedAt;

                    if (mutation.Action.Equals("delete", StringComparison.OrdinalIgnoreCase))
                    {
                        if (existing != null)
                        {
                            if (mutationTime < existing.UpdatedAt)
                            {
                                conflicts.Add(new SyncConflict("Purchase", mutation.Id, "Stale delete: server version is newer.", existing.UpdatedAt, mutationTime));
                            }
                            else
                            {
                                existing.IsDeleted = true;
                                existing.UpdatedAt = mutationTime;
                                appliedCount++;
                            }
                        }
                    }
                    else
                    {
                        // Upsert
                        if (existing != null)
                        {
                            if (mutationTime < existing.UpdatedAt)
                            {
                                conflicts.Add(new SyncConflict("Purchase", mutation.Id, "Stale update: server version is newer.", existing.UpdatedAt, mutationTime));
                            }
                            else
                            {
                                if (mutation.Date.HasValue) existing.Date = mutation.Date.Value;
                                if (mutation.Quantity.HasValue) existing.Quantity = mutation.Quantity.Value;
                                if (mutation.Price.HasValue) existing.Price = mutation.Price.Value;
                                if (mutation.EarlyRestock.HasValue) existing.EarlyRestock = mutation.EarlyRestock.Value;
                                if (mutation.EffectiveStartDate.HasValue) existing.EffectiveStartDate = mutation.EffectiveStartDate.Value;
                                if (mutation.FeedbackVerdict != null) existing.FeedbackVerdict = mutation.FeedbackVerdict;
                                if (mutation.FeedbackPredictedDate.HasValue) existing.FeedbackPredictedDate = mutation.FeedbackPredictedDate.Value;
                                existing.IsDeleted = false;
                                existing.UpdatedAt = mutationTime;
                                appliedCount++;
                            }
                        }
                        else
                        {
                            var newPurch = new Purchase
                            {
                                Id = mutation.Id,
                                ItemId = mutation.ItemId,
                                HouseholdId = householdId,
                                Date = mutation.Date ?? DateOnly.FromDateTime(serverTimestamp.DateTime),
                                Quantity = mutation.Quantity ?? 1,
                                Price = mutation.Price ?? 0,
                                EarlyRestock = mutation.EarlyRestock ?? false,
                                EffectiveStartDate = mutation.EffectiveStartDate,
                                FeedbackVerdict = mutation.FeedbackVerdict,
                                FeedbackPredictedDate = mutation.FeedbackPredictedDate,
                                CreatedAt = mutationTime,
                                UpdatedAt = mutationTime,
                                IsDeleted = false
                            };
                            _db.Purchases.Add(newPurch);
                            appliedCount++;
                        }
                    }
                }
            }

            // 3. Process Plan Mutations
            if (request.Plans != null)
            {
                foreach (var mutation in request.Plans)
                {
                    var existing = _db.Plans.Local.FirstOrDefault(p => p.HouseholdId == householdId && p.Id == mutation.Id)
                        ?? await _db.Plans.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.HouseholdId == householdId && p.Id == mutation.Id);

                    var mutationTime = mutation.UpdatedAt == default ? serverTimestamp : mutation.UpdatedAt;

                    if (mutation.Action.Equals("delete", StringComparison.OrdinalIgnoreCase))
                    {
                        if (existing != null)
                        {
                            if (mutationTime < existing.UpdatedAt)
                            {
                                conflicts.Add(new SyncConflict("TripPlan", mutation.Id, "Stale delete: server version is newer.", existing.UpdatedAt, mutationTime));
                            }
                            else
                            {
                                existing.IsDeleted = true;
                                existing.UpdatedAt = mutationTime;
                                appliedCount++;
                            }
                        }
                    }
                    else
                    {
                        // Upsert
                        if (existing != null)
                        {
                            if (mutationTime < existing.UpdatedAt)
                            {
                                conflicts.Add(new SyncConflict("TripPlan", mutation.Id, "Stale update: server version is newer.", existing.UpdatedAt, mutationTime));
                            }
                            else
                            {
                                if (mutation.TargetDate.HasValue) existing.TargetDate = mutation.TargetDate.Value;
                                if (mutation.SelectedItemIds != null) existing.SelectedItemIds = mutation.SelectedItemIds;
                                if (mutation.Completed.HasValue) existing.Completed = mutation.Completed.Value;
                                existing.IsDeleted = false;
                                existing.UpdatedAt = mutationTime;
                                appliedCount++;
                            }
                        }
                        else
                        {
                            var newPlan = new TripPlan
                            {
                                Id = mutation.Id,
                                HouseholdId = householdId,
                                TargetDate = mutation.TargetDate ?? DateOnly.FromDateTime(serverTimestamp.DateTime),
                                SelectedItemIds = mutation.SelectedItemIds ?? new List<string>(),
                                Completed = mutation.Completed ?? false,
                                CreatedAt = mutationTime,
                                UpdatedAt = mutationTime,
                                IsDeleted = false
                            };
                            _db.Plans.Add(newPlan);
                            appliedCount++;
                        }
                    }
                }
            }

            // 4. Process Preference Mutations
            if (request.Preferences != null)
            {
                var mutation = request.Preferences;
                var existing = _db.Preferences.Local.FirstOrDefault(p => p.HouseholdId == householdId)
                    ?? await _db.Preferences.FirstOrDefaultAsync(p => p.HouseholdId == householdId);

                var mutationTime = mutation.UpdatedAt == default ? serverTimestamp : mutation.UpdatedAt;

                if (existing != null)
                {
                    if (mutationTime < existing.UpdatedAt)
                    {
                        conflicts.Add(new SyncConflict("HouseholdPreference", householdId.ToString(), "Stale update: server version is newer.", existing.UpdatedAt, mutationTime));
                    }
                    else
                    {
                        if (mutation.Density != null) existing.Density = mutation.Density;
                        if (mutation.DashboardView != null) existing.DashboardView = mutation.DashboardView;
                        if (mutation.AisleOrder != null) existing.AisleOrder = mutation.AisleOrder;
                        if (mutation.OutOfStockItemIds != null) existing.OutOfStockItemIds = mutation.OutOfStockItemIds;
                        existing.UpdatedAt = mutationTime;
                        appliedCount++;
                    }
                }
                else
                {
                    var newPref = new HouseholdPreference
                    {
                        HouseholdId = householdId,
                        Density = mutation.Density ?? "spacious",
                        DashboardView = mutation.DashboardView ?? "list",
                        AisleOrder = mutation.AisleOrder ?? new List<string>(),
                        OutOfStockItemIds = mutation.OutOfStockItemIds ?? new List<string>(),
                        UpdatedAt = mutationTime
                    };
                    _db.Preferences.Add(newPref);
                    appliedCount++;
                }
            }

            await _db.SaveChangesAsync();

            if (transaction != null)
            {
                await transaction.CommitAsync();
            }

            return Ok(new BatchSyncResult(
                Success: conflicts.Count == 0,
                AppliedCount: appliedCount,
                ConflictCount: conflicts.Count,
                ServerTimestamp: serverTimestamp,
                Conflicts: conflicts
            ));
        }
        catch (Exception)
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync();
            }
            throw;
        }
    }
}
