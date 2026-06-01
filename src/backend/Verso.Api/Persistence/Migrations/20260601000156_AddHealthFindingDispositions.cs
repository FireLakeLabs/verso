using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Verso.Api.Persistence.Migrations;

/// <inheritdoc />
public partial class AddHealthFindingDispositions : Migration
{
  /// <inheritdoc />
  protected override void Up(MigrationBuilder migrationBuilder)
  {
    migrationBuilder.CreateTable(
        name: "HealthFindingDispositions",
        columns: table => new
        {
          FindingId = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
          IdentityKey = table.Column<string>(type: "TEXT", maxLength: 512, nullable: false),
          Kind = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
          Status = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
          CreatedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
          UpdatedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
          LastSeenAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
          LastTitle = table.Column<string>(type: "TEXT", maxLength: 512, nullable: false),
          LastMessage = table.Column<string>(type: "TEXT", nullable: false),
          LastItemAsins = table.Column<string>(type: "TEXT", nullable: false),
          LastEvidence = table.Column<string>(type: "TEXT", nullable: false)
        },
        constraints: table =>
        {
          table.PrimaryKey("PK_HealthFindingDispositions", x => x.FindingId);
        });

    migrationBuilder.CreateIndex(
        name: "IX_HealthFindingDispositions_IdentityKey",
        table: "HealthFindingDispositions",
        column: "IdentityKey",
        unique: true);
  }

  /// <inheritdoc />
  protected override void Down(MigrationBuilder migrationBuilder)
  {
    migrationBuilder.DropTable(
        name: "HealthFindingDispositions");
  }
}
