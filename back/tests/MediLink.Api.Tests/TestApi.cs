using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using MediLink.Api.Contracts;
using MediLink.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Npgsql;
using Xunit;

namespace MediLink.Api.Tests;

public sealed class TestClock : TimeProvider
{
    public DateTimeOffset Now { get; set; } = DateTimeOffset.UtcNow;
    public override DateTimeOffset GetUtcNow() => Now;
}

public sealed class TestApi(bool development = false) : WebApplicationFactory<Program>
{
    public const string Password = "Test-only-password-2026!";
    private readonly string root = Path.Combine(Path.GetTempPath(), "medilink-tests", Guid.NewGuid().ToString("N"));
    private readonly string schema = "medilink_test_" + Guid.NewGuid().ToString("N");
    private readonly string? postgres = Environment.GetEnvironmentVariable("MEDILINK_TEST_POSTGRES");
    private bool schemaCreated;
    public TestClock Clock { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var connectionString = $"Data Source={Path.Combine(root, "test.db")};Pooling=False";
        if (!string.IsNullOrWhiteSpace(postgres))
        {
            // Each factory owns exactly one generated schema, never an existing schema.
            using var connection = new NpgsqlConnection(postgres);
            connection.Open();
            using var create = new NpgsqlCommand($"CREATE SCHEMA \"{schema}\"", connection);
            create.ExecuteNonQuery();
            schemaCreated = true;
            connectionString = new NpgsqlConnectionStringBuilder(postgres) { SearchPath = schema, Pooling = false }.ToString();
        }
        builder.UseEnvironment(development ? "Development" : "Testing");
        builder.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Database:Provider"] = string.IsNullOrWhiteSpace(postgres) ? "Sqlite" : "PostgreSql", ["Database:MigrateOnStartup"] = "true",
            ["ConnectionStrings:MediLink"] = connectionString,
            ["Storage:Path"] = Path.Combine(root, "results"),
            ["Jwt:SigningKey"] = "test-only-signing-key-with-at-least-32-bytes-2026",
            ["Bootstrap:Enabled"] = "true", ["Bootstrap:Password"] = Password,
            ["Bootstrap:Usuario"] = "admin", ["Bootstrap:Nombre"] = "Admin de pruebas", ["Bootstrap:Correo"] = "admin@example.test",
            ["Logging:LogLevel:Default"] = "Warning"
        }));
        builder.ConfigureServices(s => s.Replace(ServiceDescriptor.Singleton<TimeProvider>(Clock)));
    }

    public async Task<HttpClient> Login(string user = "admin", string type = "lab")
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        using var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { usuario = user, contrasena = Password, tipo = type });
        var data = await Read<TokenDto>(response, HttpStatusCode.OK);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", data.AccessToken);
        return client;
    }

    public async Task WithDb(Func<MediLinkDbContext, Task> action)
    {
        await using var scope = Services.CreateAsyncScope();
        await action(scope.ServiceProvider.GetRequiredService<MediLinkDbContext>());
    }

    public static async Task<T> Read<T>(HttpResponseMessage response, HttpStatusCode expected = HttpStatusCode.Created)
    {
        var body = await response.Content.ReadAsStringAsync();
        Assert.True(response.StatusCode == expected, $"Expected {(int)expected}, got {(int)response.StatusCode}: {body}");
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing && schemaCreated && schema.StartsWith("medilink_test_", StringComparison.Ordinal)
            && Guid.TryParseExact(schema[14..], "N", out _))
        {
            using var connection = new NpgsqlConnection(postgres);
            connection.Open();
            using var drop = new NpgsqlCommand($"DROP SCHEMA \"{schema}\" CASCADE", connection);
            drop.ExecuteNonQuery();
            schemaCreated = false;
        }
        var parent = Path.GetFullPath(Path.Combine(Path.GetTempPath(), "medilink-tests"));
        var resolved = Path.GetFullPath(root);
        if (disposing && Path.GetDirectoryName(resolved) == parent && Directory.Exists(resolved)) Directory.Delete(resolved, recursive: true);
    }
}
