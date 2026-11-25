using System.Security.Claims;
using MediLink.Api.Data;
using MediLink.Api.Domain;
using MediLink.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace MediLink.Api.Security;

public sealed class CurrentAccess(IHttpContextAccessor http, MediLinkDbContext db)
{
    public string Id => http.HttpContext!.User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    public bool IsDoctor => http.HttpContext!.User.IsInRole("medico");

    public async Task RequireBranch(string sucursalId, CancellationToken ct)
    {
        if (!await db.Asignaciones.AnyAsync(x => x.UsuarioId == Id && x.SucursalId == sucursalId, ct))
            throw new ApiException(403, "No tienes acceso a esta sucursal.");
    }

    public IQueryable<Orden> Orders() => IsDoctor
        ? db.Ordenes.Where(o => o.MedicoId == Id)
        : db.Ordenes.Where(o => db.Asignaciones.Any(a => a.UsuarioId == Id && a.SucursalId == o.SucursalId));

    public async Task<Orden> Order(string id, CancellationToken ct) => await Orders()
        .Include(x => x.Paciente).Include(x => x.Estudios).ThenInclude(x => x.Estudio)
        .Include(x => x.Estudios).ThenInclude(x => x.Adjuntos)
        .AsSplitQuery().SingleOrDefaultAsync(x => x.Id == id, ct) ?? throw ApiException.NotFound();
}
