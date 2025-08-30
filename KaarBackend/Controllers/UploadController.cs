using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;
using System.Collections.Generic;
using KaarBackend.Services;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using System;
using KaarBackend.Models;
using System.Linq;
using System.IO;

namespace KaarBackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UploadController : ControllerBase
    {
        private readonly BlobStorageService _blobStorageService;
        private readonly ChatPdfService _chatPdfService;

        public UploadController(BlobStorageService blobStorageService, ChatPdfService chatPdfService)
        {
            _blobStorageService = blobStorageService;
            _chatPdfService = chatPdfService;
        }

        [HttpPost("file")]
        public async Task<IActionResult> UploadFile([FromForm] IFormFile file, [FromForm] string email, [FromForm] string username)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest("No file uploaded.");
            }

            string containerName = "uploads";
            string fileName = file.FileName;

            string sanitizedEmail = email.Trim().ToLower().Replace("@", "_at_").Replace(".", "_dot_");
            string userFolder = $"{sanitizedEmail}_{username}";
            string blobPath = $"{userFolder}/{fileName}";

            await _blobStorageService.EnsureContainerExistsAsync(containerName);
            var blobContainerClient = _blobStorageService.GetBlobContainerClient(containerName);
            var blobClient = blobContainerClient.GetBlobClient(blobPath);

            using (var stream = file.OpenReadStream())
            {
                var blobUploadOptions = new BlobUploadOptions
                {
                    Metadata = new Dictionary<string, string>
                    {
                        { "email", email.Trim().ToLower() }
                    }
                };

                await blobClient.UploadAsync(stream, blobUploadOptions);
            }

            return Ok(new { message = "File uploaded successfully.", fileName });
        }

        [HttpGet("userfiles")]
        public async Task<IActionResult> GetUserFiles([FromQuery] string email, [FromQuery] string username)
        {
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(username))
            {
                return BadRequest("Email and username are required.");
            }

            string containerName = "uploads";
            string sanitizedEmail = email.Trim().ToLower().Replace("@", "_at_").Replace(".", "_dot_");
            string userFolder = $"{sanitizedEmail}_{username}";

            var blobContainerClient = _blobStorageService.GetBlobContainerClient(containerName);
            var fileList = new List<object>();

            await foreach (var blobItem in blobContainerClient.GetBlobsByHierarchyAsync(prefix: userFolder + "/"))
            {
                if (blobItem.IsBlob)
                {
                    var blobClient = blobContainerClient.GetBlobClient(blobItem.Blob.Name);
                    var properties = await blobClient.GetPropertiesAsync();

                    fileList.Add(new
                    {
                        FileName = blobItem.Blob.Name,
                        Size = FormatFileSize(properties.Value.ContentLength),
                        LastModified = properties.Value.LastModified.UtcDateTime,
                        ContentType = properties.Value.ContentType
                    });
                }
            }

            if (fileList.Count == 0)
            {
                return NotFound("No files found for the specified user.");
            }

            return Ok(fileList);
        }

        [HttpDelete("deletefile")]
        public async Task<IActionResult> DeleteFile([FromQuery] string email, [FromQuery] string username, [FromQuery] string fileName)
        {
            // ✅ Validate Inputs
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(username) || string.IsNullOrEmpty(fileName))
            {
                return BadRequest(new { error = "Email, username, and file name are required." });
            }

            // ✅ Debug: Print incoming parameters
            Console.WriteLine($"[DEBUG] Email: {email}, Username: {username}, FileName: {fileName}");

            // ✅ Generate Blob Path
            string containerName = "uploads";
            string sanitizedEmail = email.Trim().ToLower().Replace("@", "_at_").Replace(".", "_dot_");
            string userFolder = $"{sanitizedEmail}_{username}";
            string blobPath = $"{userFolder}/{fileName}";

            // ✅ Debug: Print Blob Path
            Console.WriteLine($"[DEBUG] Blob Path: {blobPath}");

            try
            {
                var blobContainerClient = _blobStorageService.GetBlobContainerClient(containerName);
                var blobClient = blobContainerClient.GetBlobClient(blobPath);

                // ✅ Debug: Check if Blob Exists
                bool exists = await blobClient.ExistsAsync();
                Console.WriteLine($"[DEBUG] File Exists: {exists}");

                if (!exists)
                {
                    return NotFound(new { error = "File not found.", path = blobPath });
                }

                // ✅ Delete the file
                await blobClient.DeleteAsync();
                return Ok(new { message = "File deleted successfully.", fileName, path = blobPath });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] {ex.Message}");
                return StatusCode(500, new { error = "Internal server error.", details = ex.Message });
            }
        }

        [HttpPost("aiupload")]
        public async Task<IActionResult> UploadToAI([FromForm] IFormFile file, [FromForm] string email, [FromForm] string username)
        {
            // Add logging to help diagnose issues
            Console.WriteLine($"[DEBUG] aiupload endpoint called with file: {file?.FileName}, email: {email}, username: {username}");
            
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "No file uploaded." });
            }

            try
            {
                // Upload to ChatPDF API
                using var stream = file.OpenReadStream();
                string sourceId = await _chatPdfService.UploadFileAsync(stream, file.FileName);
                
                Console.WriteLine($"[DEBUG] File uploaded to ChatPDF API with sourceId: {sourceId}");

                // Save the file to blob storage too (optional)
                string containerName = "uploads";
                string sanitizedEmail = email.Trim().ToLower().Replace("@", "_at_").Replace(".", "_dot_");
                string userFolder = $"{sanitizedEmail}_{username}";
                string blobPath = $"{userFolder}/ai_{file.FileName}";

                await _blobStorageService.EnsureContainerExistsAsync(containerName);
                var blobContainerClient = _blobStorageService.GetBlobContainerClient(containerName);
                var blobClient = blobContainerClient.GetBlobClient(blobPath);

                using (var fileStream = file.OpenReadStream())
                {
                    await blobClient.UploadAsync(fileStream, overwrite: true);
                }

                return Ok(new { 
                    message = "File uploaded to AI successfully.", 
                    fileName = file.FileName,
                    sourceId = sourceId
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] {ex.Message}");
                Console.WriteLine($"[ERROR] {ex.StackTrace}");
                return StatusCode(500, new { error = "Internal server error.", details = ex.Message });
            }
        }

        [HttpPost("ask")]
        public async Task<IActionResult> AskQuestion([FromBody] QuestionRequest request)
        {
            if (string.IsNullOrEmpty(request.SourceId) || string.IsNullOrEmpty(request.Question))
            {
                return BadRequest(new { error = "SourceId and question are required." });
            }

            try
            {
                // Add logging for debugging
                Console.WriteLine($"[INFO] Asking question with sourceId: {request.SourceId}");
                Console.WriteLine($"[INFO] Question: {request.Question}");
                
                string response = await _chatPdfService.AskQuestionAsync(
                    request.SourceId, 
                    request.Question, 
                    includeReferences: true);
                    
                Console.WriteLine($"[INFO] Response received: {response}");
                return Ok(response);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] {ex.Message}");
                return StatusCode(500, new { error = "Internal server error.", details = ex.Message });
            }
        }

        [HttpPost("conversation")]
        public async Task<IActionResult> Conversation([FromBody] ConversationRequest request)
        {
            if (string.IsNullOrEmpty(request.SourceId) || request.Messages == null || request.Messages.Count == 0)
            {
                return BadRequest(new { error = "SourceId and at least one message are required." });
            }

            try
            {
                string response = await _chatPdfService.AskFollowUpQuestionAsync(
                    request.SourceId, 
                    request.Messages, 
                    includeReferences: true);
                    
                return Ok(response);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] {ex.Message}");
                return StatusCode(500, new { error = "Internal server error.", details = ex.Message });
            }
        }

        [HttpPost("deletesource")]
        public async Task<IActionResult> DeleteSource([FromBody] DeleteSourceRequest request)
        {
            if (string.IsNullOrEmpty(request.SourceId))
            {
                return BadRequest(new { error = "SourceId is required." });
            }

            try
            {
                await _chatPdfService.DeleteSourceAsync(request.SourceId);
                return Ok(new { message = "Source deleted successfully." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] {ex.Message}");
                return StatusCode(500, new { error = "Internal server error.", details = ex.Message });
            }
        }

        [HttpGet("aifiles")]
        public async Task<IActionResult> GetAIEligibleFiles([FromQuery] string email, [FromQuery] string username)
        {
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(username))
            {
                return BadRequest("Email and username are required.");
            }

            string containerName = "uploads";
            string sanitizedEmail = email.Trim().ToLower().Replace("@", "_at_").Replace(".", "_dot_");
            string userFolder = $"{sanitizedEmail}_{username}";

            var blobContainerClient = _blobStorageService.GetBlobContainerClient(containerName);
            var fileList = new List<UserFileInfo>();

            try
            {
                await foreach (var blobItem in blobContainerClient.GetBlobsByHierarchyAsync(prefix: userFolder + "/"))
                {
                    if (blobItem.IsBlob)
                    {
                        var blobClient = blobContainerClient.GetBlobClient(blobItem.Blob.Name);
                        var properties = await blobClient.GetPropertiesAsync();
                        
                        // Expand eligible file types to include PDF, Word, PowerPoint, and text files
                        string contentType = properties.Value.ContentType?.ToLower() ?? "";
                        string extension = Path.GetExtension(blobItem.Blob.Name).ToLowerInvariant();
                        
                        bool isPdf = contentType.Contains("pdf") || extension.Equals(".pdf");
                        bool isWord = contentType.Contains("word") || contentType.Contains("document") || 
                                     extension.Equals(".doc") || extension.Equals(".docx");
                        bool isPowerPoint = contentType.Contains("presentation") || contentType.Contains("powerpoint") || 
                                           extension.Equals(".ppt") || extension.Equals(".pptx");
                        bool isText = contentType.Contains("text") || extension.Equals(".txt");
                        
                        if (isPdf || isWord || isPowerPoint || isText)
                        {
                            string displayName = blobItem.Blob.Name.Split('/').Last();
                            
                            fileList.Add(new UserFileInfo
                            {
                                FileName = blobItem.Blob.Name,
                                DisplayName = displayName,
                                BlobUrl = blobClient.Uri.ToString(),
                                LastModified = properties.Value.LastModified.UtcDateTime,
                                Size = FormatFileSize(properties.Value.ContentLength),
                                ContentType = properties.Value.ContentType
                            });
                        }
                    }
                }

                return Ok(fileList);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] {ex.Message}");
                return StatusCode(500, new { error = "Failed to retrieve AI-eligible files.", details = ex.Message });
            }
        }

        [HttpGet("getfile")]
        public async Task<IActionResult> GetFile([FromQuery] string email, [FromQuery] string username, [FromQuery] string fileName)
        {
            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(username) || string.IsNullOrEmpty(fileName))
            {
                return BadRequest(new { error = "Email, username, and file name are required." });
            }

            // Debug log incoming parameters
            Console.WriteLine($"[DEBUG] GetFile - Email: {email}, Username: {username}, FileName: {fileName}");

            string containerName = "uploads";
            string sanitizedEmail = email.Trim().ToLower().Replace("@", "_at_").Replace(".", "_dot_");
            string userFolder = $"{sanitizedEmail}_{username}";
            string blobPath = $"{userFolder}/{fileName}";

            Console.WriteLine($"[DEBUG] Blob Path: {blobPath}");

            try
            {
                var blobContainerClient = _blobStorageService.GetBlobContainerClient(containerName);
                var blobClient = blobContainerClient.GetBlobClient(blobPath);

                // Check if blob exists
                bool exists = await blobClient.ExistsAsync();
                Console.WriteLine($"[DEBUG] File Exists: {exists}");
                
                if (!exists)
                {
                    return NotFound(new { error = "File not found.", path = blobPath });
                }

                // Download the blob
                var response = await blobClient.DownloadAsync();
                
                // Get content type or use default
                string contentType = response.Value.ContentType;
                if (string.IsNullOrEmpty(contentType))
                {
                    // Determine content type from file extension
                    contentType = GetContentTypeFromFileName(fileName);
                }
                
                // Return the file stream
                return File(response.Value.Content, contentType, fileName);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] {ex.Message}");
                return StatusCode(500, new { error = "Failed to retrieve file.", details = ex.Message });
            }
        }

        private string GetContentTypeFromFileName(string fileName)
        {
            string extension = Path.GetExtension(fileName).ToLowerInvariant();
            
            return extension switch
            {
                ".pdf" => "application/pdf",
                ".doc" => "application/msword",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".ppt" => "application/vnd.ms-powerpoint",
                ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                ".txt" => "text/plain",
                _ => "application/octet-stream"
            };
        }

        private string FormatFileSize(long bytes)
        {
            if (bytes >= 1024 * 1024)
                return $"{bytes / (1024 * 1024.0):F2} MB";
            else if (bytes >= 1024)
                return $"{bytes / 1024.0:F2} KB";
            else
                return $"{bytes} bytes";
        }
    }

    public class QuestionRequest
    {
        public string SourceId { get; set; }
        public string Question { get; set; }
    }

    public class ConversationRequest
    {
        public string SourceId { get; set; }
        public List<MessageDto> Messages { get; set; }
    }

    public class DeleteSourceRequest
    {
        public string SourceId { get; set; }
    }
}
