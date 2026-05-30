
using AudibleApi.Common;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Verso.Api;

public static class AudibleApiItemMapper
{
  public static ImportedAudibleItem Map(JObject rawItem)
  {
    ArgumentNullException.ThrowIfNull(rawItem);

    var item = rawItem.ToObject<Item>()
        ?? throw new InvalidOperationException("Audible raw item could not be mapped to an AudibleApi item.");

    return Map(item, rawItem.ToString(Formatting.None));
  }

  public static ImportedAudibleItem Map(Item item)
  {
    return Map(item, JsonConvert.SerializeObject(item));
  }

  private static ImportedAudibleItem Map(Item item, string rawAudiblePayload)
  {
    ArgumentNullException.ThrowIfNull(item);

    var asin = item.Asin?.Trim();
    if (string.IsNullOrWhiteSpace(asin))
    {
      throw new InvalidOperationException("Audible item is missing an ASIN.");
    }

    return new ImportedAudibleItem(
        asin,
        item.Title?.Trim() ?? string.Empty,
        item.Authors?
            .Select(author => author?.Name?.Trim())
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Cast<string>()
            .Distinct(StringComparer.Ordinal)
            .ToArray() ?? [],
        item.Narrators?
            .Select(narrator => narrator?.Name?.Trim())
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Cast<string>()
            .Distinct(StringComparer.Ordinal)
            .ToArray() ?? [],
        item.LengthInMinutes,
        Convert.ToInt32(item.PercentComplete ?? 0),
        rawAudiblePayload);
  }
}
