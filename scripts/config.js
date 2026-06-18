const getBaseUrl = () => {
  const host = window.location.hostname;

  // لو الموقع شغال محلياً
  if (host === "localhost" || host === "127.0.0.1") {
    return "http://127.0.0.1:3000/api/v1";
  }

  // الرابط الجديد اللي أخدته من Railway (أضفنا api/v1 في الآخر)
  return "https://fasa7nybackend-production.up.railway.app/api/v1";
};

// هنا بنعرف المتغير اللي كل الملفات هتستخدمه
window.API_BASE_URL = getBaseUrl();
