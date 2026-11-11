namespace HootApi.Middleware;

/// <summary>
/// Intercepts incoming HTTP requests to validate and extract the X-Household-Id header.
/// Enforces multi-household isolation before requests reach controllers.
/// </summary>
public class HouseholdContextMiddleware
{
    private readonly RequestDelegate _next;

    public const string HeaderName = "X-Household-Id";
    public const string ContextItemKey = "HouseholdId";

    public HouseholdContextMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        // Exempt system and documentation routes
        if (path.StartsWith("/api/health", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/openapi", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        // Enforce X-Household-Id for all /api endpoints
        if (path.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
        {
            if (!context.Request.Headers.TryGetValue(HeaderName, out var headerValue) ||
                string.IsNullOrWhiteSpace(headerValue))
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "Missing or empty X-Household-Id header.",
                    detail = "All household API requests must supply a valid X-Household-Id UUID header."
                });
                return;
            }

            if (!Guid.TryParse(headerValue, out var householdId) || householdId == Guid.Empty)
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new
                {
                    error = "Invalid X-Household-Id format.",
                    detail = "The provided X-Household-Id must be a non-empty RFC 4122 UUID."
                });
                return;
            }

            // Stash the validated Guid in HttpContext.Items for controllers to read
            context.Items[ContextItemKey] = householdId;
        }

        await _next(context);
    }
}
