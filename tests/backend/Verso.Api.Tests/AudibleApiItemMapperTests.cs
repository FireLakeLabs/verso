
using Newtonsoft.Json.Linq;

namespace Verso.Api.Tests;

public sealed class AudibleApiItemMapperTests
{
  [Fact]
  public void MapPreservesRepresentativeAudibleFixturePayload()
  {
    var rawItem = AudibleApiFixtureLibrary.LoadRawItem("single-item/basic-active");

    var importedItem = AudibleApiItemMapper.Map(rawItem);

    Assert.Equal("B00TEST123", importedItem.Asin);
    Assert.Equal("Project Hail Mary", importedItem.Title);
    Assert.Equal(["Andy Weir"], importedItem.Authors);
    Assert.Equal(["Ray Porter"], importedItem.Narrators);
    Assert.Equal(973, importedItem.RuntimeMinutes);
    Assert.Equal(100, importedItem.PercentComplete);
    Assert.Contains("unexpected_field", importedItem.RawAudiblePayload);
  }

  [Fact]
  public void MapPreservesSparseMetadataAndUnusualAudibleShapes()
  {
    var rawItem = AudibleApiFixtureLibrary.LoadRawItem("single-item/sparse-rich-edge-cases");

    var importedItem = AudibleApiItemMapper.Map(rawItem);

    Assert.Equal("B0EDGE0001", importedItem.Asin);
    Assert.Equal("The Long Way Home", importedItem.Title);
    Assert.Equal(["Author One", "Author Two"], importedItem.Authors);
    Assert.Equal(["Narrator One", "Narrator Two"], importedItem.Narrators);
    Assert.Equal(0, importedItem.RuntimeMinutes);
    Assert.Equal(135, importedItem.PercentComplete);

    var payload = JObject.Parse(importedItem.RawAudiblePayload);
    Assert.Equal("B0EDGE0001", payload.Value<string>("asin"));
    Assert.NotNull(payload["publisher_summary"]);
    Assert.NotNull(payload["product_images"]?["500"]);
    Assert.NotNull(payload["pdf_url"]);
    Assert.NotNull(payload["is_returnable"]);
    Assert.NotNull(payload["category_ladders"]);
    Assert.NotNull(payload["series"]);
    Assert.NotNull(payload["purchase_date"]);
    Assert.Equal(JTokenType.Null, payload["price"]?["amount"]?.Type);
  }
}
