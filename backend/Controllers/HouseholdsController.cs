using HootApi.Dtos;
using HootApi.Middleware;
using HootApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace HootApi.Controllers;

[ApiController]
[Route("api/households")]
public class HouseholdsController : ControllerBase
{
    private readonly DemoSeedService _seedService;

    public HouseholdsController(DemoSeedService seedService)
    {
        _seedService = seedService;
    }

    private Guid GetHouseholdId()
    {
        return (Guid)HttpContext.Items[HouseholdContextMiddleware.ContextItemKey]!;
    }

    [HttpPost("reset-demo")]
    public async Task<ActionResult<List<ItemResponse>>> ResetDemo([FromQuery] string sample = "starter")
    {
        var householdId = GetHouseholdId();
        var items = await _seedService.ResetDemoAsync(householdId, sample);
        return Ok(items);
    }
}
