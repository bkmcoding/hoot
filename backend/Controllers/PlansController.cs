using HootApi.Data;
using HootApi.Dtos;
using HootApi.Middleware;
using HootApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HootApi.Controllers;

[ApiController]
[Route("api/plans")]
public class PlansController : ControllerBase
{
    private readonly HootDbContext _db;

    public PlansController(HootDbContext db)
    {
        _db = db;
    }

    private Guid GetHouseholdId()
    {
        return (Guid)HttpContext.Items[HouseholdContextMiddleware.ContextItemKey]!;
    }

    [HttpGet]
    public async Task<ActionResult<List<TripPlanResponse>>> GetPlans()
    {
        var householdId = GetHouseholdId();
        var plans = await _db.Plans
            .Where(p => p.HouseholdId == householdId)
            .OrderBy(p => p.TargetDate)
            .Select(p => new TripPlanResponse(
                p.Id,
                p.TargetDate,
                p.SelectedItemIds,
                p.Completed,
                p.CreatedAt,
                p.UpdatedAt
            ))
            .ToListAsync();

        return Ok(plans);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TripPlanResponse>> GetPlanById(string id)
    {
        var householdId = GetHouseholdId();
        var plan = await _db.Plans.FirstOrDefaultAsync(p => p.Id == id && p.HouseholdId == householdId);
        if (plan == null)
        {
            return NotFound();
        }

        return Ok(new TripPlanResponse(
            plan.Id,
            plan.TargetDate,
            plan.SelectedItemIds,
            plan.Completed,
            plan.CreatedAt,
            plan.UpdatedAt
        ));
    }

    [HttpPost]
    public async Task<ActionResult<TripPlanResponse>> SavePlan([FromBody] SavePlanRequest request)
    {
        var householdId = GetHouseholdId();

        // Check if an existing plan is being updated
        if (!string.IsNullOrWhiteSpace(request.Id))
        {
            var existing = await _db.Plans.FirstOrDefaultAsync(p => p.Id == request.Id && p.HouseholdId == householdId);
            if (existing != null)
            {
                existing.TargetDate = request.TargetDate;
                existing.SelectedItemIds = request.SelectedItemIds ?? new List<string>();
                existing.Completed = request.Completed;
                existing.UpdatedAt = DateTimeOffset.UtcNow;

                await _db.SaveChangesAsync();

                return Ok(new TripPlanResponse(
                    existing.Id,
                    existing.TargetDate,
                    existing.SelectedItemIds,
                    existing.Completed,
                    existing.CreatedAt,
                    existing.UpdatedAt
                ));
            }
        }

        // Otherwise create new plan
        var planId = string.IsNullOrWhiteSpace(request.Id)
            ? $"plan-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString("N")[..5]}"
            : request.Id;

        var plan = new TripPlan
        {
            Id = planId,
            HouseholdId = householdId,
            TargetDate = request.TargetDate,
            SelectedItemIds = request.SelectedItemIds ?? new List<string>(),
            Completed = request.Completed,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            IsDeleted = false
        };

        _db.Plans.Add(plan);
        await _db.SaveChangesAsync();

        var response = new TripPlanResponse(
            plan.Id,
            plan.TargetDate,
            plan.SelectedItemIds,
            plan.Completed,
            plan.CreatedAt,
            plan.UpdatedAt
        );

        return CreatedAtAction(nameof(GetPlanById), new { id = plan.Id }, response);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePlan(string id)
    {
        var householdId = GetHouseholdId();
        var plan = await _db.Plans.FirstOrDefaultAsync(p => p.Id == id && p.HouseholdId == householdId);
        if (plan == null)
        {
            return NotFound();
        }

        plan.IsDeleted = true;
        plan.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();

        return NoContent();
    }
}
