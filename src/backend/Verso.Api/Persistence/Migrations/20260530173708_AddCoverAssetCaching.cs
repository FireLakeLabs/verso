using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Verso.Api.Persistence.Migrations;

/// <inheritdoc />
public partial class AddCoverAssetCaching : Migration
{
  /// <inheritdoc />
  protected override void Up(MigrationBuilder migrationBuilder)
  {
    migrationBuilder.CreateTable(
        name: "AudibleItemCoverImages",
        columns: table => new
        {
          Id = table.Column<long>(type: "INTEGER", nullable: false)
                .Annotation("Sqlite:Autoincrement", true),
          AudibleItemAsin = table.Column<string>(type: "TEXT", nullable: false),
          Variant = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
          SourceUrl = table.Column<string>(type: "TEXT", maxLength: 2048, nullable: false),
          CachedRelativePath = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: true),
          CachedContentType = table.Column<string>(type: "TEXT", maxLength: 256, nullable: true),
          CachedSizeBytes = table.Column<long>(type: "INTEGER", nullable: true),
          CachedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: true)
        },
        constraints: table =>
        {
          table.PrimaryKey("PK_AudibleItemCoverImages", x => x.Id);
          table.ForeignKey(
                    name: "FK_AudibleItemCoverImages_AudibleItems_AudibleItemAsin",
                    column: x => x.AudibleItemAsin,
                    principalTable: "AudibleItems",
                    principalColumn: "Asin",
                    onDelete: ReferentialAction.Cascade);
        });

    migrationBuilder.CreateIndex(
        name: "IX_AudibleItemCoverImages_AudibleItemAsin_Variant",
        table: "AudibleItemCoverImages",
        columns: new[] { "AudibleItemAsin", "Variant" },
        unique: true);
  }

  /// <inheritdoc />
  protected override void Down(MigrationBuilder migrationBuilder)
  {
    migrationBuilder.DropTable(
        name: "AudibleItemCoverImages");
  }
}
