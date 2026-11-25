namespace MediLink.Api.Domain;

public abstract class Entity
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
}

public sealed class Cuenta : Entity
{
    public string Nombre { get; set; } = "";
    public string Correo { get; set; } = "";
    public string Usuario { get; set; } = "";
    public string UsuarioNormalizado { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Rol { get; set; } = "lab";
    public bool Activo { get; set; } = true;
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");
    public int Fallos { get; set; }
    public DateTime? BloqueadoHasta { get; set; }
}

public sealed class Paciente : Entity
{
    public string Nombre { get; set; } = "";
    public string Apellidos { get; set; } = "";
    public DateOnly FechaNacimiento { get; set; }
    public string Sexo { get; set; } = "X";
    public string Telefono { get; set; } = "";
    public string Correo { get; set; } = "";
}

public sealed class Medico : Entity
{
    public Cuenta Cuenta { get; set; } = null!;
    public string Especialidad { get; set; } = "";
    public string Cedula { get; set; } = "";
    public string Telefono { get; set; } = "";
}

public sealed class Estudio : Entity
{
    public string Clave { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Area { get; set; } = "";
    public decimal Precio { get; set; }
    public int DiasEntrega { get; set; }
    public bool Dicom { get; set; }
    public string? Indicaciones { get; set; }
}

public sealed class Sucursal : Entity
{
    public string Nombre { get; set; } = "";
    public string Direccion { get; set; } = "";
    public string Telefono { get; set; } = "";
    public List<AsignacionSucursal> Asignaciones { get; set; } = [];
}

public sealed class AsignacionSucursal
{
    public string SucursalId { get; set; } = "";
    public string UsuarioId { get; set; } = "";
}

public sealed class Institucion
{
    public int Id { get; set; } = 1;
    public string Nombre { get; set; } = "MediLink";
    public string RazonSocial { get; set; } = "";
    public string Rfc { get; set; } = "";
    public string Telefono { get; set; } = "";
    public string Correo { get; set; } = "";
    public string Direccion { get; set; } = "";
    public int VigenciaEnlaceDias { get; set; } = 7;
}

public sealed class Orden : Entity
{
    public int Folio { get; set; }
    public string PacienteId { get; set; } = "";
    public Paciente Paciente { get; set; } = null!;
    public string? MedicoId { get; set; }
    public string? MedicoExterno { get; set; }
    public string SucursalId { get; set; } = "";
    public string Estado { get; set; } = "abierta";
    public DateTime FechaRegistro { get; set; }
    public DateTime FechaEntrega { get; set; }
    public DateTime? FechaCierre { get; set; }
    public bool EntregaImpreso { get; set; }
    public bool EntregaCorreo { get; set; }
    public bool EntregaWhatsapp { get; set; }
    public decimal Total { get; set; }
    public string Notas { get; set; } = "";
    public string Revision { get; set; } = Guid.NewGuid().ToString("N");
    public List<OrdenEstudio> Estudios { get; set; } = [];
}

public sealed class OrdenEstudio
{
    public string OrdenId { get; set; } = "";
    public string EstudioId { get; set; } = "";
    public Estudio Estudio { get; set; } = null!;
    public decimal Precio { get; set; }
    public List<Adjunto> Adjuntos { get; set; } = [];
}

public sealed class Adjunto : Entity
{
    public string OrdenId { get; set; } = "";
    public string EstudioId { get; set; } = "";
    public string Nombre { get; set; } = "";
    public string Tipo { get; set; } = "pdf";
    public long Tamano { get; set; }
    public DateTime Fecha { get; set; }
    public string StorageKey { get; set; } = "";
}

public sealed class EnlaceSeguro : Entity
{
    public string TokenHash { get; set; } = "";
    public string PacienteId { get; set; } = "";
    public string SucursalId { get; set; } = "";
    public string? OrdenId { get; set; }
    public DateTime Creado { get; set; }
    public DateTime Expira { get; set; }
    public bool Revocado { get; set; }
}

public sealed class Actividad : Entity
{
    public string Tipo { get; set; } = "";
    public string OrdenId { get; set; } = "";
    public string UsuarioId { get; set; } = "";
    public string Descripcion { get; set; } = "";
    public DateTime Fecha { get; set; }
}

public sealed class Consecutivo
{
    public int Id { get; set; } = 1;
    public int Valor { get; set; }
}
