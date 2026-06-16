// config.js
// scripts/config.js

const getBaseUrl = () => {
  // بنشوف اسم النطاق (Domain) اللي الموقع شغال عليه حالياً
  const host = window.location.hostname;

  // لو الموقع شغال محلياً، استخدم اللوكال هوست
  if (host === "localhost" || host === "127.0.0.1") {
    return "${API_BASE_URL}";
  }

  // لو الموقع شغال على أي سيرفر تاني (Vercel/Render)، استخدم رابط الباك إند بتاعك
  return "https://thomaszakaria-fasa7nybackend.vercel.app/api/v1";
};

// بنصدره عشان نستخدمه في أي ملف تاني
const API_BASE_URL = getBaseUrl();
