using System.ComponentModel.DataAnnotations;

namespace MediLink.Api.Contracts;

public sealed class PageQuery
{
    [Range(1, 1000000)] public int Page { get; set; } = 1;
    [Range(1, 100)] public int PageSize { get; set; } = 25;
    [StringLength(200)] public string? Q { get; set; }
}

public sealed record Page<T>(IReadOnlyList<T> Items, int PageNumber, int PageSize, int Total);

public sealed class LoginRequest
{
    [Required, StringLength(80)] public string Usuario { get; set; } = "";
    [Required, StringLength(128)] public string Contrasena { get; set; } = "";
    [RegularExpression("^(lab|medico)$")] public string Tipo { get; set; } = "lab";
}

public class AccesoRequest
{
    [Required, StringLength(160)] public string Nombre { get; set; } = "";
    [Required, EmailAddress, StringLength(254)] public string Correo { get; set; } = "";
    [Required, RegularExpression("^[a-zA-Z0-9._-]{3,80}$")] public string Usuario { get; set; } = "";
    [StringLength(128, MinimumLength = 12)] public string? Contrasena { get; set; }
    public bool Activo { get; set; } = true;
}

public sealed class UsuarioRequest : AccesoRequest
{
    [Required, RegularExpression("^(admin|lab)$")] public string Rol { get; set; } = "lab";
}

public sealed class MedicoRequest : AccesoRequest
{
    [Required, StringLength(120)] public string Especialidad { get; set; } = "";
    [Required, RegularExpression("^[0-9]{7,8}$")] public string Cedula { get; set; } = "";
    [StringLength(30)] public string Telefono { get; set; } = "";
}

public sealed class PacienteRequest
{
    [Required, StringLength(100)] public string Nombre { get; set; } = "";
    [Required, StringLength(160)] public string Apellidos { get; set; } = "";
    [Required] public DateOnly? FechaNacimiento { get; set; }
    [Required, RegularExpression("^(F|M|X)$")] public string Sexo { get; set; } = "X";
    [StringLength(30)] public string Telefono { get; set; } = "";
    [EmailAddress, StringLength(254)] public string? Correo { get; set; }
}

public sealed class EstudioRequest
{
    [Required, RegularExpression("^[a-zA-Z0-9_-]{1,30}$")] public string Clave { get; set; } = "";
    [Required, StringLength(160)] public string Nombre { get; set; } = "";
    [Required, StringLength(100)] public string Area { get; set; } = "";
    [Range(typeof(decimal), "0", "9999999.99")] public decimal Precio { get; set; }
    [Range(0, 365)] public int DiasEntrega { get; set; }
    public bool Dicom { get; set; }
    [StringLength(2000)] public string? Indicaciones { get; set; }
}

public sealed class SucursalRequest
{
    [Required, StringLength(160)] public string Nombre { get; set; } = "";
    [Required, StringLength(500)] public string Direccion { get; set; } = "";
    [StringLength(30)] public string Telefono { get; set; } = "";
    [Required, MaxLength(500)] public List<string> UsuarioIds { get; set; } = [];
}

public sealed class InstitucionRequest
{
    [Required, StringLength(160)] public string Nombre { get; set; } = "";
    [Required, StringLength(200)] public string RazonSocial { get; set; } = "";
    [Required, StringLength(13, MinimumLength = 12)] public string Rfc { get; set; } = "";
    [Required, StringLength(30)] public string Telefono { get; set; } = "";
    [Required, EmailAddress, StringLength(254)] public string Correo { get; set; } = "";
    [Required, StringLength(500)] public string Direccion { get; set; } = "";
    [Range(1, 30)] public int VigenciaEnlaceDias { get; set; } = 7;
}

public sealed record FormaEntrega(bool Impreso, bool Correo, bool Whatsapp);

public sealed class NuevaOrdenRequest
{
    [Required, StringLength(32)] public string PacienteId { get; set; } = "";
    [StringLength(32)] public string? MedicoId { get; set; }
    [StringLength(160)] public string? MedicoExterno { get; set; }
    [Required, StringLength(32)] public string SucursalId { get; set; } = "";
    [Required, MinLength(1), MaxLength(100)] public List<string> EstudioIds { get; set; } = [];
    [Required] public DateTimeOffset? FechaEntrega { get; set; }
    [Required] public FormaEntrega? Entrega { get; set; }
    [StringLength(4000)] public string Notas { get; set; } = "";
}

public sealed class EnlaceRequest
{
    [Required, StringLength(32)] public string PacienteId { get; set; } = "";
    [Required, StringLength(32)] public string SucursalId { get; set; } = "";
    [StringLength(32)] public string? OrdenId { get; set; }
}
