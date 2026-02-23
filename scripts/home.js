// ==========================================
// 0. GLOBAL DATA & STATE
// ==========================================
window.globalPlacesMap = {};
let globalPlaceIdCounter = 0;
let isFetchingCategories = false;
let currentModalPlace = null;

// استخدام 127.0.0.1 لضمان استقرار الاتصال ومنع مشاكل CORS
const API_BASE_URL = "http://127.0.0.1:3000/api/v1";
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
// 1. HELPERS (الأداء والحماية)
// ==========================================

function getValidImageUrl(place) {
  const url = place.image || place["Main Image URL"] || "";
  const isValid =
    typeof url === "string" && url.startsWith("http") && !url.includes("[URL]");
  return isValid ? url : DEFAULT_THUMB;
}

function updateAuthUI() {
  const username = localStorage.getItem("username");
  const loginBtn = document.getElementById("loginBtn");
  if (username && loginBtn) {
    loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${username}`;
    loginBtn.href = "profile.html";
    loginBtn.style.background = "#ff9800";
    loginBtn.style.color = "#fff";
  }
}

// ==========================================
// 2. RENDER LOGIC (رسم الكروت والتحميل المتأخر)
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

    container.insertAdjacentHTML(
      "beforeend",
      `
      <div class="card place-card ${isHiddenClass}" data-placeid="${currentPlaceId}" style="cursor: pointer;">
        <img src="${getValidImageUrl(place)}" alt="${name}" 
             loading="lazy"
             onerror="this.onerror=null; this.src='${DEFAULT_THUMB}'">
        <div style="padding: 15px;">
          <h3 style="color:#0b4a6f; font-size:1.1rem; margin-bottom:5px;">${name}</h3>
          <p style="color:#666; font-size:0.85rem;"><i class="fas fa-map-marker-alt"></i> ${city}</p>
          ${
            place.distanceAway && place.distanceAway !== Infinity
              ? `<p style="color:#2ecc71; font-size:0.75rem; font-weight:bold;">${place.distanceAway.toFixed(1)} km away</p>`
              : ""
          }
        </div>
      </div>`,
    );
  });
}

// ==========================================
// 3. RECOMMENDATIONS LOGIC (أقرب 3 + شبيه AI)
// ==========================================

/**
 * جلب وعرض التوصيات (أقرب 3 + شبيه AI) داخل الموديل
 */
async function loadPlaceRecommendations(placeId) {
  const nearbyContainer = document.getElementById("modalNearbyCards");
  const similarContainer = document.getElementById("modalSimilarCards");

  if (nearbyContainer)
    nearbyContainer.innerHTML = "<div class='spinner-small'></div>";
  if (similarContainer)
    similarContainer.innerHTML = "<div class='spinner-small'></div>";

  try {
    const res = await fetch(
      `${API_BASE_URL}/places/${placeId}/recommendations`,
    );
    const result = await res.json();

    if (result.status === "success") {
      const { nearest, similar } = result.data;

      // عرض الأقرب جغرافياً
      if (nearbyContainer) {
        if (nearest && nearest.length > 0)
          renderCards(nearest, nearbyContainer);
        else nearbyContainer.innerHTML = "<p>No nearby landmarks found.</p>";
      }

      // عرض الشبيه AI
      if (similarContainer) {
        if (similar && similar.length > 0)
          renderCards(similar, similarContainer);
        else similarContainer.innerHTML = "<p>No AI recommendations yet.</p>";
      }
    }
  } catch (err) {
    console.error("Recommendations UI Error:", err);
  }
}

// ==========================================
// 4. MODAL LOGIC (عرض التفاصيل والربط الكامل)
// ==========================================

function openPlaceModal(placeData) {
  if (!placeData) return;
  currentModalPlace = placeData;

  document.getElementById("modalTitle").textContent =
    placeData["Landmark Name (English)"] || "Landmark";
  document.getElementById("modalArabicName").textContent =
    placeData["Arabic Name"] || "";
  document.getElementById("modalLocation").textContent =
    placeData["Location"] || "Egypt";
  document.getElementById("modalHistory").textContent =
    placeData["Short History Summary"] || "Discover the wonders of Egypt.";
  document.getElementById("modalImg").src = getValidImageUrl(placeData);

  // تحديث رابط الخرائط
  const mapBtn = document.getElementById("modalMapLink");
  if (mapBtn && placeData.Coordinates) {
    mapBtn.href = `https://www.google.com/maps/search/?api=1&query=${placeData.Coordinates}`;
    mapBtn.style.display = "inline-flex";
  } else if (mapBtn) {
    mapBtn.style.display = "none";
  }

  // نظام النجوم
  const rating = Math.round(parseFloat(placeData["averageRating"])) || 4;
  const starsContainer = document.getElementById("modalStars");
  if (starsContainer)
    starsContainer.textContent = "★".repeat(rating) + "☆".repeat(5 - rating);

  // استخراج الـ ID للتعليقات والتوصيات
  const placeId = placeData.ID || (placeData._id ? placeData._id.$oid : null);
  if (placeId) {
    const idStr = placeId.toString();
    // مناداة الدوال الخارجية
    if (typeof loadReviews === "function") loadReviews(idStr);
    loadPlaceRecommendations(idStr);
  }

  placeModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// ==========================================
// 5. CORE FEATURES (Fetch, Scanner & GPS)
// ==========================================

async function fetchAndRenderCategories(selectedCity = "all") {
  if (isFetchingCategories || !categoriesContentWrapper) return;
  isFetchingCategories = true;
  categoriesContentWrapper.innerHTML = "";
  if (categoriesLoading) categoriesLoading.classList.remove("hidden");

  try {
    const response = await fetch(
      `${API_BASE_URL}/categories?city=${selectedCity}`,
    );
    const data = await response.json();
    if (data.status === "success") renderGroupedCategories(data.data);
  } catch (error) {
    console.error("Home Load Error:", error);
    categoriesContentWrapper.innerHTML =
      "<p style='color:red; text-align:center;'>Check your Node.js server.</p>";
  } finally {
    if (categoriesLoading) categoriesLoading.classList.add("hidden");
    isFetchingCategories = false;
  }
}

function renderGroupedCategories(groupedData) {
  categoriesContentWrapper.innerHTML = "";
  for (const [categoryName, places] of Object.entries(groupedData)) {
    const section = document.createElement("div");
    section.className = "category-block";
    section.innerHTML = `<h3 class="category-title"><i class="fas fa-landmark"></i> ${categoryName}</h3><div class="cards"></div>`;
    categoriesContentWrapper.appendChild(section);
    renderCards(places, section.querySelector(".cards"), true);
  }
}

// AI Scanner
if (uploadBtn && imageInput) {
  uploadBtn.onclick = () => imageInput.click();
  imageInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById("loadingState").classList.remove("hidden");
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(`${API_BASE_URL}/detect`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.status === "success" && data.data.details)
        openPlaceModal(data.data.details);
    } catch (err) {
      alert("AI Scan Error: Check if Python server is on Port 8000.");
    } finally {
      document.getElementById("loadingState").classList.add("hidden");
      imageInput.value = "";
    }
  };
}

// GPS Location
if (getLocationBtn) {
  getLocationBtn.onclick = function () {
    const loader = document.getElementById("locationLoading");
    const container = document.getElementById("nearMeCards");
    if (loader) loader.classList.remove("hidden");
    if (container) container.innerHTML = "";

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `${API_BASE_URL}/places/near-me?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
          );
          const d = await res.json();
          if (loader) loader.classList.add("hidden");
          renderCards(d.data.places, container);
        } catch (err) {
          if (loader) loader.classList.add("hidden");
        }
      },
      () => {
        alert("GPS Denied");
        if (loader) loader.classList.add("hidden");
      },
    );
  };
}

// ==========================================
// 6. INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
  const initialCity = cityFilter ? cityFilter.value : "cairo";
  fetchAndRenderCategories(initialCity);
  if (cityFilter)
    cityFilter.onchange = (e) => fetchAndRenderCategories(e.target.value);
});

document.addEventListener("click", (e) => {
  const card = e.target.closest(".place-card");
  if (card) {
    const data = window.globalPlacesMap[card.dataset.placeid];
    if (data) openPlaceModal(data);
  }
});

if (closeModalBtn) {
  closeModalBtn.onclick = () => {
    placeModal.classList.remove("active");
    document.body.style.overflow = "auto";
  };
}
