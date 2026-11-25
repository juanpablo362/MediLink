using MediLink.Api.Contracts;
using MediLink.Api.Data;
using MediLink.Api.Domain;
using MediLink.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace MediLink.Api.Controllers;

[ApiController, Route("api/v1/auth")]
public sealed class AuthController(MediLinkDbContext db, IPasswordHasher<Cuenta> passwords,
    TokenService tokens, CurrentAccess access, TimeProvider clock) : ControllerBase
{
    private static readonly Cuenta Dummy = new();
    private static readonly string DummyHash = new PasswordHasher<Cuenta>().HashPassword(Dummy, Guid.NewGuid().ToString());

    [HttpPost("login"), AllowAnonymous, EnableRateLimiting("login")]
    public async Task<ActionResult<TokenDto>> Login(LoginRequest request, CancellationToken ct)
    {
        var username = request.Usuario.Trim().ToUpperInvariant();
        var account = await db.Cuentas.SingleOrDefaultAsync(x => x.UsuarioNormalizado == username, ct);
        var verification = passwords.VerifyHashedPassword(account ?? Dummy, account?.PasswordHash ?? DummyHash, request.Contrasena);
        var now = clock.GetUtcNow().UtcDateTime;
        if (account is null || !account.Activo || (account.BloqueadoHasta is { } blocked && blocked > now)
            || (request.Tipo == "medico") != (account.Rol == "medico"))
            return Unauthorized(new ProblemDetails { Status = 401, Title = "Usuario o contraseña incorrectos." });
        if (verification == PasswordVerificationResult.Failed)
        {
            account.Fallos++;
            if (account.Fallos >= 5) { account.Fallos = 0; account.BloqueadoHasta = now.AddMinutes(15); }
            await db.SaveChangesAsync(ct);
            return Unauthorized(new ProblemDetails { Status = 401, Title = "Usuario o contraseña incorrectos." });
        }
        account.Fallos = 0;
        account.BloqueadoHasta = null;
        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
            account.PasswordHash = passwords.HashPassword(account, request.Contrasena);
        await db.SaveChangesAsync(ct);
        var session = await Session(account, ct);
        if (account.Rol != "medico" && session.Sucursales.Count == 0)
            return StatusCode(403, new ProblemDetails { Status = 403, Title = "Tu cuenta no tiene sucursales asignadas." });
        var (token, expires) = tokens.Create(account);
        return new TokenDto(token, "Bearer", expires, session);
    }

    [HttpGet("me")]
    public async Task<ActionResult<SesionDto>> Me(CancellationToken ct) =>
        await Session(await db.Cuentas.SingleAsync(x => x.Id == access.Id, ct), ct);

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        var account = await db.Cuentas.SingleAsync(x => x.Id == access.Id, ct);
        account.SecurityStamp = Guid.NewGuid().ToString("N");
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<SesionDto> Session(Cuenta account, CancellationToken ct)
    {
        var branches = await db.Sucursales.AsNoTracking().Include(x => x.Asignaciones)
            .Where(x => x.Asignaciones.Any(a => a.UsuarioId == account.Id)).OrderBy(x => x.Nombre).ToListAsync(ct);
        // Login only needs the user's own assignment, never another user's identity.
        return new(account.Id, account.Nombre, account.Rol == "medico" ? "medico" : "lab", account.Rol,
            branches.Select(x => new SucursalDto(x.Id, x.Nombre, x.Direccion, x.Telefono, [account.Id])).ToList());
    }
}
