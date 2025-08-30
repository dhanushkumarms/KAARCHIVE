// Chat History Manager
const ChatHistoryManager = {
    currentUserId: null,
    currentChatId: null,
    
    // Initialize the chat history functionality
    init: function() {
        // Get current user ID from local storage - checking different possible keys
        // This fixes the inconsistency in user ID storage
        this.currentUserId = localStorage.getItem('userId') || 
                             localStorage.getItem('userEmail') + '_' + localStorage.getItem('userName') ||
                             localStorage.getItem('currentUserId');
        
        if (this.currentUserId) {
            console.log("Loading chat history for user:", this.currentUserId);
            // Load chat history for the current user
            this.loadChatHistory();
        } else {
            console.error("User not logged in or user ID not found in localStorage");
            // Try to get user information from different parts
            const email = localStorage.getItem('userEmail');
            const username = localStorage.getItem('userName');
            if (email && username) {
                this.currentUserId = `${email}_${username}`;
                console.log("Constructed user ID:", this.currentUserId);
                this.loadChatHistory();
            }
        }

        // Add event listener for new chat button
        const newChatBtn = document.getElementById('new-chat-btn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                this.resetCurrentChat();
            });
        }
    },
    
    // Load chat history from API
    loadChatHistory: async function() {
        try {
            console.log("Fetching chat history for:", this.currentUserId);
            const response = await fetch(`http://localhost:5237/api/chat/history/${encodeURIComponent(this.currentUserId)}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load chat history: ${response.status}`);
            }
            
            const chatHistory = await response.json();
            console.log("Retrieved chat history:", chatHistory);
            this.renderChatHistory(chatHistory);
        } catch (error) {
            console.error('Error loading chat history:', error);
            // Show error or fallback UI
            const historyList = document.getElementById('chat-history-list');
            if (historyList) {
                historyList.innerHTML = `<div class="chat-history-empty">Error loading chat history: ${error.message}</div>`;
            }
        }
    },
    
    // Render chat history in the sidebar
    renderChatHistory: function(chatHistory) {
        const historyList = document.getElementById('chat-history-list');
        if (!historyList) {
            console.error("Chat history list element not found");
            return;
        }
        
        // Clear existing content
        historyList.innerHTML = '';
        
        if (!chatHistory || chatHistory.length === 0) {
            historyList.innerHTML = '<div class="chat-history-empty">No previous chats found.</div>';
            return;
        }
        
        // Create chat history items
        chatHistory.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-history-item';
            chatItem.dataset.chatId = chat.id;
            
            const formattedDate = new Date(chat.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            chatItem.innerHTML = `
                <h4>${chat.documentName}</h4>
                <span class="chat-date">${formattedDate}</span>
            `;
            
            chatItem.addEventListener('click', () => this.loadChatSession(chat.id));
            historyList.appendChild(chatItem);
        });
    },
    
    // Load a specific chat session
    loadChatSession: async function(chatId) {
        try {
            const response = await fetch(`http://localhost:5237/api/chat/session/${chatId}`);
            
            if (!response.ok) {
                throw new Error('Failed to load chat session');
            }
            
            const chatSession = await response.json();
            console.log("Loaded chat session:", chatSession);
            
            // Set current chat ID
            this.currentChatId = chatId;
            localStorage.setItem('currentChatId', chatId);
            
            // Update UI to show active chat
            this.updateActiveChatUI(chatId);
            
            // Load chat messages into the chat window
            this.displayChatMessages(chatSession.messages);
            
            // Update document info section
            this.updateDocumentInfo(chatSession);
            
            // Store source ID for the AI interactions
            localStorage.setItem('currentSourceId', chatSession.sourceId);
        } catch (error) {
            console.error('Error loading chat session:', error);
            // Show error message
            alert(`Error loading chat: ${error.message}`);
        }
    },
    
    // Display chat messages in the chat window
    displayChatMessages: function(messages) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        // Clear existing messages
        chatMessages.innerHTML = '';
        
        // If no messages, show welcome message
        if (!messages || messages.length === 0) {
            const welcomeMsg = document.createElement('div');
            welcomeMsg.className = 'chat-message ai';
            welcomeMsg.innerHTML = `
                <div class="message-content">
                    Hello! I'm ready to help you with this document. What would you like to know?
                </div>
            `;
            chatMessages.appendChild(welcomeMsg);
            return;
        }
        
        // Display messages
        messages.forEach(message => {
            const messageElement = document.createElement('div');
            messageElement.className = `chat-message ${message.sender}`;
            
            messageElement.innerHTML = `
                <div class="message-content">${message.content}</div>
            `;
            
            chatMessages.appendChild(messageElement);
        });
        
        // Scroll to bottom of chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
    },
    
    // Update document info section
    updateDocumentInfo: function(chatSession) {
        const documentInfo = document.getElementById('document-info');
        const documentName = document.getElementById('document-name');
        const documentIcon = document.getElementById('document-icon');
        const docStatus = document.getElementById('doc-status');
        
        // Show document info
        documentInfo.style.display = 'flex';
        
        // Set document name
        documentName.textContent = chatSession.documentName;
        
        // Set appropriate icon based on file type
        const fileExtension = chatSession.documentName.split('.').pop().toLowerCase();
        const iconSrc = this.getDocumentIconByExtension(fileExtension);
        documentIcon.src = iconSrc;
        
        // Set status to ready
        docStatus.textContent = 'Ready';
        docStatus.className = 'status-badge ready';
        
        // Hide upload area
        document.getElementById('document-drop-area').style.display = 'none';
    },
    
    // Get appropriate icon for file type
    getDocumentIconByExtension: function(extension) {
        const iconMap = {
            'pdf': '../assets/img/pdf-icon.png',
            'doc': '../assets/img/doc-icon.png',
            'docx': '../assets/img/doc-icon.png',
            'ppt': '../assets/img/ppt-icon.png',
            'pptx': '../assets/img/ppt-icon.png',
            'txt': '../assets/img/txt-icon.png'
        };
        
        return iconMap[extension] || '../assets/img/file-icon.png';
    },
    
    // Update UI to highlight active chat
    updateActiveChatUI: function(chatId) {
        // Remove active class from all history items
        document.querySelectorAll('.chat-history-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current chat
        const activeItem = document.querySelector(`.chat-history-item[data-chat-id="${chatId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    },
    
    // Reset current chat session
    resetCurrentChat: function() {
        // Clear current chat ID
        this.currentChatId = null;
        
        // Clear chat messages
        document.getElementById('chat-messages').innerHTML = '';
        
        // Hide document info
        document.getElementById('document-info').style.display = 'none';
        
        // Show upload area
        document.getElementById('document-drop-area').style.display = 'block';
        
        // Remove active class from all chat history items
        document.querySelectorAll('.chat-history-item').forEach(item => {
            item.classList.remove('active');
        });
    },
    
    // Send a message to current chat session
    sendMessageToCurrentChat: async function(message) {
        // If no current chat, do nothing
        if (!this.currentChatId) {
            console.error('No active chat session');
            return;
        }
        
        try {
            const response = await fetch(`/api/chat/message/${this.currentChatId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });
            
            if (!response.ok) {
                throw new Error('Failed to send message');
            }
            
            const result = await response.json();
            return result.message;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }
};

// Initialize chat history when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure all other scripts are loaded
    setTimeout(() => {
        ChatHistoryManager.init();
    }, 500);
    
    // Update the send message handler to use the chat history manager
    setupChatMessageHandlers();
});

function setupChatMessageHandlers() {
    const sendMessageBtn = document.getElementById('send-message-btn');
    const userInput = document.getElementById('user-input');
    
    if (sendMessageBtn && userInput) {
        sendMessageBtn.addEventListener('click', async () => {
            sendChatMessage();
        });
        
        // Add keyboard event for Enter key
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
}

async function sendChatMessage() {
    const userInput = document.getElementById('user-input');
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Clear input
    userInput.value = '';
    
    const messagesDiv = document.getElementById('chat-messages');
    
    // Add user message to chat
    const userMessageElement = document.createElement('div');
    userMessageElement.className = 'chat-message user';
    userMessageElement.innerHTML = `
        <div class="message-content">${message}</div>
    `;
    messagesDiv.appendChild(userMessageElement);
    
    // Add AI typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-message ai typing';
    typingIndicator.innerHTML = `
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    messagesDiv.appendChild(typingIndicator);
    
    // Scroll to bottom
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    try {
        // Get the current chat ID
        const chatId = ChatHistoryManager.currentChatId || localStorage.getItem('currentChatId');
        
        if (!chatId) {
            throw new Error('No active chat session');
        }
        
        // Send message to current chat session
        const response = await fetch(`http://localhost:5237/api/chat/message/${chatId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Remove typing indicator
        messagesDiv.removeChild(typingIndicator);
        
        // Add AI response
        const aiMessageElement = document.createElement('div');
        aiMessageElement.className = 'chat-message ai';
        aiMessageElement.innerHTML = `
            <div class="message-content">${result.message}</div>
        `;
        messagesDiv.appendChild(aiMessageElement);
        
        // Scroll to bottom
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } catch (error) {
        console.error('Error sending message:', error);
        
        // Remove typing indicator
        if (typingIndicator.parentNode) {
            messagesDiv.removeChild(typingIndicator);
        }
        
        // Show error message
        const errorElement = document.createElement('div');
        errorElement.className = 'chat-message error';
        errorElement.innerHTML = `
            <div class="message-content">
                Sorry, an error occurred: ${error.message}
            </div>
        `;
        messagesDiv.appendChild(errorElement);
    }
}
