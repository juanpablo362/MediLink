using MediLink.Api.Contracts;
using MediLink.Api.Data;
using MediLink.Api.Domain;
using MediLink.Api.Security;
using MediLink.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediLink.Api.Controllers;

[ApiController, Route("api/v1/enlaces"), Authorize(Policy = "Lab")]
public sealed class EnlacesController(MediLinkDbContext db, CurrentAccess access, TimeProvider clock) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<EnlaceDto>> Create(EnlaceRequest request, CancellationToken ct)
    {
        await access.RequireBranch(request.SucursalId, ct);
        var query = access.Orders().Where(x => x.PacienteId == request.PacienteId && x.SucursalId == request.SucursalId && x.Estado == "cerrada");
        if (request.OrdenId is not null) query = query.Where(x => x.Id == request.OrdenId);
        if (!await query.AnyAsync(ct)) throw ApiException.Invalid("El paciente no tiene resultados listos dentro del alcance solicitado.");
        var token = TokenService.NewLinkToken();
        var now = clock.GetUtcNow().UtcDateTime;
        var days = await db.Instituciones.Select(x => x.VigenciaEnlaceDias).SingleAsync(ct);
        var link = new EnlaceSeguro
        {
            TokenHash = TokenService.Hash(token), PacienteId = request.PacienteId, SucursalId = request.SucursalId,
            OrdenId = request.OrdenId, Creado = now, Expira = now.AddDays(days)
        };
        db.Enlaces.Add(link);
        if (request.OrdenId is not null)
            db.Actividad.Add(new() { OrdenId = request.OrdenId, UsuarioId = access.Id, Tipo = "enlace-compartido", Descripcion = "Enlace de resultados generado", Fecha = now });
        await db.SaveChangesAsync(ct);
        return StatusCode(201, new EnlaceDto(link.Id, token, link.PacienteId, link.Creado, link.Expira));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Revoke(string id, CancellationToken ct)
    {
        var link = await db.Enlaces.SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound();
        await access.RequireBranch(link.SucursalId, ct);
        link.Revocado = true; await db.SaveChangesAsync(ct); return NoContent();
    }
}
