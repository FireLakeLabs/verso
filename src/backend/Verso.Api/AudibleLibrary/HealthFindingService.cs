using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;

namespace Verso.Api;

public sealed class HealthFindingService(
    IDbContextFactory<VersoDbContext> databaseFactory,
    TimeProvider timeProvider)
{
  private static readonly string[] ValidDispositionStatuses = ["acknowledged", "dismissed"];

  public async Task<HealthFindingsResponse> GetFindingsAsync(string? view, CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);
    var findings = await EvaluateCurrentFindingsAsync(database, cancellationToken);
    var dispositions = await database.HealthFindingDispositions
        .AsNoTracking()
        .ToDictionaryAsync(disposition => disposition.FindingId, StringComparer.Ordinal, cancellationToken);

    return BuildResponse(findings, dispositions, NormalizeView(view));
  }

  public async Task<HealthFindingDispositionResponse?> UpdateDispositionAsync(
      string findingId,
      UpdateHealthFindingDispositionRequest request,
      CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);
    var findings = await EvaluateCurrentFindingsAsync(database, cancellationToken);
    var finding = findings.SingleOrDefault(finding => finding.Id == findingId);

    if (finding is null)
    {
      return null;
    }

    var now = timeProvider.GetUtcNow();
    var disposition = await database.HealthFindingDispositions
        .SingleOrDefaultAsync(disposition => disposition.FindingId == finding.Id, cancellationToken);

    if (disposition is null)
    {
      disposition = new HealthFindingDispositionEntity
      {
        FindingId = finding.Id,
        IdentityKey = finding.IdentityKey,
        Kind = finding.Kind,
        CreatedAtUtc = now
      };
      database.HealthFindingDispositions.Add(disposition);
    }

    disposition.Status = request.Status;
    disposition.UpdatedAtUtc = now;
    disposition.LastSeenAtUtc = now;
    disposition.LastTitle = finding.Title;
    disposition.LastMessage = finding.Message;
    disposition.LastItemAsins = PackLines(finding.ItemAsins);
    disposition.LastEvidence = PackLines(finding.Evidence);

    await database.SaveChangesAsync(cancellationToken);

    return new HealthFindingDispositionResponse(MapDisposition(disposition), true);
  }

  public async Task<int> CountOpenCurrentFindingsAsync(CancellationToken cancellationToken)
  {
    await using var database = await databaseFactory.CreateDbContextAsync(cancellationToken);
    var findings = await EvaluateCurrentFindingsAsync(database, cancellationToken);
    var dispositionIds = await database.HealthFindingDispositions
        .AsNoTracking()
        .Where(disposition => disposition.Status == "acknowledged" || disposition.Status == "dismissed")
        .Select(disposition => disposition.FindingId)
        .ToArrayAsync(cancellationToken);
    var dispositionSet = new HashSet<string>(dispositionIds, StringComparer.Ordinal);

    return findings.Count(finding => !dispositionSet.Contains(finding.Id));
  }

  public static bool IsValidDispositionStatus(string status)
  {
    return ValidDispositionStatuses.Contains(status, StringComparer.Ordinal);
  }

  private static HealthFindingsResponse BuildResponse(
      IReadOnlyList<EvaluatedHealthFinding> currentFindings,
      IReadOnlyDictionary<string, HealthFindingDispositionEntity> dispositions,
      string view)
  {
    var currentIds = new HashSet<string>(currentFindings.Select(finding => finding.Id), StringComparer.Ordinal);
    var currentDtos = currentFindings.Select(finding => MapCurrentFinding(finding, dispositions)).ToArray();
    var historicalDtos = dispositions.Values
        .Where(disposition => !currentIds.Contains(disposition.FindingId))
        .Select(MapHistoricalFinding)
        .ToArray();
    var allDtos = currentDtos.Concat(historicalDtos).ToArray();
    var filteredDtos = view switch
    {
      "all" => allDtos,
      "dispositioned" => allDtos.Where(finding => finding.Disposition.Status is "acknowledged" or "dismissed").ToArray(),
      _ => currentDtos
    };

    return new HealthFindingsResponse(
        new HealthFindingsSummaryDto(
            currentDtos.Length,
            currentDtos.Count(finding => finding.Disposition.Status == "open"),
            allDtos.Count(finding => finding.Disposition.Status == "acknowledged"),
            allDtos.Count(finding => finding.Disposition.Status == "dismissed"),
            historicalDtos.Length),
        filteredDtos
            .OrderBy(finding => finding.Disposition.Status == "open" ? 0 : 1)
            .ThenBy(finding => finding.Kind, StringComparer.Ordinal)
            .ThenBy(finding => finding.Title, StringComparer.OrdinalIgnoreCase)
            .ThenBy(finding => finding.Id, StringComparer.Ordinal)
            .ToArray());
  }

  private async Task<EvaluatedHealthFinding[]> EvaluateCurrentFindingsAsync(
      VersoDbContext database,
      CancellationToken cancellationToken)
  {
    var items = await database.AudibleItems
        .AsNoTracking()
        .Include(item => item.Contributors)
        .Where(item => !item.IsNoLongerPresent)
        .ToArrayAsync(cancellationToken);
    var findings = new List<EvaluatedHealthFinding>();

    foreach (var item in items)
    {
      if (item.PercentComplete is >= 90 and < 95)
      {
        findings.Add(CreateFinding(
            "near-complete",
            $"near-complete:item:{item.Asin}",
            "Near-complete Audible Item",
            $"{item.Title} is {item.PercentComplete}% complete.",
            [item.Asin],
            [$"percent-complete:{item.PercentComplete}"]));
      }

      if (item.IsReturnable == true && item.PercentComplete is > 0 and <= 5)
      {
        findings.Add(CreateFinding(
            "returnable-barely-started",
            $"returnable-barely-started:item:{item.Asin}",
            "Returnable barely-started Audible Item",
            $"{item.Title} is returnable and only {item.PercentComplete}% complete.",
            [item.Asin],
            [$"percent-complete:{item.PercentComplete}", "is-returnable:true"]));
      }

      var missingFields = GetMissingMetadataFields(item);
      if (missingFields.Length > 0)
      {
        findings.Add(CreateFinding(
            "missing-metadata",
            $"missing-metadata:item:{item.Asin}:fields:{string.Join(',', missingFields)}",
            "Missing Audible metadata",
            $"{item.Title} is missing {FormatEvidenceList(missingFields)}.",
            [item.Asin],
            missingFields));
      }
    }

    findings.AddRange(CreateDuplicateCandidateFindings(items));
    return findings.ToArray();
  }

  private static IEnumerable<EvaluatedHealthFinding> CreateDuplicateCandidateFindings(IReadOnlyList<AudibleItemEntity> items)
  {
    return items
        .Select(item => new
        {
          Item = item,
          Key = GetDuplicateCandidateKey(item)
        })
        .Where(candidate => candidate.Key is not null)
        .GroupBy(candidate => candidate.Key, StringComparer.Ordinal)
        .Where(group => group.Count() > 1)
        .Select(group =>
        {
          var duplicateItems = group
              .Select(candidate => candidate.Item)
              .OrderBy(item => item.Asin, StringComparer.Ordinal)
              .ToArray();
          var asins = duplicateItems.Select(item => item.Asin).ToArray();
          var title = duplicateItems[0].Title;

          return CreateFinding(
              "duplicate-candidate",
              $"duplicate-candidate:items:{string.Join('+', asins)}",
              "Duplicate Candidate",
              $"{title} appears on {asins.Length} distinct Audible Items.",
              asins,
              [$"title:{title}", $"asin-count:{asins.Length}"]);
        });
  }

  private static string? GetDuplicateCandidateKey(AudibleItemEntity item)
  {
    var title = NormalizeText(item.Title);
    var authors = item.Contributors
        .Where(contributor => contributor.Role == AudibleItemContributorRole.Author)
        .Select(contributor => NormalizeText(contributor.Name))
        .Where(author => author.Length > 0)
        .Order(StringComparer.Ordinal)
        .ToArray();

    return title.Length == 0 || authors.Length == 0
        ? null
        : $"{title}|{string.Join('&', authors)}";
  }

  private static string[] GetMissingMetadataFields(AudibleItemEntity item)
  {
    var fields = new List<string>();

    if (string.IsNullOrWhiteSpace(item.Title))
    {
      fields.Add("title");
    }

    if (!item.Contributors.Any(contributor => contributor.Role == AudibleItemContributorRole.Author))
    {
      fields.Add("authors");
    }

    if (!item.Contributors.Any(contributor => contributor.Role == AudibleItemContributorRole.Narrator))
    {
      fields.Add("narrators");
    }

    if (item.RuntimeMinutes <= 0)
    {
      fields.Add("runtime");
    }

    return fields.ToArray();
  }

  private static EvaluatedHealthFinding CreateFinding(
      string kind,
      string identityKey,
      string title,
      string message,
      IReadOnlyList<string> itemAsins,
      IReadOnlyList<string> evidence)
  {
    return new EvaluatedHealthFinding(
        CreateFindingId(identityKey),
        identityKey,
        kind,
        title,
        message,
        itemAsins,
        evidence);
  }

  private static HealthFindingDto MapCurrentFinding(
      EvaluatedHealthFinding finding,
      IReadOnlyDictionary<string, HealthFindingDispositionEntity> dispositions)
  {
    return new HealthFindingDto(
        finding.Id,
        finding.Kind,
        finding.Title,
        finding.Message,
        finding.ItemAsins,
        finding.Evidence,
        true,
        dispositions.TryGetValue(finding.Id, out var disposition)
            ? MapDisposition(disposition)
            : new HealthFindingDispositionDto("open", null));
  }

  private static HealthFindingDto MapHistoricalFinding(HealthFindingDispositionEntity disposition)
  {
    return new HealthFindingDto(
        disposition.FindingId,
        disposition.Kind,
        disposition.LastTitle,
        disposition.LastMessage,
        UnpackLines(disposition.LastItemAsins),
        UnpackLines(disposition.LastEvidence),
        false,
        MapDisposition(disposition));
  }

  private static HealthFindingDispositionDto MapDisposition(HealthFindingDispositionEntity disposition)
  {
    return new HealthFindingDispositionDto(disposition.Status, disposition.UpdatedAtUtc);
  }

  private static string NormalizeView(string? view)
  {
    return view?.Trim().ToLowerInvariant() switch
    {
      "all" => "all",
      "dispositioned" => "dispositioned",
      _ => "active"
    };
  }

  private static string CreateFindingId(string identityKey)
  {
    return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(identityKey))).ToLowerInvariant();
  }

  private static string NormalizeText(string value)
  {
    var builder = new StringBuilder(value.Length);
    var lastWasSpace = true;

    foreach (var character in value.Trim().ToLowerInvariant())
    {
      if (char.IsLetterOrDigit(character))
      {
        builder.Append(character);
        lastWasSpace = false;
      }
      else if (!lastWasSpace)
      {
        builder.Append(' ');
        lastWasSpace = true;
      }
    }

    return builder.ToString().Trim();
  }

  private static string FormatEvidenceList(IReadOnlyList<string> values)
  {
    return values.Count == 1 ? values[0] : string.Join(", ", values);
  }

  private static string PackLines(IReadOnlyList<string> values)
  {
    return string.Join('\n', values);
  }

  private static string[] UnpackLines(string value)
  {
    return value.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
  }

  private sealed record EvaluatedHealthFinding(
      string Id,
      string IdentityKey,
      string Kind,
      string Title,
      string Message,
      IReadOnlyList<string> ItemAsins,
      IReadOnlyList<string> Evidence);
}
