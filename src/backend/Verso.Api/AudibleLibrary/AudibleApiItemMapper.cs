
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

    return Map(item, rawItem.ToString(Formatting.None), MapCoverImages(rawItem));
  }

  public static ImportedAudibleItem Map(Item item)
  {
    var rawAudiblePayload = JsonConvert.SerializeObject(item);
    return Map(item, rawAudiblePayload, MapCoverImages(JObject.Parse(rawAudiblePayload)));
  }

  private static ImportedAudibleItem Map(
      Item item,
      string rawAudiblePayload,
      IReadOnlyList<ImportedAudibleCoverImage> coverImages)
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
        rawAudiblePayload,
        coverImages);
  }

  private static IReadOnlyList<ImportedAudibleCoverImage> MapCoverImages(JObject rawItem)
  {
    return rawItem["product_images"] is not JObject productImages
        ? []
        : productImages.Properties()
            .Select(property => new ImportedAudibleCoverImage(
                property.Name.Trim(),
                property.Value.Type == JTokenType.String
                    ? property.Value.Value<string>()?.Trim() ?? string.Empty
                    : string.Empty))
            .Where(image => !string.IsNullOrWhiteSpace(image.Variant) && !string.IsNullOrWhiteSpace(image.SourceUrl))
            .Distinct()
            .ToArray();
  }
}
