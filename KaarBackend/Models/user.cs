using System.Text.Json.Serialization;

namespace KaarBackend.Models
{
    public class User
    {
        [JsonPropertyName("id")]
        public required string Id { get; set; }
        public required string Username { get; set; }
        public required string PasswordHash { get; set; }
        public required string Email { get; set; }
    }
}
