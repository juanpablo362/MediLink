using System.ComponentModel.DataAnnotations;
using MediLink.Api.Contracts;
using MediLink.Api.Data;
using MediLink.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MediLink.Api.Controllers;

[ApiController, Route("api/v1"), Authorize(Policy = "Lab")]
public sealed class PanelController(MediLinkDbContext db, CurrentAccess access, TimeProvider clock, IConfiguration config) : ControllerBase
{
    [HttpGet("panel")]
    public async Task<IActionResult> Get([FromQuery, Required] string sucursalId, CancellationToken ct)
    {
        await access.RequireBranch(sucursalId, ct);
        var now = clock.GetUtcNow();
        var tz = TimeZoneInfo.FindSystemTimeZoneById(config["Institution:TimeZone"] ?? "America/Hermosillo");
        var localDate = TimeZoneInfo.ConvertTime(now, tz).Date;
        var start = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localDate, DateTimeKind.Unspecified), tz);
        var end = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(localDate.AddDays(1), DateTimeKind.Unspecified), tz);
        var week = now.UtcDateTime.AddDays(-7);
        var query = access.Orders().AsNoTracking().Where(x => x.SucursalId == sucursalId);
        var open = query.Where(x => x.Estado == "abierta");
        var utcNow = now.UtcDateTime;
        return Ok(new
        {
            enProceso = await open.CountAsync(ct),
            atrasadas = await open.CountAsync(x => x.FechaEntrega < utcNow, ct),
            entreganHoy = await open.CountAsync(x => x.FechaEntrega >= utcNow && x.FechaEntrega >= start && x.FechaEntrega < end, ct),
            listasSemana = await query.CountAsync(x => x.FechaCierre >= week, ct)
        });
    }

    [HttpGet("actividad")]
    public async Task<IReadOnlyList<ActividadDto>> Activity([FromQuery, Required] string sucursalId, CancellationToken ct)
    {
        await access.RequireBranch(sucursalId, ct);
        var ids = access.Orders().Where(x => x.SucursalId == sucursalId).Select(x => x.Id);
        return (await db.Actividad.AsNoTracking().Where(x => ids.Contains(x.OrdenId)).OrderByDescending(x => x.Fecha)
            .ThenByDescending(x => x.Id).Take(30).ToListAsync(ct)).Select(Dto.ToDto).ToList();
    }
}
