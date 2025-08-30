using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Text.Json;
using System.Collections.Generic;

namespace KaarBackend.Services
{
    public class ChatPdfService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public ChatPdfService(string apiKey)
        {
            _apiKey = apiKey;
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("x-api-key", _apiKey);
        }

        public async Task<string> UploadFileAsync(Stream fileStream, string fileName)
        {
            // This endpoint is correct according to the docs
            string url = "https://api.chatpdf.com/v1/sources/add-file";
            
            using var content = new MultipartFormDataContent();
            var fileContent = new StreamContent(fileStream);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
            content.Add(fileContent, "file", fileName);
            
            try
            {
                var response = await _httpClient.PostAsync(url, content);
                response.EnsureSuccessStatusCode();
                
                var jsonResponse = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"API Response: {jsonResponse}");
                using var document = JsonDocument.Parse(jsonResponse);
                return document.RootElement.GetProperty("sourceId").GetString();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error uploading file: {ex.Message}");
                throw;
            }
        }

        public async Task<string> AskQuestionAsync(string sourceId, string question, bool includeReferences = false)
        {
            // Update to the correct endpoint from the docs
            string url = "https://api.chatpdf.com/v1/chats/message";
            
            // Format request as per API documentation
            var messages = new[]
            {
                new { role = "user", content = question }
            };
            
            var requestData = new
            {
                sourceId = sourceId,
                messages = messages,
                referenceSources = includeReferences
            };
            
            var content = new StringContent(
                JsonSerializer.Serialize(requestData),
                System.Text.Encoding.UTF8,
                "application/json");
                
            try
            {
                var response = await _httpClient.PostAsync(url, content);
                response.EnsureSuccessStatusCode();
                
                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error asking question: {ex.Message}");
                throw;
            }
        }
        
        // Add method for follow-up questions
        public async Task<string> AskFollowUpQuestionAsync(string sourceId, List<MessageDto> conversation, bool includeReferences = false)
        {
            string url = "https://api.chatpdf.com/v1/chats/message";
            
            var requestData = new
            {
                sourceId = sourceId,
                messages = conversation,
                referenceSources = includeReferences
            };
            
            var content = new StringContent(
                JsonSerializer.Serialize(requestData),
                System.Text.Encoding.UTF8,
                "application/json");
                
            try
            {
                var response = await _httpClient.PostAsync(url, content);
                response.EnsureSuccessStatusCode();
                
                return await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error asking follow-up question: {ex.Message}");
                throw;
            }
        }
        
        // Add method to delete sources
        public async Task DeleteSourceAsync(string sourceId)
        {
            string url = "https://api.chatpdf.com/v1/sources/delete";
            
            var requestData = new
            {
                sources = new[] { sourceId }
            };
            
            var content = new StringContent(
                JsonSerializer.Serialize(requestData),
                System.Text.Encoding.UTF8,
                "application/json");
                
            try
            {
                var response = await _httpClient.PostAsync(url, content);
                response.EnsureSuccessStatusCode();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting source: {ex.Message}");
                throw;
            }
        }
    }
    
    // DTO for message format
    public class MessageDto
    {
        public required string Role { get; set; }
        public required string Content { get; set; }
    }
}
