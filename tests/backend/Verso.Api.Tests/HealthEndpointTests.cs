
using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Verso.Api.Tests;

public class HealthEndpointTests
{
  [Fact]
  public async Task HealthEndpointReportsApiReadiness()
  {
    await using var application = new WebApplicationFactory<Program>();
    using var client = application.CreateClient();

    var response = await client.GetAsync("/health");
    var body = await response.Content.ReadAsStringAsync();

    Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    Assert.Contains("ok", body);
    Assert.Contains("Verso.Api", body);
  }
}
