using MediLink.Api.Contracts;
using MediLink.Api.Data;
using MediLink.Api.Domain;
using MediLink.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediLink.Api.Controllers;

[ApiController, Route("api/v1/medicos"), Authorize(Policy = "Lab")]
public sealed class MedicosController(MediLinkDbContext db, IPasswordHasher<Cuenta> passwords) : ControllerBase
{
    [HttpGet]
    public Task<Page<MedicoDto>> List([FromQuery(Name = "")] PageQuery page, CancellationToken ct)
    {
        var query = db.Medicos.AsNoTracking().Include(x => x.Cuenta).AsQueryable();
        if (!string.IsNullOrWhiteSpace(page.Q))
        {
            var q = page.Q.Trim().ToLowerInvariant();
            query = query.Where(x => x.Cuenta.Nombre.ToLower().Contains(q) || x.Cedula.Contains(q) || x.Especialidad.ToLower().Contains(q));
        }
        return query.OrderBy(x => x.Cuenta.Nombre).ThenBy(x => x.Id).Page(page, Dto.ToDto, ct);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MedicoDto>> Get(string id, CancellationToken ct) =>
        (await db.Medicos.AsNoTracking().Include(x => x.Cuenta).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound()).ToDto();

    [HttpPost, Authorize(Roles = "admin")]
    public async Task<ActionResult<MedicoDto>> Create(MedicoRequest request, CancellationToken ct)
    {
        var account = new Cuenta { Rol = "medico" };
        AccountEditor.Apply(account, request, passwords, creating: true);
        var item = new Medico { Id = account.Id, Cuenta = account };
        Apply(item, request); db.Medicos.Add(item); await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = item.Id }, item.ToDto());
    }

    [HttpPut("{id}"), Authorize(Roles = "admin")]
    public async Task<ActionResult<MedicoDto>> Update(string id, MedicoRequest request, CancellationToken ct)
    {
        var item = await db.Medicos.Include(x => x.Cuenta).SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound();
        AccountEditor.Apply(item.Cuenta, request, passwords, creating: false);
        Apply(item, request); await db.SaveChangesAsync(ct); return item.ToDto();
    }

    private static void Apply(Medico item, MedicoRequest r)
    { item.Especialidad = r.Especialidad.Trim(); item.Cedula = r.Cedula; item.Telefono = r.Telefono.Trim(); }
}
