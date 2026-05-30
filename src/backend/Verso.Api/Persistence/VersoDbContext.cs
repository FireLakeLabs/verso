
using Microsoft.EntityFrameworkCore;

namespace Verso.Api;

public sealed class VersoDbContext(DbContextOptions<VersoDbContext> options) : DbContext(options)
{
  public DbSet<AudibleItemEntity> AudibleItems => Set<AudibleItemEntity>();

  public DbSet<AudibleAuthenticationStateEntity> AudibleAuthenticationStates => Set<AudibleAuthenticationStateEntity>();

  public DbSet<LibraryRefreshJobEntity> LibraryRefreshJobs => Set<LibraryRefreshJobEntity>();

  protected override void OnModelCreating(ModelBuilder modelBuilder)
  {
    var audibleItem = modelBuilder.Entity<AudibleItemEntity>();
    audibleItem.ToTable("AudibleItems");
    audibleItem.HasKey(item => item.Asin);
    audibleItem.Property(item => item.Asin).HasMaxLength(32);
    audibleItem.Property(item => item.Title).HasMaxLength(512);
    audibleItem.Property(item => item.RawAudiblePayload).HasColumnType("TEXT");
    audibleItem.Property(item => item.PublisherSummary).HasColumnType("TEXT");
    audibleItem.HasMany(item => item.Contributors)
        .WithOne()
        .HasForeignKey(contributor => contributor.AudibleItemAsin)
        .OnDelete(DeleteBehavior.Cascade);
    audibleItem.HasMany(item => item.Series)
        .WithOne()
        .HasForeignKey(series => series.AudibleItemAsin)
        .OnDelete(DeleteBehavior.Cascade);
    audibleItem.HasMany(item => item.Snapshots)
        .WithOne()
        .HasForeignKey(snapshot => snapshot.AudibleItemAsin)
        .OnDelete(DeleteBehavior.Cascade);

    var contributor = modelBuilder.Entity<AudibleItemContributorEntity>();
    contributor.ToTable("AudibleItemContributors");
    contributor.HasKey(item => item.Id);
    contributor.Property(item => item.Name).HasMaxLength(256);
    contributor.Property(item => item.Role).HasConversion<string>().HasMaxLength(32);
    contributor.HasIndex(item => new { item.AudibleItemAsin, item.Role, item.Name }).IsUnique();

    var series = modelBuilder.Entity<AudibleItemSeriesEntity>();
    series.ToTable("AudibleItemSeries");
    series.HasKey(item => item.Id);
    series.Property(item => item.Title).HasMaxLength(256);
    series.Property(item => item.Sequence).HasMaxLength(32);
    series.HasIndex(item => new { item.AudibleItemAsin, item.SortOrder }).IsUnique();

    var snapshot = modelBuilder.Entity<AudibleItemSelectiveSnapshotEntity>();
    snapshot.ToTable("AudibleItemSelectiveSnapshots");
    snapshot.HasKey(item => item.Id);
    snapshot.Property(item => item.Field).HasMaxLength(64);
    snapshot.Property(item => item.Value).HasMaxLength(256);
    snapshot.HasIndex(item => new { item.AudibleItemAsin, item.Field, item.ObservedAtUtc });

    var authenticationState = modelBuilder.Entity<AudibleAuthenticationStateEntity>();
    authenticationState.ToTable("AudibleAuthenticationStates");
    authenticationState.HasKey(item => item.Id);
    authenticationState.Property(item => item.Locale).HasMaxLength(16);
    authenticationState.Property(item => item.IdentityFilePath).HasMaxLength(1024);

    var refreshJob = modelBuilder.Entity<LibraryRefreshJobEntity>();
    refreshJob.ToTable("LibraryRefreshJobs");
    refreshJob.HasKey(item => item.Id);
    refreshJob.Property(item => item.Status).HasConversion<string>().HasMaxLength(32);
    refreshJob.Property(item => item.PhaseSummary).HasMaxLength(256);
    refreshJob.HasMany(item => item.Phases)
        .WithOne()
        .HasForeignKey(phase => phase.LibraryRefreshJobId)
        .OnDelete(DeleteBehavior.Cascade);
    refreshJob.HasMany(item => item.Errors)
        .WithOne()
        .HasForeignKey(error => error.LibraryRefreshJobId)
        .OnDelete(DeleteBehavior.Cascade);

    var refreshPhase = modelBuilder.Entity<LibraryRefreshJobPhaseEntity>();
    refreshPhase.ToTable("LibraryRefreshJobPhases");
    refreshPhase.HasKey(item => item.Id);
    refreshPhase.Property(item => item.Name).HasMaxLength(64);
    refreshPhase.Property(item => item.Status).HasConversion<string>().HasMaxLength(32);
    refreshPhase.Property(item => item.Summary).HasMaxLength(256);

    var refreshError = modelBuilder.Entity<LibraryRefreshJobErrorEntity>();
    refreshError.ToTable("LibraryRefreshJobErrors");
    refreshError.HasKey(item => item.Id);
    refreshError.Property(item => item.Code).HasMaxLength(64);
    refreshError.Property(item => item.Message).HasMaxLength(256);
    refreshError.Property(item => item.TechnicalDetails).HasMaxLength(256);
    refreshError.Property(item => item.Phase).HasMaxLength(64);
  }
}

public sealed class AudibleItemEntity
{
  public string Asin { get; set; } = string.Empty;

  public string Title { get; set; } = string.Empty;

  public int RuntimeMinutes { get; set; }

  public int PercentComplete { get; set; }

  public string RawAudiblePayload { get; set; } = string.Empty;

  public string? PublisherSummary { get; set; }

  public bool HasCompanionPdf { get; set; }

  public bool? IsReturnable { get; set; }

  public bool IsNoLongerPresent { get; set; }

  public DateTimeOffset? LastSeenInSuccessfulRefreshAtUtc { get; set; }

  public List<AudibleItemContributorEntity> Contributors { get; } = [];

  public List<AudibleItemSeriesEntity> Series { get; } = [];

  public List<AudibleItemSelectiveSnapshotEntity> Snapshots { get; } = [];
}

public sealed class AudibleItemContributorEntity
{
  public long Id { get; set; }

  public string AudibleItemAsin { get; set; } = string.Empty;

  public AudibleItemContributorRole Role { get; set; }

  public string Name { get; set; } = string.Empty;
}

public enum AudibleItemContributorRole
{
  Author,
  Narrator
}

public sealed class AudibleItemSeriesEntity
{
  public long Id { get; set; }

  public string AudibleItemAsin { get; set; } = string.Empty;

  public int SortOrder { get; set; }

  public string Title { get; set; } = string.Empty;

  public string? Sequence { get; set; }
}

public sealed class AudibleItemSelectiveSnapshotEntity
{
  public long Id { get; set; }

  public string AudibleItemAsin { get; set; } = string.Empty;

  public string Field { get; set; } = string.Empty;

  public string Value { get; set; } = string.Empty;

  public DateTimeOffset ObservedAtUtc { get; set; }
}

public sealed class AudibleAuthenticationStateEntity
{
  public int Id { get; set; }

  public string Locale { get; set; } = string.Empty;

  public string IdentityFilePath { get; set; } = string.Empty;

  public DateTimeOffset AuthenticatedAtUtc { get; set; }
}

public sealed class LibraryRefreshJobEntity
{
  public Guid Id { get; set; }

  public LibraryRefreshJobStatus Status { get; set; }

  public string PhaseSummary { get; set; } = string.Empty;

  public DateTimeOffset StartedAtUtc { get; set; }

  public DateTimeOffset? CompletedAtUtc { get; set; }

  public int ObservedItemCount { get; set; }

  public int ImportedItemCount { get; set; }

  public int RetainedNoLongerPresentItemCount { get; set; }

  public int SnapshotObservationCount { get; set; }

  public List<LibraryRefreshJobPhaseEntity> Phases { get; } = [];

  public List<LibraryRefreshJobErrorEntity> Errors { get; } = [];
}

public sealed class LibraryRefreshJobPhaseEntity
{
  public long Id { get; set; }

  public Guid LibraryRefreshJobId { get; set; }

  public string Name { get; set; } = string.Empty;

  public LibraryRefreshJobPhaseStatus Status { get; set; }

  public string Summary { get; set; } = string.Empty;

  public DateTimeOffset StartedAtUtc { get; set; }

  public DateTimeOffset? CompletedAtUtc { get; set; }
}

public sealed class LibraryRefreshJobErrorEntity
{
  public long Id { get; set; }

  public Guid LibraryRefreshJobId { get; set; }

  public string Code { get; set; } = string.Empty;

  public string Message { get; set; } = string.Empty;

  public string? TechnicalDetails { get; set; }

  public string Phase { get; set; } = string.Empty;
}

public enum LibraryRefreshJobStatus
{
  Running,
  Succeeded,
  PartialFailure,
  Failed
}

public enum LibraryRefreshJobPhaseStatus
{
  Running,
  Succeeded,
  Failed,
  Skipped
}
