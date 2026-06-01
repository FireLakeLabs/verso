
using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;

namespace Verso.Api;

public sealed class AudibleAuthenticationService(
    IDbContextFactory<VersoDbContext> databaseFactory,
    IAudibleLoginClient loginClient,
    VersoStorageOptions storageOptions,
    TimeProvider timeProvider)
{
  public const int CurrentSessionId = 1;

  private static readonly TimeSpan PendingAuthenticationTimeout = TimeSpan.FromMinutes(10);

  private readonly ConcurrentDictionary<Guid, PendingAudibleAuthentication> pendingSessions = new();
  private readonly TimeProvider clock = timeProvider;

  public async Task<StartAudibleAuthenticationResponse> StartAsync(StartAudibleAuthenticationRequest request, CancellationToken cancellationToken)
  {
    var locale = string.IsNullOrWhiteSpace(request.Locale) ? "us" : request.Locale.Trim().ToLowerInvariant();
    var identityDirectory = Path.Combine(storageOptions.DataDirectory, "audible");
    var activeIdentityFilePath = Path.Combine(identityDirectory, "identity.json");
    var pendingIdentityFilePath = Path.Combine(
        identityDirectory,
        $"identity.pending-{Guid.NewGuid():N}.json");

    var pendingAuthentication = new PendingAudibleAuthentication(
        locale,
        pendingIdentityFilePath,
        activeIdentityFilePath,
        clock);
    if (!pendingSessions.TryAdd(pendingAuthentication.SessionId, pendingAuthentication))
    {
      throw new InvalidOperationException("Could not create a pending Audible authentication session.");
    }

    pendingAuthentication.Runner = Task.Run(() => RunAuthenticationAsync(pendingAuthentication), CancellationToken.None);

    var prompt = await pendingAuthentication.WaitForPromptOrFailureAsync(cancellationToken);

    return new StartAudibleAuthenticationResponse(
        pendingAuthentication.SessionId,
        pendingAuthentication.Status,
        pendingAuthentication.Locale,
        prompt.LoginUrl,
        prompt.SignInCookies);
  }

  public async Task<AudibleAuthenticationStatusResponse?> CompleteAsync(Guid sessionId, CompleteAudibleAuthenticationRequest request, CancellationToken cancellationToken)
  {
    if (!pendingSessions.TryGetValue(sessionId, out var pendingAuthentication))
    {
      return null;
    }

    pendingAuthentication.SetResponseUrl(request.ResponseUrl);
    await pendingAuthentication.Runner.WaitAsync(cancellationToken);
    pendingSessions.TryRemove(sessionId, out _);

    return pendingAuthentication.ToStatusResponse();
  }

  public async Task<AudibleAuthenticationStatusResponse?> CancelAsync(Guid sessionId, CancellationToken cancellationToken)
  {
    if (!pendingSessions.TryGetValue(sessionId, out var pendingAuthentication))
    {
      return null;
    }

    pendingAuthentication.Cancel();
    await pendingAuthentication.Runner.WaitAsync(cancellationToken);
    pendingSessions.TryRemove(sessionId, out _);

    return pendingAuthentication.ToStatusResponse();
  }

  public async Task<AudibleAuthenticationStatusResponse> GetCurrentAsync(CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);

    var currentSession = await database.AudibleAuthenticationStates
        .AsNoTracking()
        .SingleOrDefaultAsync(session => session.Id == CurrentSessionId, cancellationToken);

    if (currentSession is null || !File.Exists(currentSession.IdentityFilePath))
    {
      return new AudibleAuthenticationStatusResponse("not-authenticated", null, null, null);
    }

    return new AudibleAuthenticationStatusResponse(
        "authenticated",
        currentSession.Locale,
        currentSession.AuthenticatedAtUtc,
        null);
  }

  public async Task ClearCurrentAsync(CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);

    var currentSession = await database.AudibleAuthenticationStates
        .SingleOrDefaultAsync(session => session.Id == CurrentSessionId, cancellationToken);

    if (currentSession is null)
    {
      return;
    }

    database.AudibleAuthenticationStates.Remove(currentSession);
    await database.SaveChangesAsync(cancellationToken);

    if (File.Exists(currentSession.IdentityFilePath))
    {
      File.Delete(currentSession.IdentityFilePath);
    }
  }

  private async Task RunAuthenticationAsync(PendingAudibleAuthentication pendingAuthentication)
  {
    try
    {
      await loginClient.EnsureAuthenticatedAsync(
          pendingAuthentication.Locale,
          pendingAuthentication.PendingIdentityFilePath,
          prompt =>
          {
            pendingAuthentication.PublishPrompt(prompt);
            return pendingAuthentication.WaitForResponseUrlAsync();
          },
          pendingAuthentication.CancellationToken);

      ReplaceCurrentIdentityFile(pendingAuthentication);

      await using var database = await databaseFactory.CreateDbContextAsync(pendingAuthentication.CancellationToken);

      var currentSession = await database.AudibleAuthenticationStates
          .SingleOrDefaultAsync(session => session.Id == CurrentSessionId, pendingAuthentication.CancellationToken)
          ?? new AudibleAuthenticationStateEntity { Id = CurrentSessionId };

      currentSession.Locale = pendingAuthentication.Locale;
      currentSession.IdentityFilePath = pendingAuthentication.ActiveIdentityFilePath;
      currentSession.AuthenticatedAtUtc = clock.GetUtcNow();

      if (database.Entry(currentSession).State == EntityState.Detached)
      {
        database.AudibleAuthenticationStates.Add(currentSession);
      }

      await database.SaveChangesAsync(pendingAuthentication.CancellationToken);
      pendingAuthentication.MarkAuthenticated(currentSession.AuthenticatedAtUtc);
    }
    catch (OperationCanceledException) when (pendingAuthentication.TimeoutTokenSource.IsCancellationRequested)
    {
      pendingAuthentication.MarkFailed(
          pendingAuthentication.WasCancelled
              ? "Audible authentication was cancelled. Start a new authentication session when ready."
              : "Audible authentication timed out before completion.");
    }
    catch (Exception exception)
    {
      pendingAuthentication.MarkFailed(GetUserFacingFailureMessage(exception));
    }
    finally
    {
      pendingSessions.TryRemove(pendingAuthentication.SessionId, out _);
      pendingAuthentication.DeletePendingIdentityFileIfPresent();
      pendingAuthentication.Dispose();
    }
  }

  private static void ReplaceCurrentIdentityFile(PendingAudibleAuthentication pendingAuthentication)
  {
    Directory.CreateDirectory(Path.GetDirectoryName(pendingAuthentication.ActiveIdentityFilePath)!);

    if (!File.Exists(pendingAuthentication.PendingIdentityFilePath))
    {
      throw new InvalidOperationException("The completed Audible identity file is missing.");
    }

    if (!File.Exists(pendingAuthentication.ActiveIdentityFilePath))
    {
      File.Move(
          pendingAuthentication.PendingIdentityFilePath,
          pendingAuthentication.ActiveIdentityFilePath);

      return;
    }

    var backupIdentityFilePath = $"{pendingAuthentication.ActiveIdentityFilePath}.backup-{Guid.NewGuid():N}";

    File.Move(pendingAuthentication.ActiveIdentityFilePath, backupIdentityFilePath);

    try
    {
      File.Move(
          pendingAuthentication.PendingIdentityFilePath,
          pendingAuthentication.ActiveIdentityFilePath);

      File.Delete(backupIdentityFilePath);
    }
    catch
    {
      if (!File.Exists(pendingAuthentication.ActiveIdentityFilePath)
          && File.Exists(backupIdentityFilePath))
      {
        File.Move(backupIdentityFilePath, pendingAuthentication.ActiveIdentityFilePath);
      }

      throw;
    }
  }

  private static string GetUserFacingFailureMessage(Exception exception)
  {
    return exception switch
    {
      FileNotFoundException or IOException or UnauthorizedAccessException =>
          "Audible authentication could not store the completed session. Start a new authentication session and try again.",
      InvalidOperationException =>
          "Audible authentication could not be completed. Start a new authentication session and try again.",
      _ => "Audible authentication failed. Start a new authentication session and try again."
    };
  }

  private sealed class PendingAudibleAuthentication(
      string locale,
      string pendingIdentityFilePath,
      string activeIdentityFilePath,
      TimeProvider clock)
      : IDisposable
  {
    private readonly TaskCompletionSource<ExternalAudibleLoginPrompt> promptSource = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly TaskCompletionSource<string> responseUrlSource = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private bool wasCancelled;

    public Guid SessionId { get; } = Guid.NewGuid();

    public string Locale { get; } = locale;

    public string PendingIdentityFilePath { get; } = pendingIdentityFilePath;

    public string ActiveIdentityFilePath { get; } = activeIdentityFilePath;

    public string Status { get; private set; } = "starting";

    public DateTimeOffset? AuthenticatedAtUtc { get; private set; }

    public string? LastError { get; private set; }

    public bool WasCancelled => wasCancelled;

    public Task Runner { get; set; } = Task.CompletedTask;

    public CancellationTokenSource TimeoutTokenSource { get; } = new(PendingAuthenticationTimeout, clock);

    public CancellationToken CancellationToken => TimeoutTokenSource.Token;

    public void PublishPrompt(ExternalAudibleLoginPrompt prompt)
    {
      Status = "awaiting-browser-completion";
      promptSource.TrySetResult(prompt);
    }

    public Task<ExternalAudibleLoginPrompt> WaitForPromptAsync(CancellationToken cancellationToken)
    {
      return promptSource.Task.WaitAsync(cancellationToken);
    }

    public async Task<ExternalAudibleLoginPrompt> WaitForPromptOrFailureAsync(CancellationToken cancellationToken)
    {
      var promptTask = WaitForPromptAsync(cancellationToken);
      var completedTask = await Task.WhenAny(promptTask, Runner);

      if (completedTask == promptTask)
      {
        return await promptTask;
      }

      cancellationToken.ThrowIfCancellationRequested();

      throw new InvalidOperationException(LastError ?? "Audible authentication failed before the browser prompt was created.");
    }

    public void SetResponseUrl(string responseUrl)
    {
      responseUrlSource.TrySetResult(responseUrl);
    }

    public void Cancel()
    {
      wasCancelled = true;
      TimeoutTokenSource.Cancel();
    }

    public Task<string> WaitForResponseUrlAsync()
    {
      return responseUrlSource.Task.WaitAsync(CancellationToken);
    }

    public void MarkAuthenticated(DateTimeOffset authenticatedAtUtc)
    {
      Status = "authenticated";
      AuthenticatedAtUtc = authenticatedAtUtc;
      LastError = null;
    }

    public void MarkFailed(string error)
    {
      Status = "failed";
      LastError = error;
    }

    public void DeletePendingIdentityFileIfPresent()
    {
      if (File.Exists(PendingIdentityFilePath))
      {
        File.Delete(PendingIdentityFilePath);
      }
    }

    public AudibleAuthenticationStatusResponse ToStatusResponse()
    {
      return new AudibleAuthenticationStatusResponse(Status, Locale, AuthenticatedAtUtc, LastError);
    }

    public void Dispose()
    {
      TimeoutTokenSource.Dispose();
    }
  }
}
