using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MediLink.Api.Domain;
using Microsoft.IdentityModel.Tokens;

namespace MediLink.Api.Security;

public sealed class TokenService(IConfiguration config, TimeProvider clock)
{
    public (string Token, DateTime Expira) Create(Cuenta cuenta)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var expires = now.AddMinutes(config.GetValue("Jwt:Minutes", 30));
        var token = new JwtSecurityToken(config["Jwt:Issuer"], config["Jwt:Audience"],
            [new(JwtRegisteredClaimNames.Sub, cuenta.Id), new("role", cuenta.Rol), new("stamp", cuenta.SecurityStamp),
             new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
             new(JwtRegisteredClaimNames.Iat, new DateTimeOffset(now).ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)],
            now, expires, new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:SigningKey"]!)), SecurityAlgorithms.HmacSha256));
        return (new JwtSecurityTokenHandler().WriteToken(token), expires);
    }

    public static string NewLinkToken() => Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
    public static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
