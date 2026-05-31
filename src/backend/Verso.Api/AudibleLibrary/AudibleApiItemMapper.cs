
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

    return Map(item, rawItem.ToString(Formatting.None), rawItem, MapCoverImages(rawItem));
  }

  public static ImportedAudibleItem Map(Item item)
  {
    var rawAudiblePayload = JsonConvert.SerializeObject(item);
    var rawItem = JObject.Parse(rawAudiblePayload);
    return Map(item, rawAudiblePayload, rawItem, MapCoverImages(rawItem));
  }

  private static ImportedAudibleItem Map(
      Item item,
      string rawAudiblePayload,
      JObject rawItem,
      IReadOnlyList<ImportedAudibleCoverImage> coverImages)
  {
    ArgumentNullException.ThrowIfNull(item);
    ArgumentNullException.ThrowIfNull(rawItem);

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
        rawItem.Value<string>("publisher_summary")?.Trim(),
        !string.IsNullOrWhiteSpace(rawItem.Value<string>("pdf_url")),
        rawItem["is_returnable"]?.Type == JTokenType.Boolean ? rawItem.Value<bool?>("is_returnable") : null,
        rawItem["series"] is JArray series
            ? series
                .OfType<JObject>()
                .Select(
                    entry => new ImportedAudibleSeriesEntry(
                        entry.Value<string>("title")?.Trim() ?? string.Empty,
                        entry.Value<string>("sequence")?.Trim()))
                .Where(entry => !string.IsNullOrWhiteSpace(entry.Title))
                .ToArray()
              : [],
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
