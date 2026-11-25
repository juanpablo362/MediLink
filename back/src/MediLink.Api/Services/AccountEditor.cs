using MediLink.Api.Contracts;
using MediLink.Api.Domain;
using Microsoft.AspNetCore.Identity;

namespace MediLink.Api.Services;

public static class AccountEditor
{
    public static void Apply(Cuenta account, AccesoRequest r, IPasswordHasher<Cuenta> passwords, bool creating)
    {
        if (creating && string.IsNullOrWhiteSpace(r.Contrasena)) throw ApiException.Invalid("La contraseña inicial es obligatoria (12–128 caracteres).");
        if (r.Contrasena is not null && string.IsNullOrWhiteSpace(r.Contrasena)) throw ApiException.Invalid("La contraseña no puede contener solo espacios.");
        account.Nombre = r.Nombre.Trim(); account.Correo = r.Correo.Trim(); account.Usuario = r.Usuario.Trim();
        account.UsuarioNormalizado = account.Usuario.ToUpperInvariant(); account.Activo = r.Activo;
        account.SecurityStamp = Guid.NewGuid().ToString("N");
        if (r.Contrasena is not null)
        {
            account.PasswordHash = passwords.HashPassword(account, r.Contrasena);
            account.Fallos = 0; account.BloqueadoHasta = null;
        }
    }
}
