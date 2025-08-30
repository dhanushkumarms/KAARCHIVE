using System.Collections.Generic;
using System;

namespace KaarBackend.Models
{
    public class ChatCreateRequest
    {
        public required string UserId { get; set; }
        public required string DocumentName { get; set; }
        public required string BlobUrl { get; set; }
        public required string SourceId { get; set; }
        public required string InitialMessage { get; set; }
    }

    public class AddMessageRequest
    {
        public required string Sender { get; set; } // "user" or "ai"
        public required string Content { get; set; }
    }
    
    public class UserFileInfo
    {
        public required string FileName { get; set; }
        public required string DisplayName { get; set; }
        public required string BlobUrl { get; set; }
        public DateTime LastModified { get; set; }
        public required string Size { get; set; }
        public required string ContentType { get; set; }
    }
}
