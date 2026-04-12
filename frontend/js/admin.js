let modal, confirmText, confirmOk, confirmCancel, toast;
let confirmCallback = null;

document.addEventListener("DOMContentLoaded", () => {

modal = document.getElementById("confirmModal");
confirmText = document.getElementById("confirmText");
confirmOk = document.getElementById("confirmOk");
confirmCancel = document.getElementById("confirmCancel");
toast = document.getElementById("toast");

confirmCancel.onclick = () => {
modal.classList.remove("show");
};

confirmOk.onclick = function(){
modal.classList.remove("show");
if(confirmCallback){
confirmCallback();
confirmCallback = null;
}
};

loadStats();
loadUsers();
loadFoodMonitor();
loadActivity();
loadAnalytics();

});

function showConfirm(message, type, callback){

confirmText.innerText = message;
confirmCallback = callback;

modal.classList.add("show");

/* RESET BUTTON */
confirmOk.className = "";
confirmOk.id = "confirmOk";

/* APPLY TYPE */
if(type === "block"){
confirmOk.classList.add("block");
}

if(type === "unblock"){
confirmOk.classList.add("unblock");
}

}

function showToast(msg,type="success"){
toast.textContent = msg;

toast.className = "toast";
toast.classList.add("show");

if(type==="block") toast.classList.add("block");
if(type==="unblock") toast.classList.add("unblock");

setTimeout(()=>{
toast.classList.remove("show");
},2500);
}

const user = JSON.parse(localStorage.getItem("user"));

if (!user || user.role !== "admin") {
  window.location.href = "../login.html";
}

let usersChart, requestsChart, mealsChart;

document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadUsers();
  loadFoodMonitor();
  loadActivity();
  loadAnalytics();
});

function loadPendingFood() {
  fetch(apiUrl(CONFIG.ENDPOINTS.ADMIN.PENDING_FOOD), {
    headers: getHeaders(CONFIG.ROLES.ADMIN)
  })
    .then(res => res.json())
    .then(data => renderTable(data))
    .catch(err => console.error("Error:", err));
}

function renderTable(foodList) {
  const tableBody = document.getElementById("foodTableBody");
  tableBody.innerHTML = "";

  if (foodList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5">No pending food items</td>
      </tr>
    `;
    return;
  }

  foodList.forEach(food => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${food.name}</td>
      <td>${food.quantity}</td>
      <td>${food.expiry_hours} hrs</td>
      <td>${food.location}</td>
      <td>
        <button onclick="approveFood(${food.id})">Approve</button>
        <button onclick="rejectFood(${food.id})">Reject</button>
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function approveFood(id) {
  fetch(apiUrl(CONFIG.ENDPOINTS.ADMIN.APPROVE_FOOD(id)), {
    method: "POST",
    headers: getHeaders(CONFIG.ROLES.ADMIN)
  })
  .then(() => loadPendingFood());
}

function rejectFood(id) {
  fetch(apiUrl(CONFIG.ENDPOINTS.ADMIN.REJECT_FOOD(id)), {
    method: "POST",
    headers: getHeaders(CONFIG.ROLES.ADMIN)
  })
  .then(() => loadPendingFood());
}

function loadAnalytics() {
  fetch("/admin/analytics", {
    headers: { "Role": "admin" }
  })
  .then(res => res.json())
  .then(data => {

    if (usersChart) usersChart.destroy();
    if (requestsChart) requestsChart.destroy();
    if (mealsChart) mealsChart.destroy();

    usersChart = new Chart(document.getElementById("usersChart"), {
      type: "bar",
      data: {
        labels: ["Users", "Sellers"],
        datasets: [{
          label: "Platform Users",
          data: [data.users, data.sellers],
          backgroundColor: ["#2ecc71", "#27ae60"]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    requestsChart = new Chart(document.getElementById("requestsChart"), {
      type: "pie",
      data: {
        labels: ["Approved", "Rejected"],
        datasets: [{
          data: [data.approved, data.rejected],
          backgroundColor: ["#2ecc71", "#e74c3c"]
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    mealsChart = new Chart(document.getElementById("mealsChart"), {
      type: "line",
      data: {
        labels: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
        datasets: [{
          label: "Meals Rescued",
          data: [
            data.mealsRescued * 0.1,
            data.mealsRescued * 0.2,
            data.mealsRescued * 0.3,
            data.mealsRescued * 0.5,
            data.mealsRescued * 0.7,
            data.mealsRescued * 0.9,
            data.mealsRescued
          ],
          borderColor: "#2ecc71",
          backgroundColor: "rgba(46,204,113,0.2)",
          tension: 0.4,
          fill: true
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });

    const percent = Math.min(100, Math.floor(data.mealsRescued / 10));
    document.querySelector(".impact-value").innerText = percent + "%";

  });
}

function loadStats() {
  fetch("/admin/analytics", {
    headers: { "Role": "admin" }
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById("totalUsers").innerText = data.users;
    document.getElementById("totalSellers").innerText = data.sellers;
    document.getElementById("mealsRescued").innerText = data.mealsRescued;
  });
}

function loadFoodMonitor() {
  fetch("/admin/food-listings")
    .then(res => res.json())
    .then(data => {
  
      document.getElementById("totalListings").innerText = data.length;

      const container = document.querySelector(".food-monitor");
      container.innerHTML = "";

      if (data.length === 0) {
        container.innerHTML = `<div class="card">No listings available</div>`;
        return;
      }

      data.forEach(item => {
        const card = document.createElement("div");
        card.className = "card";
        // Priority border
        if (item.priority === "HIGH") {
          card.style.borderLeft = "5px solid #e74c3c";
        } else if (item.priority === "MEDIUM") {
          card.style.borderLeft = "5px solid #f1c40f";
        } else {
          card.style.borderLeft = "5px solid #2ecc71";
        }

        card.innerHTML = `
          <div class="food-card-header">
            <div class="food-title">🍱 ${item.food_name}</div>
            <span class="priority-badge ${item.priority.toLowerCase()}">
              ${item.priority}
            </span>
          </div>

          <div class="food-meta">
            <p><strong>Seller:</strong> ${item.seller}</p>
            <p><strong>Quantity:</strong> ${item.quantity}</p>
            <p><strong>Expires in:</strong> ${item.expiry_hours} hrs</p>
            <p class="location"><strong>Location:</strong> 📍 ${item.location}</p>
          </div>
        `;

        container.appendChild(card);
      });
    });
}

function loadActivity() {
  fetch("/admin/activity", {
    headers: { "Role": "admin" }
  })
  .then(res => res.json())
  .then(data => {

    const container = document.getElementById("activity-list");
    container.innerHTML = "";

    data.forEach(item => {
      const div = document.createElement("div");
      div.className = `activity card ${item.type}`;

      div.innerHTML = `
          <div class="activity-top">
              <div class="activity-icon">${getActivityIcon(item.type)}</div>
              <div class="activity-message">${item.message}</div>
          </div>

          <div class="activity-time">
              ${new Date(item.time).toLocaleString()}
          </div>
      `;
      container.appendChild(div);
    });

  });
}

function getActivityIcon(type) {
  if (type === "success") return "✅";
  if (type === "warning") return "⚠️";
  if (type === "danger") return "❌";
  return "•";
}

function loadUsers() {
  fetch("/admin/users", {
    headers: { "Role": "admin" }
  })
  .then(res => res.json())
  .then(users => {

    const container = document.getElementById("user-table-body");
    container.innerHTML = "";

    users.forEach(user => {

       // prevent showing block button for admin role
      if (user.role === "admin") return;

      const row = document.createElement("div");
      row.className = "admin-row";

      const isActicve = user.status === "active";

      const statusClass = isActicve ? "active" : "danger";
      const buttonText = isActicve ? "Block" : "Unblock";
      const buttonClass = isActicve ? "btn-danger" : "btn-success";

      row.innerHTML = `
        <span>${user.name}</span>
        <span>${user.role}</span>
        <span class="badge ${statusClass}">
          ${user.status}
        </span>
        <div class="action-cell">
        <button class="btn-sm ${buttonClass}"
          onclick="toggleUser(${user.id}, '${user.name}', '${user.status}')">
          ${buttonText}
        </button>
        </div>
      `;

      container.appendChild(row);
    });
  });
}


const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(".fade-up").forEach(el => observer.observe(el));


setInterval(() => {loadFoodMonitor(); loadUsers(); loadActivity(); loadStats(); loadAnalytics();}, 10000);

function toggleUser(id, name, status) {

const isBlocking = status === "active";
const action = isBlocking ? "Block" : "Unblock";
const type = isBlocking ? "block" : "unblock";

showConfirm(`${action} ${name}?`, type, () => {

fetch(`/admin/toggle-user/${id}`, {
method: "POST",
headers: { "Role": "admin" }
})
.then(() => {

if(isBlocking){
showToast(`${name} blocked successfully`,"block");
}else{
showToast(`${name} unblocked successfully`,"unblock");
}

loadUsers();

});

});
}