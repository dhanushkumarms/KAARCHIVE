document.addEventListener('DOMContentLoaded', () => {
    // Get form elements
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    const emailField = document.getElementById('email');
    const displayNameField = document.getElementById('display-name');
    const uploadPictureBtn = document.getElementById('upload-picture');
    const pictureUpload = document.getElementById('picture-upload');
    const profilePicture = document.getElementById('profile-picture');
    
    // Get preference toggles
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const emailNotificationsToggle = document.getElementById('email-notifications');
    const saveChatHistoryToggle = document.getElementById('save-chat-history');
    const languageSelect = document.getElementById('language-select');
    
    // Get danger zone buttons
    const clearDataBtn = document.getElementById('clear-data');
    const deleteAccountBtn = document.getElementById('delete-account');
    
    // Get modal elements
    const confirmModal = document.getElementById('confirm-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    
    // Initialize the page
    initPage();
    
    /**
     * Initialize the settings page by loading user data and setting up event listeners
     */
    function initPage() {
        // Load user data
        loadUserData();
        
        // Set up form submissions
        setupForms();
        
        // Set up preference toggles
        setupPreferences();
        
        // Set up danger zone actions
        setupDangerZone();
    }
    
    /**
     * Load user data from localStorage or API
     */
    function loadUserData() {
        // Get stored email
        const userEmail = localStorage.getItem('userEmail');
        if (userEmail) {
            emailField.value = userEmail;
        }
        
        // Get stored username/display name
        const userName = localStorage.getItem('userName');
        if (userName) {
            displayNameField.value = userName;
        }
        
        // Load profile picture if exists
        const profilePicUrl = localStorage.getItem('profilePicture');
        if (profilePicUrl) {
            profilePicture.src = profilePicUrl;
        }
        
        // Load preferences
        loadPreferences();
    }
    
    /**
     * Setup form submission handlers
     */
    function setupForms() {
        // Profile form submission
        if (profileForm) {
            profileForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const displayName = displayNameField.value.trim();
                
                if (!displayName) {
                    showAlert('Please enter a display name');
                    return;
                }
                
                // Save to localStorage for demo purposes
                // In production, this would be an API call
                localStorage.setItem('userName', displayName);
                
                showAlert('Profile updated successfully', 'success');
            });
        }
        
        // Password form submission
        if (passwordForm) {
            passwordForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                const currentPassword = document.getElementById('current-password').value;
                const newPassword = document.getElementById('new-password').value;
                const confirmPassword = document.getElementById('confirm-password').value;
                
                // Basic validation
                if (!currentPassword || !newPassword || !confirmPassword) {
                    showAlert('All password fields are required');
                    return;
                }
                
                if (newPassword !== confirmPassword) {
                    showAlert('New passwords do not match');
                    return;
                }
                
                if (newPassword.length < 8) {
                    showAlert('Password must be at least 8 characters');
                    return;
                }
                
                // In production, this would be an API call to change password
                // For demo, just show success
                showAlert('Password changed successfully', 'success');
                
                // Reset form
                passwordForm.reset();
            });
        }
        
        // Profile picture upload
        if (uploadPictureBtn && pictureUpload) {
            uploadPictureBtn.addEventListener('click', () => {
                pictureUpload.click();
            });
            
            pictureUpload.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    
                    reader.onload = function(e) {
                        profilePicture.src = e.target.result;
                        
                        // Save to localStorage for demo purposes
                        localStorage.setItem('profilePicture', e.target.result);
                    };
                    
                    reader.readAsDataURL(this.files[0]);
                }
            });
        }
    }
    
    /**
     * Setup preference toggles and selects
     */
    function setupPreferences() {
        // Dark mode toggle
        if (darkModeToggle) {
            darkModeToggle.addEventListener('change', function() {
                const isDarkMode = this.checked;
                toggleDarkMode(isDarkMode);
                localStorage.setItem('darkMode', isDarkMode);
            });
        }
        
        // Email notifications toggle
        if (emailNotificationsToggle) {
            emailNotificationsToggle.addEventListener('change', function() {
                localStorage.setItem('emailNotifications', this.checked);
            });
        }
        
        // Save chat history toggle
        if (saveChatHistoryToggle) {
            saveChatHistoryToggle.addEventListener('change', function() {
                localStorage.setItem('saveChatHistory', this.checked);
            });
        }
        
        // Language select
        if (languageSelect) {
            languageSelect.addEventListener('change', function() {
                localStorage.setItem('language', this.value);
                // In a real app, this would trigger language change throughout the app
            });
        }
    }
    
    /**
     * Apply dark mode to the entire site
     * @param {boolean} enable - Whether to enable or disable dark mode
     */
    function applyDarkMode(enable) {
        if (enable) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }
    
    /**
     * Setup danger zone action buttons
     */
    function setupDangerZone() {
        // Clear data button
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => {
                showConfirmModal(
                    'Clear All Data',
                    'This will permanently delete all your documents and chat history. This action cannot be undone. Are you sure you want to proceed?',
                    clearAllUserData
                );
            });
        }
        
        // Delete account button
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', () => {
                showConfirmModal(
                    'Delete Account',
                    'This will permanently delete your account and all associated data. This action cannot be undone. Are you sure you want to delete your account?',
                    deleteUserAccount
                );
            });
        }
        
        // Modal cancel button
        if (modalCancel) {
            modalCancel.addEventListener('click', () => {
                confirmModal.style.display = 'none';
            });
        }
        
        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === confirmModal) {
                confirmModal.style.display = 'none';
            }
        });
    }
    
    /**
     * Load user preferences from localStorage
     */
    function loadPreferences() {
        // Dark mode
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (darkModeToggle) {
            darkModeToggle.checked = isDarkMode;
        }
        
        // Email notifications
        const emailNotifications = localStorage.getItem('emailNotifications') !== 'false'; // Default to true
        if (emailNotificationsToggle) {
            emailNotificationsToggle.checked = emailNotifications;
        }
        
        // Save chat history
        const saveChatHistory = localStorage.getItem('saveChatHistory') !== 'false'; // Default to true
        if (saveChatHistoryToggle) {
            saveChatHistoryToggle.checked = saveChatHistory;
        }
        
        // Language
        const language = localStorage.getItem('language') || 'en';
        if (languageSelect) {
            languageSelect.value = language;
        }
    }
    
    /**
     * Show confirmation modal
     * @param {string} title - Modal title
     * @param {string} message - Modal message
     * @param {Function} confirmCallback - Function to call when confirmed
     */
    function showConfirmModal(title, message, confirmCallback) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        
        // Set up confirm button
        modalConfirm.onclick = () => {
            confirmCallback();
            confirmModal.style.display = 'none';
        };
        
        // Show modal
        confirmModal.style.display = 'flex';
    }
    
    /**
     * Clear all user data
     */
    function clearAllUserData() {
        // In a real app, this would call an API to delete user data
        // For demo, remove relevant items from localStorage
        
        // Keep authentication but remove all other data
        const authToken = localStorage.getItem('authToken');
        const userEmail = localStorage.getItem('userEmail');
        const userName = localStorage.getItem('userName');
        
        localStorage.clear();
        
        // Restore auth
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('userEmail', userEmail);
        localStorage.setItem('userName', userName);
        
        showAlert('All your data has been cleared successfully', 'success');
    }
    
    /**
     * Delete user account
     */
    function deleteUserAccount() {
        // In a real app, this would call an API to delete the user's account
        // For demo, clear localStorage and redirect to login
        
        localStorage.clear();
        showAlert('Your account has been deleted', 'success');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
    
    /**
     * Show an alert to the user
     * @param {string} message - Alert message
     * @param {string} type - Alert type (success or error)
     */
    function showAlert(message, type = 'error') {
        // You could use a toast library here or a custom alert
        alert(`${type === 'success' ? 'Success' : 'Error'}: ${message}`);
    }
});
