// ==========================================
// 0. GLOBAL DATA & STATE
// ==========================================
window.globalPlacesMap = {};
let globalPlaceIdCounter = 0;
let isFetchingCategories = false;
window.currentModalPlace = null; // هام جداً لربط الحفظ، التعليقات، والحاسبة
window.tripCart = [];
const API_BASE_URL = window.API_BASE_URL;
const DEFAULT_THUMB =
  "https://s7g10.scene7.com/is/image/barcelo/pyramids-of-giza-facts_ancient-pyramids-of-giza?&&fmt=webp-alpha&qlt=75&wid=1300&fit=crop,1";

// DOM Elements Stack
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

const openBtn = document.getElementById("openTripPlannerBtn");
const modal = document.getElementById("tripPlannerModal");
const closeBtn = document.getElementById("closeTripPlannerBtn");
const tripResultContainer = document.getElementById("tripResult");

const generateBtn = document.getElementById("generateTripBtn");
const tripLoading = document.getElementById("tripLoading");
const loadingMessage = document.getElementById("loadingMessage");
const tripDaysInput = document.getElementById("tripDays");
const daysDisplayLabel = document.querySelector(".days-display-v2");

const tabCreate = document.getElementById("tabCreateTrip");
const tabTrips = document.getElementById("tabMyTrips");
const plannerCont = document.getElementById("plannerContainer");
const trackerCont = document.getElementById("trackerContainer");

let selectedCities = [];
let selectedInterests = [];

const loadingMessages = [
  "Analyzing destinations...",
  "Finding top attractions...",
  "Optimizing travel route...",
  "Calculating visit times...",
  "Building itinerary...",
  "Finalizing your trip...",
];

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

function getFallbackImageUrl(place) {
  if (!place) return DEFAULT_THUMB;
  if (place.images && Array.isArray(place.images.gallery)) {
    const fallback = place.images.gallery.find(
      (img) => isValidUrl(img) && img !== place.images.main,
    );
    if (fallback) return fallback;
  }
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
// 2. GLOBAL RENDER LOGIC (Resilient Scoping)
// ==========================================
window.renderCards = function (places, container, limit = false) {
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
          ${place.distanceAway && place.distanceAway !== Infinity ? `<p style="color:#2ecc71; font-size:0.75rem; font-weight:bold;">${place.distanceAway.toFixed(1)} km away</p>` : ""}
        </div>
      </div>`,
    );
  });
};

window.renderPremiumCards = function (places, container) {
  if (!container) return;
  container.innerHTML = "";

  places.forEach((place) => {
    if (!place || (!place["Landmark Name (English)"] && !place.name)) return;

    const currentPlaceId = "place_" + globalPlaceIdCounter++;
    window.globalPlacesMap[currentPlaceId] = place;

    const name = place["Landmark Name (English)"] || place.name;
    const city = place.Location || "Egypt";

    const originalMainUrl = getValidImageUrl(place);
    const optimizedMainUrl = optimizeImage(originalMainUrl, 500);

    container.insertAdjacentHTML(
      "beforeend",
      `<div class="premium-place-card place-card" data-placeid="${currentPlaceId}">
        <div class="card-image-wrapper">
          <img src="${optimizedMainUrl}" alt="${name}" loading="lazy" onerror="this.onerror=null; this.src='${originalMainUrl}';">
        </div>
        <div class="card-content-wrapper">
          <h4 class="card-landmark-name">${name}</h4>
          <p class="card-landmark-location"><i class="fas fa-map-marker-alt"></i> ${city}</p>
          ${place.distanceAway && place.distanceAway !== Infinity ? `<p class="card-landmark-distance"><i class="fas fa-location-arrow"></i> ${place.distanceAway.toFixed(1)} km away</p>` : ""}
        </div>
      </div>`,
    );
  });
};

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
      if (nearbyContainer) window.renderCards(nearest, nearbyContainer, false);
      if (similarContainer)
        window.renderCards(similar, similarContainer, false);
    }
  } catch (err) {
    console.error("Recommendations UI Error:", err);
  }
}

// ==========================================
// 3. MODAL LOGIC & IMAGE GALLERY
// ==========================================
function openPlaceModal(placeData) {
  if (!placeData || !placeModal) return;
  window.currentModalPlace = placeData;

  const safeSetText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  safeSetText("modalTitle", placeData["Landmark Name (English)"] || "Landmark");
  safeSetText("modalArabicName", placeData["Arabic Name"] || "");
  safeSetText("modalLocation", placeData["Location"] || "Egypt");
  safeSetText("modalTime", placeData.workingTime || "08:00 - 17:00");
  safeSetText("modalPrice", placeData.price || "Free");
  safeSetText("modalCategory", placeData.category || "General");

  const historyEl = document.getElementById("modalHistory");
  if (historyEl)
    historyEl.innerText =
      placeData["Short History Summary"] || "Discover the wonders of Egypt.";

  const imgEl = document.getElementById("modalImg");
  const galleryEl = document.getElementById("modalGallery");

  let allImages = [];
  const mainImage = getValidImageUrl(placeData);
  if (mainImage && mainImage !== DEFAULT_THUMB) allImages.push(mainImage);

  if (placeData.images && Array.isArray(placeData.images.gallery)) {
    placeData.images.gallery.forEach((img) => {
      if (img && !allImages.includes(img) && !img.includes("[URL]"))
        allImages.push(img);
    });
  } else if (placeData.images && Array.isArray(placeData.images)) {
    placeData.images.forEach((img) => {
      if (img && !allImages.includes(img) && !img.includes("[URL]"))
        allImages.push(img);
    });
  } else if (placeData.images && typeof placeData.images === "string") {
    placeData.images.split(",").forEach((img) => {
      let cleanImg = img.trim();
      if (
        cleanImg &&
        !allImages.includes(cleanImg) &&
        !cleanImg.includes("[URL]")
      )
        allImages.push(cleanImg);
    });
  }

  if (imgEl) {
    const originalHero = allImages.length > 0 ? allImages[0] : DEFAULT_THUMB;
    imgEl.src = optimizeImage(originalHero, 800);
    imgEl.onerror = function () {
      this.onerror = null;
      this.src = originalHero;
    };
  }

  if (galleryEl) {
    galleryEl.innerHTML = "";
    if (allImages.length > 1) {
      galleryEl.style.display = "flex";
      allImages.forEach((originalUrl, index) => {
        const thumb = document.createElement("img");
        thumb.src = optimizeImage(originalUrl, 100);
        thumb.onerror = function () {
          this.onerror = null;
          this.src = originalUrl;
        };
        thumb.style.minWidth = "65px";
        thumb.style.height = "65px";
        thumb.style.objectFit = "cover";
        thumb.style.borderRadius = "8px";
        thumb.style.cursor = "pointer";
        thumb.style.border =
          index === 0 ? "2px solid #0b4a6f" : "2px solid transparent";
        thumb.style.transition = "0.3s";
        thumb.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";

        thumb.onclick = () => {
          if (imgEl) {
            imgEl.src = optimizeImage(originalUrl, 800);
            imgEl.onerror = function () {
              this.onerror = null;
              this.src = originalUrl;
            };
          }
          Array.from(galleryEl.children).forEach(
            (child) => (child.style.border = "2px solid transparent"),
          );
          thumb.style.border = "2px solid #0b4a6f";
        };
        galleryEl.appendChild(thumb);
      });
    } else {
      galleryEl.style.display = "none";
    }
  }

  const mapBtn = document.getElementById("modalMapLink");
  if (mapBtn && placeData.Coordinates) {
    const cleanCoords = placeData.Coordinates.replace(/\s+/g, "");
    mapBtn.href = `https://www.google.com/maps?q=${cleanCoords}`;
    mapBtn.style.display = "inline-flex";
  } else if (mapBtn) {
    mapBtn.style.display = "none";
  }

  updateSaveButtonUI();
  const placeId =
    placeData.ID ||
    (placeData._id ? placeData._id.$oid || placeData._id : null);
  if (placeId) {
    const idStr = placeId.toString();
    if (typeof loadReviews === "function") loadReviews(idStr);
    loadPlaceRecommendations(idStr);
  }
  // ✨ تحديث حالة زر الإضافة إلى الرحلة (Add to your trip) بناءً على وجوده في السلة
  // ==========================================
  // SMART TRIP CART SELECTION LOGIC (Groq AI Integration)
  // ==========================================
  const addToTripBtn = document.getElementById("addToTripBtn");
  if (addToTripBtn) {
    addToTripBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!window.currentModalPlace) return;

      const pName =
        window.currentModalPlace["Landmark Name (English)"] ||
        window.currentModalPlace.name;

      if (window.tripCart.includes(pName)) {
        // إذا كان مضافاً بالفعل، نقوم بحذفه عند الضغط مرة أخرى
        window.tripCart = window.tripCart.filter((item) => item !== pName);
        addToTripBtn.style.background = "#27ae60";
        addToTripBtn.innerHTML = `<i class="fas fa-plus-circle"></i> Add to your trip`;
      } else {
        // إضافة المعلم إلى مصفوفة الاختيارات اليدوية الخاصة بك
        window.tripCart.push(pName);
        addToTripBtn.style.background = "#0b4a6f";
        addToTripBtn.innerHTML = `<i class="fas fa-check-circle"></i> Added to Trip`;

        // إشعار فوري وتفاعلي لليوزر
        window.showPremiumToast(
          "Landmark Curated!",
          `"${pName}" has been pinned to your temporary workspace context preferences.`,
          false,
        );
      }
    });
  }
  placeModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// ==========================================
// 4. BUTTON ACTIONS (Save & Review)
// ==========================================
function updateSaveButtonUI() {
  const saveBtn = document.getElementById("modalSaveBtn");
  const saveIcon = document.getElementById("modalSaveIcon");
  const saveText = document.getElementById("modalSaveText");

  if (!saveBtn) return;

  const user = JSON.parse(localStorage.getItem("userProfile") || "{}");
  const placeData = window.currentModalPlace;
  const placeId =
    placeData.ID ||
    (placeData._id ? placeData._id.$oid || placeData._id : null);
  const isSaved = user.saved_places?.some((p) => p.id == placeId);

  if (isSaved) {
    saveBtn.style.background = "#27ae60";
    saveText.textContent = "Saved";
    if (saveIcon) saveIcon.className = "fas fa-heart";
  } else {
    saveBtn.style.background = "#e74c3c";
    saveText.textContent = "Save Place";
    if (saveIcon) saveIcon.className = "far fa-heart";
  }
}

if (modalSaveBtn) {
  modalSaveBtn.onclick = async function () {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("Please sign in to save places!");
      window.location.href = "auth.html";
      return;
    }

    const extractedId =
      window.currentModalPlace.ID ||
      window.currentModalPlace._id?.$oid ||
      window.currentModalPlace._id;

    try {
      const response = await fetch(`${API_BASE_URL}/user/save-place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId,
          place: {
            id: extractedId,
            name:
              window.currentModalPlace["Landmark Name (English)"] ||
              window.currentModalPlace.name,
            location: window.currentModalPlace.Location,
            img: getValidImageUrl(window.currentModalPlace),
          },
        }),
      });

      const result = await response.json();
      if (result.status === "success") {
        const user = JSON.parse(localStorage.getItem("userProfile") || "{}");
        if (!user.saved_places) user.saved_places = [];
        user.saved_places.push({ id: extractedId });
        localStorage.setItem("userProfile", JSON.stringify(user));
        updateSaveButtonUI();
      }
    } catch (err) {
      console.error("Save Error:", err);
    }
  };
}

async function submitReview() {
  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");
  const comment = document.getElementById("reviewComment").value.trim();
  const rating = document.querySelector('input[name="stars"]:checked')?.value;

  if (!userId) return alert("Please login to post a review!");
  if (!comment || !rating) return alert("Please add a comment and rating!");

  const placeId =
    window.currentModalPlace.ID ||
    window.currentModalPlace._id?.$oid ||
    window.currentModalPlace._id;

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
      document.getElementById("reviewComment").value = "";
      if (typeof loadReviews === "function") loadReviews(placeId.toString());
      alert("Review posted!");
    }
  } catch (err) {
    console.error("Review Error:", err);
  }
}

// ==========================================
// TRIP COST CALCULATOR LOGIC (Advanced)
// ==========================================
window.updateStepper = function (inputId, change) {
  const input = document.getElementById(inputId);
  if (!input) return;
  let newVal = parseInt(input.value) + change;
  if (newVal < 1) newVal = 1;
  input.value = newVal;
  if (window.triggerTripCalculation) window.triggerTripCalculation();
};

// ==========================================
// 5. INITIALIZATION & Curated Categories Rendering
// ==========================================

// ✨ إصلاح الخلل المرجعي: قراءة الـ Object القادم من الباك إيند وتوزيع كروت الـ Premium بشكل سليم تماماً
function renderGroupedCategories(groupedData, selectedCity) {
  if (!categoriesContentWrapper) return;
  categoriesContentWrapper.innerHTML = "";

  categoriesContentWrapper.className = "categories-main-block";

  const entries = Object.entries(groupedData || {});
  if (entries.length === 0) {
    categoriesContentWrapper.innerHTML = `
      <div style="text-align:center; padding:40px; color:var(--airbnb-gray);">
        <i class="fas fa-compass" style="font-size:2.5rem; margin-bottom:12px; opacity:0.5;"></i>
        <p style="font-weight:500; margin:0;">No matching curated categories found for this region.</p>
      </div>`;
    return;
  }

  entries.forEach(([categoryName, places], index) => {
    if (!places || places.length === 0) return;

    const categoryDesc = "Handpicked local experiences optimized by AI.";
    let iconClass = "fa-monument";
    const lowerName = categoryName.toLowerCase();
    if (lowerName.includes("temple")) iconClass = "fa-gopuram";
    if (lowerName.includes("pyramid")) iconClass = "fa-landmark";
    if (lowerName.includes("mosque")) iconClass = "fa-mosque";
    if (lowerName.includes("church") || lowerName.includes("coptic"))
      iconClass = "fa-church";
    if (lowerName.includes("museum")) iconClass = "fa-images";
    if (lowerName.includes("nature") || lowerName.includes("island"))
      iconClass = "fa-tree";

    const bgRowClass = index % 2 === 0 ? "bg-white" : "bg-gray";
    const carouselId = `carousel_cat_${index}_${Date.now()}`;
    const uniqueGridId = `grid_cat_${index}_${Date.now()}`;

    // بناء الهيكل الفاخر مع حاوية الكاروسيل وأزرار التنقل الذكية
    const sectionHtml = `
      <section class="premium-category-section ${bgRowClass}">
        <div class="premium-section-container">
          <div class="premium-section-header">
            <div class="header-left">
              <div class="category-icon-box"><i class="fas ${iconClass}"></i></div>
              <div>
                <h4 class="category-title">${categoryName}</h4>
                <p class="category-desc">${categoryDesc}</p>
              </div>
            </div>
            ${
              places.length > 4
                ? `
            <a href="explore.html?category=${encodeURIComponent(categoryName)}&city=${selectedCity}" class="premium-view-all-btn">
              View All <i class="fas fa-arrow-right"></i>
            </a>`
                : ""
            }
          </div>
          
          <div class="premium-carousel-wrapper">
            ${
              places.length > 4
                ? `
            <button class="premium-carousel-btn prev" onclick="document.getElementById('${carouselId}').scrollBy({left: -document.getElementById('${carouselId}').offsetWidth, behavior: 'smooth'})" aria-label="Previous">
              <i class="fas fa-chevron-left"></i>
            </button>`
                : ""
            }
            
            <div id="${carouselId}" class="premium-carousel-track">
              <div id="${uniqueGridId}" class="premium-cards-grid-carousel"></div>
            </div>
            
            ${
              places.length > 4
                ? `
            <button class="premium-carousel-btn next" onclick="document.getElementById('${carouselId}').scrollBy({left: document.getElementById('${carouselId}').offsetWidth, behavior: 'smooth'})" aria-label="Next">
              <i class="fas fa-chevron-right"></i>
            </button>`
                : ""
            }
          </div>
        </div>
      </section>
    `;

    categoriesContentWrapper.insertAdjacentHTML("beforeend", sectionHtml);

    const subGridTarget = document.getElementById(uniqueGridId);
    if (subGridTarget && typeof window.renderPremiumCards === "function") {
      window.renderPremiumCards(places, subGridTarget);
    }
  });
}
async function fetchAndRenderCategories(selectedCity = "all") {
  if (isFetchingCategories || !categoriesContentWrapper) return;
  isFetchingCategories = true;
  if (categoriesLoading) categoriesLoading.classList.remove("hidden");

  try {
    const response = await fetch(
      `${API_BASE_URL}/categories?city=${selectedCity}`,
    );
    const data = await response.json();
    if (data.status === "success") {
      renderGroupedCategories(data.data, selectedCity);
    }
  } catch (error) {
    console.error("Home Load Error:", error);
  } finally {
    // 🛠️ تصحيح الكلمة المفتاحية الإملائية القاتلة من 'finaly' إلى 'finally'
    if (categoriesLoading) categoriesLoading.classList.add("hidden");
    isFetchingCategories = false;
  }
}

function setDefaultItineraryPlaceholder() {
  const container = document.getElementById("tripResult");
  if (!container) return;
  container.innerHTML = `
    <div class="itinerary-empty-placeholder-card" style="text-align:center; padding: 40px 24px; border: 2px dashed #ddd; border-radius:12px; background:#fafafa; margin-top:2px;">
      <div style="width:64px; height:64px; border-radius:50%; background:rgba(11,74,111,0.05); color:#0b4a6f; display:flex; align-items:center; justify-content:center; font-size:1.6rem; margin:0 auto 16px;"><i class="fas fa-map-marked-alt"></i></div>
      <h3 style="font-size:1.25rem; font-weight:600; color:#222; margin:0 0 8px 0;">Your Egyptian Itinerary Awaits</h3>
      <p style="font-size:0.92rem; color:#717171; line-height:1.5; max-width:440px; margin:0 auto;">Select your target destinations, trip duration, and historic exploration preferences on the left panel, then tap generate to visualize your fully optimized visual timeline.</p>
    </div>`;
}

// ==========================================
// UNIFIED DOMContentLoaded Lifecycle INITIALIZER
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
  const initialCity = cityFilter ? cityFilter.value : "all";
  fetchAndRenderCategories(initialCity);
  if (tripResultContainer) setDefaultItineraryPlaceholder();

  if (cityFilter) {
    cityFilter.onchange = (e) => fetchAndRenderCategories(e.target.value);
  }

  if (closeModalBtn) {
    closeModalBtn.onclick = () => {
      if (placeModal) placeModal.classList.remove("active");
      document.body.style.overflow = "auto";
    };
  }

  if (openBtn && modal) {
    openBtn.addEventListener("click", () => {
      modal.classList.add("active");
      if (tripResultContainer && !tripResultContainer.innerHTML.trim()) {
        setDefaultItineraryPlaceholder();
      }
    });
  }
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => modal.classList.remove("active"));
  }

  // Calculator Modal Event Setup
  const calcModal = document.getElementById("calc-modal");
  const openCalcBtn = document.getElementById("open-calc-btn");
  const closeCalcBtn = document.getElementById("close-calc-modal");

  const inputs = {
    days: document.getElementById("calc-days"),
    travelers: document.getElementById("calc-travelers"),
    transport: document.getElementById("calc-transport"),
    accommodation: document.getElementById("calc-accommodation"),
    food: document.getElementById("calc-food"),
  };
  const currencySelect = document.getElementById("currency-switcher");
  const totalCostEl = document.getElementById("total-cost");
  const costPerPersonEl = document.getElementById("cost-per-person");

  const exchangeRates = { EGP: 1, USD: 0.021, EUR: 0.019 };
  let previousCurrency = "EGP";
  let lastCalcPlaceId = null;

  if (openCalcBtn) {
    openCalcBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const currentPlaceId = window.currentModalPlace
        ? window.currentModalPlace.ID ||
          window.currentModalPlace._id?.$oid ||
          window.currentModalPlace._id
        : null;

      if (currentPlaceId !== lastCalcPlaceId) {
        inputs.days.value = 1;
        inputs.travelers.value = 1;
        inputs.transport.value = "";
        inputs.accommodation.value = "";
        inputs.food.value = "";
        if (currencySelect) currencySelect.value = "EGP";
        previousCurrency = "EGP";
        lastCalcPlaceId = currentPlaceId;
        window.triggerTripCalculation();
      }
      if (calcModal) calcModal.classList.add("active");
    });
  }

  if (closeCalcBtn) {
    closeCalcBtn.addEventListener("click", () => {
      if (calcModal) calcModal.classList.remove("active");
    });
  }

  window.triggerTripCalculation = function () {
    if (!inputs.days) return;
    const days = Math.max(1, parseInt(inputs.days.value) || 1);
    const travelers = Math.max(1, parseInt(inputs.travelers.value) || 1);
    const transport = Math.max(0, parseFloat(inputs.transport.value) || 0);
    const accommodation = Math.max(
      0,
      parseFloat(inputs.accommodation.value) || 0,
    );
    const food = Math.max(0, parseFloat(inputs.food.value) || 0);

    const nights = days;
    const grandTotal =
      transport + accommodation * nights + food * days * travelers;
    const perPerson = travelers > 0 ? grandTotal / travelers : 0;

    if (totalCostEl)
      totalCostEl.textContent = grandTotal.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      });
    if (costPerPersonEl)
      costPerPersonEl.textContent = perPerson.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      });

    const selectedCurrency = currencySelect ? currencySelect.value : "EGP";
    document.querySelectorAll(".curr-symbol").forEach((el) => {
      el.textContent =
        selectedCurrency === "USD"
          ? "$"
          : selectedCurrency === "EUR"
            ? "€"
            : "ج.م";
    });
  };

  Object.values(inputs).forEach((input) => {
    if (input) {
      input.addEventListener("input", window.triggerTripCalculation);
    }
  });

  if (tripDaysInput && daysDisplayLabel) {
    tripDaysInput.addEventListener("input", () => {
      daysDisplayLabel.textContent = `${tripDaysInput.value} Days Selected`;
    });
  }
});

document.addEventListener("click", (e) => {
  const card = e.target.closest(".place-card");
  if (card) {
    const data = window.globalPlacesMap[card.dataset.placeid];
    if (data) openPlaceModal(data);
  }
});

// ==========================================
// 6. AI SCANNER & GPS LOGIC
// ==========================================
if (uploadBtn && imageInput) {
  uploadBtn.onclick = () => imageInput.click();
  imageInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

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

      if (data.status === "success") {
        if (data.data.details) openPlaceModal(data.data.details);
        else if (data.data.prediction)
          alert(`AI identified this as: ${data.data.prediction}`);
      }
    } catch (err) {
      console.error("AI Scan Error:", err);
    } finally {
      // 🛠️ تصحيح الإملاء البرمجي القاتل هنا أيضاً
      if (loadState) loadState.classList.add("hidden");
      imageInput.value = "";
    }
  };
}

if (getLocationBtn) {
  getLocationBtn.onclick = function () {
    const loader = document.getElementById("locationLoading");
    const container = document.getElementById("nearMeCards");
    if (loader) loader.classList.remove("hidden");

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      try {
        const res = await fetch(
          `${API_BASE_URL}/places/near-me?lat=${lat}&lng=${lng}`,
        );
        const d = await res.json();
        if (loader) loader.classList.add("hidden");
        renderCards(d.data.places, container, true);
      } catch (err) {
        if (loader) loader.classList.add("hidden");
      }
    });
  };
}

// =========================================================================
// 7. ITINERARY MATRIX INTERACTION DECK
// =========================================================================
document.addEventListener("click", (e) => {
  const cityChip = e.target.closest(".city-chip-v2:not(.interest-chip-v2)");
  if (cityChip) {
    const city = cityChip.dataset.city;
    cityChip.classList.toggle("active");
    if (selectedCities.includes(city))
      selectedCities = selectedCities.filter((c) => c !== city);
    else selectedCities.push(city);
  }

  const interestChip = e.target.closest(".interest-chip-v2");
  if (interestChip) {
    const interest = interestChip.dataset.interest;
    interestChip.classList.toggle("active");
    if (selectedInterests.includes(interest))
      selectedInterests = selectedInterests.filter((i) => i !== interest);
    else selectedInterests.push(interest);
  }
});

if (generateBtn) {
  generateBtn.addEventListener("click", () => {
    if (selectedCities.length === 0) {
      alert("Please select at least one city to initialize layout paths.");
      return;
    }

    if (tripLoading) tripLoading.style.display = "block";
    document.getElementById("tripResult").innerHTML = "";

    let msgIdx = 0;
    const interval = setInterval(() => {
      if (loadingMessage) {
        loadingMessage.textContent = loadingMessages[msgIdx];
        msgIdx = (msgIdx + 1) % loadingMessages.length;
      }
    }, 1000);

    setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/trip-planner`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cities: selectedCities,
            days: tripDaysInput ? tripDaysInput.value : 3,
            interests: selectedInterests,
            manualSelection: window.tripCart || [],
          }),
        });
        const data = await response.json();
        clearInterval(interval);
        if (tripLoading) tripLoading.style.display = "none";

        const itinerary = data?.data?.itinerary;
        if (!itinerary || !itinerary.days) return;

        document.getElementById("plannerInputsForm").style.display = "none";
        document.getElementById("summaryLabelDestinations").textContent =
          selectedCities.join(", ");
        document.getElementById("summaryLabelDuration").textContent =
          `${tripDaysInput ? tripDaysInput.value : 3} Days Scheduled`;
        document.getElementById("summaryLabelInterests").textContent =
          selectedInterests.length > 0
            ? selectedInterests.join(", ")
            : "General Historical Exploration Focus";

        const summaryWidgetElement = document.getElementById(
          "compactTripSummaryWidget",
        );
        if (summaryWidgetElement) summaryWidgetElement.style.display = "flex";

        document.getElementById("editPreferencesBtn").onclick = function () {
          if (summaryWidgetElement) summaryWidgetElement.style.display = "none";
          document.getElementById("plannerInputsForm").style.display = "block";
          setDefaultItineraryPlaceholder();
        };

        let accordionDaysHtml = "";
        itinerary.days.forEach((dayObj, dayIndex) => {
          let dayEstimatedCost = 0;
          let dayActivitiesCount = dayObj.places.length;
          let chronologicalSlots = { morning: [], afternoon: [], evening: [] };

          dayObj.places.forEach((place, placeIndex) => {
            let entryFee = 0;
            if (place.price_range) {
              const numericMatch = place.price_range.match(/\d+/);
              if (numericMatch) entryFee = parseInt(numericMatch[0]);
            }
            dayEstimatedCost += entryFee;

            // 🔺 خطوة الصورة الموحدة: اختيار الصورة الفاخرة بناءً على الفئة لمنع انبعاج الأشكال
            let curatedThumbnail =
              "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=350&q=70";
            const textQuery = (place.name || "").toLowerCase();
            let resolvedCategoryTag = "Historic Landmark";

            if (textQuery.includes("pyramid") || textQuery.includes("giza")) {
              curatedThumbnail =
                "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=350&q=70";
              resolvedCategoryTag = "Necropolis";
            } else if (
              textQuery.includes("museum") ||
              textQuery.includes("tahrir") ||
              textQuery.includes("grand")
            ) {
              curatedThumbnail =
                "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?auto=format&fit=crop&w=350&q=70";
              resolvedCategoryTag = "Exhibition Gallery";
            } else if (
              textQuery.includes("temple") ||
              textQuery.includes("luxor") ||
              textQuery.includes("karnak")
            ) {
              curatedThumbnail =
                "https://images.unsplash.com/photo-1543157145-f78c636d023d?auto=format&fit=crop&w=350&q=70";
              resolvedCategoryTag = "Pharaonic Sanctuary";
            } else if (
              textQuery.includes("mosque") ||
              textQuery.includes("citadel")
            ) {
              curatedThumbnail =
                "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=350&q=70";
              resolvedCategoryTag = "Islamic Architecture";
            } else if (
              textQuery.includes("church") ||
              textQuery.includes("coptic")
            ) {
              curatedThumbnail =
                "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=350&q=70";
              resolvedCategoryTag = "Coptic Heritage";
            }

            const timeString = (place.time || "").toUpperCase();
            let assignedPeriod = "afternoon";
            if (timeString.includes("AM") || placeIndex === 0)
              assignedPeriod = "morning";
            else if (
              timeString.includes("PM") &&
              (timeString.includes("5:") ||
                timeString.includes("6:") ||
                placeIndex === dayActivitiesCount - 1)
            )
              assignedPeriod = "evening";

            const cleanNarrative = place.reason
              ? place.reason.replace(/^"|焦点|"/g, "")
              : "AI optimized recommendation.";

            const singleCardMarkup = `
              <div class="premium-attraction-item-card generation-mode-card">
                <div class="attraction-thumbnail-frame"><img src="${curatedThumbnail}" alt="Preview" loading="lazy"></div>
                <div class="attraction-details-frame">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:4px;">
                    <h5>${place.name || "Destination Landmark"}</h5>
                    <span class="category-badge-pill">${resolvedCategoryTag}</span>
                  </div>
                  <p class="attraction-short-narrative">${cleanNarrative}</p>
                  <div class="attraction-meta-row-tags">
                    <span><i class="far fa-clock"></i> ${place.time || "Flexible"}</span>
                    <span><i class="fas fa-ticket-alt"></i> ${place.price_range || "Free"}</span>
                  </div>
                </div>
                <div class="attraction-action-rail-buttons">
                  <button class="action-icon-pill-btn swap-variant" onclick="alert('🔄 Swapping options...')"><i class="fas fa-exchange-alt"></i> Swap</button>
                  <button class="action-icon-pill-btn" onclick="alert('✏️ Editing panel...')"><i class="far fa-edit"></i> Edit</button>
                </div>
              </div>`;
            chronologicalSlots[assignedPeriod].push(singleCardMarkup);
          });

          let timelineBlocksContent = "";
          if (chronologicalSlots.morning.length > 0)
            timelineBlocksContent += `<div class="chronological-timeline-slot"><div class="timeline-slot-anchor-title"><i class="fas fa-sun"></i> Morning Exploration</div><div style="display:flex; flex-direction:column; gap:12px;">${chronologicalSlots.morning.join("")}</div></div>`;
          if (chronologicalSlots.afternoon.length > 0)
            timelineBlocksContent += `<div class="chronological-timeline-slot"><div class="timeline-slot-anchor-title"><i class="fas fa-cloud-sun"></i> Afternoon High Tracks</div><div style="display:flex; flex-direction:column; gap:12px;">${chronologicalSlots.afternoon.join("")}</div></div>`;
          if (chronologicalSlots.evening.length > 0)
            timelineBlocksContent += `<div class="chronological-timeline-slot"><div class="timeline-slot-anchor-title"><i class="fas fa-moon"></i> Evening Leisure Paths</div><div style="display:flex; flex-direction:column; gap:12px;">${chronologicalSlots.evening.join("")}</div></div>`;

          const uniqueAccordionIdentifier = `generationAccordionDay_d${dayObj.day}`;
          accordionDaysHtml += `
            <div class="day-accordion-card ${dayIndex === 0 ? "expanded" : ""}" id="${uniqueAccordionIdentifier}">
              <div class="day-accordion-header" onclick="window.togglePremiumAccordion('${uniqueAccordionIdentifier}')">
                <div class="day-header-left-pane">
                  <h4 class="day-title-txt">Day ${dayObj.day} — ${dayObj.city || "Regional Center"}</h4>
                  <div class="day-subtitle-tags">
                    <span class="tag-lbl-item"><i class="fas fa-map-marked-alt"></i> ${dayActivitiesCount} Activities</span>
                    <span class="tag-divider-dot"></span>
                    <span class="tag-lbl-item"><i class="fas fa-wallet"></i> Approx: ${dayEstimatedCost || 150} EGP</span>
                  </div>
                </div>
                <div class="accordion-toggle-chevron"><i class="fas fa-chevron-down"></i></div>
              </div>
              <div class="day-accordion-body-wrapper">
                <div class="day-accordion-content-inner">${timelineBlocksContent}</div>
              </div>
            </div>`;
        });

        document.getElementById("tripResult").innerHTML = `
          <div class="generated-premium-itinerary-wrapper">
            <div class="itinerary-display-column" style="margin-bottom: 24px;">${accordionDaysHtml}</div>
            <div class="sticky-mobile-save-container">
              <button id="saveAiTripBtn" class="primary-action-cta full-width-save-btn"><i class="fas fa-cloud-download-alt"></i> Commit & Save Plan to Dashboard</button>
            </div>
          </div>`;

        const savePlanBtn = document.getElementById("saveAiTripBtn");
        if (savePlanBtn) {
          savePlanBtn.addEventListener("click", async () => {
            const userId = localStorage.getItem("userId");
            if (!userId) return;
            try {
              await fetch(`${API_BASE_URL}/user/save-trip`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId,
                  itinerary,
                  cities: selectedCities,
                  days: tripDaysInput ? tripDaysInput.value : 3,
                }),
              });
              // استبدل الـ alert المزعج بالـ Modal التفاعلي الجديد
              window.showPremiumToast(
                "Expedition Saved!",
                "Your adventure path has been successfully synced to the Live Dashboard.",
                true,
              );
              document.getElementById("tabMyTrips").click();
            } catch (err) {
              console.error(err);
            }
          });
        }
      } catch (error) {
        console.error(error);
      }
    }, 2000);
  });
}
async function syncGlobalTracker() {
  const userId = localStorage.getItem("userId");
  const widget = document.getElementById("currentAdventureWidget");
  const floatingBtn = document.getElementById("floatingTrackerBtn");
  const continueBtn = document.getElementById("continueJourneyBtn");

  if (!userId) {
    if (widget) widget.style.display = "none";
    if (floatingBtn) floatingBtn.style.display = "none";
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`);
    const data = await res.json();
    const trips = data.data.user.saved_trips || [];

    // البحث عن أول رحلة غير مكتملة (Active Trip) بدلاً من آخر رحلة عشوائية
    const activeTrip = trips
      .slice()
      .reverse()
      .find((t) => (t.progress || 0) < 100);

    if (activeTrip && activeTrip.itinerary && activeTrip.itinerary.days) {
      // حساب التقدم الفعلي بناءً على الـ Checkboxes
      let totalPlaces = 0;
      let visitedPlaces = 0;
      let nextAttraction = "Continue your journey!";
      let foundNext = false;

      activeTrip.itinerary.days.forEach((day) => {
        day.places.forEach((place, pIndex) => {
          totalPlaces++;
          const uniqueId = `chk_${activeTrip.tripId}_d${day.day}_p${pIndex}`;
          const isChecked = localStorage.getItem(uniqueId) === "true";

          if (isChecked) {
            visitedPlaces++;
          } else if (!foundNext) {
            nextAttraction = place.name;
            foundNext = true;
          }
        });
      });

      const progress =
        totalPlaces === 0 ? 0 : Math.round((visitedPlaces / totalPlaces) * 100);

      // تحديث الـ Widget
      if (widget) {
        widget.style.display = "block";
        document.getElementById("widgetTripTitle").textContent =
          `${activeTrip.cities[0]} Expedition`;
        document.getElementById("widgetProgressText").textContent =
          `${progress}% Complete`;
        document.getElementById("widgetProgressBar").style.width =
          `${progress}%`;
        document.getElementById("widgetNextAttraction").textContent =
          `Next: ${nextAttraction}`;

        // ربط زر الانتقال
        if (continueBtn) {
          continueBtn.onclick = () =>
            (window.location.href = "profile.html#myTripsTracker");
        }
      }

      // تحديث الـ Floating Button
      if (floatingBtn) {
        floatingBtn.style.display = "flex";
        document.getElementById("floatingPercent").textContent = `${progress}%`;
      }
    } else {
      // إخفاء الأدوات إذا كانت كل الرحلات مكتملة أو لا توجد رحلات
      if (widget) widget.style.display = "none";
      if (floatingBtn) floatingBtn.style.display = "none";
    }
  } catch (err) {
    console.error("Tracker Sync Error:", err);
  }
}

// استدعاء الدالة عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", syncGlobalTracker);
// استدعاء الدالة عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", syncGlobalTracker);

document.addEventListener("DOMContentLoaded", syncGlobalTracker);
// Initialize on load
document.addEventListener("DOMContentLoaded", syncGlobalTracker);
// ==========================================
// 8. PROGRESS TRACKER & TABS LOGIC
// ==========================================
if (tabCreate && tabTrips) {
  tabCreate.addEventListener("click", () => {
    tabCreate.classList.add("active");
    tabCreate.style.background = "#fff";
    tabCreate.style.color = "#0b4a6f";
    tabTrips.classList.remove("active");
    tabTrips.style.background = "transparent";
    tabTrips.style.color = "#666";
    if (plannerCont) plannerCont.style.display = "block";
    if (trackerCont) trackerCont.style.display = "none";
  });

  tabTrips.addEventListener("click", () => {
    tabTrips.classList.add("active");
    tabTrips.style.background = "#fff";
    tabTrips.style.color = "#0b4a6f";
    tabCreate.classList.remove("active");
    tabCreate.style.background = "transparent";
    tabCreate.style.color = "#666";
    if (plannerCont) plannerCont.style.display = "none";
    if (trackerCont) trackerCont.style.display = "block";
    loadMyTripsTracker();
  });
}

async function loadMyTripsTracker() {
  const userId = localStorage.getItem("userId");
  const container = document.getElementById("myTripsList");
  if (!container || !userId) return;

  try {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`);
    const data = await res.json();
    const trips = data.data.user.saved_trips || [];
    let finalHtml = "";

    [...trips].reverse().forEach((trip) => {
      let totalActivitiesCount = 0;
      let completedActivitiesCount = 0;
      let accordionDaysHtml = "";

      if (trip.itinerary && trip.itinerary.days) {
        trip.itinerary.days.forEach((dayObj, dayIndex) => {
          let dayEstimatedCost = 0;
          let dayActivitiesCount = dayObj.places.length;
          totalActivitiesCount += dayActivitiesCount;
          let chronologicalSlots = { morning: [], afternoon: [], evening: [] };

          dayObj.places.forEach((place, placeIndex) => {
            const uniqueActivityId = `chk_${trip.tripId}_d${dayObj.day}_p${placeIndex}`;
            const isCompleted =
              localStorage.getItem(uniqueActivityId) === "true";
            if (isCompleted) completedActivitiesCount++;

            let entryFee = 0;
            if (place.price_range) {
              const numericMatch = place.price_range.match(/\d+/);
              if (numericMatch) entryFee = parseInt(numericMatch[0]);
            }
            dayEstimatedCost += entryFee;

            let curatedThumbnail =
              "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=250&q=70";
            const textString = (place.time || "").toUpperCase();
            let assignedPeriod = "afternoon";
            if (textString.includes("AM") || placeIndex === 0)
              assignedPeriod = "morning";

            const singleCardMarkup = `
              <div class="premium-attraction-item-card ${isCompleted ? "task-completed" : ""}" id="cardWrapper_${uniqueActivityId}">
                <div class="task-checkbox-wrapper-premium">
                  <input type="checkbox" class="modern-circular-checkbox tracker-checkbox-engine" data-id="${uniqueActivityId}" data-tripid="${trip.tripId}" ${isCompleted ? "checked" : ""}>
                </div>
                <div class="attraction-thumbnail-frame"><img src="${curatedThumbnail}" alt="Thumbnail" loading="lazy"></div>
                <div class="attraction-details-frame">
                  <h5>${place.name || "Destination Landmark"}</h5>
                  <p class="attraction-short-narrative">${place.reason || "Optimized activity."}</p>
                </div>
              </div>`;
            chronologicalSlots[assignedPeriod].push(singleCardMarkup);
          });

          let timelineBlocksContent = "";
          if (chronologicalSlots.morning.length > 0)
            timelineBlocksContent += `<div class="chronological-timeline-slot"><div class="timeline-slot-anchor-title">Morning Exploration</div><div>${chronologicalSlots.morning.join("")}</div></div>`;
          if (chronologicalSlots.afternoon.length > 0)
            timelineBlocksContent += `<div class="chronological-timeline-slot"><div class="timeline-slot-anchor-title">Afternoon High Tracks</div><div>${chronologicalSlots.afternoon.join("")}</div></div>`;

          accordionDaysHtml += `
            <div class="day-accordion-card ${dayIndex === 0 ? "expanded" : ""}" id="accordionDay_${trip.tripId}_d${dayObj.day}">
              <div class="day-accordion-header" onclick="window.togglePremiumAccordion('accordionDay_${trip.tripId}_d${dayObj.day}')">
                <h4 class="day-title-txt">Day ${dayObj.day} — ${dayObj.city || "Center"}</h4>
              </div>
              <div class="day-accordion-body-wrapper">
                <div class="day-accordion-content-inner">${timelineBlocksContent}</div>
              </div>
            </div>`;
        });
      }

      const activeProgressPercentage =
        totalActivitiesCount === 0
          ? 0
          : Math.round((completedActivitiesCount / totalActivitiesCount) * 100);
      const svgRingCircumference = 2 * Math.PI * 28;
      const initialStrokeDashOffset =
        svgRingCircumference -
        (activeProgressPercentage / 100) * svgRingCircumference;

      finalHtml += `
        <div class="trip-operational-grand-card" style="margin-bottom:40px;">
          <div class="sticky-trip-summary-header">
            <h4>Expedition inside ${trip.cities.join(", ")}</h4>
            <div class="progress-svg-frame">
              <svg><circle class="circle-track-bg" cx="32" cy="32" r="28"></circle><circle class="circle-progress-fill" id="svgCircleFill_${trip.tripId}" cx="32" cy="32" r="28" stroke-dasharray="${svgRingCircumference}" stroke-dashoffset="${initialStrokeDashOffset}"></circle></svg>
              <div class="progress-percentage-label" id="badgePercentage_${trip.tripId}">${activeProgressPercentage}%</div>
            </div>
          </div>
          <div class="itinerary-display-column">${accordionDaysHtml}</div>
        </div>`;
    });
    container.innerHTML = finalHtml;
  } catch (error) {
    console.error(error);
  }
}
/**
 * دالة بديلة للـ Alert المزعج تظهر Modal تفاعلي فاخر
 * @param {String} title - عنوان الرسالة
 * @param {String} message - نص الرسالة الداخلي
 * @param {Boolean} isSuccess - هل العملية ناجحة أم خطأ لتغيير الأيقونة والألوان
 */
window.showPremiumToast = function (title, message, isSuccess = true) {
  const toastModal = document.getElementById("premiumToastModal");
  const toastIcon = document.getElementById("toastIcon");
  const toastTitle = document.getElementById("toastTitle");
  const toastMessage = document.getElementById("toastMessage");
  const closeToastBtn = document.getElementById("closeToastBtn");

  if (!toastModal) return;

  // تخصيص الشكل بناءً على نوع الرسالة (ناجحة أم تنبيه/خطأ)
  if (isSuccess) {
    toastIcon.className = "fas fa-check-circle";
    toastIcon.parentElement.style.background = "rgba(16, 185, 129, 0.1)";
    toastIcon.parentElement.style.color = "#10b981";
  } else {
    toastIcon.className = "fas fa-info-circle";
    toastIcon.parentElement.style.background = "rgba(255, 152, 0, 0.1)";
    toastIcon.parentElement.style.color = "#ff9800";
  }

  toastTitle.textContent = title;
  toastMessage.textContent = message;

  // إظهار الـ Modal
  toastModal.classList.add("active");

  // إغلاق عند الضغط على الزر
  closeToastBtn.onclick = () => {
    toastModal.classList.remove("active");
  };
};
window.togglePremiumAccordion = function (elementId) {
  const selectedAccordionFrame = document.getElementById(elementId);
  if (!selectedAccordionFrame) return;
  const contentSliderWrapper = selectedAccordionFrame.querySelector(
    ".day-accordion-body-wrapper",
  );

  if (selectedAccordionFrame.classList.contains("expanded")) {
    contentSliderWrapper.style.maxHeight =
      contentSliderWrapper.scrollHeight + "px";
    setTimeout(() => {
      contentSliderWrapper.style.maxHeight = "0";
      selectedAccordionFrame.classList.remove("expanded");
    }, 10);
  } else {
    selectedAccordionFrame.classList.add("expanded");
    contentSliderWrapper.style.maxHeight =
      contentSliderWrapper.scrollHeight + "px";
    contentSliderWrapper.addEventListener(
      "transitionend",
      function clearBounds() {
        if (selectedAccordionFrame.classList.contains("expanded"))
          contentSliderWrapper.style.maxHeight = "none";
      },
    );
  }
};
