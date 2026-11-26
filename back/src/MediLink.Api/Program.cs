using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.RateLimiting;
using MediLink.Api.Data;
using MediLink.Api.Domain;
using MediLink.Api.Security;
using MediLink.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true).AddEnvironmentVariables();

// Resolve configuration through DI so each host (including integration tests) can
// select its provider and connection before any database or token service is built.
builder.Services.AddDbContext<SqliteDbContext>((services, options) =>
{
    var config = services.GetRequiredService<IConfiguration>();
    var sqlite = new SqliteConnectionStringBuilder(config.GetConnectionString("MediLink"));
    if (sqlite.DataSource != ":memory:")
    {
        sqlite.DataSource = Path.GetFullPath(sqlite.DataSource, services.GetRequiredService<IWebHostEnvironment>().ContentRootPath);
        Directory.CreateDirectory(Path.GetDirectoryName(sqlite.DataSource)!);
    }
    options.UseSqlite(sqlite.ToString());
});
builder.Services.AddDbContext<PostgresDbContext>((services, options) =>
    options.UseNpgsql(services.GetRequiredService<IConfiguration>().GetConnectionString("MediLink")));
builder.Services.AddScoped<MediLinkDbContext>(services => services.GetRequiredService<IConfiguration>()["Database:Provider"]?.ToLowerInvariant() switch
{
    "sqlite" => services.GetRequiredService<SqliteDbContext>(),
    "postgres" or "postgresql" => services.GetRequiredService<PostgresDbContext>(),
    _ => throw new InvalidOperationException("Database:Provider debe ser Sqlite o PostgreSql.")
});

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<CurrentAccess>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<IPasswordHasher<Cuenta>, PasswordHasher<Cuenta>>();
builder.Services.AddSingleton<ResultStorage>();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddControllers();
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
    options.AddOperationTransformer<BearerSecurityOperationTransformer>();
});
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = ResultStorage.MaxFileBytes + 1024 * 1024);
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = ResultStorage.MaxFileBytes + 1024 * 1024);

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("Content-Disposition")));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.MapInboundClaims = true;
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true, ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true, ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateLifetime = true, ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SigningKey"]!)),
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256], ClockSkew = TimeSpan.FromSeconds(10)
    };
    o.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var db = context.HttpContext.RequestServices.GetRequiredService<MediLinkDbContext>();
            var principal = context.Principal!;
            var id = principal.FindFirstValue(ClaimTypes.NameIdentifier);
            var account = await db.Cuentas.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, context.HttpContext.RequestAborted);
            if (account is null || !account.Activo || account.SecurityStamp != principal.FindFirstValue("stamp")
                || !principal.IsInRole(account.Rol)) context.Fail("Sesión inválida.");
        }
    };
});
builder.Services.AddAuthorization(o =>
{
    o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
    o.AddPolicy("Lab", p => p.RequireRole("admin", "lab"));
});

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    foreach (var (name, limit) in new[] { ("login", 10), ("public", 60) })
        o.AddPolicy(name, context => RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = limit, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 }));
});

var app = builder.Build();
var signingKey = builder.Configuration["Jwt:SigningKey"];
if (string.IsNullOrWhiteSpace(signingKey) && app.Environment.IsDevelopment())
    builder.Configuration["Jwt:SigningKey"] = signingKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
if (string.IsNullOrWhiteSpace(signingKey) || Encoding.UTF8.GetByteCount(signingKey) < 32)
    throw new InvalidOperationException("Define Jwt__SigningKey con al menos 32 bytes aleatorios.");
if (builder.Configuration.GetValue("Jwt:Minutes", 30) is < 1 or > 120)
    throw new InvalidOperationException("Jwt:Minutes debe estar entre 1 y 120.");
app.UseExceptionHandler();
app.UseStatusCodePages();
if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing"))
{
    app.UseHsts();
    app.UseHttpsRedirection();
}
app.Use(async (context, next) =>
{
    context.Response.Headers.CacheControl = "no-store";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers.XContentTypeOptions = "nosniff";
    await next();
});
app.UseCors();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
    // Serve the UI before the fallback authorization policy so login and docs
    // are reachable without already having an access token.
    app.UseSwaggerUI(options =>
    {
        options.RoutePrefix = "swagger";
        options.DocumentTitle = "MediLink · Swagger UI";
        options.SwaggerEndpoint("../openapi/v1.json", "MediLink API v1");
        options.DisplayRequestDuration();
    });
}
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();
app.MapControllers();
app.MapGet("/health/live", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.MapGet("/health/ready", async (MediLinkDbContext db, CancellationToken ct) =>
{
    try
    {
        return await db.Database.CanConnectAsync(ct) && await db.Instituciones.AnyAsync(ct)
            ? Results.Ok(new { status = "ok" }) : Results.StatusCode(503);
    }
    catch (System.Data.Common.DbException) { return Results.StatusCode(503); }
}).AllowAnonymous();
if (args.Contains("--migrate") || builder.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
    await DatabaseSetup.Initialize(app.Services, builder.Configuration);
if (!args.Contains("--migrate")) await app.RunAsync();

public partial class Program;
