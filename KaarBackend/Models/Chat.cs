using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace KaarBackend.Models
{
    public class Chat
    {
        [JsonPropertyName("id")]
        public required string Id { get; set; } // Primary key/ChatId
        public required string UserId { get; set; } // Username or identifier
        public required string DocumentName { get; set; } // Name of the document
        public required string BlobUrl { get; set; } // URL to the document in blob storage
        public required string SourceId { get; set; } // ChatPDF API source ID
        public List<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ChatMessage
    {
        public required string Sender { get; set; } // "user" or "ai"
        public required string Content { get; set; } 
        public DateTime Timestamp { get; set; }
    }
}
