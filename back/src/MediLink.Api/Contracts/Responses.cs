using MediLink.Api.Domain;

namespace MediLink.Api.Contracts;

public sealed record UsuarioDto(string Id, string Nombre, string Correo, string Usuario, string Rol, bool Activo);
public sealed record MedicoDto(string Id, string Nombre, string Especialidad, string Cedula, string Telefono, string Correo, string Usuario, bool Activo);
public sealed record PacienteDto(string Id, string Nombre, string Apellidos, DateOnly FechaNacimiento, string Sexo, string Telefono, string Correo);
public sealed record EstudioDto(string Id, string Clave, string Nombre, string Area, decimal Precio, int DiasEntrega, bool Dicom, string? Indicaciones);
public sealed record SucursalDto(string Id, string Nombre, string Direccion, string Telefono, IReadOnlyList<string> UsuarioIds);
public sealed record InstitucionDto(string Nombre, string RazonSocial, string Rfc, string Telefono, string Correo, string Direccion, int VigenciaEnlaceDias);
public sealed record AdjuntoDto(string Id, string Nombre, string Tipo, long Tamano, DateTime Fecha);
public sealed record OrdenEstudioDto(string EstudioId, IReadOnlyList<AdjuntoDto> Adjuntos, EstudioDto Estudio);
public sealed record OrdenDto(string Id, int Folio, string PacienteId, string? MedicoId, string? MedicoExterno,
    string SucursalId, IReadOnlyList<OrdenEstudioDto> Estudios, string Estado, DateTime FechaRegistro,
    DateTime FechaEntrega, DateTime? FechaCierre, FormaEntrega Entrega, decimal Total, string Notas, PacienteDto Paciente);
public sealed record EnlaceDto(string Id, string Token, string PacienteId, DateTime Creado, DateTime Expira);
public sealed record ActividadDto(string Id, string Tipo, string OrdenId, string Descripcion, DateTime Fecha);
public sealed record SesionDto(string Id, string Nombre, string Tipo, string Rol, IReadOnlyList<SucursalDto> Sucursales);
public sealed record TokenDto(string AccessToken, string TokenType, DateTime Expira, SesionDto Sesion);
public sealed record ResultadoEstudioDto(string EstudioId, string Clave, string Nombre, bool Dicom, IReadOnlyList<AdjuntoDto> Adjuntos);
public sealed record ResultadoOrdenDto(string Id, int Folio, DateTime FechaEntrega, IReadOnlyList<ResultadoEstudioDto> Estudios);
public sealed record ResultadosDto(string Estado, string PacienteNombre, DateTime Expira, IReadOnlyList<ResultadoOrdenDto> Ordenes);

public static class Dto
{
    public static UsuarioDto ToDto(this Cuenta x) => new(x.Id, x.Nombre, x.Correo, x.Usuario, x.Rol, x.Activo);
    public static MedicoDto ToDto(this Medico x) => new(x.Id, x.Cuenta.Nombre, x.Especialidad, x.Cedula, x.Telefono, x.Cuenta.Correo, x.Cuenta.Usuario, x.Cuenta.Activo);
    public static PacienteDto ToDto(this Paciente x) => new(x.Id, x.Nombre, x.Apellidos, x.FechaNacimiento, x.Sexo, x.Telefono, x.Correo);
    public static EstudioDto ToDto(this Estudio x) => new(x.Id, x.Clave, x.Nombre, x.Area, x.Precio, x.DiasEntrega, x.Dicom, x.Indicaciones);
    public static SucursalDto ToDto(this Sucursal x) => new(x.Id, x.Nombre, x.Direccion, x.Telefono, x.Asignaciones.Select(a => a.UsuarioId).ToList());
    public static InstitucionDto ToDto(this Institucion x) => new(x.Nombre, x.RazonSocial, x.Rfc, x.Telefono, x.Correo, x.Direccion, x.VigenciaEnlaceDias);
    public static AdjuntoDto ToDto(this Adjunto x) => new(x.Id, x.Nombre, x.Tipo, x.Tamano, x.Fecha);
    public static OrdenDto ToDto(this Orden x) => new(x.Id, x.Folio, x.PacienteId, x.MedicoId, x.MedicoExterno, x.SucursalId,
        x.Estudios.Select(e => new OrdenEstudioDto(e.EstudioId, e.Adjuntos.Select(ToDto).ToList(), e.Estudio.ToDto())).ToList(),
        x.Estado, x.FechaRegistro, x.FechaEntrega, x.FechaCierre, new(x.EntregaImpreso, x.EntregaCorreo, x.EntregaWhatsapp), x.Total, x.Notas, x.Paciente.ToDto());
    public static ActividadDto ToDto(this Actividad x) => new(x.Id, x.Tipo, x.OrdenId, x.Descripcion, x.Fecha);
}
