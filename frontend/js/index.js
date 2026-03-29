function redirect() {
  const role = document.getElementById("role").value;

  if (!role) {
    alert("Please select a role");
    return;
  }

  if (role === "admin") {
    window.location.href = "admin/admin.html";
  }

  if (role === "seller") {
    window.location.href = "seller/seller.html";
  }

  if (role === "user") {
    window.location.href = "user/user.html";
  }
}

