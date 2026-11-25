using MediLink.Api.Contracts;
using MediLink.Api.Data;
using MediLink.Api.Domain;
using MediLink.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediLink.Api.Controllers;

[ApiController, Route("api/v1/pacientes"), Authorize(Policy = "Lab")]
public sealed class PacientesController(MediLinkDbContext db, TimeProvider clock) : ControllerBase
{
    [HttpGet]
    public Task<Page<PacienteDto>> List([FromQuery(Name = "")] PageQuery page, CancellationToken ct)
    {
        var query = db.Pacientes.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(page.Q))
        {
            var q = page.Q.Trim().ToLowerInvariant();
            query = query.Where(x => (x.Nombre + " " + x.Apellidos).ToLower().Contains(q) || x.Telefono.Contains(q) || x.Correo.ToLower().Contains(q));
        }
        return query.OrderBy(x => x.Apellidos).ThenBy(x => x.Id).Page(page, Dto.ToDto, ct);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PacienteDto>> Get(string id, CancellationToken ct) =>
        (await db.Pacientes.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound()).ToDto();

    [HttpPost]
    public async Task<ActionResult<PacienteDto>> Create(PacienteRequest request, CancellationToken ct)
    {
        var item = new Paciente();
        Apply(item, request);
        db.Pacientes.Add(item);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = item.Id }, item.ToDto());
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PacienteDto>> Update(string id, PacienteRequest request, CancellationToken ct)
    {
        var item = await db.Pacientes.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound();
        Apply(item, request);
        await db.SaveChangesAsync(ct);
        return item.ToDto();
    }

    private void Apply(Paciente item, PacienteRequest r)
    {
        var today = DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);
        if (r.FechaNacimiento > today || r.FechaNacimiento < today.AddYears(-130))
            throw ApiException.Invalid("La fecha de nacimiento debe estar dentro de los últimos 130 años.");
        item.Nombre = r.Nombre.Trim(); item.Apellidos = r.Apellidos.Trim(); item.FechaNacimiento = r.FechaNacimiento!.Value;
        item.Sexo = r.Sexo; item.Telefono = r.Telefono.Trim(); item.Correo = r.Correo?.Trim() ?? "";
    }
}
