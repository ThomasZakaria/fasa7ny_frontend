// ==========================================
// 0. GLOBAL DATA & STATE
// ==========================================
window.globalPlacesMap = {};
let globalPlaceIdCounter = 0;
let isFetchingCategories = false;
window.currentModalPlace = null;
window.tripCart = []; // السلة الجديدة لرحلتك
const API_BASE_URL = window.API_BASE_URL;
const DEFAULT_THUMB =
  "https://s7g10.scene7.com/is/image/barcelo/pyramids-of-giza-facts_ancient-pyramids-of-giza?&&fmt=webp-alpha&qlt=75&wid=1300&fit=crop,1";

// DOM Elements
const placeModal = document.getElementById("placeModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const categoriesContentWrapper = document.getElementById(
  "categoriesContentWrapper",
);
const cityFilter = document.getElementById("cityFilter");
const categoriesLoading = document.getElementById("categoriesLoading");
const uploadBtn = document.getElementById("uploadBtn");
const imageInput = document.getElementById("imageInput");
const getLocationBtn = document.getElementById("getLocationBtn");

// ==========================================
// 1. HELPERS & AUTH
// ==========================================

const isValidUrl = (url) =>
  typeof url === "string" && url.startsWith("http") && !url.includes("[URL]");

function getValidImageUrl(place) {
  if (!place) return DEFAULT_THUMB;
  if (place.images && isValidUrl(place.images.main)) return place.images.main;
  if (place.images && Array.isArray(place.images.gallery)) {
    const validGalleryImg = place.images.gallery.find(isValidUrl);
    if (validGalleryImg) return validGalleryImg;
  }
  const oldUrl = place.image || place.img || place["Main Image URL"];
  if (isValidUrl(oldUrl)) return oldUrl;
  return DEFAULT_THUMB;
}

function optimizeImage(url, width = 400) {
  if (!url || url === DEFAULT_THUMB || url.includes("wsrv.nl")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp&q=70`;
}

async function updateAuthUI() {
  const loginBtn = document.getElementById("loginBtn");
  if (!loginBtn) return;
  const userId = localStorage.getItem("userId");
  let username = localStorage.getItem("username");
  if (
    userId &&
    (!username || username === "undefined" || username.trim() === "")
  ) {
    try {
      const res = await fetch(`${API_BASE_URL}/users/${userId}`);
      const result = await res.json();
      if (result.status === "success" && result.data.user) {
        const user = result.data.user;
        username = user.username || user.name || "Tourist";
        localStorage.setItem("username", username);
        localStorage.setItem("userProfile", JSON.stringify(user));
      }
    } catch (err) {
      console.error("Auth Sync Error:", err);
    }
  }
  if (username && username !== "undefined") {
    loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${username}`;
    loginBtn.href = "profile.html";
    loginBtn.style.background = "#ff9800";
    loginBtn.style.color = "#fff";
    loginBtn.style.border = "none";
  }
}

// ==========================================
// 2. RENDER LOGIC
// ==========================================

function renderCards(places, container, limit = false) {
  if (!container) return;
  container.innerHTML = "";
  places.forEach((place, index) => {
    if (!place || (!place["Landmark Name (English)"] && !place.name)) return;
    const currentPlaceId = "place_" + globalPlaceIdCounter++;
    window.globalPlacesMap[currentPlaceId] = place;
    const isHiddenClass = limit && index >= 4 ? "hidden" : "";
    const name = place["Landmark Name (English)"] || place.name;
    const city = place.Location || "Egypt";
    const originalMainUrl = getValidImageUrl(place);
    const optimizedMainUrl = optimizeImage(originalMainUrl, 400);

    container.insertAdjacentHTML(
      "beforeend",
      `<div class="card place-card ${isHiddenClass}" data-placeid="${currentPlaceId}" style="cursor: pointer;">
        <img src="${optimizedMainUrl}" alt="${name}" loading="lazy" onerror="this.onerror=null; this.src='${originalMainUrl}';">
        <div style="padding: 15px;">
          <h3 style="color:#0b4a6f; font-size:1.1rem; margin-bottom:5px;">${name}</h3>
          <p style="color:#666; font-size:0.85rem;"><i class="fas fa-map-marker-alt"></i> ${city}</p>
        </div>
      </div>`,
    );
  });
}

// ==========================================
// 3. MODAL LOGIC
// ==========================================

function openPlaceModal(placeData) {
  if (!placeData || !placeModal) return;
  window.currentModalPlace = placeData;

  const safeSetText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  // زر الإضافة للرحلة
  const addBtn = document.getElementById("addToTripBtn");
  if (addBtn) {
    addBtn.onclick = () => {
      if (!window.tripCart.find((p) => p.ID === placeData.ID)) {
        window.tripCart.push(placeData);
        alert(
          `✅ Added ${placeData["Landmark Name (English)"] || placeData.name} to your trip cart!`,
        );
      } else {
        alert("⚠️ Already in your trip.");
      }
    };
  }

  safeSetText("modalTitle", placeData["Landmark Name (English)"] || "Landmark");
  safeSetText("modalArabicName", placeData["Arabic Name"] || "");
  safeSetText("modalLocation", placeData["Location"] || "Egypt");
  safeSetText("modalPrice", placeData.price || "Free");
  safeSetText("modalCategory", placeData.category || "General");

  const historyEl = document.getElementById("modalHistory");
  if (historyEl)
    historyEl.innerText =
      placeData["Short History Summary"] || "Discover the wonders of Egypt.";

  // عرض الصور
  const imgEl = document.getElementById("modalImg");
  const mainImage = getValidImageUrl(placeData);
  if (imgEl) imgEl.src = optimizeImage(mainImage, 800);

  placeModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// ==========================================
// 4. AI TRIP PLANNER (Updated with manualSelection)
// ==========================================

const generateBtn = document.getElementById("generateTripBtn");
const tripLoading = document.getElementById("tripLoading");
const loadingMessage = document.getElementById("loadingMessage");

if (generateBtn) {
  generateBtn.addEventListener("click", () => {
    if (selectedCities.length === 0) return alert("Please select a city");

    tripLoading.style.display = "block";
    document.getElementById("tripResult").innerHTML = "";

    setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/trip-planner`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cities: selectedCities,
            days: tripDays.value,
            interests: selectedInterests,
            manualSelection: window.tripCart, // 🚀 هنا بنبعت أماكن اليوزر
          }),
        });

        const data = await response.json();
        tripLoading.style.display = "none";
        const itinerary = data.data.itinerary;

        let htmlContent = `<div class="premium-itinerary"><h3>✨ Your Adventure</h3>`;

        itinerary.days.forEach((dayObj) => {
          htmlContent += `
            <div class="day-card" style="padding: 15px; border: 1px solid #ddd; margin: 10px 0;">
              <h4>Day ${dayObj.day} - ${dayObj.city}</h4>
              <ul>`;

          dayObj.places.forEach((place) => {
            const name = place.name || place;
            const price = place.price || "Moderate"; // السعر اللي الـ AI بيحدده
            htmlContent += `
              <li>
                <strong>${name}</strong> - 
                <span style="color: #c2410c; font-weight:bold;">💸 ${price}</span>
              </li>`;
          });

          htmlContent += `</ul></div>`;
        });

        htmlContent += `</div>`;
        document.getElementById("tripResult").innerHTML = htmlContent;
      } catch (err) {
        tripLoading.style.display = "none";
        alert("Failed to plan trip.");
      }
    }, 1500);
  });
}

// باقي الـ Event Listeners (تعديل الفلترة والـ UI)
document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
  // ... (باقي الكود الخاص بك مثل fetchAndRenderCategories)
});
