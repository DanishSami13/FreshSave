let map;
let marker;
let previousSellerRequests = [];

document.addEventListener("DOMContentLoaded", () => {

      map = L.map('map').setView([17.3850,78.4867],13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
          attribution:'© OpenStreetMap'
      }).addTo(map);

      map.on('click', function(e){

          if(marker){
              map.removeLayer(marker);
          }

          marker = L.marker(e.latlng).addTo(map);

          document.getElementById("lat").value = e.latlng.lat;
          document.getElementById("lng").value = e.latlng.lng;

          document.getElementById("coords").innerText =
             e.latlng.lat.toFixed(5) + ", " + e.latlng.lng.toFixed(5);

      });

});
  
window.addEventListener("DOMContentLoaded", () => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("show");
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll(".fade-in").forEach(el => {
      observer.observe(el);
    });
});


const user = JSON.parse(localStorage.getItem("user"));

document.querySelector(".seller-greeting").innerHTML =
`<span>Hi,</span> ${user.name}`;

if (!user || user.role !== "seller") {
  window.location.href = "../login.html";
}

if (!user || user.status === "blocked") {
  localStorage.removeItem("user");
  window.location.href = "../login.html";
}


const sellerId = user.id;

function loadRequests() {
  
  fetch(`/seller/requests/${sellerId}`, {
    headers: { "Role": user.role }
  })
  .then(res => res.json())
  .then(data => {

    const container = document.getElementById("requests-container");

    if (data.length === 0) {
      previousSellerRequests = data; 
      
      container.classList.add("empty");
      container.innerHTML = `
        <div class="empty-state">
          <p>🎉 No incoming requests right now</p>
        </div>
      `;
      return;
    }

    container.classList.remove("empty");
    container.innerHTML = "";

    data.forEach(req => {
      const old = previousSellerRequests.find(r => r.id === req.id);
      const card = document.createElement("div");
      card.className = "request-card";

      card.innerHTML = `
        <div class="request-info">
          <h4>${req.food_name}</h4>
          <p><strong>Requested by:</strong> ${req.user_name}</p>
          <p><strong>Quantity:</strong> ${req.quantity_requested}</p>
        </div>
        <div class="request-actions">
          <button onclick="approveRequest(${req.id})" class="btn-approve">Approve</button>
          <button onclick="rejectRequest(${req.id})" class="btn-reject">Reject</button>
        </div>
      `;

      container.appendChild(card);
    });

    previousSellerRequests = data;
  });
}

function loadMyListings() {
  fetch(`/seller/my-food/${sellerId}`, {
    headers: { "Role": user.role }
  })
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById("my-listings-container");
    container.innerHTML = "";

    if (data.length === 0) {
     container.innerHTML = `
        <div class="empty-state">
          <p>📦 No listings added yet</p>
        </div>
      `;
      return;
    }

    data.forEach(item => {

      const div = document.createElement("div");
      div.className = "food-item";

      // expiry progress calculation
      const maxHours = 24;
      const expiryPercent = item.expiry_hours > 0
        ? Math.max(0, (item.expiry_hours / maxHours) * 100)
        : 100;
      const qtyWarning = item.quantity <= 2 ? "low-stock" : "";



      div.innerHTML = `
        <div class="food-info">
          <strong>${item.name}</strong>

          <div class="food-meta">
           <span class="food-qty ${qtyWarning}">📦 ${item.quantity} ${item.quantity === 1 ? "pack" : "packs"}</span>
            ${
              item.expiry_hours > 0
              ? `Expires in ${item.expiry_hours.toFixed(1)}h`
              : `<span class="expired-label">Expired</span>`
            }

            <span class="status-badge ${item.status}">
              ${item.status}
            </span>
          </div>
        </div>

        <div class="expiry-progress">
          <div class="expiry-bar" style="width:${expiryPercent}%"></div>
        </div>
      `;

      container.appendChild(div);

    });

  });
}

function approveRequest(id) {
  fetch(`/seller/approve-request/${id}`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Role": user.role
  },
  body: JSON.stringify({
    seller_id: sellerId
  })
})
 .then(async res => {
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
})
.then(data => {
  showToast(data.message);
  loadRequests();
  loadStats();
})
.catch(err => {
  showToast(err.message, "error");
});
}

function rejectRequest(id) {
  fetch(`/seller/reject-request/${id}`, {
    method: "POST",
    headers: { "Role": user.role }
  })
  .then(res => res.json())
  .then(data => {
    showToast(data.message,"error");
    loadRequests();
  });
}

function loadStats() {
  fetch(`/seller/stats/${sellerId}`, {
    headers: { "Role": user.role }
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById("stat-total").innerText = data.total;
    document.getElementById("stat-active").innerText = data.active;
    document.getElementById("stat-picked").innerText = data.picked_today;
    document.getElementById("stat-pending").innerText = data.pending;
  });
}

// ✅ ADD FOOD
document.getElementById("add-food-form").addEventListener("submit", function(e) {
  e.preventDefault();

  const name = document.getElementById("food-name").value;
  const quantity = document.getElementById("food-quantity").value;
  const expiry = document.getElementById("food-expiry").value;
  const location = document.getElementById("food-location").value;
  const lat = document.getElementById("lat").value;
  const lng = document.getElementById("lng").value;

  fetch("/seller/add-food", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Role": "seller"
  },
  body: JSON.stringify({
    seller_id: sellerId,
    name: name,
    quantity: parseInt(quantity),
    expiry_hours: parseFloat(expiry),
    location: location,
    lat: lat,
    lng: lng
  })
})
  .then(async res => {
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Something went wrong");
    }

    return data;
  })
  .then(data => {
    showToast(data.message);

    document.getElementById("add-food-form").reset();
    loadMyListings();
    loadStats();
  })
  .catch(err => {
    console.error(err);
    showToast(err.message, "error");
  });
  });

  function logout() {
    localStorage.removeItem("user");
    window.location.href = "../login.html";
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadRequests();
    loadMyListings();
    loadStats();
});


function useMyLocation(){

if(!navigator.geolocation){
showToast("Geolocation not supported by this browser", "error");
return;
}

navigator.geolocation.getCurrentPosition(position => {

const lat = position.coords.latitude;
const lng = position.coords.longitude;

map.setView([lat, lng], 15);

if(marker){
    map.removeLayer(marker);
}

marker = L.marker([lat, lng]).addTo(map);

document.getElementById("lat").value = lat;
document.getElementById("lng").value = lng;

document.getElementById("coords").innerText =
    lat.toFixed(5) + ", " + lng.toFixed(5);

});

}


setInterval(() => {
  loadRequests();
  loadMyListings();
  loadStats();
}, 10000);

function showToast(message, type = "success") {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = "show";

  if (type === "error") toast.classList.add("error");

  setTimeout(() => {
    toast.classList.remove("show", "error");
  }, 10000);
}


const observer = new IntersectionObserver(entries=>{
entries.forEach(entry=>{
if(entry.isIntersecting){
entry.target.classList.add("show");
}
});
},{threshold:0.15});

document.querySelectorAll(".fade-up").forEach(el=>{
observer.observe(el);
});