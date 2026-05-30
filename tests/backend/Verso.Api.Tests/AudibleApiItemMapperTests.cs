namespace Verso.Api.Tests;

using Newtonsoft.Json.Linq;
using Verso.Api;

public sealed class AudibleApiItemMapperTests
{
    [Fact]
    public void MapPreservesRepresentativeAudibleFixturePayload()
    {
        var fixturePath = Path.Combine(AppContext.BaseDirectory, "Fixtures", "audible-library-item.json");
        var rawItem = JObject.Parse(File.ReadAllText(fixturePath));

        var importedItem = AudibleApiItemMapper.Map(rawItem);

        Assert.Equal("B00TEST123", importedItem.Asin);
        Assert.Equal("Project Hail Mary", importedItem.Title);
        Assert.Equal(["Andy Weir"], importedItem.Authors);
        Assert.Equal(["Ray Porter"], importedItem.Narrators);
        Assert.Equal(973, importedItem.RuntimeMinutes);
        Assert.Equal(100, importedItem.PercentComplete);
        Assert.Contains("unexpected_field", importedItem.RawAudiblePayload);
    }
}