// config.js
var API_BASE_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3000"
    : "https://fasa7ny-backend.vercel.app";

// Attach it to window just to be safe
window.API_BASE_URL = API_BASE_URL;
