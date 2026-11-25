using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.Sqlite;
using Npgsql;

namespace MediLink.Api.Services;

public sealed class ApiException(int status, string message) : Exception(message)
{
    public int Status { get; } = status;
    public static ApiException NotFound() => new(404, "No se encontró el recurso.");
    public static ApiException Invalid(string message) => new(400, message);
    public static ApiException Conflict(string message) => new(409, message);
}

public sealed class ApiExceptionHandler(IProblemDetailsService problems, ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception error, CancellationToken ct)
    {
        var (status, detail) = error switch
        {
            ApiException e => (e.Status, e.Message),
            DbUpdateConcurrencyException => (409, "La orden cambió durante la operación. Recarga y vuelve a intentarlo."),
            DbUpdateException { InnerException: SqliteException { SqliteErrorCode: 19 } }
                or DbUpdateException { InnerException: PostgresException { SqlState: PostgresErrorCodes.UniqueViolation or PostgresErrorCodes.ForeignKeyViolation } }
                => (409, "La operación entra en conflicto con los datos existentes."),
            BadHttpRequestException e => (e.StatusCode, "La solicitud no es válida o supera el tamaño permitido."),
            _ => (500, "No se pudo completar la solicitud.")
        };
        if (status == 500) logger.LogError(error, "Error interno. TraceId: {TraceId}", context.TraceIdentifier);
        context.Response.StatusCode = status;
        return await problems.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = context,
            ProblemDetails = new ProblemDetails { Status = status, Title = detail, Extensions = { ["traceId"] = context.TraceIdentifier } }
        });
    }
}
