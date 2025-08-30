using KaarBackend.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace KaarBackend.Services
{
    public class ChatService
    {
        private readonly CosmosDbService _cosmosDbService;
        private readonly ChatPdfService _chatPdfService;

        public ChatService(CosmosDbService cosmosDbService, ChatPdfService chatPdfService)
        {
            _cosmosDbService = cosmosDbService;
            _chatPdfService = chatPdfService;
        }

        public async Task<Chat> CreateChatAsync(ChatCreateRequest request)
        {
            var chat = new Chat
            {
                Id = Guid.NewGuid().ToString(),
                UserId = request.UserId,
                DocumentName = request.DocumentName,
                BlobUrl = request.BlobUrl,
                SourceId = request.SourceId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Add initial message if provided
            if (!string.IsNullOrEmpty(request.InitialMessage))
            {
                chat.Messages.Add(new ChatMessage
                {
                    Sender = "user",
                    Content = request.InitialMessage,
                    Timestamp = DateTime.UtcNow
                });
            }

            await _cosmosDbService.AddDocumentAsync(chat);
            return chat;
        }

        public async Task<Chat> AddMessageAsync(string chatId, AddMessageRequest request)
        {
            var chat = await _cosmosDbService.GetDocumentAsync<Chat>(chatId);
            if (chat == null)
            {
                throw new KeyNotFoundException($"Chat with ID {chatId} not found");
            }

            var message = new ChatMessage
            {
                Sender = request.Sender,
                Content = request.Content,
                Timestamp = DateTime.UtcNow
            };

            chat.Messages.Add(message);
            chat.UpdatedAt = DateTime.UtcNow;

            await _cosmosDbService.UpdateDocumentAsync(chatId, chat);
            return chat;
        }

        public async Task<IEnumerable<Chat>> GetUserChatsAsync(string userId)
        {
            var chats = await _cosmosDbService.QueryDocumentsAsync<Chat>(c => c.UserId == userId);
            return chats.OrderByDescending(c => c.UpdatedAt);
        }

        public async Task<Chat> GetChatByIdAsync(string chatId)
        {
            var chat = await _cosmosDbService.GetDocumentAsync<Chat>(chatId);
            if (chat == null)
            {
                throw new KeyNotFoundException($"Chat with ID {chatId} not found");
            }
            return chat;
        }

        // Add new method for ChatPDF upload
        public async Task<string> UploadToChatPdfAsync(Stream fileStream, string fileName)
        {
            return await _chatPdfService.UploadFileAsync(fileStream, fileName);
        }

        // Get all chats for a specific user
        public async Task<IEnumerable<Chat>> GetChatHistoryAsync(string userId)
        {
            var chats = await _cosmosDbService.QueryDocumentsAsync<Chat>(c => c.UserId == userId);
            return chats.OrderByDescending(c => c.UpdatedAt);
        }

        // Update chat with new messages
        public async Task UpdateChatAsync(Chat chat)
        {
            chat.UpdatedAt = DateTime.UtcNow;
            await _cosmosDbService.UpdateDocumentAsync(chat.Id, chat);
        }

        // Process a message using the ChatPDF service
        public async Task<string> ProcessMessageWithChatPdfAsync(string sourceId, string message)
        {
            // Call ChatPDF API to get response
            var response = await _chatPdfService.AskQuestionAsync(sourceId, message);
            return response;
        }
    }
}
