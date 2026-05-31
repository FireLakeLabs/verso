using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Verso.Api.Persistence.Migrations;

/// <inheritdoc />
public partial class ExpandSettingsState : Migration
{
  /// <inheritdoc />
  protected override void Up(MigrationBuilder migrationBuilder)
  {
    migrationBuilder.AddColumn<string>(
        name: "ArchiveExportCoverImages",
        table: "Settings",
        type: "TEXT",
        maxLength: 32,
        nullable: false,
        defaultValue: "sibling-folder");

    migrationBuilder.AddColumn<string>(
        name: "ArchiveExportFormat",
        table: "Settings",
        type: "TEXT",
        maxLength: 32,
        nullable: false,
        defaultValue: "json-archive");

    migrationBuilder.AddColumn<string>(
        name: "CostBasisCurrencyCode",
        table: "Settings",
        type: "TEXT",
        maxLength: 8,
        nullable: false,
        defaultValue: "USD");

    migrationBuilder.AddColumn<string>(
        name: "DefaultCostBasis",
        table: "Settings",
        type: "TEXT",
        maxLength: 32,
        nullable: false,
        defaultValue: "per-credit-value");

    migrationBuilder.AddColumn<bool>(
        name: "IncludeRawPayloadsInArchive",
        table: "Settings",
        type: "INTEGER",
        nullable: false,
        defaultValue: true);

    migrationBuilder.AddColumn<int>(
        name: "PerCreditValueInCents",
        table: "Settings",
        type: "INTEGER",
        nullable: false,
        defaultValue: 1495);

    migrationBuilder.AddColumn<string>(
        name: "RefreshTrigger",
        table: "Settings",
        type: "TEXT",
        maxLength: 32,
        nullable: false,
        defaultValue: "manual");

    migrationBuilder.AddColumn<bool>(
        name: "RetainNoLongerPresentItems",
        table: "Settings",
        type: "INTEGER",
        nullable: false,
        defaultValue: true);
  }

  /// <inheritdoc />
  protected override void Down(MigrationBuilder migrationBuilder)
  {
    migrationBuilder.DropColumn(
        name: "ArchiveExportCoverImages",
        table: "Settings");

    migrationBuilder.DropColumn(
        name: "ArchiveExportFormat",
        table: "Settings");

    migrationBuilder.DropColumn(
        name: "CostBasisCurrencyCode",
        table: "Settings");

    migrationBuilder.DropColumn(
        name: "DefaultCostBasis",
        table: "Settings");

    migrationBuilder.DropColumn(
        name: "IncludeRawPayloadsInArchive",
        table: "Settings");

    migrationBuilder.DropColumn(
        name: "PerCreditValueInCents",
        table: "Settings");

    migrationBuilder.DropColumn(
        name: "RefreshTrigger",
        table: "Settings");

    migrationBuilder.DropColumn(
        name: "RetainNoLongerPresentItems",
        table: "Settings");
  }
}
