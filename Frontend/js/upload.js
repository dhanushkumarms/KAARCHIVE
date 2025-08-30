const storedEmail = localStorage.getItem('userEmail') || "user@example.com";
const userEmailEl = document.getElementById('user-email');
if (userEmailEl) {
  userEmailEl.innerText = storedEmail;
}

// Menu & Navigation handling
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

const linkColor = document.querySelectorAll('.nav__link');
function colorLink() {
  linkColor.forEach(l => l.classList.remove('active'));
  this.classList.add('active');
}
linkColor.forEach(l => l.addEventListener('click', colorLink));

// Helper: Choose a file icon based on the file extension
function getFileIcon(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  switch (extension) {
    case 'pdf':
      return "../assets/img/pdf.png";
    case 'doc':
    case 'docx':
      return "../assets/img/docx.png";
    case 'ppt':
    case 'pptx':
      return "../assets/img/pptx.png";
    default:
      return "../assets/img/default.png"; // a default icon if available
  }
}

// File upload logic
const dropArea = document.querySelector(".drop_box");
// Use event delegation for button clicks within dropArea
dropArea.addEventListener("click", (event) => {
  if (event.target.id === "uploadButton") {
    const file = dropArea.fileToUpload;
    if (file) {
      uploadFile(file);
    }
  } else if (event.target.classList.contains('btn') && event.target.closest('.drop_box') === dropArea) {
    const input = dropArea.querySelector("input");
    input.click();
  }
});

// Use event delegation for changes in the file
dropArea.addEventListener("change", (e) => {
  if (e.target.type === "file") {
    const file = e.target.files[0];
    if (file) {
      handleFileSelection(file);
    }
  }
});

function handleFileSelection(file) {
  // Choose an appropriate icon for the file
  const iconUrl = getFileIcon(file.name);

  // Store the file in the dropArea element
  dropArea.fileToUpload = file;

  // Display the file name along with its icon and an "Upload" button
  const filedata = `
    <div class="upload-summary">
      <img src="${iconUrl}" alt="File Icon" class="file-icon">
      <h4>${file.name}</h4>
      <button id="uploadButton" class="btn">Upload</button>
    </div>
  `;
  dropArea.innerHTML = filedata;
}

function uploadFile(file) {
  const loggedInEmail = localStorage.getItem('userEmail') || "user@example.com";
  const loggedInUsername = localStorage.getItem('userName') || "defaultUser";
  let formData = new FormData();
  formData.append("file", file);
  formData.append("email", loggedInEmail);
  formData.append("username", loggedInUsername);
  // Send the file to the backend endpoint.
  fetch("http://localhost:5237/api/upload/file", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.text())
    .then((data) => {
      // On success, display a success message
      dropArea.innerHTML = `<div class="upload-success"><h4>${data}</h4></div>`;
      // After a delay, reset the drop area for a new upload
      setTimeout(() => {
        resetDropArea();
      }, 3000);
    })
    .catch((error) => {
      console.error("Upload error:", error);
      alert("File upload failed.");
    });
}

// Function to upload to ChatPDF AI
function uploadToAI(file) {
  const loggedInEmail = localStorage.getItem('userEmail') || "user@example.com";
  const loggedInUsername = localStorage.getItem('userName') || "defaultUser";
  
  let formData = new FormData();
  formData.append("file", file);
  formData.append("email", loggedInEmail);
  formData.append("username", loggedInUsername);
  
  // Show loading state with improved styling
  dropArea.innerHTML = `
    <div class="loading">
      <h4>Uploading to AI...</h4>
      <div class="spinner"></div>
    </div>
  `;

  fetch("http://localhost:5237/api/upload/aiupload", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      // Store the sourceId for future questions
      localStorage.setItem('currentSourceId', data.sourceId);
      
      // Enhanced UI with better contrast
      dropArea.innerHTML = `
        <div class="upload-success">
          <h4>File uploaded to AI successfully!</h4>
          <p>You can now ask questions about this document.</p>
          <div class="question-area">
            <textarea id="question" placeholder="Ask something about the document..."></textarea>
            <button id="askButton" class="btn">Ask AI</button>
          </div>
          <div id="answer-container"></div>
        </div>
      `;
      
      // Add event listener to the Ask button
      document.getElementById('askButton').addEventListener('click', askQuestion);
    })
    .catch((error) => {
      console.error("Upload error:", error);
      // Enhanced error UI with better contrast
      dropArea.innerHTML = `
        <div class="upload-error">
          <h4>Upload failed</h4>
          <p>Please try again</p>
          <button class="btn" onclick="resetDropArea()">Try Again</button>
        </div>
      `;
    });
}

function askQuestion() {
  const question = document.getElementById('question').value;
  const sourceId = localStorage.getItem('currentSourceId');
  
  if (!question || !sourceId) {
    alert("Please upload a document first and enter a question");
    return;
  }
  
  const answerContainer = document.getElementById('answer-container');
  answerContainer.innerHTML = `<div class="loading"><p>Getting answer...</p><div class="spinner"></div></div>`;
  
  fetch("http://localhost:5237/api/upload/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sourceId: sourceId,
      question: question
    })
  })
    .then(response => response.json())
    .then(data => {
      answerContainer.innerHTML = `
        <div class="answer">
          <h4>Answer:</h4>
          <p>${data.content || data}</p>
        </div>
      `;
    })
    .catch(error => {
      console.error("Error:", error);
      answerContainer.innerHTML = `<div class="error">Failed to get answer. Please try again.</div>`;
    });
}

// Function to reset the drop area to its initial state.
function resetDropArea() {
  // Dark mode aware reset
  const isDarkMode = document.body.classList.contains('dark-mode');
  
  dropArea.innerHTML = `
    <i class='bx bxs-cloud-upload icon'></i>
    <header>
      <h4>Select File here</h4>
    </header>
    <p>Files Supported: <span>.pdf, .doc, .docx, .ppt, .pptx, .txt</span></p>
    <input type="file" hidden accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" id="fileID">
    <button class="btn">Choose File</button>
  `;
  dropArea.fileToUpload = undefined;
}

// Add dark mode detection on page load
document.addEventListener('DOMContentLoaded', function() {
  // Check if dark mode is enabled and apply appropriate styles
  const isDarkMode = localStorage.getItem('darkMode') === 'true';
  if (isDarkMode) {
    document.body.classList.add('dark-mode');
  }
});

resetDropArea();