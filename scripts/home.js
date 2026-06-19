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
window.handleImageError = function (imgElement) {
  if (!imgElement) return;
  imgElement.onerror = null;
  imgElement.src = DEFAULT_THUMB;
};
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
        <img
  src="${optimizedMainUrl}"
  alt="${name}"
  loading="lazy"
  onerror="window.handleImageError(this);"
> alt="${name}" loading="lazy" onerror="this.onerror=null; this.src='${originalMainUrl}';">
        <div style="padding: 15px;">
          <h3 style="color:#0b4a6f; font-size:1.1rem; margin-bottom:5px;">${name}</h3>
          <p style="color:#666; font-size:0.85rem;"><i class="fas fa-map-marker-alt"></i> ${city}</p>
          ${place.distanceAway && place.distanceAway !== Infinity ? `<p style="color:#2ecc71; font-size:0.75rem; font-weight:bold;">${place.distanceAway.toFixed(1)} km away</p>` : ""}
        </div>
      </div>`,
    );
  });

  container.querySelectorAll(".place-card").forEach((card) => {
    card.onclick = (e) => {
      const placeId = card.dataset.placeid;
      if (window.globalPlacesMap[placeId]) {
        openPlaceModal(window.globalPlacesMap[placeId]);
      }
    };
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
      `<div class="premium-place-card place-card" data-placeid="${currentPlaceId}" style="cursor: pointer;">
        <div class="card-image-wrapper">
          <img
  src="${optimizedMainUrl}"
  alt="${name}"
  loading="lazy"
  onerror="window.handleImageError(this);"
> alt="${name}" loading="lazy" onerror="this.onerror=null; this.src='${originalMainUrl}';">
        </div>
        <div class="card-content-wrapper">
          <h4 class="card-landmark-name">${name}</h4>
          <p class="card-landmark-location"><i class="fas fa-map-marker-alt"></i> ${city}</p>
          ${place.distanceAway && place.distanceAway !== Infinity ? `<p class="card-landmark-distance"><i class="fas fa-location-arrow"></i> ${place.distanceAway.toFixed(1)} km away</p>` : ""}
        </div>
      </div>`,
    );
  });

  container.querySelectorAll(".place-card").forEach((card) => {
    card.onclick = (e) => {
      const placeId = card.dataset.placeid;
      if (window.globalPlacesMap[placeId]) {
        openPlaceModal(window.globalPlacesMap[placeId]);
      }
    };
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
      window.handleImageError(this);
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
    mapBtn.href = `http://maps.google.com/?q=${cleanCoords}`;
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

  const addToTripBtn = document.getElementById("addToTripBtn");
  if (addToTripBtn) {
    const newBtn = addToTripBtn.cloneNode(true);
    addToTripBtn.parentNode.replaceChild(newBtn, addToTripBtn);

    const pName = placeData["Landmark Name (English)"] || placeData.name;
    if (window.tripCart.includes(pName)) {
      newBtn.style.background = "#0b4a6f";
      newBtn.innerHTML = `<i class="fas fa-check-circle"></i> Added to Trip`;
    } else {
      newBtn.style.background = "#27ae60";
      newBtn.innerHTML = `<i class="fas fa-plus-circle"></i> Add to your trip`;
    }

    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (window.tripCart.includes(pName)) {
        window.tripCart = window.tripCart.filter((item) => item !== pName);
        newBtn.style.background = "#27ae60";
        newBtn.innerHTML = `<i class="fas fa-plus-circle"></i> Add to your trip`;
      } else {
        window.tripCart.push(pName);
        newBtn.style.background = "#0b4a6f";
        newBtn.innerHTML = `<i class="fas fa-check-circle"></i> Added to Trip`;

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

const modalSaveBtn = document.getElementById("modalSaveBtn");
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
      </section>`;

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
  syncGlobalTracker(); // مزامنة التراكر عند التحميل

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

async function syncGlobalTracker() {
  const userId = localStorage.getItem("userId");
  const widget = document.getElementById("currentAdventureWidget");
  const continueBtn = document.getElementById("continueJourneyBtn");
  const contextualHeroText = document.getElementById("contextualHeroText");
  const scannerBox = document.getElementById("aiScannerActionBox");

  if (!userId) {
    if (widget) widget.style.display = "none";
    if (scannerBox)
      scannerBox.className = "ai-scanner-box primary-focus-scanner";
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`);
    const data = await res.json();
    const trips = data.data.user.saved_trips || [];

    document
      .querySelectorAll("#navTripsCount")
      .forEach((el) => (el.textContent = trips.length));

    const activeTrip = trips
      .slice()
      .reverse()
      .find((t) => {
        let tot = 0,
          checked = 0;
        if (t.itinerary && t.itinerary.days) {
          t.itinerary.days.forEach((d) => {
            d.places.forEach((p, pIdx) => {
              tot++;
              if (
                localStorage.getItem(`chk_${t.tripId}_d${d.day}_p${pIdx}`) ===
                "true"
              )
                checked++;
            });
          });
        }
        return tot === 0 ? false : checked < tot;
      });

    if (activeTrip && activeTrip.itinerary && activeTrip.itinerary.days) {
      let totalPlaces = 0;
      let visitedPlaces = 0;
      let nextAttraction = "Curated checkpoint";
      let foundNext = false;
      let calculatedTripBudget = 0;
      let currentDayIndex = 1;

      activeTrip.itinerary.days.forEach((day, dIdx) => {
        day.places.forEach((place, pIndex) => {
          totalPlaces++;
          const uniqueId = `chk_${activeTrip.tripId}_d${day.day}_p${pIndex}`;
          const isChecked = localStorage.getItem(uniqueId) === "true";

          let entryFee = 150;
          if (place.price_range) {
            const numericMatch = place.price_range.match(/\d+/);
            if (numericMatch) entryFee = parseInt(numericMatch[0], 10);
          }
          calculatedTripBudget += entryFee;

          if (isChecked) {
            visitedPlaces++;
          } else {
            if (!foundNext) {
              nextAttraction =
                typeof place === "string" ? place : place.name || "Attraction";
              currentDayIndex = dIdx + 1;
              foundNext = true;
            }
          }
        });
      });

      const progress =
        totalPlaces === 0 ? 0 : Math.round((visitedPlaces / totalPlaces) * 100);
      const remainingPlacesCount = totalPlaces - visitedPlaces;

      if (scannerBox) {
        scannerBox.className = "ai-scanner-box secondary-subordinated-scanner";
        const scannerBtn = scannerBox.querySelector(".scanner-btn");
        if (scannerBtn)
          scannerBtn.innerHTML = `<i class="fas fa-camera"></i> Scan Landmark`;
      }

      if (contextualHeroText) {
        contextualHeroText.innerHTML = `
          <h1 style="font-size: 2.4rem; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 6px; color: #ffffff;">Welcome Back!</h1>
          <p style="font-size: 1.1rem; opacity: 0.95; font-weight: 400; margin-bottom: 0; color: rgba(255,255,255,0.95);">Track your real-time adventure milestones below.</p>
        `;
      }

      if (widget) {
        widget.style.display = "block";

        const destinationRegion = activeTrip.cities.join(" & ");
        document.getElementById("widgetTripTitle").textContent =
          `${destinationRegion} Expedition • Day ${currentDayIndex} of ${activeTrip.days}`;
        document.getElementById("widgetProgressText").textContent =
          `${progress}%`;
        document.getElementById("widgetProgressBar").style.width =
          `${progress}%`;
        document.getElementById("widgetPlacesCompletedCount").textContent =
          visitedPlaces;
        document.getElementById("widgetPlacesRemainingCount").textContent =
          remainingPlacesCount;
        document.getElementById("widgetRemainingBudget").textContent =
          `${calculatedTripBudget} EGP`;
        document.getElementById("widgetNextAttraction").innerHTML =
          `Next Stop: <strong>${nextAttraction}</strong>`;

        const queryNormal = nextAttraction.toLowerCase();
        let coverImgUrl =
          "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=800&q=80";
        let thumbImgUrl =
          "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=120&q=80";

        if (queryNormal.includes("pyramid") || queryNormal.includes("giza")) {
          coverImgUrl =
            "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=800&q=80";
          thumbImgUrl =
            "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=120&q=80";
        } else if (
          queryNormal.includes("museum") ||
          queryNormal.includes("grand")
        ) {
          coverImgUrl =
            "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?auto=format&fit=crop&w=800&q=80";
          thumbImgUrl =
            "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?auto=format&fit=crop&w=120&q=80";
        } else if (
          queryNormal.includes("temple") ||
          queryNormal.includes("luxor") ||
          queryNormal.includes("karnak")
        ) {
          coverImgUrl =
            "https://images.unsplash.com/photo-1543157145-f78c636d023d?auto=format&fit=crop&w=800&q=80";
          thumbImgUrl =
            "https://images.unsplash.com/photo-1543157145-f78c636d023d?auto=format&fit=crop&w=120&q=80";
        }

        const coverNode = document.getElementById("widgetTripCover");
        const thumbNode = document.getElementById("widgetNextAttractionThumb");
        if (coverNode) coverNode.src = coverImgUrl;
        if (thumbNode) thumbNode.src = thumbImgUrl;

        if (continueBtn) {
          continueBtn.onclick = () => {
            if (modal) modal.classList.add("active");
            tabTrips.click();

            setTimeout(() => {
              const uncheckedCard = document.querySelector(
                `.premium-attraction-item-card:not(.task-completed)`,
              );
              if (uncheckedCard) {
                uncheckedCard.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                uncheckedCard.style.transform = "scale(1.025)";
                uncheckedCard.style.borderColor = "#ff9800";
                uncheckedCard.style.boxShadow =
                  "0 20px 25px -5px rgba(255,152,0,0.15)";

                let highlightPulseTrack = 0;
                const highlightPulseInterval = setInterval(() => {
                  uncheckedCard.style.backgroundColor =
                    highlightPulseTrack % 2 === 0
                      ? "rgba(255,152,0,0.06)"
                      : "#ffffff";
                  highlightPulseTrack++;
                  if (highlightPulseTrack >= 6) {
                    clearInterval(highlightPulseInterval);
                    uncheckedCard.style.transform = "none";
                    uncheckedCard.style.borderColor = "#e2e8f0";
                    uncheckedCard.style.boxShadow =
                      "0 1px 3px rgba(0,0,0,0.05)";
                    uncheckedCard.style.backgroundColor = "#ffffff";
                  }
                }, 250);
              }
            }, 400);
          };
        }
      }
    } else {
      if (widget) widget.style.display = "none";
      if (scannerBox)
        scannerBox.className = "ai-scanner-box primary-focus-scanner";
      if (contextualHeroText) {
        contextualHeroText.innerHTML = `<h1 style="color: #ffffff;">Discover Egypt Through AI</h1><p style="color: rgba(255,255,255,0.85);">Take a photo or upload an image to identify any historical landmark instantly.</p>`;
      }
    }
  } catch (err) {
    console.error("Tracker Sync Error:", err);
  }
}

document.addEventListener("change", (e) => {
  if (e.target && e.target.classList.contains("tracker-checkbox-engine")) {
    const targetCheckboxId = e.target.dataset.id;
    localStorage.setItem(targetCheckboxId, e.target.checked ? "true" : "false");

    const targetCardWrapper = document.getElementById(
      `cardWrapper_${targetCheckboxId}`,
    );
    if (targetCardWrapper) {
      if (e.target.checked) {
        targetCardWrapper.classList.add("task-completed");
      } else {
        targetCardWrapper.classList.remove("task-completed");
      }
    }
    syncGlobalTracker();
  }
});

// Window-Scoped System Component Engine Extensions
window.showCustomAlert = function (title, text) {
  const modalHtml = `
    <div class="custom-app-modal-overlay" id="customAlertModal">
      <div class="custom-app-modal-card">
        <h4><i class="fas fa-exclamation-circle" style="color:#0b4a6f;"></i> ${title}</h4>
        <p>${text}</p>
        <button class="modal-primary-btn" onclick="document.getElementById('customAlertModal').remove()">Acknowledge</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
};

window.openCustomConfirmModal = function (title, text, confirmCallback) {
  const modalId = "customConfirmModal_" + Date.now();
  const modalHtml = `
    <div class="custom-app-modal-overlay" id="${modalId}">
      <div class="custom-app-modal-card">
        <h4><i class="fas fa-exclamation-triangle" style="color:#e74c3c;"></i> ${title}</h4>
        <p>${text}</p>
        <div class="modal-actions-wrapper-row">
          <button class="modal-secondary-btn" id="cancelBtn_${modalId}">Cancel</button>
          <button class="modal-danger-btn" id="confirmBtn_${modalId}">Proceed</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  document.getElementById(`cancelBtn_${modalId}`).onclick = () =>
    document.getElementById(modalId).remove();
  document.getElementById(`confirmBtn_${modalId}`).onclick = () => {
    confirmCallback();
    document.getElementById(modalId).remove();
  };
};

window.openCustomEditModal = function (dayIdx, placeIdx) {
  const place =
    window.currentGeneratedTrip.itinerary.days[dayIdx].places[placeIdx];
  const modalId = "customEditModal";
  const modalHtml = `
    <div class="custom-app-modal-overlay" id="${modalId}">
      <div class="custom-app-modal-card">
        <h4><i class="far fa-edit" style="color:#0b4a6f;"></i> Edit Assignment Frame</h4>
        <label class="modal-form-label">Time Slot Allocation</label>
        <input type="text" id="editTimeInput" class="modal-form-input" value="${place.time || "10:00 AM"}">
        <label class="modal-form-label">Contextual Narrative Override</label>
        <textarea id="editReasonInput" class="modal-form-input" rows="3">${place.reason || ""}</textarea>
        <div class="modal-actions-wrapper-row">
          <button class="modal-secondary-btn" onclick="document.getElementById('${modalId}').remove()">Discard</button>
          <button class="modal-primary-btn" id="saveEditBtn">Apply Framework</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  document.getElementById("saveEditBtn").onclick = () => {
    const newTime = document.getElementById("editTimeInput").value;
    const newReason = document.getElementById("editReasonInput").value;
    window.currentGeneratedTrip.itinerary.days[dayIdx].places[placeIdx].time =
      newTime;
    window.currentGeneratedTrip.itinerary.days[dayIdx].places[placeIdx].reason =
      newReason;
    document.getElementById(modalId).remove();
    window.renderGeneratedItineraryInterface();
  };
};

window.openCustomSwapModal = function (dayIdx, placeIdx) {
  const currentPlace =
    window.currentGeneratedTrip.itinerary.days[dayIdx].places[placeIdx];
  const modalId = "customSwapModal";
  const alternatives = [
    {
      name: "Grand Egyptian Museum",
      thumb:
        "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?auto=format&fit=crop&w=150&q=70",
      rating: "4.9",
      reason: "Highly rated local choice substitution match.",
    },
    {
      name: "Coptic Hanging Church",
      thumb:
        "https://images.unsplash.com/photo-1543157145-f78c636d023d?auto=format&fit=crop&w=150&q=70",
      rating: "4.8",
      reason: "Historical vector track deviation alternative.",
    },
    {
      name: "Khan El-Khalili Bazaar",
      thumb:
        "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=150&q=70",
      rating: "4.7",
      reason: "Cultural market lifestyle immersion variant.",
    },
  ];

  let alternativesHtml = "";
  alternatives.forEach((alt, idx) => {
    alternativesHtml += `
      <div class="swap-alternative-option-row" id="altOption_${idx}" style="display:flex; gap:12px; padding:12px; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:10px; cursor:pointer;">
        <img src="${alt.thumb}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
        <div style="flex-grow:1; text-align:left;">
          <h5 style="margin:0 0 2px 0; color:#0b4a6f; font-size:0.95rem;">${alt.name}</h5>
          <p style="margin:0; font-size:0.78rem; color:#64748b;">${alt.reason}</p>
        </div>
        <span style="font-weight:700; color:#eab308; font-size:0.85rem; white-space:nowrap;"><i class="fas fa-star"></i> ${alt.rating}</span>
      </div>`;
  });

  const modalHtml = `
    <div class="custom-app-modal-overlay" id="${modalId}">
      <div class="custom-app-modal-card" style="max-width:480px;">
        <h4><i class="fas fa-exchange-alt" style="color:#0b4a6f;"></i> Swap Attraction Vector</h4>
        <p style="font-size:0.85rem; color:#64748b; margin-bottom:16px;">Select an alternative attraction pipeline to switch instantly:</p>
        <div class="alternatives-scroll-container" style="max-height:260px; overflow-y:auto;">
          ${alternativesHtml}
        </div>
        <button class="modal-secondary-btn" style="width:100%; margin-top:12px;" onclick="document.getElementById('${modalId}').remove()">Cancel</button>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  alternatives.forEach((alt, idx) => {
    document.getElementById(`altOption_${idx}`).onclick = () => {
      window.currentGeneratedTrip.itinerary.days[dayIdx].places[placeIdx] = {
        ...currentPlace,
        name: alt.name,
        reason: alt.reason,
        price_range: currentPlace.price_range,
      };
      document.getElementById(modalId).remove();
      window.renderGeneratedItineraryInterface();
    };
  });
};

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

    if (trips.length === 0) {
      container.innerHTML = `<p class="empty-state-text">No customized routes saved yet. Initialize one in the planner view!</p>`;
      return;
    }

    [...trips].reverse().forEach((trip) => {
      let totalActivitiesCount = 0;
      let completedActivitiesCount = 0;
      let accordionDaysHtml = "";

      if (trip.itinerary && trip.itinerary.days) {
        trip.itinerary.days.forEach((dayObj, dayIndex) => {
          let dayActivitiesCount = dayObj.places.length;
          totalActivitiesCount += dayActivitiesCount;
          let chronologicalSlots = { morning: [], afternoon: [], evening: [] };

          dayObj.places.forEach((place, placeIndex) => {
            const uniqueActivityId = `chk_${trip.tripId}_d${dayObj.day}_p${placeIndex}`;
            const isCompleted =
              localStorage.getItem(uniqueActivityId) === "true";
            if (isCompleted) completedActivitiesCount++;

            let curatedThumbnail =
              "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=250&q=70";
            const textQuery = (place.name || "").toLowerCase();
            if (textQuery.includes("pyramid"))
              curatedThumbnail =
                "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=250&q=70";
            else if (textQuery.includes("museum"))
              curatedThumbnail =
                "https://images.unsplash.com/photo-1601581875309-fafbf2d3ed3a?auto=format&fit=crop&w=250&q=70";
            else if (textQuery.includes("temple"))
              curatedThumbnail =
                "https://images.unsplash.com/photo-1543157145-f78c636d023d?auto=format&fit=crop&w=250&q=70";

            const textString = (place.time || "").toUpperCase();
            let assignedPeriod = "afternoon";
            if (textString.includes("AM") || placeIndex === 0)
              assignedPeriod = "morning";
            else if (
              textString.includes("PM") &&
              (textString.includes("6:") || textString.includes("7:"))
            )
              assignedPeriod = "evening";

            const singleCardMarkup = `
              <div class="premium-attraction-item-card static-tracker-card-view ${isCompleted ? "task-completed" : ""}" id="cardWrapper_${uniqueActivityId}">
                <div class="task-checkbox-wrapper-premium">
                  <input type="checkbox" class="modern-circular-checkbox tracker-checkbox-engine" data-id="${uniqueActivityId}" data-tripid="${trip.tripId}" ${isCompleted ? "checked" : ""}>
                </div>
                <div class="attraction-thumbnail-frame"><img src="${curatedThumbnail}" alt="Thumbnail" loading="lazy"></div>
                <div class="attraction-details-frame">
                  <h5>${place.name || "Destination Landmark"}</h5>
                  <p class="attraction-short-narrative">${place.reason || "Optimized structural route checkpoint activity."}</p>
                  <span class="tracker-time-pill-micro"><i class="far fa-clock"></i> ${place.time || "Scheduled Slot"}</span>
                </div>
              </div>`;
            chronologicalSlots[assignedPeriod].push(singleCardMarkup);
          });

          let timelineBlocksContent = "";
          if (chronologicalSlots.morning.length > 0)
            timelineBlocksContent += `<div class="chronological-timeline-slot"><div class="timeline-slot-anchor-title"><i class="fas fa-sun"></i> Morning</div><div>${chronologicalSlots.morning.join("")}</div></div>`;
          if (chronologicalSlots.afternoon.length > 0)
            timelineBlocksContent += `<div class="chronological-timeline-slot"><div class="timeline-slot-anchor-title"><i class="fas fa-cloud-sun"></i> Afternoon</div><div>${chronologicalSlots.afternoon.join("")}</div></div>`;
          if (chronologicalSlots.evening.length > 0)
            timelineBlocksContent += `<div class="chronological-timeline-slot"><div class="timeline-slot-anchor-title"><i class="fas fa-moon"></i> Evening</div><div>${chronologicalSlots.evening.join("")}</div></div>`;

          accordionDaysHtml += `
            <div class="day-accordion-card ${dayIndex === 0 ? "expanded" : ""}" id="accordionDay_${trip.tripId}_d${dayObj.day}">
              <div class="day-accordion-header" onclick="window.togglePremiumAccordion('accordionDay_${trip.tripId}_d${dayObj.day}')">
                <h4 class="day-title-txt"><i class="fas fa-calendar-day"></i> Day ${dayObj.day} — ${dayObj.city || "Destination"}</h4>
                <i class="fas fa-chevron-down accordion-chevron-icon"></i>
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

      finalHtml += `
        <div class="trip-operational-grand-card-simplified">
          <div class="tracker-dashboard-header-analytics-travel">
            <div class="travel-analytic-meta">
              <span class="travel-headline-lbl">Adventure Progress</span>
              <h4>${trip.cities.join(" & ")} Journey</h4>
              <p class="travel-sub-text-lbl">${completedActivitiesCount} stops completed • ${totalActivitiesCount - completedActivitiesCount} remaining checkpoints</p>
            </div>
            <div class="travel-progress-ring-box">
              <span class="travel-percentage-large">${activeProgressPercentage}%</span>
              <span class="travel-percentage-subtext">curated milestones</span>
            </div>
          </div>
          <div class="itinerary-display-column-clean">${accordionDaysHtml}</div>
        </div>`;
    });
    container.innerHTML = finalHtml;
  } catch (error) {
    console.error("Tracker Load Error:", error);
  }
}

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

// ==========================================
// 9. ITINERARY MATRIX ENGINE DECK
// ==========================================
if (generateBtn) {
  generateBtn.addEventListener("click", () => {
    if (selectedCities.length === 0) {
      window.showCustomAlert(
        "Destination Missing",
        "Please select at least one target city to initialize travel matrix pathways.",
      );
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

    const budgetTier = document.getElementById("plannerBudgetTier")
      ? document.getElementById("plannerBudgetTier").value
      : "Moderate";

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
            budgetLimit: budgetTier,
          }),
        });
        const data = await response.json();
        clearInterval(interval);
        if (tripLoading) tripLoading.style.display = "none";

        const itinerary = data?.data?.itinerary;
        if (!itinerary || !itinerary.days) return;

        document.getElementById("plannerInputsForm").style.display = "none";

        const summaryDestinations = document.getElementById(
          "summaryLabelDestinations",
        );
        if (summaryDestinations)
          summaryDestinations.textContent = selectedCities.join(", ");

        const summaryDuration = document.getElementById("summaryLabelDuration");
        if (summaryDuration)
          summaryDuration.textContent = `${tripDaysInput ? tripDaysInput.value : 3} Days Scheduled`;

        const summaryInterests = document.getElementById(
          "summaryLabelInterests",
        );
        if (summaryInterests) {
          summaryInterests.textContent =
            selectedInterests.length > 0
              ? selectedInterests.join(", ")
              : "General Historical Exploration Focus";
        }

        const summaryWidgetElement = document.getElementById(
          "compactTripSummaryWidget",
        );
        if (summaryWidgetElement) {
          summaryWidgetElement.style.display = "flex";
          summaryWidgetElement.style.flexWrap = "wrap";
          summaryWidgetElement.style.gap = "12px";
          summaryWidgetElement.style.padding = "16px";
          summaryWidgetElement.style.background = "#f8fafc";
          summaryWidgetElement.style.borderRadius = "12px";
          summaryWidgetElement.style.border = "1px solid #e2e8f0";
        }

        document.getElementById("editPreferencesBtn").onclick = function () {
          if (summaryWidgetElement) summaryWidgetElement.style.display = "none";
          document.getElementById("plannerInputsForm").style.display = "block";
          setDefaultItineraryPlaceholder();
        };

        let totalTripEstimatedCost = 0;
        let totalActivitiesGenerated = 0;

        itinerary.days.forEach((dayObj) => {
          totalActivitiesGenerated += dayObj.places.length;
          dayObj.places.forEach((place) => {
            let entryFee = 150;
            if (place.price_range) {
              const numericMatch = place.price_range.match(/\d+/);
              if (numericMatch) entryFee = parseInt(numericMatch[0], 10);
            }
            totalTripEstimatedCost += entryFee;
          });
        });

        window.currentGeneratedTrip = {
          itinerary: itinerary,
          cities: selectedCities,
          days: tripDaysInput ? parseInt(tripDaysInput.value) : 3,
          totalCost: totalTripEstimatedCost,
          totalStops: totalActivitiesGenerated,
          budgetTier: budgetTier,
        };

        window.renderGeneratedItineraryInterface = function () {
          let accordionDaysHtml = "";
          let calculatedCostAccumulator = 0;
          let calculatedStopsAccumulator = 0;

          window.currentGeneratedTrip.itinerary.days.forEach((dayObj) => {
            if (dayObj && dayObj.places) {
              calculatedStopsAccumulator += dayObj.places.length;
            }
          });

          window.currentGeneratedTrip.itinerary.days.forEach((dayObj) => {
            if (!dayObj || !dayObj.places) return;
            dayObj.places.forEach((place) => {
              let entryFee = 150;
              if (place.price_range) {
                const numericMatch = place.price_range.match(/\d+/);
                if (numericMatch) entryFee = parseInt(numericMatch[0], 10);
              }
              calculatedCostAccumulator += entryFee;
            });
          });

          const getCityCoverImg = (cities) => {
            const primaryCity =
              cities && cities[0] ? cities[0].toLowerCase() : "";
            if (primaryCity.includes("cairo"))
              return "https://images.unsplash.com/photo-1572252017456-29bf24beefdf?auto=format&fit=crop&w=800&q=70";
            if (primaryCity.includes("giza"))
              return "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=800&q=70";
            if (primaryCity.includes("luxor"))
              return "https://images.unsplash.com/photo-1543157145-f78c636d023d?auto=format&fit=crop&w=800&q=70";
            if (primaryCity.includes("aswan"))
              return "https://images.unsplash.com/photo-1599933310672-0402f1a6fbfb?auto=format&fit=crop&w=800&q=70";
            if (primaryCity.includes("alexandria"))
              return "https://images.unsplash.com/photo-1568322422998-8432ef2e6c43?auto=format&fit=crop&w=800&q=70";
            return "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=800&q=70";
          };

          const destinationBannerUrl = getCityCoverImg(
            window.currentGeneratedTrip.cities,
          );

          window.currentGeneratedTrip.itinerary.days.forEach(
            (dayObj, dayIndex) => {
              if (!dayObj || !dayObj.places) return;
              let dayEstimatedCost = 0;
              let dayActivitiesCount = dayObj.places.length;
              let chronologicalSlots = {
                morning: [],
                afternoon: [],
                evening: [],
              };

              dayObj.places.forEach((place, placeIndex) => {
                let dayEntryFee = 150;
                if (place.price_range) {
                  const numericMatch = place.price_range.match(/\d+/);
                  if (numericMatch) dayEntryFee = parseInt(numericMatch[0], 10);
                }
                dayEstimatedCost += dayEntryFee;

                let curatedThumbnail =
                  "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=350&q=70";
                const textQuery = (place.name || "").toLowerCase();
                let resolvedCategoryTag = "Historic Landmark";

                if (
                  textQuery.includes("pyramid") ||
                  textQuery.includes("giza")
                ) {
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
                const completeCheckedAttr = place.isCompleted ? "checked" : "";
                const completedCardClass = place.isCompleted
                  ? "task-completed"
                  : "";

                const singleCardMarkup = `
                <div class="premium-attraction-item-card generation-mode-card ${completedCardClass}">
                  <div class="task-checkbox-wrapper-premium">
                    <input type="checkbox" class="modern-circular-checkbox planner-checkbox-engine" data-dayidx="${dayIndex}" data-placeidx="${placeIndex}" ${completeCheckedAttr}>
                  </div>
                  <div class="attraction-thumbnail-frame"><img src="${curatedThumbnail}" alt="Preview" loading="lazy"></div>
                  <div class="attraction-details-frame">
                    <div class="attraction-card-header-flex-wrapper">
                      <div class="attraction-headline-block">
                        <h5>${place.name || "Destination Landmark"}</h5>
                        <div class="badge-ratings-row-luxury">
                          <span class="rating-stars-luxury"><i class="fas fa-star"></i> 4.9</span>
                          <span class="must-visit-badge"><i class="fas fa-award"></i> Must Visit</span>
                        </div>
                      </div>
                      <span class="category-badge-pill">${resolvedCategoryTag}</span>
                    </div>
                    <p class="attraction-short-narrative">${cleanNarrative}</p>
                    <div class="attraction-meta-grid-specs">
                      <span><i class="far fa-clock"></i> ${place.time || "09:00 AM"}</span>
                      <span><i class="fas fa-ticket-alt"></i> ${place.price_range || "Moderate"}</span>
                    </div>
                  </div>
                  <div class="attraction-action-rail-buttons">
                    <button class="action-icon-pill-btn swap-variant" data-dayidx="${dayIndex}" data-placeidx="${placeIndex}"><i class="fas fa-exchange-alt"></i> Swap</button>
                    <button class="action-icon-pill-btn edit-variant" data-dayidx="${dayIndex}" data-placeidx="${placeIndex}"><i class="far fa-edit"></i> Edit</button>
                    <button class="action-icon-pill-btn delete-variant" data-dayidx="${dayIndex}" data-placeidx="${placeIndex}"><i class="far fa-trash-alt"></i></button>
                  </div>
                </div>`;
                chronologicalSlots[assignedPeriod].push(singleCardMarkup);
              });

              let timelineBlocksContent = "";
              if (chronologicalSlots.morning.length > 0)
                timelineBlocksContent += `<div class="chronological-timeline-slot"><div class="timeline-slot-anchor-title"><i class="fas fa-sun"></i> Morning Exploration</div><div class="timeline-cards-stack-wrapper">${chronologicalSlots.morning.join("")}</div></div>`;
              if (chronologicalSlots.afternoon.length > 0)
                timelineBlocksContent += `<div class="chronological-timeline-slot"><div class="timeline-slot-anchor-title"><i class="fas fa-cloud-sun"></i> Afternoon High Tracks</div><div class="timeline-cards-stack-wrapper">${chronologicalSlots.afternoon.join("")}</div></div>`;
              if (chronologicalSlots.evening.length > 0)
                timelineBlocksContent += `<div class="chronological-timeline-slot"><div class="timeline-slot-anchor-title"><i class="fas fa-moon"></i> Evening Leisure Paths</div><div class="timeline-cards-stack-wrapper">${chronologicalSlots.evening.join("")}</div></div>`;

              const uniqueAccordionIdentifier = `generationAccordionDay_d${dayObj.day}`;
              accordionDaysHtml += `
              <div class="day-accordion-card expanded" id="${uniqueAccordionIdentifier}">
                <div class="day-accordion-header" onclick="window.togglePremiumAccordion('${uniqueAccordionIdentifier}')">
                  <div class="day-header-left-pane">
                    <h4 class="day-title-txt">Day ${dayObj.day} — ${dayObj.city || "Regional Center"}</h4>
                    <div class="day-header-premium-meta-metrics">
                      <span class="day-metric-badge"><i class="fas fa-map-marked-alt"></i> ${dayActivitiesCount} Activities</span>
                      <span class="day-metric-badge"><i class="fas fa-wallet"></i> ${dayEstimatedCost} EGP</span>
                    </div>
                  </div>
                  <div class="accordion-toggle-chevron"><i class="fas fa-chevron-down"></i></div>
                </div>
                <div class="day-accordion-body-wrapper">
                  <div class="day-accordion-content-inner">${timelineBlocksContent}</div>
                </div>
              </div>`;
            },
          );

          const regionTitle = window.currentGeneratedTrip.cities.join(" & ");

          document.getElementById("tripResult").innerHTML = `
            <div class="generated-premium-itinerary-wrapper" style="animation: modalFadeInPref 0.4s ease-out;">
              <div style="background: #e6f4ea; border: 1px solid #34a853; border-radius: 12px; padding: 14px 20px; color: #137333; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                <i class="fas fa-check-circle" style="font-size: 1.2rem;"></i>
                <span>✓ Itinerary Generated Successfully! Your bespoke ${regionTitle} expedition roadmap is unlocked and ready for launch.</span>
              </div>

              <div class="luxury-adventure-storycard" style="max-width: 100% !important; margin: 0 0 25px 0 !important; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
                <div class="storycard-banner-wrapper" style="height: 180px;">
                  <img src="${destinationBannerUrl}" alt="Destination Cover" class="storycard-hero-img" style="filter: brightness(0.85);" />
                  <div class="storycard-gradient-shield"></div>
                  <div class="storycard-status-pill" style="background: #ff9800; color: white; border-color: #ff9800;">
                    <i class="fas fa-sparkles"></i> AI CURATED MAP READY
                  </div>
                </div>

                <div class="storycard-narrative-container" style="margin-top: -25px; padding: 0 24px 24px 24px;">
                  <div class="storycard-top-flexrow" style="align-items: flex-start; margin-bottom: 15px;">
                    <div class="storycard-route-info">
                      <h3 style="font-size: 1.8rem; margin-bottom: 4px;">${regionTitle} Expedition</h3>
                      <div class="storycard-next-destination-block" style="background: transparent; border: none; padding: 0;">
                        <p style="color: #64748b; font-size: 0.95rem;"><i class="fas fa-calendar-alt"></i> Plan Status: Review & Accept Journey Framework</p>
                      </div>
                    </div>
                  </div>

                  <div class="storycard-metrics-strip" style="grid-template-columns: repeat(3, 1fr) !important; background: #f8fafc; padding: 16px;">
                    <div class="metric-block-item">
                      <i class="fas fa-history"></i>
                      <div class="metric-text-label-combo">
                        <span>${window.currentGeneratedTrip.days} Days</span><label>Duration</label>
                      </div>
                    </div>
                    <div class="metric-block-item">
                      <i class="fas fa-map-signs"></i>
                      <div class="metric-text-label-combo">
                        <span>${calculatedStopsAccumulator} Stops</span><label>Attractions</label>
                      </div>
                    </div>
                    <div class="metric-block-item">
                      <i class="fas fa-wallet"></i>
                      <div class="metric-text-label-combo">
                        <span>${calculatedCostAccumulator} EGP</span><label>Est. Budget</label>
                      </div>
                    </div>
                  </div>

                  <div style="display: flex; gap: 12px; align-items: center; justify-content: flex-end; flex-wrap: wrap; margin-top: 20px;">
                    <button id="editPreferencesBtnInline" class="action-icon-pill-btn" style="height: 46px; border-radius: 12px; font-weight: 600; padding: 0 20px;"><i class="fas fa-sliders-h"></i> Edit Preferences</button>
                    <button id="saveAiTripBtn" class="save-plan-primary-cta" style="height: 46px; border-radius: 12px; font-size: 0.95rem; padding: 0 26px; display: inline-flex; align-items: center; gap: 8px;"><i class="fas fa-bookmark"></i> Accept Itinerary & Start Journey</button>
                  </div>
                </div>
              </div>

              <div style="margin-bottom: 15px; text-align: left;"><h4 style="color: #0b4a6f; font-weight: 700; font-size: 1.1rem; text-transform: uppercase; letter-spacing: 0.5px;"><i class="fas fa-stream"></i> Route Timeline Breakdown</h4></div>
              <div class="itinerary-display-column">
                ${accordionDaysHtml}
              </div>
            </div>`;

          const editInlineBtn = document.getElementById(
            "editPreferencesBtnInline",
          );
          if (editInlineBtn) {
            editInlineBtn.onclick = () => {
              const summaryWidgetElement = document.getElementById(
                "compactTripSummaryWidget",
              );
              if (summaryWidgetElement)
                summaryWidgetElement.style.display = "none";
              document.getElementById("plannerInputsForm").style.display =
                "block";
              setDefaultItineraryPlaceholder();
            };
          }

          document.getElementById("saveAiTripBtn").onclick = async () => {
            const userId = localStorage.getItem("userId");
            if (!userId) {
              window.showCustomAlert(
                "Authentication Required",
                "Please sign in to save itineraries.",
              );
              return;
            }
            try {
              await fetch(`${API_BASE_URL}/user/save-trip`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId,
                  itinerary: window.currentGeneratedTrip.itinerary,
                  cities: window.currentGeneratedTrip.cities,
                  days: window.currentGeneratedTrip.days,
                }),
              });
              window.showPremiumToast(
                "Expedition Saved!",
                "Your adventure path has been successfully synced to the Live Dashboard.",
                true,
              );
              syncGlobalTracker();
              document.getElementById("tabMyTrips").click();
            } catch (err) {
              console.error(err);
            }
          };

          document
            .querySelectorAll(".planner-checkbox-engine")
            .forEach((box) => {
              box.onchange = (e) => {
                const dayIdx = parseInt(e.target.dataset.dayidx, 10);
                const placeIdx = parseInt(e.target.dataset.placeidx, 10);
                window.currentGeneratedTrip.itinerary.days[dayIdx].places[
                  placeIdx
                ].isCompleted = e.target.checked;
                window.renderGeneratedItineraryInterface();
              };
            });

          document.querySelectorAll(".swap-variant").forEach((btn) => {
            btn.onclick = (e) => {
              const target = e.target.closest(".swap-variant");
              const dayIdx = parseInt(target.dataset.dayidx, 10);
              const placeIdx = parseInt(target.dataset.placeidx, 10);
              window.openCustomSwapModal(dayIdx, placeIdx);
            };
          });

          document.querySelectorAll(".edit-variant").forEach((btn) => {
            btn.onclick = (e) => {
              const target = e.target.closest(".edit-variant");
              const dayIdx = parseInt(target.dataset.dayidx, 10);
              const placeIdx = parseInt(target.dataset.placeidx, 10);
              window.openCustomEditModal(dayIdx, placeIdx);
            };
          });

          document.querySelectorAll(".delete-variant").forEach((btn) => {
            btn.onclick = (e) => {
              const target = e.target.closest(".delete-variant");
              const dayIdx = parseInt(target.dataset.dayidx, 10);
              const placeIdx = parseInt(target.dataset.placeidx, 10);
              window.openCustomConfirmModal(
                "Delete Attraction",
                "Are you sure you want to drop this attraction from your roadmap?",
                () => {
                  window.currentGeneratedTrip.itinerary.days[
                    dayIdx
                  ].places.splice(placeIdx, 1);
                  if (
                    window.currentGeneratedTrip.itinerary.days[dayIdx].places
                      .length === 0
                  ) {
                    window.currentGeneratedTrip.itinerary.days.splice(
                      dayIdx,
                      1,
                    );
                  }
                  window.renderGeneratedItineraryInterface();
                },
              );
            };
          });
        };

        window.renderGeneratedItineraryInterface();
      } catch (error) {
        console.error(error);
        if (tripLoading) tripLoading.style.display = "none";
      }
    }, 2000);
  });
}
