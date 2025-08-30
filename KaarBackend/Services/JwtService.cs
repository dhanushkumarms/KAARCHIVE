using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;

namespace KaarBackend.Services
{
    public class JwtService
    {
        private readonly string _secretKey;
        private static readonly ConcurrentDictionary<string, DateTime> _blacklistedTokens = new();

        public JwtService(IConfiguration configuration)
        {
            _secretKey = configuration["Jwt:Secret"] ?? throw new ArgumentNullException("JWT Secret is missing in configuration.");
        }

        public string GenerateToken(string username, string email)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_secretKey);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Name, username),
                    new Claim(ClaimTypes.Email, email)
                }),
                Expires = DateTime.UtcNow.AddHours(1), // Token expires in 1 hour
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        public bool IsTokenBlacklisted(string token)
        {
            return _blacklistedTokens.ContainsKey(token);
        }

        public void BlacklistToken(string token)
        {
            _blacklistedTokens[token] = DateTime.UtcNow;
        }
    }
}
