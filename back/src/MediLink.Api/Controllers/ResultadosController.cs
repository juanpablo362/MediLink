using System.ComponentModel.DataAnnotations;
using MediLink.Api.Contracts;
using MediLink.Api.Data;
using MediLink.Api.Domain;
using MediLink.Api.Security;
using MediLink.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace MediLink.Api.Controllers;

[ApiController, Route("api/v1/resultados"), AllowAnonymous, EnableRateLimiting("public")]
public sealed class ResultadosController(MediLinkDbContext db, TimeProvider clock, ResultStorage storage) : ControllerBase
{
    [HttpGet("contacto")]
    public async Task<IActionResult> Contact(CancellationToken ct) => Ok(await db.Instituciones.AsNoTracking()
        .Select(x => new { x.Nombre, x.Telefono, x.Correo }).SingleAsync(ct));

    [HttpGet("{token}")]
    public async Task<ActionResult<ResultadosDto>> Resolve([StringLength(100)] string token, CancellationToken ct)
    {
        var link = await ResolveLink(token, ct);
        var patient = await db.Pacientes.AsNoTracking().SingleAsync(x => x.Id == link.PacienteId, ct);
        var orders = await Orders(link).Include(x => x.Estudios).ThenInclude(x => x.Estudio)
            .Include(x => x.Estudios).ThenInclude(x => x.Adjuntos).AsSplitQuery().OrderByDescending(x => x.Folio).ToListAsync(ct);
        return new ResultadosDto("ok", $"{patient.Nombre} {patient.Apellidos}", link.Expira,
            orders.Select(x => new ResultadoOrdenDto(x.Id, x.Folio, x.FechaEntrega,
                x.Estudios.Select(e => new ResultadoEstudioDto(e.EstudioId, e.Estudio.Clave, e.Estudio.Nombre, e.Estudio.Dicom,
                    e.Adjuntos.Select(Dto.ToDto).ToList())).ToList())).ToList());
    }

    [HttpGet("{token}/archivos/{adjuntoId}")]
    public async Task<IActionResult> Download([StringLength(100)] string token, string adjuntoId, CancellationToken ct)
    {
        var link = await ResolveLink(token, ct);
        var attachment = await Orders(link).SelectMany(x => x.Estudios).SelectMany(x => x.Adjuntos)
            .SingleOrDefaultAsync(x => x.Id == adjuntoId, ct) ?? throw ApiException.NotFound();
        return File(storage.Open(attachment.StorageKey), attachment.Tipo == "pdf" ? "application/pdf" : "application/dicom", attachment.Nombre, enableRangeProcessing: true);
    }

    private async Task<EnlaceSeguro> ResolveLink(string token, CancellationToken ct)
    {
        if (token.Length != 43) throw ApiException.NotFound();
        var hash = TokenService.Hash(token);
        var link = await db.Enlaces.AsNoTracking().SingleOrDefaultAsync(x => x.TokenHash == hash, ct) ?? throw ApiException.NotFound();
        if (link.Revocado || link.Expira <= clock.GetUtcNow().UtcDateTime) throw new ApiException(410, "El enlace venció o fue revocado. Contacta al laboratorio.");
        return link;
    }

    private IQueryable<Orden> Orders(EnlaceSeguro link) => db.Ordenes.AsNoTracking().Where(x => x.PacienteId == link.PacienteId
        && x.SucursalId == link.SucursalId && x.Estado == "cerrada" && (link.OrdenId == null || x.Id == link.OrdenId));
}
