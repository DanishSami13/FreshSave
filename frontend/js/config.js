// ===============================
// Global App Configuration
// ===============================

const CONFIG = {
  // 🔗 Backend base URL
  API_BASE_URL: "https://freshsave.onrender.com",

  // 🔐 Role Header Key (used by role_guard)
  ROLE_HEADER: "Role",

  // 👥 Roles
  ROLES: {
    ADMIN: "admin",
    SELLER: "seller",
    USER: "user"
  },

  // 🌐 API Endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: "/auth/login",
      REGISTER: "/auth/register"
    },

    ADMIN: {
      PENDING_FOOD: "/admin/pending-food",
      APPROVE_FOOD: (id) => `/admin/approve-food/${id}`,
      REJECT_FOOD: (id) => `/admin/reject-food/${id}`,
      ANALYTICS: "/admin/analytics"
    },

    SELLER: {
      ADD_FOOD: "/seller/add-food",
      VIEW_REQUESTS: (sellerId) => `/seller/requests/${sellerId}`,
      APPROVE_REQUEST: (requestId) => `/seller/approve-request/${requestId}`,
      REJECT_REQUEST: (requestId) => `/seller/reject-request/${requestId}`
    },

    USER: {
      VIEW_FOOD: "/user/food",
      REQUEST_FOOD: (foodId) => `/user/request-food/${foodId}`
    }
  }
};

// ===============================
// Helper: Build full API URL
// ===============================
function apiUrl(endpoint) {
  return `${CONFIG.API_BASE_URL}${endpoint}`;
}

// ===============================
// Helper: Default headers
// ===============================
function getHeaders(role = null) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (role) {
    headers[CONFIG.ROLE_HEADER] = role;
  }

  return headers;
}
