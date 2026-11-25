using MediLink.Api.Contracts;
using MediLink.Api.Data;
using MediLink.Api.Domain;
using MediLink.Api.Security;
using MediLink.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediLink.Api.Controllers;

[ApiController, Route("api/v1/sucursales"), Authorize(Policy = "Lab")]
public sealed class SucursalesController(MediLinkDbContext db, CurrentAccess access) : ControllerBase
{
    [HttpGet]
    public Task<Page<SucursalDto>> List([FromQuery(Name = "")] PageQuery page, CancellationToken ct)
    {
        var query = db.Sucursales.AsNoTracking().Include(x => x.Asignaciones).AsQueryable();
        if (!User.IsInRole("admin")) query = query.Where(x => x.Asignaciones.Any(a => a.UsuarioId == access.Id));
        if (!string.IsNullOrWhiteSpace(page.Q)) query = query.Where(x => x.Nombre.ToLower().Contains(page.Q.ToLower()));
        return query.OrderBy(x => x.Nombre).ThenBy(x => x.Id).Page(page, Map, ct);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SucursalDto>> Get(string id, CancellationToken ct)
    {
        if (!User.IsInRole("admin")) await access.RequireBranch(id, ct);
        return Map(await db.Sucursales.AsNoTracking().Include(x => x.Asignaciones).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound());
    }

    [HttpPost, Authorize(Roles = "admin")]
    public async Task<ActionResult<SucursalDto>> Create(SucursalRequest request, CancellationToken ct)
    {
        var item = new Sucursal(); await Apply(item, request, ct); db.Sucursales.Add(item);
        await db.SaveChangesAsync(ct); return CreatedAtAction(nameof(Get), new { id = item.Id }, item.ToDto());
    }

    [HttpPut("{id}"), Authorize(Roles = "admin")]
    public async Task<ActionResult<SucursalDto>> Update(string id, SucursalRequest request, CancellationToken ct)
    {
        var item = await db.Sucursales.Include(x => x.Asignaciones).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound();
        if (item.Asignaciones.Any(x => x.UsuarioId == access.Id) && !request.UsuarioIds.Contains(access.Id)
            && !await db.Asignaciones.AnyAsync(x => x.UsuarioId == access.Id && x.SucursalId != id, ct))
            throw ApiException.Conflict("Debes conservar al menos una sucursal asignada a tu cuenta.");
        await Apply(item, request, ct); await db.SaveChangesAsync(ct); return item.ToDto();
    }

    private async Task Apply(Sucursal item, SucursalRequest r, CancellationToken ct)
    {
        var ids = r.UsuarioIds.Distinct().ToList();
        if (ids.Count != r.UsuarioIds.Count || await db.Cuentas.CountAsync(x => ids.Contains(x.Id) && x.Rol != "medico", ct) != ids.Count)
            throw ApiException.Invalid("Las asignaciones deben contener usuarios de laboratorio válidos, sin duplicados.");
        item.Nombre = r.Nombre.Trim(); item.Direccion = r.Direccion.Trim(); item.Telefono = r.Telefono.Trim();
        item.Asignaciones.RemoveAll(x => !ids.Contains(x.UsuarioId));
        foreach (var id in ids.Where(id => item.Asignaciones.All(x => x.UsuarioId != id)))
            item.Asignaciones.Add(new() { UsuarioId = id, SucursalId = item.Id });
    }

    private SucursalDto Map(Sucursal x) => User.IsInRole("admin") ? x.ToDto()
        : new(x.Id, x.Nombre, x.Direccion, x.Telefono, [access.Id]);
}
