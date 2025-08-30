using Microsoft.AspNetCore.Mvc;
using KaarBackend.Services;
using KaarBackend.Models; // ✅ Make sure this is included
using System.IdentityModel.Tokens.Jwt;

namespace KaarBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly UserService _userService;
        private readonly JwtService _jwtService;

        public UserController(UserService userService, JwtService jwtService)
        {
            _userService = userService;
            _jwtService = jwtService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var existingUser = await _userService.GetUserByEmailOrUsernameAsync(request.Email, request.Username);
            if (existingUser != null)
                return BadRequest("Username or Email already exists.");

            var user = new User
            {
                Id = request.Username,
                Username = request.Username,
                Email = request.Email,
                PasswordHash = request.Password
            };

            await _userService.RegisterUserAsync(user);
            var token = _jwtService.GenerateToken(user.Username, user.Email);
            return Ok(new { message = "User registered successfully", token });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _userService.AuthenticateUserAsync(request.Username, request.Password);
            if (user == null)
                return Unauthorized("Invalid credentials");

            var token = _jwtService.GenerateToken(user.Username, user.Email);
            // 🚨 Check if token is already blacklisted (shouldn't happen, but just in case)
            if (_jwtService.IsTokenBlacklisted(token))
                return Unauthorized("This token is no longer valid.");      
            return Ok(new { username = user.Username, email = user.Email, token });
        }

        [HttpPost("logout")]
        public IActionResult Logout([FromHeader] string Authorization)
        {
            if (string.IsNullOrEmpty(Authorization) || !Authorization.StartsWith("Bearer "))
                return BadRequest("Invalid token");

            var token = Authorization.Substring("Bearer ".Length).Trim();
            var handler = new JwtSecurityTokenHandler();

            try
            {
                var jwtToken = handler.ReadToken(token) as JwtSecurityToken;
                if (jwtToken == null)
                    return BadRequest("Invalid token");

                // 🚨 Check if already blacklisted
                if (_jwtService.IsTokenBlacklisted(token))
                    return Unauthorized("Token already blacklisted");

                _jwtService.BlacklistToken(token);
                return Ok(new { message = "Logged out successfully" });
            }
            catch
            {
                return BadRequest("Invalid token");
            }
        }

    }
}
