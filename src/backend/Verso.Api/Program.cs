var builder = WebApplication.CreateBuilder(args);

var backendPort = Environment.GetEnvironmentVariable("VERSO_BACKEND_PORT");
if (!string.IsNullOrWhiteSpace(backendPort) && string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
	builder.WebHost.UseUrls($"http://localhost:{backendPort}");
}

var app = builder.Build();

app.MapGet("/", () => Results.Redirect("/health"));
app.MapGet("/health", () => Results.Ok(new HealthResponse("ok", "Verso.Api")));

app.Run();

internal sealed record HealthResponse(string Status, string Service);

public partial class Program;
