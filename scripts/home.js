// ==========================================
// 0. GLOBAL DATA & STATE
// ==========================================
window.globalPlacesMap = {};
let globalPlaceIdCounter = 0;
let isFetchingCategories = false;
let currentModalPlace = null; // هام جداً لربط زر الحفظ والتعليقات

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
// 1. HELPERS
// ==========================================
async function loadPlaceRecommendations(placeId) {
  const nearbyContainer = document.getElementById("modalNearbyCards");
  const similarContainer = document.getElementById("modalSimilarCards");

  if (nearbyContainer) nearbyContainer.innerHTML = "<p>Loading nearby...</p>";
  if (similarContainer)
    similarContainer.innerHTML = "<p>Analyzing similar wonders...</p>";

  try {
    const res = await fetch(
      `${API_BASE_URL}/places/${placeId}/recommendations`,
    );
    const result = await res.json();

    if (result.status === "success") {
      const { nearest, similar } = result.data;
      // Use renderCards (already in home.js) to fill the modal sections
      if (nearbyContainer) renderCards(nearest || [], nearbyContainer, false);
      if (similarContainer) renderCards(similar || [], similarContainer, false);
    }
  } catch (err) {
    console.error("Recommendations UI Error:", err);
  }
}
function getValidImageUrl(place) {
  if (!place) return DEFAULT_THUMB;
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

    container.insertAdjacentHTML(
      "beforeend",
      `
      <div class="card place-card ${isHiddenClass}" data-placeid="${currentPlaceId}" style="cursor: pointer;">
        <img src="${getValidImageUrl(place)}" alt="${name}" loading="lazy" onerror="this.onerror=null; this.src='${DEFAULT_THUMB}'">
        <div style="padding: 15px;">
          <h3 style="color:#0b4a6f; font-size:1.1rem; margin-bottom:5px;">${name}</h3>
          <p style="color:#666; font-size:0.85rem;"><i class="fas fa-map-marker-alt"></i> ${city}</p>
          ${place.distanceAway && place.distanceAway !== Infinity ? `<p style="color:#2ecc71; font-size:0.75rem; font-weight:bold;">${place.distanceAway.toFixed(1)} km away</p>` : ""}
        </div>
      </div>`,
    );
  });
}
async function loadPlaceRecommendations(placeId) {
  const nearbyContainer = document.getElementById("modalNearbyCards");
  const similarContainer = document.getElementById("modalSimilarCards");

  if (nearbyContainer) nearbyContainer.innerHTML = "Loading...";
  if (similarContainer) similarContainer.innerHTML = "Loading...";

  try {
    const res = await fetch(
      `${API_BASE_URL}/places/${placeId}/recommendations`,
    );
    const result = await res.json();

    if (result.status === "success") {
      const { nearest, similar } = result.data;
      if (nearbyContainer) renderCards(nearest, nearbyContainer, false);
      if (similarContainer) renderCards(similar, similarContainer, false);
    }
  } catch (err) {
    console.error("Recommendations UI Error:", err);
  }
}
// ==========================================
// 4. MODAL LOGIC (تم إصلاح الخرائط والحفظ هنا)
// ==========================================

function openPlaceModal(placeData) {
  if (!placeData || !placeModal) return;
  currentModalPlace = placeData; // تعيين المكان الحالي عالمياً

  const safeSetText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  // 1. البيانات الأساسية
  safeSetText("modalTitle", placeData["Landmark Name (English)"] || "Landmark");
  safeSetText("modalArabicName", placeData["Arabic Name"] || "");
  safeSetText("modalLocation", placeData["Location"] || "Egypt");
  safeSetText("modalTime", placeData.workingTime || "08:00 - 17:00");
  safeSetText("modalPrice", placeData.price || "Free");
  safeSetText("modalCategory", placeData.category || "General");

  const imgEl = document.getElementById("modalImg");
  if (imgEl) imgEl.src = getValidImageUrl(placeData);

  const historyEl = document.getElementById("modalHistory");
  if (historyEl)
    historyEl.innerText =
      placeData["Short History Summary"] || "Discover the wonders of Egypt.";

  // 2. إصلاح زر الخرائط (Open in Maps)
  const mapBtn = document.getElementById("modalMapLink");
  if (mapBtn && placeData.Coordinates) {
    const cleanCoords = placeData.Coordinates.replace(/\s+/g, "");
    mapBtn.href = `https://www.google.com/maps/search/?api=1&query=${cleanCoords}`;
    mapBtn.style.display = "inline-flex";
  } else if (mapBtn) {
    mapBtn.style.display = "none";
  }

  // 3. تحديث حالة زر الحفظ (Save Button)
  updateSaveButtonUI();

  // 4. جلب المراجعات والتوصيات
  const placeId =
    placeData.ID ||
    (placeData._id ? placeData._id.$oid || placeData._id : null);
  if (placeId) {
    const idStr = placeId.toString();
    if (typeof loadReviews === "function") loadReviews(idStr);
    if (typeof loadPlaceRecommendations === "function")
      loadPlaceRecommendations(idStr);
  }

  placeModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// تحديث شكل زر الحفظ بناءً على هل المكان محفوظ أم لا
function updateSaveButtonUI() {
  const saveBtn = document.getElementById("modalSaveBtn");
  const saveIcon = document.getElementById("modalSaveIcon");
  const saveText = document.getElementById("modalSaveText");

  if (!saveBtn) return;

  const user = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const placeId = currentModalPlace.ID || currentModalPlace._id;
  const isSaved = user.saved_places?.some((p) => p.id == placeId);

  if (isSaved) {
    saveBtn.style.background = "#27ae60"; // أخضر
    saveText.textContent = "Saved";
    if (saveIcon) saveIcon.className = "fas fa-heart";
  } else {
    saveBtn.style.background = "#e74c3c"; // أحمر
    saveText.textContent = "Save Place";
    if (saveIcon) saveIcon.className = "far fa-heart";
  }
}

// ==========================================
// 5. BUTTON ACTIONS (Save & Review)
// ==========================================

// منطق زر الحفظ
const modalSaveBtn = document.getElementById("modalSaveBtn");
if (modalSaveBtn) {
  modalSaveBtn.onclick = async function () {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("Please sign in to save places!");
      window.location.href = "auth.html";
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/user/save-place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          place: {
            id: currentModalPlace.ID || currentModalPlace._id,
            name:
              currentModalPlace["Landmark Name (English)"] ||
              currentModalPlace.name,
            location: currentModalPlace.Location,
            img: getValidImageUrl(currentModalPlace),
          },
        }),
      });

      const result = await response.json();
      if (result.status === "success") {
        // تحديث الـ LocalStorage ليعرف المتصفح أن المكان حُفظ
        const user = JSON.parse(localStorage.getItem("userProfile") || "{}");
        if (!user.saved_places) user.saved_places = [];
        user.saved_places.push({
          id: currentModalPlace.ID || currentModalPlace._id,
        });
        localStorage.setItem("userProfile", JSON.stringify(user));

        updateSaveButtonUI();
        alert("Place saved to your profile!");
      }
    } catch (err) {
      console.error("Save Error:", err);
    }
  };
}

// منطق إضافة مراجعة (Review)
async function submitReview() {
  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");
  const comment = document.getElementById("reviewComment").value.trim();
  const rating = document.querySelector('input[name="stars"]:checked')?.value;

  if (!userId) return alert("Please login to post a review!");
  if (!comment || !rating) return alert("Please add a comment and rating!");

  const placeId = currentModalPlace.ID || currentModalPlace._id;

  try {
    const res = await fetch(`${API_BASE_URL}/places/${placeId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        username: username || "Tourist",
        comment,
        rating: parseInt(rating),
      }),
    });

    const data = await res.json();
    if (data.status === "success") {
      document.getElementById("reviewComment").value = ""; // تفريغ النص
      if (typeof loadReviews === "function") loadReviews(placeId.toString()); // تحديث القائمة
      alert("Review posted!");
    }
  } catch (err) {
    console.error("Review Error:", err);
  }
}

// ==========================================
// 6. INITIALIZATION & CORE FEATURES
// ==========================================

async function fetchAndRenderCategories(selectedCity = "all") {
  if (isFetchingCategories || !categoriesContentWrapper) return;
  isFetchingCategories = true;
  if (categoriesLoading) categoriesLoading.classList.remove("hidden");

  try {
    const response = await fetch(
      `${API_BASE_URL}/categories?city=${selectedCity}`,
    );
    const data = await response.json();
    if (data.status === "success")
      renderGroupedCategories(data.data, selectedCity);
  } catch (error) {
    console.error("Home Load Error:", error);
  } finally {
    if (categoriesLoading) categoriesLoading.classList.add("hidden");
    isFetchingCategories = false;
  }
}

function renderGroupedCategories(groupedData, selectedCity) {
  if (!categoriesContentWrapper) return;
  categoriesContentWrapper.innerHTML = "";

  for (const [categoryName, places] of Object.entries(groupedData)) {
    const section = document.createElement("div");
    section.className = "category-block";
    section.innerHTML = `
      <h3 class="category-title"><i class="fas fa-landmark"></i> ${categoryName}</h3>
      <div class="cards"></div>
      ${
        places.length > 4
          ? `
        <div style="text-align: center; margin-top: 20px;">
          <button class="show-more-global-btn cat-specific-btn">
            View All ${categoryName} <i class="fas fa-arrow-right"></i>
          </button>
        </div>`
          : ""
      }
    `;

    categoriesContentWrapper.appendChild(section);
    renderCards(places, section.querySelector(".cards"), true);

    const btn = section.querySelector(".cat-specific-btn");
    if (btn) {
      btn.onclick = () =>
        (window.location.href = `explore.html?category=${encodeURIComponent(categoryName)}&city=${selectedCity}`);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
  const initialCity = cityFilter ? cityFilter.value : "all";
  fetchAndRenderCategories(initialCity);

  if (cityFilter)
    cityFilter.onchange = (e) => fetchAndRenderCategories(e.target.value);

  if (closeModalBtn) {
    closeModalBtn.onclick = () => {
      placeModal.classList.remove("active");
      document.body.style.overflow = "auto";
    };
  }
});

// مراقبة الضغط على الكروت
document.addEventListener("click", (e) => {
  const card = e.target.closest(".place-card");
  if (card) {
    const data = window.globalPlacesMap[card.dataset.placeid];
    if (data) openPlaceModal(data);
  }
});
// ==========================================
// 7. AI SCANNER LOGIC (الجزء الناقص)
// ==========================================
if (uploadBtn && imageInput) {
  // فتح نافذة اختيار الملفات عند الضغط على الزر
  uploadBtn.onclick = () => imageInput.click();

  imageInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // إظهار حالة التحميل
    const loadState = document.getElementById("loadingState");
    if (loadState) loadState.classList.remove("hidden");

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(`${API_BASE_URL}/detect`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.status === "success" && data.data.details) {
        // فتح المودال ببيانات المكان الذي تعرف عليه الـ AI
        openPlaceModal(data.data.details);
      } else {
        alert("AI couldn't identify this landmark clearly. Try another angle!");
      }
    } catch (err) {
      console.error("AI Scan Error:", err);
      alert("Make sure both Node.js and Python servers are running!");
    } finally {
      if (loadState) loadState.classList.add("hidden");
      imageInput.value = ""; // تفريغ المدخل لتجربة صورة أخرى
    }
  };
}
// GPS Location Logic
if (getLocationBtn) {
  getLocationBtn.onclick = function () {
    const loader = document.getElementById("locationLoading");
    const container = document.getElementById("nearMeCards");
    if (loader) loader.classList.remove("hidden");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const res = await fetch(
            `${API_BASE_URL}/places/near-me?lat=${lat}&lng=${lng}`,
          );
          const d = await res.json();

          if (loader) loader.classList.add("hidden");

          // Render current preview on home page
          renderCards(d.data.places, container, true);

          // Setup the "Show More" button to redirect to Explore page
          const showBtn = document.getElementById("showMoreNearMeBtn");
          if (showBtn && d.data.places.length > 0) {
            showBtn.classList.remove("hidden");
            showBtn.onclick = () => {
              window.location.href = `explore.html?type=near-me&lat=${lat}&lng=${lng}`;
            };
          }
        } catch (err) {
          if (loader) loader.classList.add("hidden");
          console.error("Location Fetch Error:", err);
        }
      },
      (err) => {
        if (loader) loader.classList.add("hidden");
        alert("Please enable location services in your browser.");
      },
    );
  };
}
