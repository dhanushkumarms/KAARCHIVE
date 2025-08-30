using KaarBackend.Models;
using KaarBackend.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using System.IO;
using System.Linq;

namespace KaarBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatController : ControllerBase
    {
        private readonly ChatService _chatService;

        public ChatController(ChatService chatService)
        {
            _chatService = chatService;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateChat([FromBody] ChatCreateRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.UserId))
                {
                    return BadRequest("UserId is required");
                }

                var chat = await _chatService.CreateChatAsync(request);
                return Ok(chat);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to create chat", details = ex.Message });
            }
        }

        [HttpPost("{chatId}/messages")]
        public async Task<IActionResult> AddMessage(string chatId, [FromBody] AddMessageRequest request)
        {
            try
            {
                var chat = await _chatService.AddMessageAsync(chatId, request);
                return Ok(chat);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to add message", details = ex.Message });
            }
        }

        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserChats(string userId)
        {
            try
            {
                var chats = await _chatService.GetUserChatsAsync(userId);
                return Ok(chats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to retrieve chats", details = ex.Message });
            }
        }

        [HttpGet("{chatId}")]
        public async Task<IActionResult> GetChat(string chatId)
        {
            try
            {
                var chat = await _chatService.GetChatByIdAsync(chatId);
                return Ok(chat);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Failed to retrieve chat", details = ex.Message });
            }
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadForChat(IFormFile file)
        {
            try
            {
                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { error = "No file uploaded." });
                }
                
                // Log the file information for debugging
                Console.WriteLine($"[DEBUG] Processing file upload: {file.FileName}, Size: {file.Length}, ContentType: {file.ContentType}");
                
                // Check if file format is supported - expanded to include more file types
                string contentType = file.ContentType?.ToLower() ?? "";
                string extension = Path.GetExtension(file.FileName).ToLowerInvariant();
                
                // Support PDF, Word, PowerPoint, and text files
                bool isPdf = contentType.Contains("pdf") || extension.Equals(".pdf");
                bool isWord = contentType.Contains("word") || contentType.Contains("document") || 
                              extension.Equals(".doc") || extension.Equals(".docx");
                bool isPowerPoint = contentType.Contains("presentation") || contentType.Contains("powerpoint") || 
                                   extension.Equals(".ppt") || extension.Equals(".pptx");
                bool isText = contentType.Contains("text") || extension.Equals(".txt");
                
                if (!isPdf && !isWord && !isPowerPoint && !isText)
                {
                    Console.WriteLine($"[ERROR] Unsupported file format: {contentType}, Extension: {extension}");
                    return BadRequest(new { error = "File format not supported. Please upload PDF, Word, PowerPoint, or text files only." });
                }

                // Upload to ChatPDF API
                using var stream = file.OpenReadStream();
                string sourceId = await _chatService.UploadToChatPdfAsync(stream, file.FileName);
                
                Console.WriteLine($"[DEBUG] File uploaded to ChatPDF API with sourceId: {sourceId}");

                return Ok(new { 
                    message = "File uploaded to chat successfully.", 
                    fileName = file.FileName,
                    sourceId = sourceId
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Chat upload: {ex.Message}");
                Console.WriteLine($"[ERROR] {ex.StackTrace}");
                return StatusCode(500, new { error = "Internal server error.", details = ex.Message });
            }
        }

        [HttpGet("history/{userId}")]
        public async Task<IActionResult> GetChatHistory(string userId)
        {
            try
            {
                var chats = await _chatService.GetChatHistoryAsync(userId);
                
                // Project to a simplified response model
                var chatHistory = chats.Select(c => new 
                {
                    c.Id,
                    c.DocumentName,
                    c.CreatedAt,
                    c.UpdatedAt,
                    c.SourceId,
                    RecentMessages = c.Messages.OrderByDescending(m => m.Timestamp).Take(3).ToList()
                });
                
                return Ok(chatHistory);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Failed to retrieve chat history: {ex.Message}");
            }
        }

        [HttpGet("session/{chatId}")]
        public async Task<IActionResult> GetChatSession(string chatId)
        {
            try
            {
                var chat = await _chatService.GetChatByIdAsync(chatId);
                if (chat == null)
                {
                    return NotFound($"Chat session with ID {chatId} not found.");
                }
                
                return Ok(chat);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Failed to retrieve chat session: {ex.Message}");
            }
        }
        
        [HttpPost("message/{chatId}")]
        public async Task<IActionResult> AddMessageToChat(string chatId, [FromBody] ChatMessageRequest messageRequest)
        {
            try
            {
                var chat = await _chatService.GetChatByIdAsync(chatId);
                if (chat == null)
                {
                    return NotFound($"Chat session with ID {chatId} not found.");
                }
                
                // Add user message
                chat.Messages.Add(new ChatMessage
                {
                    Sender = "user",
                    Content = messageRequest.Message,
                    Timestamp = DateTime.UtcNow
                });
                
                // Update chat
                await _chatService.UpdateChatAsync(chat);
                
                // Now process with ChatPDF and get AI response
                var aiResponse = await _chatService.ProcessMessageWithChatPdfAsync(chat.SourceId, messageRequest.Message);
                
                // Add AI response to chat
                chat.Messages.Add(new ChatMessage
                {
                    Sender = "ai",
                    Content = aiResponse,
                    Timestamp = DateTime.UtcNow
                });
                
                // Update chat again
                await _chatService.UpdateChatAsync(chat);
                
                return Ok(new { 
                    Message = aiResponse,
                    ChatId = chat.Id
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Failed to process message: {ex.Message}");
            }
        }
    }
}
