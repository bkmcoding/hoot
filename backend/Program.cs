using HootApi.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

// Enforce X-Household-Id header on all API endpoints
app.UseMiddleware<HouseholdContextMiddleware>();

// Minimal API endpoint for health checking (exempt from middleware)
app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

// Test endpoint to inspect current household context
app.MapGet("/api/test-context", (HttpContext ctx) =>
    Results.Ok(new { householdId = ctx.Items["HouseholdId"]?.ToString() }));

app.MapControllers();

app.Run();

public partial class Program { }
