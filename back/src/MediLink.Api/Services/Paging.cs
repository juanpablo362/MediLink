using MediLink.Api.Contracts;
using Microsoft.EntityFrameworkCore;

namespace MediLink.Api.Services;

public static class Paging
{
    public static async Task<Page<TDto>> Page<T, TDto>(this IQueryable<T> query, PageQuery page, Func<T, TDto> map, CancellationToken ct)
    {
        var total = await query.CountAsync(ct);
        var rows = await query.Skip((page.Page - 1) * page.PageSize).Take(page.PageSize).ToListAsync(ct);
        return new(rows.Select(map).ToList(), page.Page, page.PageSize, total);
    }
}
