// config.js
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000" // Your local backend
    : "https://fasa7ny-backend.vercel.app"; // Your deployed Vercel backend URL

// Make it available globally to all other scripts
window.API_BASE_URL = API_BASE_URL;
