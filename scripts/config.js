const getBaseUrl = () => {
  const host = window.location.hostname;

  // لو الموقع شغال محلياً، استخدم اللوكال هوست
  if (host === "localhost" || host === "127.0.0.1") {
    // هنا تكتب الرابط اللوكال مباشرة
    return "http://127.0.0.1:3000/api/v1";
  }

  // لو الموقع شغال لايف (Vercel/Render)
  return "https://thomaszakaria-fasa7nybackend.vercel.app/api/v1";
};

// هنا بنعرف المتغير اللي كل الملفات هتستخدمه
window.API_BASE_URL = getBaseUrl();
