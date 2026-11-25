using MediLink.Api.Contracts;
using MediLink.Api.Data;
using MediLink.Api.Domain;
using MediLink.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediLink.Api.Controllers;

[ApiController, Route("api/v1/estudios"), Authorize(Policy = "Lab")]
public sealed class EstudiosController(MediLinkDbContext db) : ControllerBase
{
    [HttpGet]
    public Task<Page<EstudioDto>> List([FromQuery(Name = "")] PageQuery page, CancellationToken ct)
    {
        var query = db.Estudios.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(page.Q))
        {
            var q = page.Q.Trim().ToLowerInvariant();
            query = query.Where(x => x.Clave.ToLower().Contains(q) || x.Nombre.ToLower().Contains(q) || x.Area.ToLower().Contains(q));
        }
        return query.OrderBy(x => x.Nombre).ThenBy(x => x.Id).Page(page, Dto.ToDto, ct);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EstudioDto>> Get(string id, CancellationToken ct) =>
        (await db.Estudios.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound()).ToDto();

    [HttpPost]
    public async Task<ActionResult<EstudioDto>> Create(EstudioRequest request, CancellationToken ct)
    {
        var item = new Estudio(); Apply(item, request); db.Estudios.Add(item);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = item.Id }, item.ToDto());
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<EstudioDto>> Update(string id, EstudioRequest request, CancellationToken ct)
    {
        var item = await db.Estudios.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound();
        Apply(item, request); await db.SaveChangesAsync(ct); return item.ToDto();
    }

    private static void Apply(Estudio x, EstudioRequest r)
    {
        if (decimal.Round(r.Precio, 2) != r.Precio) throw ApiException.Invalid("El precio admite hasta dos decimales.");
        x.Clave = r.Clave.Trim().ToUpperInvariant(); x.Nombre = r.Nombre.Trim(); x.Area = r.Area.Trim();
        x.Precio = r.Precio; x.DiasEntrega = r.DiasEntrega; x.Dicom = r.Dicom; x.Indicaciones = r.Indicaciones?.Trim();
    }
}
