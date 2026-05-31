using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Verso.Api.Persistence.Migrations;

/// <inheritdoc />
public partial class AddSettingsState : Migration
{
  /// <inheritdoc />
  protected override void Up(MigrationBuilder migrationBuilder)
  {
    migrationBuilder.CreateTable(
        name: "Settings",
        columns: table => new
        {
          Id = table.Column<int>(type: "INTEGER", nullable: false)
                .Annotation("Sqlite:Autoincrement", true),
          NavChrome = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
          DefaultOverviewVariant = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
          DefaultLibraryView = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false)
        },
        constraints: table =>
        {
          table.PrimaryKey("PK_Settings", x => x.Id);
        });
  }

  /// <inheritdoc />
  protected override void Down(MigrationBuilder migrationBuilder)
  {
    migrationBuilder.DropTable(
        name: "Settings");
  }
}
