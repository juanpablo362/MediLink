using MediLink.Api.Contracts;
using MediLink.Api.Data;
using MediLink.Api.Domain;
using MediLink.Api.Security;
using MediLink.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediLink.Api.Controllers;

[ApiController, Route("api/v1/usuarios"), Authorize(Roles = "admin")]
public sealed class UsuariosController(MediLinkDbContext db, IPasswordHasher<Cuenta> passwords, CurrentAccess access) : ControllerBase
{
    [HttpGet]
    public Task<Page<UsuarioDto>> List([FromQuery(Name = "")] PageQuery page, CancellationToken ct)
    {
        var query = db.Cuentas.AsNoTracking().Where(x => x.Rol != "medico");
        if (!string.IsNullOrWhiteSpace(page.Q))
        {
            var q = page.Q.Trim().ToLowerInvariant();
            query = query.Where(x => x.Nombre.ToLower().Contains(q) || x.Usuario.ToLower().Contains(q));
        }
        return query.OrderBy(x => x.Nombre).ThenBy(x => x.Id).Page(page, Dto.ToDto, ct);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UsuarioDto>> Get(string id, CancellationToken ct) =>
        (await db.Cuentas.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id && x.Rol != "medico", ct) ?? throw ApiException.NotFound()).ToDto();

    [HttpPost]
    public async Task<ActionResult<UsuarioDto>> Create(UsuarioRequest request, CancellationToken ct)
    {
        var account = new Cuenta { Rol = request.Rol };
        AccountEditor.Apply(account, request, passwords, creating: true); db.Cuentas.Add(account);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = account.Id }, account.ToDto());
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<UsuarioDto>> Update(string id, UsuarioRequest request, CancellationToken ct)
    {
        var account = await db.Cuentas.SingleOrDefaultAsync(x => x.Id == id && x.Rol != "medico", ct) ?? throw ApiException.NotFound();
        if (id == access.Id && (!request.Activo || request.Rol != "admin"))
            throw ApiException.Conflict("No puedes desactivar ni quitar el rol de tu propia cuenta administradora.");
        AccountEditor.Apply(account, request, passwords, creating: false); account.Rol = request.Rol;
        await db.SaveChangesAsync(ct); return account.ToDto();
    }
}
