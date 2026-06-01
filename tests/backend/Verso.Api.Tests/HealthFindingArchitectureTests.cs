namespace Verso.Api.Tests;

public sealed class HealthFindingArchitectureTests
{
  [Fact]
  public void FrontendGetsHealthFindingsFromBackendInsteadOfSynthesizingFindingRules()
  {
    var root = FindRepositoryRoot();
    var appSource = File.ReadAllText(Path.Combine(root, "src", "frontend", "src", "FirelakeApp.tsx"));
    var shellSource = File.ReadAllText(Path.Combine(root, "src", "frontend", "src", "shell", "firelake-shell.tsx"));
    var apiSource = File.ReadAllText(Path.Combine(root, "src", "frontend", "src", "library-api.ts"));
    var findingsPageSource = SliceFunction(shellSource, "function FindingsPage");

    Assert.Contains("api.getHealthFindings(\"all\")", appSource, StringComparison.Ordinal);
    Assert.Contains("/api/library/health-findings", apiSource, StringComparison.Ordinal);
    Assert.DoesNotContain("percentComplete", findingsPageSource, StringComparison.Ordinal);
    Assert.DoesNotContain("isReturnable", findingsPageSource, StringComparison.Ordinal);
    Assert.DoesNotContain("runtimeMinutes", findingsPageSource, StringComparison.Ordinal);
  }

  private static string SliceFunction(string source, string startMarker)
  {
    var start = source.IndexOf(startMarker, StringComparison.Ordinal);

    Assert.True(start >= 0, $"Could not find {startMarker}.");

    var openBrace = source.IndexOf('{', start);
    Assert.True(openBrace > start, $"Could not find function body for {startMarker}.");

    var depth = 0;
    for (var index = openBrace; index < source.Length; index++)
    {
      if (source[index] == '{')
      {
        depth++;
      }
      else if (source[index] == '}')
      {
        depth--;

        if (depth == 0)
        {
          return source[start..(index + 1)];
        }
      }
    }

    throw new InvalidOperationException($"Could not find end of function body for {startMarker}.");
  }

  private static string FindRepositoryRoot()
  {
    var directory = new DirectoryInfo(Directory.GetCurrentDirectory());

    while (directory is not null)
    {
      if (File.Exists(Path.Combine(directory.FullName, "Verso.slnx")))
      {
        return directory.FullName;
      }

      directory = directory.Parent;
    }

    throw new InvalidOperationException("Could not locate the Verso repository root.");
  }
}
