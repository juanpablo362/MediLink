using MediLink.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace MediLink.Api.Data;

public abstract class MediLinkDbContext(DbContextOptions options) : DbContext(options)
{
    public DbSet<Cuenta> Cuentas => Set<Cuenta>();
    public DbSet<Paciente> Pacientes => Set<Paciente>();
    public DbSet<Medico> Medicos => Set<Medico>();
    public DbSet<Estudio> Estudios => Set<Estudio>();
    public DbSet<Sucursal> Sucursales => Set<Sucursal>();
    public DbSet<AsignacionSucursal> Asignaciones => Set<AsignacionSucursal>();
    public DbSet<Institucion> Instituciones => Set<Institucion>();
    public DbSet<Orden> Ordenes => Set<Orden>();
    public DbSet<Adjunto> Adjuntos => Set<Adjunto>();
    public DbSet<EnlaceSeguro> Enlaces => Set<EnlaceSeguro>();
    public DbSet<Actividad> Actividad => Set<Actividad>();
    public DbSet<Consecutivo> Consecutivos => Set<Consecutivo>();

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder) =>
        configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Cuenta>().HasIndex(x => x.UsuarioNormalizado).IsUnique();
        b.Entity<Cuenta>().Property(x => x.UsuarioNormalizado).HasMaxLength(80);
        b.Entity<Medico>().HasOne(x => x.Cuenta).WithOne().HasForeignKey<Medico>(x => x.Id).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Medico>().HasIndex(x => x.Cedula).IsUnique();
        b.Entity<Estudio>().HasIndex(x => x.Clave).IsUnique();
        b.Entity<Estudio>().Property(x => x.Precio).HasPrecision(12, 2);
        b.Entity<AsignacionSucursal>().HasKey(x => new { x.SucursalId, x.UsuarioId });
        b.Entity<Sucursal>().HasMany(x => x.Asignaciones).WithOne().HasForeignKey(x => x.SucursalId);
        b.Entity<AsignacionSucursal>().HasOne<Cuenta>().WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Institucion>().Property(x => x.Id).ValueGeneratedNever();
        b.Entity<Consecutivo>().Property(x => x.Id).ValueGeneratedNever();
        b.Entity<Orden>().HasIndex(x => x.Folio).IsUnique();
        b.Entity<Orden>().HasIndex(x => new { x.SucursalId, x.Estado, x.FechaEntrega });
        b.Entity<Orden>().HasIndex(x => x.MedicoId);
        b.Entity<Orden>().Property(x => x.Revision).IsConcurrencyToken();
        b.Entity<Orden>().Property(x => x.Total).HasPrecision(12, 2);
        b.Entity<Orden>().HasOne(x => x.Paciente).WithMany().HasForeignKey(x => x.PacienteId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Orden>().HasOne<Medico>().WithMany().HasForeignKey(x => x.MedicoId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Orden>().HasOne<Sucursal>().WithMany().HasForeignKey(x => x.SucursalId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Orden>().HasMany(x => x.Estudios).WithOne().HasForeignKey(x => x.OrdenId);
        b.Entity<OrdenEstudio>().HasKey(x => new { x.OrdenId, x.EstudioId });
        b.Entity<OrdenEstudio>().Property(x => x.Precio).HasPrecision(12, 2);
        b.Entity<OrdenEstudio>().HasOne(x => x.Estudio).WithMany().HasForeignKey(x => x.EstudioId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<OrdenEstudio>().HasMany(x => x.Adjuntos).WithOne().HasForeignKey(x => new { x.OrdenId, x.EstudioId });
        b.Entity<EnlaceSeguro>().HasIndex(x => x.TokenHash).IsUnique();
        b.Entity<EnlaceSeguro>().HasOne<Paciente>().WithMany().HasForeignKey(x => x.PacienteId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<EnlaceSeguro>().HasOne<Sucursal>().WithMany().HasForeignKey(x => x.SucursalId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<EnlaceSeguro>().HasOne<Orden>().WithMany().HasForeignKey(x => x.OrdenId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<Actividad>().HasOne<Orden>().WithMany().HasForeignKey(x => x.OrdenId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<Actividad>().HasOne<Cuenta>().WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Actividad>().HasIndex(x => x.Fecha);
    }
}

public sealed class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
    value => value.Kind == DateTimeKind.Utc ? value : value.ToUniversalTime(),
    value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

public sealed class SqliteDbContext(DbContextOptions<SqliteDbContext> options) : MediLinkDbContext(options);
public sealed class PostgresDbContext(DbContextOptions<PostgresDbContext> options) : MediLinkDbContext(options);

// EF commands never need production credentials to generate migrations or SQL.
public sealed class SqliteDesignFactory : IDesignTimeDbContextFactory<SqliteDbContext>
{
    public SqliteDbContext CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<SqliteDbContext>()
        .UseSqlite("Data Source=App_Data/medilink.db").Options);
}

public sealed class PostgresDesignFactory : IDesignTimeDbContextFactory<PostgresDbContext>
{
    public PostgresDbContext CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<PostgresDbContext>()
        .UseNpgsql(Environment.GetEnvironmentVariable("ConnectionStrings__MediLink")
            ?? "Host=localhost;Database=medilink;Username=medilink").Options);
}
