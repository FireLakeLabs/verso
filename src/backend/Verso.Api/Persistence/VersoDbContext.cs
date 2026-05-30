
using Microsoft.EntityFrameworkCore;

namespace Verso.Api;

public sealed class VersoDbContext(DbContextOptions<VersoDbContext> options) : DbContext(options)
{
  public DbSet<AudibleItemEntity> AudibleItems => Set<AudibleItemEntity>();

  public DbSet<AudibleItemCoverImageEntity> AudibleItemCoverImages => Set<AudibleItemCoverImageEntity>();

  public DbSet<AudibleAuthenticationStateEntity> AudibleAuthenticationStates => Set<AudibleAuthenticationStateEntity>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    var audibleItem = modelBuilder.Entity<AudibleItemEntity>();
    audibleItem.ToTable("AudibleItems");
    audibleItem.HasKey(item => item.Asin);
    audibleItem.Property(item => item.Asin).HasMaxLength(32);
    audibleItem.Property(item => item.Title).HasMaxLength(512);
    audibleItem.Property(item => item.RawAudiblePayload).HasColumnType("TEXT");
    audibleItem.HasMany(item => item.Contributors)
        .WithOne()
        .HasForeignKey(contributor => contributor.AudibleItemAsin)
        .OnDelete(DeleteBehavior.Cascade);
    audibleItem.HasMany(item => item.CoverImages)
        .WithOne()
        .HasForeignKey(coverImage => coverImage.AudibleItemAsin)
        .OnDelete(DeleteBehavior.Cascade);

    var contributor = modelBuilder.Entity<AudibleItemContributorEntity>();
    contributor.ToTable("AudibleItemContributors");
    contributor.HasKey(item => item.Id);
    contributor.Property(item => item.Name).HasMaxLength(256);
    contributor.Property(item => item.Role).HasConversion<string>().HasMaxLength(32);
    contributor.HasIndex(item => new { item.AudibleItemAsin, item.Role, item.Name }).IsUnique();

    var coverImage = modelBuilder.Entity<AudibleItemCoverImageEntity>();
    coverImage.ToTable("AudibleItemCoverImages");
    coverImage.HasKey(item => item.Id);
    coverImage.Property(item => item.Variant).HasMaxLength(64);
    coverImage.Property(item => item.SourceUrl).HasMaxLength(2048);
    coverImage.Property(item => item.CachedRelativePath).HasMaxLength(1024);
    coverImage.Property(item => item.CachedContentType).HasMaxLength(256);
    coverImage.HasIndex(item => new { item.AudibleItemAsin, item.Variant }).IsUnique();

    var authenticationState = modelBuilder.Entity<AudibleAuthenticationStateEntity>();
    authenticationState.ToTable("AudibleAuthenticationStates");
    authenticationState.HasKey(item => item.Id);
    authenticationState.Property(item => item.Locale).HasMaxLength(16);
    authenticationState.Property(item => item.IdentityFilePath).HasMaxLength(1024);
  }
}

public sealed class AudibleItemEntity
{
  public string Asin { get; set; } = string.Empty;

  public string Title { get; set; } = string.Empty;

  public int RuntimeMinutes { get; set; }

  public int PercentComplete { get; set; }

  public string RawAudiblePayload { get; set; } = string.Empty;

  public List<AudibleItemContributorEntity> Contributors { get; } = [];

  public List<AudibleItemCoverImageEntity> CoverImages { get; } = [];
}

public sealed class AudibleItemContributorEntity
{
  public long Id { get; set; }

  public string AudibleItemAsin { get; set; } = string.Empty;

  public AudibleItemContributorRole Role { get; set; }

  public string Name { get; set; } = string.Empty;
}

public sealed class AudibleItemCoverImageEntity
{
  public long Id { get; set; }

  public string AudibleItemAsin { get; set; } = string.Empty;

  public string Variant { get; set; } = string.Empty;

  public string SourceUrl { get; set; } = string.Empty;

  public string? CachedRelativePath { get; set; }

  public string? CachedContentType { get; set; }

  public long? CachedSizeBytes { get; set; }

  public DateTimeOffset? CachedAtUtc { get; set; }
}

public enum AudibleItemContributorRole
{
  Author,
  Narrator
}

public sealed class AudibleAuthenticationStateEntity
{
  public int Id { get; set; }

  public string Locale { get; set; } = string.Empty;

  public string IdentityFilePath { get; set; } = string.Empty;

  public DateTimeOffset AuthenticatedAtUtc { get; set; }
}
