let previousRequests = [];
let foodMap;
let userMarker;
let markersLayer;
let selectedRadius = 100;

let userLat = null;
let userLng = null;

// --------------------
const user = JSON.parse(localStorage.getItem("user"));

if (!user || user.role !== "user") {
  window.location.href = "../login.html";
}

if (!user || user.status === "blocked") {
  localStorage.removeItem("user");
  window.location.href = "../login.html";
}

// set navbar name
document.addEventListener("DOMContentLoaded", () => {
  const nameEl = document.querySelector(".user-name");

  if (nameEl && user) {
    nameEl.textContent = `Hi, ${user.name}`;
  }
});

// --------------------
// RENDER FOOD
// --------------------
function loadFood() {

  const foodList = document.getElementById("foodList");

  // 🔥 Show skeletons immediately
  foodList.innerHTML = `
    <div class="skeleton-card">
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
      <div class="skeleton-line"></div>
    </div>
  `;

  navigator.geolocation.getCurrentPosition(

    position => {

      userLat = position.coords.latitude;
      userLng = position.coords.longitude;
      
      foodMap.eachLayer(layer => {
        if(layer instanceof L.Marker){
          foodMap.removeLayer(layer);
        }
      });

      userMarker = L.marker([userLat, userLng])
      .addTo(foodMap)
      .bindPopup("📍 You are here")
      .openPopup();


      fetchFoodData(userLat, userLng);

      },

      error => {

        console.log("Location permission denied",error);

        fetchFoodData(null, null);
      }
    );
}

function fetchFoodData(userLat, userLng){

  markersLayer.clearLayers();

  fetch("/user/available-food")
    .then(res => res.json())
    .then(data => {
      
      document.getElementById("foodCount").textContent = `(${data.length})`;

      const foodList = document.getElementById("foodList");
      foodList.innerHTML = "";

      // 📍 Sort food by distance
      if(userLat){

        data.forEach(item => {

          if(item.lat && item.lng){
            item.distance = getDistance(userLat, userLng, item.lat, item.lng);
          } else {
            item.distance = 9999;
          }

        });

        data.sort((a,b) => a.distance - b.distance);

      }

      if(selectedRadius !== 100){

        data = data.filter(item => {

          if(item.distance){
            return item.distance <= selectedRadius;
          }

          return true;

        });

      }

      if (data.length === 0) {
        foodList.innerHTML = `
          <div class="empty-state">
            <p>🍃 No food available right now</p>
          </div>
        `;
        return;
      }

      data.forEach(item => {
  
        let distanceText = "";

        if(item.distance){
          distanceText = `📏 ${item.distance.toFixed(1)} km away`;
        }

        if(item.lat && item.lng){

          L.marker([item.lat, item.lng])
            .addTo(markersLayer)
            .bindPopup(`
              <b>${item.name}</b><br>
              📍 ${item.location}<br>
              Quantity: ${item.quantity}
            `);

        }

        let expiryClass = "";
        if (item.expiry_hours < 2) {
          expiryClass = "urgent";
        } else if (item.expiry_hours < 4) {
          expiryClass = "warning";
        } else {
          expiryClass = "safe";
        }

        const card = document.createElement("div");
        card.className = "food-card";

        card.innerHTML = `
          <div class="food-top">
            <h3>🍱 ${item.name}</h3>
          </div>

          <div class="food-meta">
            <div>
              <span class="meta-label">Quantity</span>
              <span class="meta-value">${item.quantity}</span>
            </div>

            <div>
              <span class="meta-label">Expires</span>
              <span class="meta-value expiry ${expiryClass}">
                ${item.expiry_hours} hrs
              </span>
            </div>
          </div>

          <div class="food-location-row">

            <div class="location-text">
              📍 ${item.location || "Location not specified"}
            </div>

            ${distanceText ? `
              <div class="distance-text">
                ${distanceText}
              </div>
            ` : ""}

          </div>

         ${item.lat && item.lng ? `
        <a class="map-btn"
          target="_blank"
          href="https://www.google.com/maps?q=${item.lat},${item.lng}">
          🗺 View Location
        </a>
        ` : `<span class="map-btn disabled">📍 Location unavailable</span>`}



          <div class="card-actions">
            <input type="number" min="1" max="${item.quantity}" 
                  id="qty-${item.id}" placeholder="Qty" />
                  <button type="button"
                  class="btn btn-primary request-btn"
                  data-food-id="${item.id}">
              Request
            </button>
          </div>
        `;

        foodList.appendChild(card);

        const button = card.querySelector(".request-btn");
        button.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          requestFood(item.id);
        });
      });
    })
    .catch(err => console.error("Food load error:", err));
}

// --------------------
// REQUEST FOOD
// --------------------
function requestFood(foodId) {
  const qtyInput = document.getElementById(`qty-${foodId}`);
  const quantity = parseInt(qtyInput.value);

  if (!quantity || quantity <= 0) {
    showToast("Enter valid quantity", "error");
    return;
  }

  fetch("/user/request-food", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      food_id: foodId,
      user_id: user.id,
      quantity: quantity
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showToast(data.error, "error");
    } else {
      showToast("Request sent successfully");
      loadFood();
      loadMyRequests();
    }
  })
  .catch(err => console.error("Request error:", err));
}


// --------------------
// RENDER REQUESTS
// --------------------
function loadMyRequests() {
  fetch(`/user/my-requests/${user.id}`)
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("myRequests");
      container.innerHTML = "";

      if (data.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p>📭 No requests yet</p>
          </div>
        `;
        return;
      }

      data.forEach(req => {

        const old = previousRequests.find(r => r.id === req.id);

        if(old && old.status !== req.status){

          if(req.status === "approved"){
            showToast(`✅ Your request for ${req.food_name} was approved`);
          }

          if(req.status === "rejected"){
            showToast(`❌ Your request for ${req.food_name} was rejected`, "error");
          }

        }

        container.innerHTML += `
           <div class="request-card">
            <div class="request-top">
              <h3>${req.food_name}</h3>
              <span class="badge ${req.status}">
                ${req.status}
              </span>
            </div>

            <div class="request-meta">
              <span class="meta-label">Quantity</span>
              <span class="meta-value">${req.quantity_requested}</span>
            </div>
          </div>
          </div>
        `;
      });
      previousRequests = data;
    })
    .catch(err => console.error("Request load error:", err));
}


function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "show";

  if (type === "error") toast.classList.add("error");

  setTimeout(() => {
    toast.classList.remove("show", "error");
  }, 3000);
}


// --------------------
// INIT
// --------------------
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadFood();
  loadMyRequests();
});

document.getElementById("radiusFilter").addEventListener("change", function(){

  selectedRadius = parseFloat(this.value);

  loadFood();

});



document.addEventListener("click", function (e) {
  if (e.target.classList.contains("request-btn")) {
    const foodId = e.target.dataset.foodId;
    requestFood(foodId);
  }
});

function getDistance(lat1, lon1, lat2, lon2){

  const R = 6371; // Earth radius in km

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) *
    Math.sin(dLon/2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}


function initMap(){

  foodMap = L.map('foodMap').setView([17.3850,78.4867],13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution:'© OpenStreetMap'
  }).addTo(foodMap);

  markersLayer = L.layerGroup().addTo(foodMap);

}


setInterval(() => {
  loadMyRequests();
}, 10000);


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

setInterval(() => {
loadListings();
loadRequests();
}, 10000);