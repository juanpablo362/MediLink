using MediLink.Api.Contracts;
using MediLink.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediLink.Api.Controllers;

[ApiController, Route("api/v1/institucion"), Authorize(Policy = "Lab")]
public sealed class InstitucionController(MediLinkDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<InstitucionDto>> Get(CancellationToken ct) => (await db.Instituciones.AsNoTracking().SingleAsync(ct)).ToDto();

    [HttpPut, Authorize(Roles = "admin")]
    public async Task<ActionResult<InstitucionDto>> Update(InstitucionRequest r, CancellationToken ct)
    {
        var x = await db.Instituciones.SingleAsync(ct);
        x.Nombre = r.Nombre.Trim(); x.RazonSocial = r.RazonSocial.Trim(); x.Rfc = r.Rfc.Trim().ToUpperInvariant();
        x.Telefono = r.Telefono.Trim(); x.Correo = r.Correo.Trim(); x.Direccion = r.Direccion.Trim(); x.VigenciaEnlaceDias = r.VigenciaEnlaceDias;
        await db.SaveChangesAsync(ct); return x.ToDto();
    }
}
