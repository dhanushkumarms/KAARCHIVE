document.addEventListener("DOMContentLoaded", function() {
    displayUserEmail();
    setupLogout();
});

// ✅ Centralized Function: Display Email
function displayUserEmail() {
    const storedEmail = localStorage.getItem('userEmail') || "user@example.com";
    const userEmailEl = document.getElementById('user-email');

    if (userEmailEl) {
        userEmailEl.innerText = storedEmail;
    }
}

// ✅ Centralized Function: Logout
function setupLogout() {
    const logoutBtn = document.getElementById('logout-button');
    
    if (!logoutBtn) {
        console.warn("Logout button not found!");
        return;
    }

    logoutBtn.addEventListener('click', async () => {
        console.log("Logout button clicked");
        
        // Define client-side logout function
        const performClientSideLogout = () => {
            localStorage.clear();
            window.location.href = "login.html"; // Redirect to login page
        };
        
        const authToken = localStorage.getItem('authToken');

        // If no auth token, just do client-side logout
        if (!authToken) {
            console.warn("No authToken found in localStorage.");
            performClientSideLogout();
            return;
        }

        try {
            // Attempt server-side logout
            const response = await fetch("http://localhost:5237/api/user/logout", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${authToken}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                console.warn("Logout API failed, continuing with client-side logout");
            }
        } catch (error) {
            console.error("Error during logout:", error);
        } finally {
            // Always perform client-side logout, even if API call fails
            performClientSideLogout();
        }
    });
}
