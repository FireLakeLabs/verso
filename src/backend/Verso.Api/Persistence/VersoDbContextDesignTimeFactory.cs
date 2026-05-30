namespace Verso.Api;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

public sealed class VersoDbContextDesignTimeFactory : IDesignTimeDbContextFactory<VersoDbContext>
{
    public VersoDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<VersoDbContext>();
        optionsBuilder.UseSqlite("Data Source=verso.db");
        return new VersoDbContext(optionsBuilder.Options);
    }
}