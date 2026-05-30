using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Verso.Api.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLibraryRefreshJobsAndSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasCompanionPdf",
                table: "AudibleItems",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsNoLongerPresent",
                table: "AudibleItems",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsReturnable",
                table: "AudibleItems",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastSeenInSuccessfulRefreshAtUtc",
                table: "AudibleItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublisherSummary",
                table: "AudibleItems",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "AudibleItemSelectiveSnapshots",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AudibleItemAsin = table.Column<string>(type: "TEXT", nullable: false),
                    Field = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Value = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    ObservedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AudibleItemSelectiveSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AudibleItemSelectiveSnapshots_AudibleItems_AudibleItemAsin",
                        column: x => x.AudibleItemAsin,
                        principalTable: "AudibleItems",
                        principalColumn: "Asin",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AudibleItemSeries",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AudibleItemAsin = table.Column<string>(type: "TEXT", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    Sequence = table.Column<string>(type: "TEXT", maxLength: 32, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AudibleItemSeries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AudibleItemSeries_AudibleItems_AudibleItemAsin",
                        column: x => x.AudibleItemAsin,
                        principalTable: "AudibleItems",
                        principalColumn: "Asin",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LibraryRefreshJobs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    PhaseSummary = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    ObservedItemCount = table.Column<int>(type: "INTEGER", nullable: false),
                    ImportedItemCount = table.Column<int>(type: "INTEGER", nullable: false),
                    RetainedNoLongerPresentItemCount = table.Column<int>(type: "INTEGER", nullable: false),
                    SnapshotObservationCount = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LibraryRefreshJobs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "LibraryRefreshJobErrors",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    LibraryRefreshJobId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Code = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Message = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    TechnicalDetails = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
                    Phase = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LibraryRefreshJobErrors", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LibraryRefreshJobErrors_LibraryRefreshJobs_LibraryRefreshJobId",
                        column: x => x.LibraryRefreshJobId,
                        principalTable: "LibraryRefreshJobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "LibraryRefreshJobPhases",
                columns: table => new
                {
                    Id = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    LibraryRefreshJobId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
                    Summary = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    CompletedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LibraryRefreshJobPhases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LibraryRefreshJobPhases_LibraryRefreshJobs_LibraryRefreshJobId",
                        column: x => x.LibraryRefreshJobId,
                        principalTable: "LibraryRefreshJobs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AudibleItemSelectiveSnapshots_AudibleItemAsin_Field_ObservedAtUtc",
                table: "AudibleItemSelectiveSnapshots",
                columns: new[] { "AudibleItemAsin", "Field", "ObservedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AudibleItemSeries_AudibleItemAsin_SortOrder",
                table: "AudibleItemSeries",
                columns: new[] { "AudibleItemAsin", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LibraryRefreshJobErrors_LibraryRefreshJobId",
                table: "LibraryRefreshJobErrors",
                column: "LibraryRefreshJobId");

            migrationBuilder.CreateIndex(
                name: "IX_LibraryRefreshJobPhases_LibraryRefreshJobId",
                table: "LibraryRefreshJobPhases",
                column: "LibraryRefreshJobId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AudibleItemSelectiveSnapshots");

            migrationBuilder.DropTable(
                name: "AudibleItemSeries");

            migrationBuilder.DropTable(
                name: "LibraryRefreshJobErrors");

            migrationBuilder.DropTable(
                name: "LibraryRefreshJobPhases");

            migrationBuilder.DropTable(
                name: "LibraryRefreshJobs");

            migrationBuilder.DropColumn(
                name: "HasCompanionPdf",
                table: "AudibleItems");

            migrationBuilder.DropColumn(
                name: "IsNoLongerPresent",
                table: "AudibleItems");

            migrationBuilder.DropColumn(
                name: "IsReturnable",
                table: "AudibleItems");

            migrationBuilder.DropColumn(
                name: "LastSeenInSuccessfulRefreshAtUtc",
                table: "AudibleItems");

            migrationBuilder.DropColumn(
                name: "PublisherSummary",
                table: "AudibleItems");
        }
    }
}
