using MediLink.Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace MediLink.Api.Data;

public static class DatabaseSetup
{
    public static async Task Initialize(IServiceProvider services, IConfiguration config, CancellationToken ct = default)
    {
        await using var scope = services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<MediLinkDbContext>();
        await db.Database.MigrateAsync(ct);
        if (!await db.Instituciones.AnyAsync(ct)) db.Instituciones.Add(new());
        if (!await db.Consecutivos.AnyAsync(ct)) db.Consecutivos.Add(new());
        if (config.GetValue<bool>("Bootstrap:Enabled") && !await db.Cuentas.AnyAsync(ct))
        {
            var password = config["Bootstrap:Password"];
            if (string.IsNullOrWhiteSpace(password) || password.Length < 12 || password.Length > 128)
                throw new InvalidOperationException("Define Bootstrap__Password (12–128 caracteres) para crear el primer administrador.");
            var usuario = config["Bootstrap:Usuario"] ?? "admin";
            var cuenta = new Cuenta
            {
                Nombre = config["Bootstrap:Nombre"] ?? "Administración MediLink", Usuario = usuario,
                UsuarioNormalizado = usuario.Trim().ToUpperInvariant(), Correo = config["Bootstrap:Correo"] ?? "admin@example.test", Rol = "admin"
            };
            cuenta.PasswordHash = scope.ServiceProvider.GetRequiredService<IPasswordHasher<Cuenta>>().HashPassword(cuenta, password);
            db.Cuentas.Add(cuenta);
            db.Sucursales.Add(new Sucursal { Nombre = "Sucursal principal", Direccion = "Por configurar", Asignaciones = [new() { UsuarioId = cuenta.Id }] });
        }
        await db.SaveChangesAsync(ct);
    }
}
