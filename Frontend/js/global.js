/**
 * Global functions for the KAARchive application
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize key global features
    displayUserEmail();
    applyDarkModeIfEnabled();
    setupLogout();
});

/**
 * Display the logged in user's email in the sidebar
 */
function displayUserEmail() {
    const storedEmail = localStorage.getItem('userEmail') || "user@example.com";
    const userEmailEl = document.getElementById('user-email');

    if (userEmailEl) {
        userEmailEl.innerText = storedEmail;
    }
}

/**
 * Apply dark mode if it's enabled in localStorage
 */
function applyDarkModeIfEnabled() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

/**
 * Toggle dark mode
 * @param {boolean} enable - Whether to enable or disable dark mode
 */
function toggleDarkMode(enable) {
    localStorage.setItem('darkMode', enable);
    applyDarkModeIfEnabled();
}

/**
 * Set up the logout button functionality
 */
function setupLogout() {
    const logoutBtn = document.getElementById('logout-button');
    
    if (!logoutBtn) {
        console.warn("Logout button not found!");
        return;
    }

    logoutBtn.addEventListener('click', async () => {
        console.log("Logout button clicked");
        const authToken = localStorage.getItem('authToken');

        if (!authToken) {
            console.error("No authToken found in localStorage.");
            return;
        }

        try {
            const response = await fetch("http://localhost:5237/api/user/logout", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json"
                }
            });

            console.log("Logout response status:", response.status);
            console.log("Logout response:", await response.text());

            if (!response.ok) {
                console.warn("Logout API failed.");
            }
        } catch (error) {
            console.error("Error during logout:", error);
        } finally {
            console.log("Clearing localStorage and redirecting...");
            localStorage.clear();
            window.location.replace("login.html");
        }
    });
}

/**
 * Format a date string to a more readable format
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(isoDate) {
    if (!isoDate) return '';
    
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Display a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of notification ('success', 'error', 'info', 'warning')
 * @param {number} duration - How long to display the notification in milliseconds
 */
function showNotification(message, type = 'info', duration = 3000) {
    // Check if notification container exists, create if not
    let container = document.getElementById('notification-container');
    
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.style.position = 'fixed';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Set notification styles
    notification.style.backgroundColor = type === 'success' ? '#4CAF50' : 
                                        type === 'error' ? '#F44336' :
                                        type === 'warning' ? '#FF9800' : '#2196F3';
    notification.style.color = 'white';
    notification.style.padding = '12px 16px';
    notification.style.marginBottom = '10px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'all 0.3s ease';
    
    // Add to container
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        
        // Remove from DOM after animation completes
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, duration);
}
