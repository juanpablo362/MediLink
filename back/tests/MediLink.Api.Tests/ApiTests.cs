using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using MediLink.Api.Contracts;
using MediLink.Api.Data;
using MediLink.Api.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace MediLink.Api.Tests;

public sealed class ApiTests
{
    private static readonly byte[] Pdf = Encoding.ASCII.GetBytes("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF");

    [Fact]
    public async Task Authentication_requires_real_password_and_logout_invalidates_token()
    {
        using var app = new TestApi();
        using var anon = app.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await anon.GetAsync("/health/ready")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/v1/pacientes")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.PostAsJsonAsync("/api/v1/auth/login", new { usuario = "admin", contrasena = "incorrecta" })).StatusCode);
        using var admin = await app.Login();
        var me = await TestApi.Read<SesionDto>(await admin.GetAsync("/api/v1/auth/me"), HttpStatusCode.OK);
        Assert.Equal("admin", me.Rol); Assert.Single(me.Sucursales);
        var raw = await admin.GetStringAsync("/api/v1/usuarios");
        Assert.DoesNotContain("passwordHash", raw); Assert.DoesNotContain("securityStamp", raw);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.PostAsync("/api/v1/auth/logout", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await admin.GetAsync("/api/v1/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Catalogs_validate_input_and_preserve_unique_keys()
    {
        using var app = new TestApi(); using var admin = await app.Login();
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/api/v1/pacientes", new { nombre = "Futuro", apellidos = "Test", fechaNacimiento = "2999-01-01", sexo = "F" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync("/api/v1/estudios?pageSize=101")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync("/api/v1/estudios?page=2147483647")).StatusCode);
        var patient = await Patient(admin);
        Assert.Equal("Andrea", patient.Nombre);
        var study = await Study(admin);
        Assert.Equal(350.25m, study.Precio);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync("/api/v1/estudios", new { clave = "bh", nombre = "Duplicado", area = "Test", precio = 1 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/api/v1/estudios", new { clave = "DEC", nombre = "Decimales", area = "Test", precio = 1.123 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/api/v1/usuarios", new { nombre = "Sin clave", correo = "user@example.test", usuario = "sin-clave", rol = "lab" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PutAsJsonAsync($"/api/v1/usuarios/{await AdminId(admin)}", new { nombre = "Admin", correo = "admin@example.test", usuario = "admin", rol = "lab", activo = true })).StatusCode);
        var changed = await TestApi.Read<PacienteDto>(await admin.PutAsJsonAsync($"/api/v1/pacientes/{patient.Id}", new { nombre = "Andrea", apellidos = "Actualizado", fechaNacimiento = "1990-04-12", sexo = "F", telefono = "6620000000" }), HttpStatusCode.OK);
        Assert.Equal("Actualizado", changed.Apellidos);
        var results = await TestApi.Read<Page<PacienteDto>>(await admin.GetAsync("/api/v1/pacientes?q=actualizado"), HttpStatusCode.OK);
        Assert.Single(results.Items);
    }

    [Fact]
    public async Task Order_lifecycle_stores_real_files_and_enforces_result_rules()
    {
        using var app = new TestApi(); using var admin = await app.Login();
        var branch = await Branch(admin); var patient = await Patient(admin); var study = await Study(admin);
        var order = await Order(admin, branch.Id, patient.Id, study.Id);
        Assert.Equal(study.Precio, order.Total); Assert.Equal(patient.Nombre, order.Paciente.Nombre);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync($"/api/v1/ordenes/{order.Id}/cerrar", null)).StatusCode);
        using var forged = UploadBody(Encoding.ASCII.GetBytes("not a PDF"), "fake.pdf");
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsync(UploadUrl(order, study), forged)).StatusCode);
        using var invalidType = UploadBody(Pdf, "file.exe");
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsync(UploadUrl(order, study), invalidType)).StatusCode);
        var file = await Upload(admin, order, study);
        var url = DownloadUrl(order, study, file);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.GetAsync(url)).StatusCode);
        var closed = await TestApi.Read<OrdenDto>(await admin.PostAsync($"/api/v1/ordenes/{order.Id}/cerrar", null), HttpStatusCode.OK);
        Assert.Equal("cerrada", closed.Estado); Assert.NotNull(closed.FechaCierre);
        using var download = await admin.GetAsync(url);
        Assert.Equal(Pdf, await download.Content.ReadAsByteArrayAsync());
        Assert.Equal("application/pdf", download.Content.Headers.ContentType!.MediaType);
        Assert.Equal("no-store", download.Headers.CacheControl!.ToString());
        using var rangeRequest = new HttpRequestMessage(HttpMethod.Get, url);
        rangeRequest.Headers.Range = new RangeHeaderValue(0, 4);
        using var range = await admin.SendAsync(rangeRequest);
        Assert.Equal(HttpStatusCode.PartialContent, range.StatusCode);
        Assert.Equal("%PDF-", await range.Content.ReadAsStringAsync());
        using var uploadClosed = UploadBody(Pdf);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync(UploadUrl(order, study), uploadClosed)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.DeleteAsync($"/api/v1/ordenes/{order.Id}/estudios/{study.Id}/adjuntos/{file.Id}")).StatusCode);
        await TestApi.Read<OrdenDto>(await admin.PostAsync($"/api/v1/ordenes/{order.Id}/reabrir", null), HttpStatusCode.OK);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/v1/ordenes/{order.Id}/estudios/{study.Id}/adjuntos/{file.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync($"/api/v1/ordenes/{order.Id}/cerrar", null)).StatusCode);
        var activity = await admin.GetStringAsync($"/api/v1/actividad?sucursalId={branch.Id}");
        Assert.Contains("orden-reabierta", activity);
        Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync($"/api/v1/panel?sucursalId={branch.Id}")).StatusCode);
    }

    [Fact]
    public async Task Doctor_can_only_read_own_orders_and_has_no_catalog_or_admin_access()
    {
        using var app = new TestApi(); using var admin = await app.Login();
        var branch = await Branch(admin); var patient = await Patient(admin); var study = await Study(admin);
        var doctor = await Doctor(admin, "medico1", "1234567");
        var other = await Doctor(admin, "medico2", "7654321");
        var own = await Order(admin, branch.Id, patient.Id, study.Id, doctor.Id);
        var foreign = await Order(admin, branch.Id, patient.Id, study.Id, other.Id);
        var file = await Upload(admin, own, study);
        using var client = await app.Login("medico1", "medico");
        var listed = await TestApi.Read<Page<OrdenDto>>(await client.GetAsync("/api/v1/ordenes"), HttpStatusCode.OK);
        Assert.Single(listed.Items); Assert.Equal(own.Id, listed.Items[0].Id);
        Assert.Equal("Andrea", listed.Items[0].Paciente.Nombre);
        Assert.Equal(study.Nombre, listed.Items[0].Estudios[0].Estudio.Nombre);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/v1/ordenes/{foreign.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/v1/pacientes")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/v1/usuarios")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsync($"/api/v1/ordenes/{own.Id}/cerrar", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.GetAsync(DownloadUrl(own, study, file))).StatusCode);
        await Close(admin, own);
        using var download = await client.GetAsync(DownloadUrl(own, study, file));
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
    }

    [Fact]
    public async Task Branch_permissions_and_patient_links_prevent_cross_branch_disclosure()
    {
        using var app = new TestApi(); using var admin = await app.Login();
        var first = await Branch(admin); var patient = await Patient(admin); var study = await Study(admin);
        var lab = await TestApi.Read<UsuarioDto>(await admin.PostAsJsonAsync("/api/v1/usuarios", new { nombre = "Lab", correo = "lab@example.test", usuario = "lab1", contrasena = TestApi.Password, rol = "lab" }));
        await TestApi.Read<SucursalDto>(await admin.PutAsJsonAsync($"/api/v1/sucursales/{first.Id}", new { first.Nombre, first.Direccion, first.Telefono, usuarioIds = new[] { await AdminId(admin), lab.Id } }), HttpStatusCode.OK);
        var second = await TestApi.Read<SucursalDto>(await admin.PostAsJsonAsync("/api/v1/sucursales", new { nombre = "Otra sucursal", direccion = "Otra dirección", usuarioIds = new[] { await AdminId(admin) } }));
        var own = await Order(admin, first.Id, patient.Id, study.Id); await Upload(admin, own, study); await Close(admin, own);
        var foreign = await Order(admin, second.Id, patient.Id, study.Id); var foreignFile = await Upload(admin, foreign, study); await Close(admin, foreign);
        using var client = await app.Login("lab1");
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/v1/ordenes/{foreign.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync($"/api/v1/ordenes?sucursalId={second.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(DownloadUrl(foreign, study, foreignFile))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/v1/enlaces", new { pacienteId = patient.Id, sucursalId = second.Id })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.DeleteAsync($"/api/v1/ordenes/{own.Id}")).StatusCode);
        var link = await TestApi.Read<EnlaceDto>(await client.PostAsJsonAsync("/api/v1/enlaces", new { pacienteId = patient.Id, sucursalId = first.Id }));
        using var publicClient = app.CreateClient();
        var results = await TestApi.Read<ResultadosDto>(await publicClient.GetAsync($"/api/v1/resultados/{link.Token}"), HttpStatusCode.OK);
        Assert.Single(results.Ordenes); Assert.Equal(own.Id, results.Ordenes[0].Id);
        Assert.Equal(HttpStatusCode.NotFound, (await publicClient.GetAsync($"/api/v1/resultados/{link.Token}/archivos/{foreignFile.Id}")).StatusCode);
        await app.WithDb(async db =>
        {
            var stored = await db.Enlaces.SingleAsync(x => x.Id == link.Id);
            Assert.Equal(TokenService.Hash(link.Token), stored.TokenHash); Assert.NotEqual(link.Token, stored.TokenHash);
        });
    }

    [Fact]
    public async Task Patient_links_expire_can_be_revoked_and_hide_reopened_results()
    {
        using var app = new TestApi(); using var admin = await app.Login();
        var branch = await Branch(admin); var patient = await Patient(admin); var study = await Study(admin);
        var order = await Order(admin, branch.Id, patient.Id, study.Id); var file = await Upload(admin, order, study); await Close(admin, order);
        var link = await Link(admin, order); var expiring = await Link(admin, order);
        using var anon = app.CreateClient();
        using var download = await anon.GetAsync($"/api/v1/resultados/{link.Token}/archivos/{file.Id}");
        Assert.Equal(Pdf, await download.Content.ReadAsByteArrayAsync());
        var json = await anon.GetStringAsync($"/api/v1/resultados/{link.Token}");
        Assert.DoesNotContain("fechaNacimiento", json); Assert.DoesNotContain("notas", json); Assert.DoesNotContain("total", json);
        await admin.PostAsync($"/api/v1/ordenes/{order.Id}/reabrir", null);
        var reopened = await TestApi.Read<ResultadosDto>(await anon.GetAsync($"/api/v1/resultados/{link.Token}"), HttpStatusCode.OK);
        Assert.Empty(reopened.Ordenes);
        Assert.Equal(HttpStatusCode.NotFound, (await anon.GetAsync($"/api/v1/resultados/{link.Token}/archivos/{file.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/v1/enlaces/{link.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Gone, (await anon.GetAsync($"/api/v1/resultados/{link.Token}")).StatusCode);
        app.Clock.Now = app.Clock.Now.AddDays(8);
        Assert.Equal(HttpStatusCode.Gone, (await anon.GetAsync($"/api/v1/resultados/{expiring.Token}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await anon.GetAsync("/api/v1/resultados/invalid")).StatusCode);
    }

    [Fact]
    public async Task Dicom_part10_is_validated_and_downloaded_without_transformation()
    {
        using var app = new TestApi(); using var admin = await app.Login();
        var study = await Study(admin, dicom: true); var patient = await Patient(admin); var branch = await Branch(admin);
        var order = await Order(admin, branch.Id, patient.Id, study.Id);
        var bytes = new byte[180]; Encoding.ASCII.GetBytes("DICM").CopyTo(bytes, 128);
        using var body = UploadBody(bytes, "imagen.dcm");
        var file = await TestApi.Read<AdjuntoDto>(await admin.PostAsync(UploadUrl(order, study), body));
        Assert.Equal("dicom", file.Tipo); await Close(admin, order);
        using var response = await admin.GetAsync(DownloadUrl(order, study, file));
        Assert.Equal("application/dicom", response.Content.Headers.ContentType!.MediaType);
        Assert.Equal(bytes, await response.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Concurrent_order_creation_allocates_distinct_folios()
    {
        using var app = new TestApi(); using var admin = await app.Login();
        var branch = await Branch(admin); var patient = await Patient(admin); var study = await Study(admin);
        var orders = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => Order(admin, branch.Id, patient.Id, study.Id)));
        Assert.Equal(8, orders.Select(x => x.Folio).Distinct().Count());
        Assert.Equal(Enumerable.Range(1, 8), orders.Select(x => x.Folio).Order());
    }

    [Fact]
    public async Task Stale_order_update_cannot_overwrite_a_concurrent_result_upload()
    {
        using var app = new TestApi(); using var admin = await app.Login();
        var branch = await Branch(admin); var patient = await Patient(admin); var study = await Study(admin);
        var order = await Order(admin, branch.Id, patient.Id, study.Id);
        await using var scope = app.Services.CreateAsyncScope();
        var staleDb = scope.ServiceProvider.GetRequiredService<MediLinkDbContext>();
        var stale = await staleDb.Ordenes.SingleAsync(x => x.Id == order.Id);
        await Upload(admin, order, study);
        stale.Estado = "cerrada"; stale.Revision = Guid.NewGuid().ToString("N");
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => staleDb.SaveChangesAsync());
        var actual = await TestApi.Read<OrdenDto>(await admin.GetAsync($"/api/v1/ordenes/{order.Id}"), HttpStatusCode.OK);
        Assert.Equal("abierta", actual.Estado); Assert.Single(actual.Estudios[0].Adjuntos);
        Assert.Equal(DateTimeKind.Utc, actual.FechaRegistro.Kind);
        Assert.Equal(DateTimeKind.Utc, actual.Estudios[0].Adjuntos[0].Fecha.Kind);
    }

    [Fact]
    public async Task Disabled_accounts_lose_access_immediately_and_login_locks_after_five_failures()
    {
        using var app = new TestApi(); using var admin = await app.Login();
        var branch = await Branch(admin);
        var lab = await TestApi.Read<UsuarioDto>(await admin.PostAsJsonAsync("/api/v1/usuarios", new { nombre = "Lab", correo = "lab@example.test", usuario = "lab1", contrasena = TestApi.Password, rol = "lab" }));
        await admin.PutAsJsonAsync($"/api/v1/sucursales/{branch.Id}", new { branch.Nombre, branch.Direccion, usuarioIds = new[] { await AdminId(admin), lab.Id } });
        using var client = await app.Login("lab1");
        await admin.PutAsJsonAsync($"/api/v1/usuarios/{lab.Id}", new { lab.Nombre, lab.Correo, lab.Usuario, lab.Rol, activo = false });
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/auth/me")).StatusCode);
        using var anon = app.CreateClient();
        for (var i = 0; i < 5; i++)
            Assert.Equal(HttpStatusCode.Unauthorized, (await anon.PostAsJsonAsync("/api/v1/auth/login", new { usuario = "admin", contrasena = "incorrecta" })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.PostAsJsonAsync("/api/v1/auth/login", new { usuario = "admin", contrasena = TestApi.Password })).StatusCode);
        app.Clock.Now = app.Clock.Now.AddMinutes(16);
        Assert.Equal(HttpStatusCode.OK, (await anon.PostAsJsonAsync("/api/v1/auth/login", new { usuario = "admin", contrasena = TestApi.Password })).StatusCode);
    }

    [Fact]
    public async Task Deleting_order_removes_attachments_and_order_scoped_links()
    {
        using var app = new TestApi(); using var admin = await app.Login();
        var branch = await Branch(admin); var patient = await Patient(admin); var study = await Study(admin);
        var order = await Order(admin, branch.Id, patient.Id, study.Id); await Upload(admin, order, study); await Close(admin, order);
        var link = await Link(admin, order);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/v1/ordenes/{order.Id}")).StatusCode);
        await app.WithDb(async db => { Assert.Empty(await db.Adjuntos.ToListAsync()); Assert.Empty(await db.Actividad.ToListAsync()); Assert.Empty(await db.Enlaces.ToListAsync()); });
        using var anon = app.CreateClient();
        Assert.Equal(HttpStatusCode.NotFound, (await anon.GetAsync($"/api/v1/resultados/{link.Token}")).StatusCode);
    }

    [Fact]
    public async Task OpenApi_is_available_in_development_and_describes_the_routes()
    {
        using var app = new TestApi(development: true); using var client = app.CreateClient();
        using var response = await client.GetAsync("/openapi/v1.json");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        Assert.Contains("/api/v1/ordenes", json);
        Assert.Contains("/api/v1/auth/login", json);
        Assert.Contains("/api/v1/resultados/{token}", json);
    }

    private static async Task<string> AdminId(HttpClient c) => (await TestApi.Read<SesionDto>(await c.GetAsync("/api/v1/auth/me"), HttpStatusCode.OK)).Id;
    private static async Task<SucursalDto> Branch(HttpClient c) => (await TestApi.Read<SesionDto>(await c.GetAsync("/api/v1/auth/me"), HttpStatusCode.OK)).Sucursales[0];
    private static async Task<PacienteDto> Patient(HttpClient c) => await TestApi.Read<PacienteDto>(await c.PostAsJsonAsync("/api/v1/pacientes", new { nombre = "Andrea", apellidos = "Pruebas", fechaNacimiento = "1990-04-12", sexo = "F", telefono = "6620000000", correo = "andrea@example.test" }));
    private static async Task<EstudioDto> Study(HttpClient c, bool dicom = false) => await TestApi.Read<EstudioDto>(await c.PostAsJsonAsync("/api/v1/estudios", new { clave = "BH", nombre = "Biometría hemática", area = "Hematología", precio = 350.25m, diasEntrega = 1, dicom }));
    private static async Task<MedicoDto> Doctor(HttpClient c, string user, string cedula) => await TestApi.Read<MedicoDto>(await c.PostAsJsonAsync("/api/v1/medicos", new { nombre = user, especialidad = "General", cedula, correo = user + "@example.test", usuario = user, contrasena = TestApi.Password }));
    private static async Task<OrdenDto> Order(HttpClient c, string branch, string patient, string study, string? doctor = null) => await TestApi.Read<OrdenDto>(await c.PostAsJsonAsync("/api/v1/ordenes", new { pacienteId = patient, sucursalId = branch, medicoId = doctor, estudioIds = new[] { study }, fechaEntrega = DateTimeOffset.UtcNow.AddDays(2), entrega = new { impreso = true, correo = false, whatsapp = false }, notas = "Nota interna" }));
    private static async Task Close(HttpClient c, OrdenDto o) => await TestApi.Read<OrdenDto>(await c.PostAsync($"/api/v1/ordenes/{o.Id}/cerrar", null), HttpStatusCode.OK);
    private static async Task<EnlaceDto> Link(HttpClient c, OrdenDto o) => await TestApi.Read<EnlaceDto>(await c.PostAsJsonAsync("/api/v1/enlaces", new { pacienteId = o.PacienteId, sucursalId = o.SucursalId, ordenId = o.Id }));
    private static async Task<AdjuntoDto> Upload(HttpClient c, OrdenDto o, EstudioDto s)
    { using var body = UploadBody(Pdf); return await TestApi.Read<AdjuntoDto>(await c.PostAsync(UploadUrl(o, s), body)); }
    private static string UploadUrl(OrdenDto o, EstudioDto s) => $"/api/v1/ordenes/{o.Id}/estudios/{s.Id}/adjuntos";
    private static string DownloadUrl(OrdenDto o, EstudioDto s, AdjuntoDto a) => UploadUrl(o, s) + $"/{a.Id}/contenido";
    private static MultipartFormDataContent UploadBody(byte[] bytes, string name = "resultado.pdf")
    { var body = new MultipartFormDataContent(); body.Add(new ByteArrayContent(bytes), "archivo", name); return body; }
}
