document.addEventListener("DOMContentLoaded", () => {

const form = document.getElementById("registerForm");
const messageBox = document.getElementById("authMessage");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirm = document.getElementById("confirm-password").value.trim();
  const role = document.getElementById("role").value;

  messageBox.className = "auth-message";
  messageBox.style.opacity = "1";

  if (password !== confirm) {
    messageBox.textContent = "❌ Passwords do not match";
    messageBox.classList.add("error");
    return;
  }

  try {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password, role })
    });

    const data = await response.json();
    console.log("REGISTER RESPONSE:", data);

    if (data.error) {
      messageBox.textContent = "❌ " + data.error;
      messageBox.classList.add("error");
      return;
    }

    messageBox.textContent = "✅ Registration successful!";
    messageBox.classList.add("success");

    // FORCE redirect
    window.location.replace("login.html");

  } catch (err) {
    console.error(err);
    messageBox.textContent = "❌ Server error";
    messageBox.classList.add("error");
  }

});

});