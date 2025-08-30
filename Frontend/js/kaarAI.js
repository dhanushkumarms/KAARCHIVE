// Initialize document variables
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-message-btn');
const newChatButton = document.getElementById('new-chat-btn');
const documentDropArea = document.getElementById('document-drop-area');
const documentInfo = document.getElementById('document-info');
const documentIcon = document.getElementById('document-icon');
const documentName = document.getElementById('document-name');
const documentStatus = document.getElementById('doc-status');

// User information
const storedEmail = localStorage.getItem('userEmail') || "user@example.com";
const userEmailEl = document.getElementById('user-email');
if (userEmailEl) {
  userEmailEl.innerText = storedEmail;
}
const loggedInEmail = storedEmail;

// Current document tracking
let currentDocument = null;
let currentSourceId = null;

// Chat persistence
const CHAT_STORAGE_KEY = 'kaarAI_chatState';

// Initialize chat
document.addEventListener('DOMContentLoaded', () => {
    // Check if we should load a specific chat session
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get('chatId');
    
    if (chatId) {
        // If we have a chat ID in the URL, load that specific chat
        console.log("Loading specific chat:", chatId);
        localStorage.setItem('currentChatId', chatId);
        
        // The chat history manager will handle loading this chat
    } else {
        // Check if a filename was provided in the URL
        const filename = urlParams.get('filename');
        
        if (filename) {
            console.log(`Loading existing file: ${filename}`);
            
            // Clear any previous chat state for a clean start
            chatMessages.innerHTML = '';
            localStorage.removeItem('currentSourceId');
            
            // Always hide the document drop area when loading a specific file
            if (documentDropArea) documentDropArea.style.display = 'none';
            
            // Show loading indicator in document info area
            if (documentInfo) {
                documentInfo.style.display = 'flex';
                documentName.textContent = filename;
                documentStatus.textContent = 'Loading...';
                documentStatus.className = 'status-badge loading';
            }
            
            // Get user credentials from localStorage
            const loggedInEmail = localStorage.getItem('userEmail') || "user@example.com";
            const loggedInUsername = localStorage.getItem('userName') || "defaultUser";
            
            // Add initial welcome message for the specific file
            addMessage(`Loading "${filename}"...`, 'ai');
            
            // Fetch the file from the backend
            fetchFileFromBackend(filename, loggedInEmail, loggedInUsername)
                .then(file => {
                    console.log(`File fetched successfully, size: ${file.size} bytes`);
                    // Update status to uploading
                    documentStatus.textContent = 'Uploading to AI...';
                    
                    // Create a proper File object to ensure consistent handling
                    const actualFile = new File([file], filename, {
                        type: file.type || determineFileType(filename)
                    });
                    
                    // Store reference to current document
                    currentDocument = actualFile;
                    
                    // Upload to ChatPDF API
                    return uploadToChatAPI(file, filename, loggedInEmail, loggedInUsername);
                })
                .then(chatData => {
                    console.log(`Chat created successfully with sourceId: ${chatData.sourceId || 'unknown'}`);
                    // Update status to success
                    documentStatus.textContent = 'Ready';
                    documentStatus.className = 'status-badge success';
                    
                    // Store the sourceId for future questions
                    if (chatData.sourceId) {
                        currentSourceId = chatData.sourceId;
                        localStorage.setItem('currentSourceId', chatData.sourceId);
                    }
                    
                    // Update the document icon based on file type
                    documentIcon.src = getFileIconPath(filename);
                    
                    // Initialize chat with the document
                    addMessage(`I've loaded "${filename}". What would you like to know about it?`, 'ai');
                })
                .catch(error => {
                    console.error('Error processing file:', error);
                    if (documentStatus) {
                        documentStatus.textContent = 'Error';
                        documentStatus.className = 'status-badge error';
                    }
                    addMessage(`Sorry, I couldn't process "${filename}": ${error.message}. Please try again.`, 'ai');
                });
        } else {
            // Try to restore previous chat state only if we're not loading a specific file
            if (loadChatState()) {
                console.log("Restored previous chat session");
            } else {
                // Add initial welcome message only if there's no saved state
                addMessage("Hello! I'm Kaar AI. Upload a document to get started.", 'ai');
            }
        }
    }
    
    // Set up event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Send message when button is clicked
    if (sendButton) {
        sendButton.addEventListener('click', sendMessage);
    }
    
    // Send message when Enter key is pressed (not with Shift)
    if (userInput) {
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Auto resize text area as user types with improved handling
        userInput.addEventListener('input', function() {
            // Set a minimum height (matches the initial height in CSS)
            const minHeight = 42;
            
            // Reset height to calculate the new height
            this.style.height = 'auto';
            
            // Set new height based on content with minimum enforced
            const newHeight = Math.max(minHeight, Math.min(this.scrollHeight, 150));
            this.style.height = newHeight + 'px';
            
            // Enable/disable send button based on content
            if (sendButton) {
                sendButton.disabled = this.value.trim().length === 0;
            }
        });
        
        // Initialize height on page load
        userInput.dispatchEvent(new Event('input'));
    }
    
    // New chat button handler
    if (newChatButton) {
        newChatButton.addEventListener('click', startNewChat);
    }
    
    // File selection from drop area
    if (documentDropArea) {
        documentDropArea.addEventListener('click', (e) => {
            // Check if the click was on the choose file button
            if (e.target.classList.contains('btn')) {
                const fileInput = documentDropArea.querySelector('input[type="file"]');
                if (fileInput) {
                    fileInput.click();
                }
            }
        });
    }
    
    // File input change handler
    const fileInput = document.getElementById('fileID');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleFileSelection(file);
            }
        });
    }
    
    // Save chat state when navigating away
    window.addEventListener('beforeunload', saveChatState);
}

function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    // If ChatHistoryManager is available and initialized, use it
    if (window.ChatHistoryManager && ChatHistoryManager.currentChatId) {
        // The message sending will be handled by ChatHistoryManager
        // Just simulate a click on the send button
        document.getElementById('send-message-btn').click();
        return;
    }
    
    // Add user message to chat
    addMessage(message, 'user');
    
    // Clear input field
    userInput.value = '';
    
    // If we have a source ID, send the question to the AI
    if (currentSourceId) {
        // Show loading indicator
        showTypingIndicator();
        
        // Send question to AI backend
        askAIQuestion(message);
    } else {
        // If no document is uploaded yet, inform the user
        setTimeout(() => {
            addMessage("Please upload a document first to ask specific questions about its content.", 'ai');
        }, 600);
    }
    
    // After processing the message, save the chat state
    saveChatState();
}

function addMessage(content, sender) {
    if (!chatMessages) return;
    
    // Remove typing indicator if present
    removeTypingIndicator();
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    // Add ARIA roles for accessibility
    messageDiv.setAttribute('role', 'log');
    messageDiv.setAttribute('aria-live', sender === 'user' ? 'off' : 'polite');
    
    // Create avatar
    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.src = sender === 'ai' ? '../assets/img/k.png' : '../assets/img/profile.png';
    avatar.alt = sender === 'ai' ? 'AI Assistant' : 'User'; 
    
    // Fallback for missing avatars
    avatar.onerror = function() {
        avatar.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM2OTIzRDAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSIxMSIgd2lkdGg9IjE4IiBoZWlnaHQ9IjExIiByeD0iMiIgcnk9IjIiPjwvcmVjdD48cGF0aCBkPSJNNyAxMVY3YTUgNSAwIDAgMSAxMCAwdjQiPjwvcGF0aD48L3N2Zz4=';
    };
    
    // Create message content with improved text handling
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Handle multi-line text and preserve formatting
    // Replace line breaks with <br> tags for proper display
    messageContent.innerHTML = content.replace(/\n/g, '<br>');
    
    // Assemble and append the message
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    scrollToBottom();
    
    // After adding message to DOM, save the chat state
    saveChatState();
}

function showTypingIndicator() {
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'message ai-message typing-indicator';
    indicatorDiv.innerHTML = `
        <img class="avatar" src="../assets/img/k.png" alt="AI">
        <div class="typing-animation">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    chatMessages.appendChild(indicatorDiv);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.querySelector('.typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function scrollToBottom() {
    // Enhanced smooth scrolling with a small delay to ensure all content is rendered
    if (chatMessages) {
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 50);
    }
}

function handleFileSelection(file) {
    // Accept all supported file types (PDF, Word, PowerPoint, text)
    const extension = file.name.split('.').pop().toLowerCase();
    const supportedExtensions = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt'];
    
    if (!supportedExtensions.includes(extension)) {
        addMessage("Sorry, this file type is not supported. Please upload a PDF, Word document, PowerPoint, or text file.", 'ai');
        return;
    }
    
    // Update current document reference
    currentDocument = file;
    
    // Show the document info panel
    updateDocumentInfoDisplay(file);
    
    // Upload the document to AI
    uploadToAI(file);
}

function updateDocumentInfoDisplay(file) {
    // Set document icon based on file type
    documentIcon.src = getFileIconPath(file.name);
    documentIcon.alt = 'Document';
    
    // Set document name
    documentName.textContent = file.name;
    
    // Update status
    documentStatus.textContent = 'Processing...';
    documentStatus.className = 'status-badge processing';
    
    // Show the document info panel, hide the drop area
    documentInfo.style.display = 'flex';
    documentDropArea.style.display = 'none';
}

function uploadToAI(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("email", loggedInEmail);
    formData.append("username", localStorage.getItem('userName') || "defaultUser");
    
    // Show uploading message in chat
    addMessage(`Uploading and processing "${file.name}"...`, 'ai');
    
    fetch("http://localhost:5237/api/upload/aiupload", {
        method: "POST",
        body: formData,
    })
    .then((response) => {
        if (!response.ok) {
            throw new Error(`Upload failed with status: ${response.status}`);
        }
        return response.json();
    })
    .then((data) => {
        // Store the sourceId for future questions
        currentSourceId = data.sourceId;
        localStorage.setItem('currentSourceId', data.sourceId);
        
        // Update status
        documentStatus.textContent = 'Ready';
        documentStatus.className = 'status-badge ready';
        
        // Inform the user
        addMessage(`I've processed your document "${file.name}". What would you like to know about it?`, 'ai');
    })
    .catch((error) => {
        console.error("Upload error:", error);
        
        // Update status to indicate error
        documentStatus.textContent = 'Failed';
        documentStatus.className = 'status-badge error';
        
        // Notify the user
        addMessage(`Sorry, I couldn't process the document: ${error.message}. Please try again.`, 'ai');
        
        // Reset drop area to allow trying again
        documentInfo.style.display = 'none';
        documentDropArea.style.display = 'flex';
    });
}

function askAIQuestion(question) {
    fetch("http://localhost:5237/api/upload/ask", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            sourceId: currentSourceId,
            question: question
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Parse the response
        let content;
        let references = [];
        
        if (typeof data === 'string') {
            try {
                const parsedData = JSON.parse(data);
                content = parsedData.content || data;
                references = parsedData.references || [];
            } catch (e) {
                content = data;
            }
        } else {
            content = data.content || JSON.stringify(data);
            references = data.references || [];
        }
        
        // Add the answer to the chat
        addMessage(content, 'ai');
        
        // If there are references, add them in a separate message
        if (references.length > 0) {
            const refsText = `References: ${references.map(ref => `Page ${ref.pageNumber}`).join(', ')}`;
            
            // Create a small note with references
            const refsDiv = document.createElement('div');
            refsDiv.className = 'message ai-message references-message';
            
            const refContent = document.createElement('div');
            refContent.className = 'references-note';
            refContent.textContent = refsText;
            
            refsDiv.appendChild(document.createElement('div')); // Empty div for spacing
            refsDiv.appendChild(refContent);
            
            chatMessages.appendChild(refsDiv);
            scrollToBottom();
        }
    })
    .catch(error => {
        console.error("Error asking question:", error);
        addMessage(`Sorry, I encountered an error: ${error.message}. Please try again.`, 'ai');
    });
}

function saveChatState() {
    // Save chat messages
    const messages = [];
    const messageElements = chatMessages.querySelectorAll('.message');
    
    messageElements.forEach(el => {
        const sender = el.classList.contains('user-message') ? 'user' : 'ai';
        const contentEl = el.querySelector('.message-content');
        if (contentEl) {
            messages.push({
                content: contentEl.innerHTML,
                sender: sender
            });
        }
    });
    
    // Save document info if any
    const documentState = currentDocument ? {
        name: currentDocument.name,
        sourceId: currentSourceId
    } : null;
    
    const chatState = {
        messages: messages,
        document: documentState,
        timestamp: new Date().getTime()
    };
    
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatState));
}

function loadChatState() {
    const savedState = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!savedState) return false;
    
    try {
        const chatState = JSON.parse(savedState);
        
        // Check if we have any messages to restore
        if (!chatState.messages || chatState.messages.length === 0) return false;
        
        // Clear current messages
        chatMessages.innerHTML = '';
        
        // Restore messages
        chatState.messages.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = `message ${msg.sender}-message`;
            
            // Create avatar
            const avatar = document.createElement('img');
            avatar.className = 'avatar';
            if (msg.sender === 'user') {
                avatar.src = '../assets/img/profile.png';
                avatar.alt = 'User';
            } else {
                avatar.src = '../assets/img/k.png';
                avatar.alt = 'AI';
            }
            
            // Create message content
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.innerHTML = msg.content;
            
            // Append elements
            msgDiv.appendChild(avatar);
            msgDiv.appendChild(contentDiv);
            chatMessages.appendChild(msgDiv);
        });
        
        // Restore document state if available
        if (chatState.document) {
            currentSourceId = chatState.document.sourceId;
            // We can't restore the actual File object, but we can update the UI
            documentIcon.src = '../assets/img/pdf.png';
            documentName.textContent = chatState.document.name;
            documentStatus.textContent = 'Ready';
            documentStatus.className = 'status-badge success';
            documentInfo.style.display = 'flex';
            documentDropArea.style.display = 'none';
        }
        
        return true;
    } catch (error) {
        console.error("Error restoring chat state:", error);
        return false;
    }
}

function startNewChat() {
    // If ChatHistoryManager is available, use it
    if (window.ChatHistoryManager) {
        ChatHistoryManager.resetCurrentChat();
        return;
    }
    
    // Confirm before clearing chat
    if (chatMessages.children.length > 1) {
        if (!confirm("Start a new chat? This will clear your current conversation.")) {
            return;
        }
    }
    
    // Clear chat messages
    chatMessages.innerHTML = '';
    
    // Completely reset document state
    currentDocument = null;
    currentSourceId = null;
    
    // Reset document UI
    documentIcon.src = '../assets/img/file-icon.png'; // Reset to default icon
    documentName.textContent = 'No document selected';
    documentStatus.textContent = 'Not uploaded';
    documentStatus.className = 'status-badge';
    
    // Show document upload area, hide document info
    documentInfo.style.display = 'none';
    documentDropArea.style.display = 'block';
    
    // Add initial welcome message
    addMessage("Hello! I'm Kaar AI. Upload a document to get started.", 'ai');
    
    // Save the new empty state immediately
    saveChatState();
    
    // Also clear the sourceId from localStorage
    localStorage.removeItem('currentSourceId');
}

// Navigation menu toggle
const showMenu = (headerToggle, navbarId) => {
    const toggleBtn = document.getElementById(headerToggle);
    const nav = document.getElementById(navbarId);
    if (toggleBtn && nav) {
        toggleBtn.addEventListener('click', () => {
            nav.classList.toggle('show-menu');
            toggleBtn.classList.toggle('bx-x');
        });
    }
};
showMenu('header-toggle', 'navbar');

// Handle active navigation links
const linkColor = document.querySelectorAll('.nav__link');
function colorLink() {
    linkColor.forEach(l => l.classList.remove('active'));
    this.classList.add('active');
}
linkColor.forEach(l => l.addEventListener('click', colorLink));

/**
 * Fetch file from backend
 * @param {string} filename - Name of the file to fetch
 * @param {string} email - User email
 * @param {string} username - Username
 * @returns {Promise<Blob>} - File blob
 */
async function fetchFileFromBackend(filename, email, username) {
    console.log(`Attempting to fetch file: ${filename} for ${email}/${username}`);
    const apiUrl = `http://localhost:5237/api/upload/getfile?email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}&fileName=${encodeURIComponent(filename)}`;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            throw new Error(`Failed to fetch file (${response.status}): ${response.statusText}`);
        }
        
        return response.blob();
    } catch (error) {
        console.error("Fetch error:", error);
        throw new Error(`Failed to fetch file: ${error.message}`);
    }
}

/**
 * Upload file to Chat API
 * @param {Blob} fileBlob - File blob data
 * @param {string} filename - Name of the file
 * @param {string} email - User email
 * @param {string} username - Username
 * @returns {Promise<Object>} - Chat data response
 */
async function uploadToChatAPI(fileBlob, filename, email, username) {
    const userId = `${email}_${username}`;
    console.log(`Uploading file to ChatAPI: ${filename} for user ${userId}`);
    
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', fileBlob, filename);
    
    try {
        // First upload the file to get sourceId
        console.log('Sending file to /api/chat/upload endpoint');
        const uploadResponse = await fetch('http://localhost:5237/api/chat/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Upload error response:', errorText);
            throw new Error(`Failed to upload file to AI: ${uploadResponse.statusText}`);
        }
        
        const uploadData = await uploadResponse.json();
        console.log('Upload successful, sourceId:', uploadData.sourceId);
        
        // Store sourceId for immediate use
        currentSourceId = uploadData.sourceId;
        localStorage.setItem('currentSourceId', uploadData.sourceId);
        
        // Create chat with the uploaded file
        const chatRequest = {
            userId: userId,
            documentName: filename,
            blobUrl: `uploads/${email.replace('@', '_at_').replace('.', '_dot_')}_${username}/${filename}`,
            sourceId: uploadData.sourceId,
            initialMessage: "Tell me about this document"
        };
        
        console.log('Creating chat with request:', JSON.stringify(chatRequest));
        const createChatResponse = await fetch('http://localhost:5237/api/chat/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(chatRequest)
        });
        
        if (!createChatResponse.ok) {
            throw new Error(`Failed to create chat: ${createChatResponse.statusText}`);
        }
        
        const chatData = await createChatResponse.json();
        
        // Store the chat ID for future reference
        localStorage.setItem('currentChatId', chatData.id);
        
        return chatData;
    } catch (error) {
        console.error('Error in uploadToChatAPI:', error);
        throw error;
    }
}

/**
 * Initialize chat with document
 * @param {string} chatId - Chat ID from API
 * @param {string} filename - Name of the document
 */
function initializeChat(chatId, filename) {
    // Store chat ID and show chat interface
    localStorage.setItem('currentChatId', chatId);
    localStorage.setItem('currentDocumentName', filename);
    
    // Function to send initial message
    const sendInitialQuestion = () => {
        // Get chat message input and simulate sending a message
        const questionInput = document.getElementById('question-input');
        const questionForm = document.getElementById('question-form');
        
        if (questionInput && questionForm) {
            questionInput.value = "Tell me about this document";
            
            // Dispatch submit event on the form
            const submitEvent = new Event('submit');
            questionForm.dispatchEvent(submitEvent);
        }
    };
    
    // Add slight delay to ensure chat interface is ready
    setTimeout(sendInitialQuestion, 1000);
}

/**
 * Determine file type based on extension
 * @param {string} filename - Name of the file
 * @returns {string} - MIME type
 */
function determineFileType(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    switch (extension) {
        case 'pdf': return 'application/pdf';
        case 'doc': case 'docx': return 'application/msword';
        case 'ppt': case 'pptx': return 'application/vnd.ms-powerpoint';
        case 'txt': return 'text/plain';
        default: return 'application/octet-stream';
    }
}

/**
 * Get appropriate icon path based on file type
 * @param {string} filename - Name of the file
 * @returns {string} - Path to icon
 */
function getFileIconPath(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    switch (extension) {
        case 'pdf': return '../assets/img/pdf.png';
        case 'doc': case 'docx': return '../assets/img/docx.png';
        case 'ppt': case 'pptx': return '../assets/img/pptx.png';
        case 'txt': return '../assets/img/txt.png';
        default: return '../assets/img/file-icon.png';
    }
}