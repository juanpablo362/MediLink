using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace MediLink.Api.Security;

public sealed class BearerSecuritySchemeTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
    {
        document.Info.Title = "MediLink API";
        document.Info.Version = "v1";
        document.Info.Description = """
            API para laboratorios clínicos: pacientes, médicos, estudios, órdenes y resultados.

            Para probar los endpoints protegidos:
            1. Ejecuta POST /api/v1/auth/login con tu usuario, contraseña y tipo de acceso.
            2. Usa tipo `lab` para administración/laboratorio o `medico` para el portal médico.
            3. Copia `accessToken` de la respuesta y pégalo en **Authorize**, sin el prefijo `Bearer`.

            Los permisos de cada cuenta y sus sucursales se aplican también desde Swagger.
            Los pacientes consultan sus resultados mediante un enlace seguro, sin iniciar sesión.
            """;
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes[JwtBearerDefaults.AuthenticationScheme] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Pega únicamente el accessToken devuelto por /api/v1/auth/login."
        };
        return Task.CompletedTask;
    }
}

public sealed class BearerSecurityOperationTransformer : IOpenApiOperationTransformer
{
    public Task TransformAsync(OpenApiOperation operation, OpenApiOperationTransformerContext context, CancellationToken cancellationToken)
    {
        if (context.Description.ActionDescriptor.EndpointMetadata.OfType<IAllowAnonymous>().Any())
            return Task.CompletedTask;

        // The API has a fallback policy: every operation without AllowAnonymous
        // requires authentication, even when it has no explicit Authorize attribute.
        operation.Security ??= [];
        operation.Security.Add(new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference(JwtBearerDefaults.AuthenticationScheme, context.Document)] = []
        });
        return Task.CompletedTask;
    }
}
