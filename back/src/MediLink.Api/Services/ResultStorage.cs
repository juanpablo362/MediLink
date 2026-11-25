using System.Text;

namespace MediLink.Api.Services;

public sealed class ResultStorage
{
    public const long MaxFileBytes = 500L * 1024 * 1024;
    private readonly string root;

    public ResultStorage(IConfiguration config, IWebHostEnvironment env)
    {
        root = Path.GetFullPath(config["Storage:Path"] ?? "App_Data/results", env.ContentRootPath);
        Directory.CreateDirectory(root);
    }

    public async Task<(string Key, string Name, string Type)> Save(IFormFile file, CancellationToken ct)
    {
        if (file.Length is <= 0 or > MaxFileBytes)
            throw new ApiException(413, "El archivo debe contener datos y no superar 500 MiB.");
        var name = Path.GetFileName(file.FileName.Replace('\\', '/'));
        if (name.Length is < 1 or > 200 || name.Any(char.IsControl)) throw ApiException.Invalid("Nombre de archivo inválido.");
        var extension = Path.GetExtension(name).ToLowerInvariant();
        var type = extension switch { ".pdf" => "pdf", ".dcm" or ".dicom" => "dicom", _ => throw ApiException.Invalid("Solo se aceptan PDF y DICOM (.dcm/.dicom).") };
        await using var source = file.OpenReadStream();
        var header = new byte[132];
        var read = await source.ReadAtLeastAsync(header, Math.Min(header.Length, (int)Math.Min(file.Length, header.Length)), throwOnEndOfStream: false, cancellationToken: ct);
        if ((type == "pdf" && (read < 5 || Encoding.ASCII.GetString(header, 0, 5) != "%PDF-"))
            || (type == "dicom" && (read < 132 || Encoding.ASCII.GetString(header, 128, 4) != "DICM")))
            throw ApiException.Invalid("El contenido no corresponde al formato declarado. DICOM requiere cabecera Part 10.");
        var key = Guid.NewGuid().ToString("N");
        try
        {
            await using var target = new FileStream(PathFor(key), FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, useAsync: true);
            await target.WriteAsync(header.AsMemory(0, read), ct);
            await source.CopyToAsync(target, ct);
        }
        catch
        {
            Delete(key);
            throw;
        }
        return (key, name, type);
    }

    public FileStream Open(string key)
    {
        try { return new FileStream(PathFor(key), FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true); }
        catch (FileNotFoundException) { throw ApiException.NotFound(); }
    }

    public void Delete(string key) => File.Delete(PathFor(key));
    private string PathFor(string key) => key.Length == 32 && key.All(Uri.IsHexDigit)
        ? Path.Combine(root, key) : throw new InvalidOperationException("Clave de almacenamiento inválida.");
}
