// config.js
const API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://fasa7ny-backend.vercel.app";

// We are using 'window' instead of 'export' to prevent the crash
window.API_BASE_URL = API_BASE_URL;
