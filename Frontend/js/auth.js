document.addEventListener("DOMContentLoaded", () => {
  // Signup form handling
  const signupForm = document.getElementById("signup-form");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirm-password").value;

      // Basic client-side validation
      if (!username || !email || !password || !confirmPassword) {
        alert("All fields are required!");
        return;
      }

      if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
      }

      if (!isStrongPassword(password)) {
        alert(
          "Password must be at least 8 characters long, include 1 uppercase letter, 1 number, and 1 special character."
        );
        return;
      }

      try {
        const response = await fetch("http://localhost:5237/api/user/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });

        if (response.ok) {
          alert("Signup successful");
          window.location.href = "login.html"; // Redirect to login page
        } else {
          const errorData = await response.json();
          alert(`Signup failed: ${errorData.error || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Error:", error);
        alert("Something went wrong. Please try again.");
      }
    });
  }

  // Login form handling
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;

      if (!username || !password) {
        alert("Please enter both username and password.");
        return;
      }

      try {
        const response = await fetch("http://localhost:5237/api/user/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
          const userData = await response.json();
          localStorage.setItem("userEmail", userData.email);
          localStorage.setItem("authToken", userData.token); // Store token
          localStorage.setItem("userName", userData.username); // Store username
          console.log(userData);
          alert("Login successful");
          window.location.href = "index.html"; // Redirect to dashboard
        } else {
          const errorData = await response.json();
          alert(`Login failed: ${errorData.error || "Invalid credentials"}`);
        }
      } catch (error) {
        console.error("Error:", error);
        alert("Something went wrong. Please try again.");
      }
    });
  }
});

// Function to check strong password
function isStrongPassword(password) {
  const regex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
}
