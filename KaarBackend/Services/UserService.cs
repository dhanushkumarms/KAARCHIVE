using KaarBackend.Models;
using System.Threading.Tasks;

namespace KaarBackend.Services
{
    public class UserService
    {
        private readonly CosmosDbService _cosmosDbService;

        public UserService(CosmosDbService cosmosDbService)
        {
            _cosmosDbService = cosmosDbService;
        }

        public async Task RegisterUserAsync(User user)
        {
            // Ensure unique username and email
            var existingUser = await GetUserByEmailOrUsernameAsync(user.Email, user.Username);
            if (existingUser != null)
            {
                throw new Exception("Username or Email already exists.");
            }

            // Hash the password securely
            user.Id = user.Username;
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(user.PasswordHash);

            await _cosmosDbService.AddDocumentAsync(user);
        }

        public async Task<User?> AuthenticateUserAsync(string username, string password)
        {
            var user = await _cosmosDbService.GetDocumentAsync<User>(username);
            if (user != null && BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            {
                return user;
            }
            return null;
        }

        public async Task<User?> GetUserByEmailOrUsernameAsync(string email, string username)
        {
            try
            {
                var userByEmail = await _cosmosDbService.GetDocumentAsync<User>(email);
                var userByUsername = await _cosmosDbService.GetDocumentAsync<User>(username);
                return userByEmail ?? userByUsername;
            }
            catch
            {
                return null; // Return null if no user is found
            }
        }
    }
}
