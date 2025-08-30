document.addEventListener('DOMContentLoaded', () => {
    const fileSelector = document.getElementById('file-selector');
    const fileList = document.getElementById('existing-files');
    const uploadSection = document.getElementById('upload-section');
    const existingFilesSection = document.getElementById('existing-files-section');
    
    if (fileSelector) {
        fileSelector.addEventListener('change', (e) => {
            const option = e.target.value;
            if (option === 'upload') {
                uploadSection.style.display = 'block';
                existingFilesSection.style.display = 'none';
            } else if (option === 'existing') {
                uploadSection.style.display = 'none';
                existingFilesSection.style.display = 'block';
                loadExistingFiles();
            }
        });
    }
    
    async function loadExistingFiles() {
        try {
            const loggedInEmail = localStorage.getItem('userEmail') || "user@example.com";
            const loggedInUsername = localStorage.getItem('userName') || "defaultUser";
            
            const response = await fetch(`http://localhost:5237/api/upload/aifiles?email=${loggedInEmail}&username=${loggedInUsername}`);
            if (!response.ok) {
                throw new Error(`Error ${response.status} while fetching files.`);
            }
            
            const files = await response.json();
            displayExistingFiles(files);
        } catch (error) {
            console.error('Error loading files:', error);
            fileList.innerHTML = '<p class="text-danger">Failed to load files. Please try again later.</p>';
        }
    }
    
    function displayExistingFiles(files) {
        if (!files || files.length === 0) {
            fileList.innerHTML = '<p>No files available. Please upload a new file.</p>';
            return;
        }
        
        let html = '<div class="file-grid">';
        files.forEach(file => {
            const formattedDate = new Date(file.lastModified).toLocaleDateString();
            html += `
                <div class="file-item" data-blob-url="${file.blobUrl}" data-filename="${file.displayName}">
                    <div class="file-icon">
                        <i class="fa ${getFileIconClass(file.contentType)}"></i>
                    </div>
                    <div class="file-info">
                        <div class="file-name">${file.displayName}</div>
                        <div class="file-details">${file.size} • ${formattedDate}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        fileList.innerHTML = html;
        
        // Add click event listeners to each file item
        document.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                selectFile(item.dataset.blobUrl, item.dataset.filename);
            });
        });
    }
    
    function getFileIconClass(contentType) {
        if (contentType?.includes('pdf')) return 'fa-file-pdf';
        if (contentType?.includes('text')) return 'fa-file-alt';
        if (contentType?.includes('word') || contentType?.includes('document')) return 'fa-file-word';
        return 'fa-file';
    }
    
    function selectFile(blobUrl, fileName) {
        // Remove selection from all files
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to clicked file
        const selectedItem = document.querySelector(`.file-item[data-blob-url="${blobUrl}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
        }
        
        // Store the selected file info for submission
        window.selectedExistingFile = {
            blobUrl: blobUrl,
            fileName: fileName
        };
        
        // Enable the submit button
        const startChatBtn = document.getElementById('start-chat-btn');
        if (startChatBtn) {
            startChatBtn.disabled = false;
        }
    }
});

// Function to start chat with selected file
function startChatWithExistingFile() {
    if (!window.selectedExistingFile) {
        alert('Please select a file first.');
        return;
    }
    
    const { blobUrl, fileName } = window.selectedExistingFile;
    const loggedInEmail = localStorage.getItem('userEmail') || "user@example.com";
    const loggedInUsername = localStorage.getItem('userName') || "defaultUser";
    const initialQuestion = document.getElementById('initial-question')?.value || 'Tell me about this document';
    
    // Create chat request object similar to the one used for new uploads
    const chatRequest = {
        userId: `${loggedInEmail}_${loggedInUsername}`,
        documentName: fileName,
        blobUrl: blobUrl,
        sourceId: blobUrl,
        initialMessage: initialQuestion
    };
    
    // Submit the chat request
    fetch('http://localhost:5237/api/chat/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatRequest)
    })
    .then(response => {
        if (!response.ok) throw new Error(`Error ${response.status}`);
        return response.json();
    })
    .then(data => {
        // Handle successful chat creation - redirect to chat page or show chat UI
        console.log('Chat created:', data);
        window.location.href = `chat.html?id=${data.chatId}`;
    })
    .catch(error => {
        console.error('Error creating chat:', error);
        alert('Failed to start chat. Please try again.');
    });
}
