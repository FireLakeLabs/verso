using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Verso.Api.Persistence.Migrations;

/// <inheritdoc />
public partial class InitialAudibleImportBaseline : Migration
{
  /// <inheritdoc />
  protected override void Up(MigrationBuilder migrationBuilder)
  {
    migrationBuilder.CreateTable(
        name: "AudibleAuthenticationStates",
        columns: table => new
        {
          Id = table.Column<int>(type: "INTEGER", nullable: false)
                .Annotation("Sqlite:Autoincrement", true),
          Locale = table.Column<string>(type: "TEXT", maxLength: 16, nullable: false),
          IdentityFilePath = table.Column<string>(type: "TEXT", maxLength: 1024, nullable: false),
          AuthenticatedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
        },
        constraints: table =>
        {
          table.PrimaryKey("PK_AudibleAuthenticationStates", x => x.Id);
        });

    migrationBuilder.CreateTable(
        name: "AudibleItems",
        columns: table => new
        {
          Asin = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
          Title = table.Column<string>(type: "TEXT", maxLength: 512, nullable: false),
          RuntimeMinutes = table.Column<int>(type: "INTEGER", nullable: false),
          PercentComplete = table.Column<int>(type: "INTEGER", nullable: false),
          RawAudiblePayload = table.Column<string>(type: "TEXT", nullable: false)
        },
        constraints: table =>
        {
          table.PrimaryKey("PK_AudibleItems", x => x.Asin);
        });

    migrationBuilder.CreateTable(
        name: "AudibleItemContributors",
        columns: table => new
        {
          Id = table.Column<long>(type: "INTEGER", nullable: false)
                .Annotation("Sqlite:Autoincrement", true),
          AudibleItemAsin = table.Column<string>(type: "TEXT", nullable: false),
          Role = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false),
          Name = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false)
        },
        constraints: table =>
        {
          table.PrimaryKey("PK_AudibleItemContributors", x => x.Id);
          table.ForeignKey(
                  name: "FK_AudibleItemContributors_AudibleItems_AudibleItemAsin",
                  column: x => x.AudibleItemAsin,
                  principalTable: "AudibleItems",
                  principalColumn: "Asin",
                  onDelete: ReferentialAction.Cascade);
        });

    migrationBuilder.CreateIndex(
        name: "IX_AudibleItemContributors_AudibleItemAsin_Role_Name",
        table: "AudibleItemContributors",
        columns: new[] { "AudibleItemAsin", "Role", "Name" },
        unique: true);
  }

  /// <inheritdoc />
  protected override void Down(MigrationBuilder migrationBuilder)
  {
    migrationBuilder.DropTable(
        name: "AudibleAuthenticationStates");

    migrationBuilder.DropTable(
        name: "AudibleItemContributors");

    migrationBuilder.DropTable(
        name: "AudibleItems");
  }
}
