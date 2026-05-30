
using System.Net;
using AudibleApi;

namespace Verso.Api;

public sealed class AudibleApiLoginClient : IAudibleLoginClient
{
  public async Task EnsureAuthenticatedAsync(
      string locale,
      string identityFilePath,
      Func<ExternalAudibleLoginPrompt, Task<string>> externalLoginAsync,
      CancellationToken cancellationToken)
  {
    ArgumentException.ThrowIfNullOrWhiteSpace(locale);
    ArgumentException.ThrowIfNullOrWhiteSpace(identityFilePath);
    ArgumentNullException.ThrowIfNull(externalLoginAsync);

    Directory.CreateDirectory(Path.GetDirectoryName(identityFilePath)!);

    var loginChoice = new ExternalOnlyLoginChoice(externalLoginAsync);
    await EzApiCreator.GetApiAsync(loginChoice, Localization.Get(locale), identityFilePath);
  }

  private sealed class ExternalOnlyLoginChoice(Func<ExternalAudibleLoginPrompt, Task<string>> externalLoginAsync) : ILoginChoiceEager
  {
    public ILoginCallback LoginCallback { get; } = new ExternalOnlyLoginCallback();

    public async Task<ChoiceOut?> StartAsync(ChoiceIn choiceIn)
    {
      var prompt = new ExternalAudibleLoginPrompt(
          choiceIn.LoginUrl,
          choiceIn.SignInCookies.Cast<Cookie>()
              .Select(cookie => new AudibleSignInCookieDto(cookie.Name, cookie.Value, cookie.Domain, cookie.Path))
              .ToArray());

      var responseUrl = await externalLoginAsync(prompt);
      return ChoiceOut.External(responseUrl);
    }
  }

  private sealed class ExternalOnlyLoginCallback : ILoginCallback
  {
    public string DeviceName => "Verso Local";

    public Task<(string email, string password)> GetLoginAsync()
    {
      throw new NotSupportedException("Verso uses AudibleApi external browser login.");
    }

    public Task<(string password, string guess)> GetCaptchaAnswerAsync(string password, byte[] captchaImage)
    {
      throw new NotSupportedException("Verso uses AudibleApi external browser login.");
    }

    public Task<(string name, string value)> GetMfaChoiceAsync(MfaConfig mfaConfig)
    {
      throw new NotSupportedException("Verso uses AudibleApi external browser login.");
    }

    public Task<string> Get2faCodeAsync(string prompt)
    {
      throw new NotSupportedException("Verso uses AudibleApi external browser login.");
    }

    public Task ShowApprovalNeededAsync()
    {
      throw new NotSupportedException("Verso uses AudibleApi external browser login.");
    }
  }
}
