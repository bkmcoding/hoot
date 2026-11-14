using HootApi.Data;
using HootApi.Dtos;
using HootApi.Middleware;
using HootApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HootApi.Controllers;

[ApiController]
[Route("api/preferences")]
public class PreferencesController : ControllerBase
{
    private readonly HootDbContext _db;

    public PreferencesController(HootDbContext db)
    {
        _db = db;
    }

    private Guid GetHouseholdId()
    {
        return (Guid)HttpContext.Items[HouseholdContextMiddleware.ContextItemKey]!;
    }

    [HttpGet]
    public async Task<ActionResult<HouseholdPreferenceResponse>> GetPreferences()
    {
        var householdId = GetHouseholdId();
        var pref = await _db.Preferences.FirstOrDefaultAsync(p => p.HouseholdId == householdId);

        if (pref == null)
        {
            // Return sensible defaults if no preferences have been saved yet
            return Ok(new HouseholdPreferenceResponse(
                Density: "spacious",
                DashboardView: "list",
                AisleOrder: new List<string>(),
                OutOfStockItemIds: new List<string>(),
                UpdatedAt: DateTimeOffset.UtcNow
            ));
        }

        return Ok(new HouseholdPreferenceResponse(
            pref.Density,
            pref.DashboardView,
            pref.AisleOrder,
            pref.OutOfStockItemIds,
            pref.UpdatedAt
        ));
    }

    [HttpPut]
    public async Task<ActionResult<HouseholdPreferenceResponse>> SavePreferences([FromBody] SavePreferenceRequest request)
    {
        var householdId = GetHouseholdId();
        var pref = await _db.Preferences.FirstOrDefaultAsync(p => p.HouseholdId == householdId);

        if (pref == null)
        {
            pref = new HouseholdPreference
            {
                HouseholdId = householdId,
                Density = request.Density ?? "spacious",
                DashboardView = request.DashboardView ?? "list",
                AisleOrder = request.AisleOrder ?? new List<string>(),
                OutOfStockItemIds = request.OutOfStockItemIds ?? new List<string>(),
                UpdatedAt = DateTimeOffset.UtcNow
            };
            _db.Preferences.Add(pref);
        }
        else
        {
            if (request.Density != null) pref.Density = request.Density;
            if (request.DashboardView != null) pref.DashboardView = request.DashboardView;
            if (request.AisleOrder != null) pref.AisleOrder = request.AisleOrder;
            if (request.OutOfStockItemIds != null) pref.OutOfStockItemIds = request.OutOfStockItemIds;
            pref.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync();

        return Ok(new HouseholdPreferenceResponse(
            pref.Density,
            pref.DashboardView,
            pref.AisleOrder,
            pref.OutOfStockItemIds,
            pref.UpdatedAt
        ));
    }
}
