using Newtonsoft.Json.Linq;

namespace Verso.Api.Tests;

internal static class AudibleApiFixtureLibrary
{
  private static readonly string BasePath = Path.Combine(AppContext.BaseDirectory, "Fixtures", "AudibleApi");

  public static JObject LoadRawItem(string fixtureName)
  {
    var fixture = LoadToken(fixtureName);
    return fixture as JObject
        ?? throw new InvalidOperationException($"Fixture '{fixtureName}' must contain a single AudibleApi item object.");
  }

  public static IReadOnlyList<JObject> LoadRawItems(string fixtureName)
  {
    var fixture = LoadToken(fixtureName);

    return fixture switch
    {
      JArray array => array.Children<JObject>().ToArray(),
      JObject obj => [obj],
      _ => throw new InvalidOperationException($"Fixture '{fixtureName}' must contain an AudibleApi item object or array."),
    };
  }

  public static ImportedAudibleItem LoadImportedItem(string fixtureName)
  {
    return AudibleApiItemMapper.Map(LoadRawItem(fixtureName));
  }

  public static IReadOnlyList<ImportedAudibleItem> LoadImportedItems(string fixtureName)
  {
    return LoadRawItems(fixtureName)
        .Select(AudibleApiItemMapper.Map)
        .ToArray();
  }

  private static JToken LoadToken(string fixtureName)
  {
    var path = Path.Combine(BasePath, $"{fixtureName}.json");
    if (!File.Exists(path))
    {
      throw new FileNotFoundException($"AudibleApi fixture '{fixtureName}' was not found.", path);
    }

    return JToken.Parse(File.ReadAllText(path));
  }
}
