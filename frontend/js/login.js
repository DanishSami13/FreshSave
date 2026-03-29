
const form = document.getElementById("loginForm");
const messageBox = document.getElementById("authMessage");

form.addEventListener("submit", function(e) {
e.preventDefault();

const email = form.querySelector("input[type='email']").value.trim();
const password = form.querySelector("input[type='password']").value.trim();

if (!email || !password) {
messageBox.textContent = "⚠️ Please enter email and password.";
messageBox.className = "auth-message error";
messageBox.style.opacity = "1";
return;
}

fetch("/auth/login", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ email, password })
})
.then(res => res.json())
.then(data => {
if (data.error) {
    messageBox.textContent = "❌ " + data.error;
    messageBox.classList.add("error");
    messageBox.className = "auth-message error";
    messageBox.style.opacity = "1";
    return;
}

// 🔐 Store session
localStorage.setItem("user", JSON.stringify({
    id: data.user_id,
    role: data.role,
    name: data.name
}));

messageBox.textContent = "✅ Login successful! Redirecting...";
messageBox.className = "auth-message success";
messageBox.style.opacity = "1";

setTimeout(() => {
    if (data.role === "seller") {
    window.location.href = "seller/seller-dashboard.html";
    } 
    else if (data.role === "admin") {
    window.location.href = "admin/admin-dashboard.html";
    } 
    else {
    window.location.href = "user/user-dashboard.html";
    }
}, 1000);
})
.catch(() => {
messageBox.textContent = "❌ Server error.";
messageBox.className = "auth-message error";
messageBox.style.opacity = "1";
});
});