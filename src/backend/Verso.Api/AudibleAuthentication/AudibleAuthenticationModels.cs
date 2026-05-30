namespace Verso.Api;

public sealed record VersoStorageOptions(string DataDirectory);

public interface IAudibleLoginClient
{
  Task EnsureAuthenticatedAsync(
      string locale,
      string identityFilePath,
      Func<ExternalAudibleLoginPrompt, Task<string>> externalLoginAsync,
      CancellationToken cancellationToken);
}

public sealed record StartAudibleAuthenticationRequest(string Locale);

public sealed record StartAudibleAuthenticationResponse(
    Guid SessionId,
    string Status,
    string Locale,
    string LoginUrl,
    IReadOnlyList<AudibleSignInCookieDto> SignInCookies);

public sealed record CompleteAudibleAuthenticationRequest(string ResponseUrl);

public sealed record AudibleAuthenticationStatusResponse(
    string Status,
    string? Locale,
    DateTimeOffset? AuthenticatedAtUtc,
    string? LastError);

public sealed record OperationErrorResponse(string Code, string Message);

public sealed record AudibleSignInCookieDto(string Name, string Value, string Domain, string Path);

public sealed record ExternalAudibleLoginPrompt(string LoginUrl, IReadOnlyList<AudibleSignInCookieDto> SignInCookies);
