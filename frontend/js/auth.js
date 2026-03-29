window.addEventListener("load", () => {
  document.body.classList.add("loaded");
});

const form = document.getElementById("loginForm");
const messageBox = document.getElementById("authMessage");
const roleSelect = document.getElementById("role");
const roleGroup = roleSelect.closest(".input-group");

form.addEventListener("submit", (e) => {
  e.preventDefault();

  messageBox.className = "auth-message";
  roleGroup.classList.remove("error", "success");

  if (!roleSelect.value) {
    roleGroup.classList.add("error");
    return;
  }

  roleGroup.classList.add("success");

  setTimeout(() => {
    messageBox.textContent = "✅ Login successful!";
    messageBox.classList.add("success");
  }, 300);
});


fetch("/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: email.value,
    password: password.value
  })
})
.then(res => res.json())
.then(data => {

   if (data.error) {
    showToast(data.error, "error");
    return;
  }

  localStorage.setItem("user", JSON.stringify({
    id: data.user_id,
    role: data.role,
    name: data.name,
    status: data.status
  }));

  if (data.role === "admin") {
    window.location.href = "admin-dashboard.html";
  } else if (data.role === "seller") {
    window.location.href = "seller-dashboard.html";
  } else {
    window.location.href = "user-dashboard.html";
  }
});