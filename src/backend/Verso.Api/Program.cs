using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Verso.Api;

var builder = WebApplication.CreateBuilder(args);

var backendPort = Environment.GetEnvironmentVariable("VERSO_BACKEND_PORT");
if (!string.IsNullOrWhiteSpace(backendPort) && string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
  builder.WebHost.UseUrls($"http://localhost:{backendPort}");
}

var sqliteConnectionString = builder.Configuration.GetConnectionString("Verso")
    ?? builder.Configuration["VERSO_SQLITE_CONNECTION_STRING"]
    ?? builder.WebHost.GetSetting("VERSO_SQLITE_CONNECTION_STRING")
    ?? "Data Source=verso.db";

var dataDirectory = builder.Configuration["VERSO_DATA_DIRECTORY"]
    ?? builder.WebHost.GetSetting("VERSO_DATA_DIRECTORY")
    ?? Path.Combine(AppContext.BaseDirectory, "App_Data");

builder.Services.AddDbContextFactory<VersoDbContext>(options => options.UseSqlite(sqliteConnectionString));
builder.Services.AddSingleton(new VersoStorageOptions(dataDirectory));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddHttpClient<IAudibleAssetDownloader, AudibleAssetDownloader>();
builder.Services.AddSingleton<IAudibleLoginClient, AudibleApiLoginClient>();
builder.Services.AddSingleton<AudibleAuthenticationService>();
builder.Services.AddSingleton<AudibleCoverAssetCacheService>();
builder.Services.AddScoped<AudibleLibraryImportService>();
builder.Services.AddScoped<IAudibleLibrarySource, AudibleApiLibrarySource>();

var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
  var databaseFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<VersoDbContext>>();
  await using var database = await databaseFactory.CreateDbContextAsync(app.Lifetime.ApplicationStopping);
  await database.Database.MigrateAsync(app.Lifetime.ApplicationStopping);
}

app.MapGet("/", () => Results.Redirect("/health"));
app.MapGet("/health", () => Results.Ok(new HealthResponse("ok", "Verso.Api")));
app.MapPost("/api/audible-authentication/sessions", async (StartAudibleAuthenticationRequest request, AudibleAuthenticationService service, CancellationToken cancellationToken) =>
{
  try
  {
    var result = await service.StartAsync(request, cancellationToken);
    return Results.Ok(result);
  }
  catch (InvalidOperationException exception)
  {
    app.Logger.LogError(exception, "Failed to start Audible authentication session.");
    return Results.Json(
        new OperationErrorResponse("audible-authentication-start-failed", "Audible authentication could not be started. Try again."),
        statusCode: StatusCodes.Status500InternalServerError);
  }
});
app.MapPost("/api/audible-authentication/sessions/{sessionId:guid}/complete", async (Guid sessionId, CompleteAudibleAuthenticationRequest request, AudibleAuthenticationService service, CancellationToken cancellationToken) =>
{
  try
  {
    var result = await service.CompleteAsync(sessionId, request, cancellationToken);
    return result is null
        ? Results.NotFound()
        : Results.Ok(result);
  }
  catch (InvalidOperationException exception)
  {
    app.Logger.LogError(exception, "Failed to complete Audible authentication session {SessionId}.", sessionId);
    return Results.Json(
        new OperationErrorResponse("audible-authentication-complete-failed", "Audible authentication could not be completed. Start a new authentication session and try again."),
        statusCode: StatusCodes.Status500InternalServerError);
  }
});
app.MapGet("/api/audible-authentication/session", async (AudibleAuthenticationService service, CancellationToken cancellationToken) =>
{
  var result = await service.GetCurrentAsync(cancellationToken);
  return Results.Ok(result);
});
app.MapDelete("/api/audible-authentication/session", async (AudibleAuthenticationService service, CancellationToken cancellationToken) =>
{
  await service.ClearCurrentAsync(cancellationToken);
  return Results.NoContent();
});
app.MapPost("/api/audible-library/imports", async (AudibleLibraryImportService service, CancellationToken cancellationToken) =>
{
  try
  {
    var result = await service.ImportAsync(cancellationToken);
    return Results.Ok(result);
  }
  catch (InvalidOperationException exception)
  {
    app.Logger.LogError(exception, "Failed to import Audible Library.");
    return Results.Json(
        new OperationErrorResponse("audible-library-import-failed", "Audible Library import failed. Re-authenticate and try again."),
        statusCode: StatusCodes.Status500InternalServerError);
  }
});
app.MapGet("/api/library/items", async (AudibleLibraryImportService service, CancellationToken cancellationToken) =>
{
  var result = await service.GetLibraryAsync(cancellationToken);
  return Results.Ok(result);
});
app.MapGet("/api/library/items/{asin}/cover-images/{variant}", async Task<Results<FileContentHttpResult, ProblemHttpResult>> (string asin, string variant, AudibleLibraryImportService service, CancellationToken cancellationToken) =>
{
  var result = await service.GetCachedCoverImageAsync(asin, variant, cancellationToken);
  return result is null
      ? TypedResults.Problem(
          statusCode: StatusCodes.Status404NotFound,
          title: "Cached cover image not found.")
      : TypedResults.File(result.Content, result.ContentType);
});

app.Run();

internal sealed record HealthResponse(string Status, string Service);

public partial class Program;
