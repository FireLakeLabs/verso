using System.Net.Http.Headers;

namespace Verso.Api;

public interface IAudibleAssetDownloader
{
  Task<DownloadedAudibleAsset> DownloadAsync(string sourceUrl, CancellationToken cancellationToken);
}

public sealed record DownloadedAudibleAsset(string ContentType, byte[] Content, string FileExtension);

public sealed record CachedCoverImageFileResponse(byte[] Content, string ContentType);

public sealed class AudibleCoverCachingException(string message, Exception innerException) : InvalidOperationException(message, innerException);

public sealed class AudibleAssetDownloader(HttpClient httpClient) : IAudibleAssetDownloader
{
  public async Task<DownloadedAudibleAsset> DownloadAsync(string sourceUrl, CancellationToken cancellationToken)
  {
    using var response = await httpClient.GetAsync(sourceUrl, cancellationToken);
    response.EnsureSuccessStatusCode();

    var content = await response.Content.ReadAsByteArrayAsync(cancellationToken);
    var mediaType = response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream";

    return new DownloadedAudibleAsset(mediaType, content, ResolveExtension(sourceUrl, response.Content.Headers.ContentType));
  }

  private static string ResolveExtension(string sourceUrl, MediaTypeHeaderValue? contentType)
  {
    var extension = Uri.TryCreate(sourceUrl, UriKind.Absolute, out var parsedUri)
        ? Path.GetExtension(parsedUri.AbsolutePath)
        : string.Empty;

    if (!string.IsNullOrWhiteSpace(extension))
    {
      return extension;
    }

    return contentType?.MediaType switch
    {
      "image/jpeg" => ".jpg",
      "image/png" => ".png",
      "image/webp" => ".webp",
      "image/gif" => ".gif",
      _ => ".bin",
    };
  }
}

public sealed class AudibleCoverAssetCacheService(
    IAudibleAssetDownloader assetDownloader,
    VersoStorageOptions storageOptions,
    TimeProvider timeProvider)
{
  public async Task<CacheCoverImageResult> CacheAsync(
      string asin,
      ImportedAudibleCoverImage coverImage,
      AudibleItemCoverImageEntity? existingCoverImage,
      CancellationToken cancellationToken)
  {
    if (existingCoverImage is not null
        && string.Equals(existingCoverImage.SourceUrl, coverImage.SourceUrl, StringComparison.Ordinal)
        && existingCoverImage.CachedRelativePath is not null
        && File.Exists(GetAbsolutePath(existingCoverImage.CachedRelativePath)))
    {
      return new CacheCoverImageResult(existingCoverImage, Downloaded: false);
    }

    try
    {
      var downloadedAsset = await assetDownloader.DownloadAsync(coverImage.SourceUrl, cancellationToken);
      var relativePath = BuildRelativePath(asin, coverImage.Variant, downloadedAsset.FileExtension);
      var absolutePath = GetAbsolutePath(relativePath);
      Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);
      await File.WriteAllBytesAsync(absolutePath, downloadedAsset.Content, cancellationToken);

      return new CacheCoverImageResult(
          new AudibleItemCoverImageEntity
          {
            AudibleItemAsin = asin,
            Variant = coverImage.Variant,
            SourceUrl = coverImage.SourceUrl,
            CachedRelativePath = relativePath,
            CachedContentType = downloadedAsset.ContentType,
            CachedSizeBytes = downloadedAsset.Content.LongLength,
            CachedAtUtc = timeProvider.GetUtcNow()
          },
          Downloaded: true);
    }
    catch (Exception exception) when (exception is HttpRequestException or IOException or UnauthorizedAccessException or InvalidOperationException)
    {
      throw new AudibleCoverCachingException(
          $"Cover caching failed for Audible Item '{asin}' variant '{coverImage.Variant}'.",
          exception);
    }
  }

  public string GetAbsolutePath(string relativePath)
  {
    return Path.Combine(storageOptions.DataDirectory, relativePath);
  }

  public void DeleteIfPresent(string? relativePath)
  {
    if (string.IsNullOrWhiteSpace(relativePath))
    {
      return;
    }

    var absolutePath = GetAbsolutePath(relativePath);
    if (File.Exists(absolutePath))
    {
      File.Delete(absolutePath);
    }
  }

  public static string GetCachedCoverUrl(string asin, string variant)
  {
    return $"/api/library/items/{Uri.EscapeDataString(asin)}/cover-images/{Uri.EscapeDataString(variant)}";
  }

  private static string BuildRelativePath(string asin, string variant, string fileExtension)
  {
    return Path.Combine(
        "cached-assets",
        "covers",
        SanitizePathSegment(asin),
        $"{SanitizePathSegment(variant)}{NormalizeExtension(fileExtension)}");
  }

  private static string NormalizeExtension(string fileExtension)
  {
    if (string.IsNullOrWhiteSpace(fileExtension))
    {
      return ".bin";
    }

    return fileExtension.StartsWith(".", StringComparison.Ordinal)
        ? fileExtension.ToLowerInvariant()
        : $".{fileExtension.ToLowerInvariant()}";
  }

  private static string SanitizePathSegment(string value)
  {
    var invalidCharacters = Path.GetInvalidFileNameChars();
    return new string(value.Select(character => invalidCharacters.Contains(character) ? '_' : character).ToArray());
  }
}

public sealed record CacheCoverImageResult(AudibleItemCoverImageEntity CoverImage, bool Downloaded);
