using System.ComponentModel.DataAnnotations;
using MediLink.Api.Contracts;
using MediLink.Api.Data;
using MediLink.Api.Domain;
using MediLink.Api.Security;
using MediLink.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediLink.Api.Controllers;

[ApiController, Route("api/v1/ordenes")]
public sealed class OrdenesController(MediLinkDbContext db, CurrentAccess access, TimeProvider clock,
    ResultStorage storage, ILogger<OrdenesController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<Page<OrdenDto>> List([FromQuery(Name = "")] PageQuery page, [FromQuery, StringLength(32)] string? sucursalId,
        [FromQuery, RegularExpression("^(abierta|cerrada)$")] string? estado, [FromQuery] DateTimeOffset? desde,
        [FromQuery] DateTimeOffset? hasta, CancellationToken ct)
    {
        if (desde > hasta) throw ApiException.Invalid("El inicio del rango debe ser anterior al final.");
        var query = access.Orders().AsNoTracking();
        if (!access.IsDoctor)
        {
            if (string.IsNullOrWhiteSpace(sucursalId)) throw ApiException.Invalid("Indica sucursalId.");
            await access.RequireBranch(sucursalId, ct);
        }
        if (sucursalId is not null) query = query.Where(x => x.SucursalId == sucursalId);
        if (estado is not null) query = query.Where(x => x.Estado == estado);
        if (desde.HasValue) { var start = desde.Value.UtcDateTime; query = query.Where(x => x.FechaRegistro >= start); }
        if (hasta.HasValue) { var end = hasta.Value.UtcDateTime; query = query.Where(x => x.FechaRegistro <= end); }
        if (!string.IsNullOrWhiteSpace(page.Q))
        {
            var q = page.Q.Trim().ToLowerInvariant();
            var folio = int.TryParse(q, out var f) ? f : -1;
            query = query.Where(x => x.Folio == folio || (x.Paciente.Nombre + " " + x.Paciente.Apellidos).ToLower().Contains(q));
        }
        return await query.Include(x => x.Paciente).Include(x => x.Estudios).ThenInclude(x => x.Estudio)
            .Include(x => x.Estudios).ThenInclude(x => x.Adjuntos).AsSplitQuery()
            .OrderByDescending(x => x.Folio).Page(page, Dto.ToDto, ct);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OrdenDto>> Get(string id, CancellationToken ct) => (await access.Order(id, ct)).ToDto();

    [HttpPost, Authorize(Policy = "Lab")]
    public async Task<ActionResult<OrdenDto>> Create(NuevaOrdenRequest r, CancellationToken ct)
    {
        await access.RequireBranch(r.SucursalId, ct);
        var patient = await db.Pacientes.SingleOrDefaultAsync(x => x.Id == r.PacienteId, ct) ?? throw ApiException.Invalid("El paciente no existe.");
        if (r.MedicoId is not null && !await db.Medicos.AnyAsync(x => x.Id == r.MedicoId && x.Cuenta.Activo, ct))
            throw ApiException.Invalid("El médico no existe o está desactivado.");
        if (r.MedicoId is not null && !string.IsNullOrWhiteSpace(r.MedicoExterno))
            throw ApiException.Invalid("Selecciona un médico registrado o un médico externo.");
        var now = clock.GetUtcNow().UtcDateTime;
        if (r.FechaEntrega!.Value.UtcDateTime < now) throw ApiException.Invalid("La fecha de entrega no puede estar en el pasado.");
        if (!r.Entrega!.Impreso && !r.Entrega.Correo && !r.Entrega.Whatsapp) throw ApiException.Invalid("Selecciona al menos una forma de entrega.");
        var studies = await db.Estudios.Where(x => r.EstudioIds.Contains(x.Id)).ToListAsync(ct);
        if (r.EstudioIds.Distinct().Count() != r.EstudioIds.Count || studies.Count != r.EstudioIds.Count)
            throw ApiException.Invalid("Los estudios deben existir y no pueden repetirse.");
        // Atomic counter allocation prevents duplicate folios under concurrent requests.
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await db.Consecutivos.Where(x => x.Id == 1).ExecuteUpdateAsync(s => s.SetProperty(x => x.Valor, x => x.Valor + 1), ct);
        var order = new Orden
        {
            Folio = await db.Consecutivos.Where(x => x.Id == 1).Select(x => x.Valor).SingleAsync(ct),
            PacienteId = r.PacienteId, Paciente = patient, MedicoId = r.MedicoId, MedicoExterno = r.MedicoExterno?.Trim(), SucursalId = r.SucursalId,
            FechaRegistro = now, FechaEntrega = r.FechaEntrega.Value.UtcDateTime,
            EntregaImpreso = r.Entrega.Impreso, EntregaCorreo = r.Entrega.Correo, EntregaWhatsapp = r.Entrega.Whatsapp,
            Total = studies.Sum(x => x.Precio), Notas = r.Notas.Trim(),
            Estudios = studies.Select(x => new OrdenEstudio { EstudioId = x.Id, Estudio = x, Precio = x.Precio }).ToList()
        };
        db.Ordenes.Add(order); Record(order, "orden-creada", "Orden registrada");
        await db.SaveChangesAsync(ct); await tx.CommitAsync(ct);
        return CreatedAtAction(nameof(Get), new { id = order.Id }, order.ToDto());
    }

    [HttpPost("{id}/cerrar"), Authorize(Policy = "Lab")]
    public async Task<ActionResult<OrdenDto>> Close(string id, CancellationToken ct)
    {
        var order = await access.Order(id, ct);
        if (order.Estado != "abierta") throw ApiException.Conflict("La orden ya está lista.");
        if (order.Estudios.Count == 0 || order.Estudios.Any(x => x.Adjuntos.Count == 0))
            throw ApiException.Conflict("Cada estudio necesita al menos un resultado para cerrar la orden.");
        order.Estado = "cerrada"; order.FechaCierre = clock.GetUtcNow().UtcDateTime;
        Record(order, "orden-cerrada", "Resultados listos"); await db.SaveChangesAsync(ct); return order.ToDto();
    }

    [HttpPost("{id}/reabrir"), Authorize(Policy = "Lab")]
    public async Task<ActionResult<OrdenDto>> Reopen(string id, CancellationToken ct)
    {
        var order = await access.Order(id, ct);
        if (order.Estado != "cerrada") throw ApiException.Conflict("La orden ya está en proceso.");
        order.Estado = "abierta"; order.FechaCierre = null;
        Record(order, "orden-reabierta", "Orden reabierta"); await db.SaveChangesAsync(ct); return order.ToDto();
    }

    [HttpDelete("{id}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var order = await access.Order(id, ct);
        var keys = order.Estudios.SelectMany(x => x.Adjuntos).Select(x => x.StorageKey).ToList();
        db.Ordenes.Remove(order); await db.SaveChangesAsync(ct);
        foreach (var key in keys) Cleanup(key);
        return NoContent();
    }

    [HttpPost("{id}/estudios/{estudioId}/adjuntos"), Authorize(Policy = "Lab")]
    [RequestSizeLimit(ResultStorage.MaxFileBytes + 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = ResultStorage.MaxFileBytes + 1024 * 1024)]
    public async Task<ActionResult<AdjuntoDto>> Upload(string id, string estudioId, [FromForm, Required] IFormFile archivo, CancellationToken ct)
    {
        var order = await access.Order(id, ct);
        RequireOpen(order);
        var study = order.Estudios.SingleOrDefault(x => x.EstudioId == estudioId) ?? throw ApiException.NotFound();
        var saved = await storage.Save(archivo, ct);
        var attachment = new Adjunto { OrdenId = id, EstudioId = estudioId, Nombre = saved.Name, Tipo = saved.Type,
            Tamano = archivo.Length, Fecha = clock.GetUtcNow().UtcDateTime, StorageKey = saved.Key };
        try
        {
            if (saved.Type == "dicom" && !study.Estudio.Dicom) throw ApiException.Invalid("Este estudio no acepta DICOM.");
            study.Adjuntos.Add(attachment);
            Record(order, "resultado-adjunto", "Resultado adjuntado"); await db.SaveChangesAsync(ct);
        }
        catch { Cleanup(saved.Key); throw; }
        return Created($"/api/v1/ordenes/{id}/estudios/{estudioId}/adjuntos/{attachment.Id}/contenido", attachment.ToDto());
    }

    [HttpDelete("{id}/estudios/{estudioId}/adjuntos/{adjuntoId}"), Authorize(Policy = "Lab")]
    public async Task<IActionResult> RemoveAttachment(string id, string estudioId, string adjuntoId, CancellationToken ct)
    {
        var order = await access.Order(id, ct); RequireOpen(order);
        var item = order.Estudios.Where(x => x.EstudioId == estudioId).SelectMany(x => x.Adjuntos)
            .SingleOrDefault(x => x.Id == adjuntoId) ?? throw ApiException.NotFound();
        db.Adjuntos.Remove(item); Record(order, "resultado-eliminado", "Resultado eliminado");
        await db.SaveChangesAsync(ct); Cleanup(item.StorageKey); return NoContent();
    }

    [HttpGet("{id}/estudios/{estudioId}/adjuntos/{adjuntoId}/contenido")]
    public async Task<IActionResult> Download(string id, string estudioId, string adjuntoId, CancellationToken ct)
    {
        var order = await access.Order(id, ct);
        if (order.Estado != "cerrada") throw ApiException.Conflict("Los resultados solo están disponibles cuando la orden está lista.");
        var attachment = order.Estudios.Where(x => x.EstudioId == estudioId).SelectMany(x => x.Adjuntos)
            .SingleOrDefault(x => x.Id == adjuntoId) ?? throw ApiException.NotFound();
        return File(storage.Open(attachment.StorageKey), attachment.Tipo == "pdf" ? "application/pdf" : "application/dicom", attachment.Nombre, enableRangeProcessing: true);
    }

    private void Record(Orden order, string type, string description)
    {
        order.Revision = Guid.NewGuid().ToString("N");
        db.Actividad.Add(new() { OrdenId = order.Id, UsuarioId = access.Id, Tipo = type, Descripcion = description, Fecha = clock.GetUtcNow().UtcDateTime });
    }
    private static void RequireOpen(Orden order)
    { if (order.Estado != "abierta") throw ApiException.Conflict("Reabre la orden antes de modificar los resultados."); }
    private void Cleanup(string key)
    {
        try { storage.Delete(key); }
        catch (IOException ex) { logger.LogWarning(ex, "No se pudo limpiar el archivo {StorageKey}", key); }
        catch (UnauthorizedAccessException ex) { logger.LogWarning(ex, "No se pudo limpiar el archivo {StorageKey}", key); }
    }
}
