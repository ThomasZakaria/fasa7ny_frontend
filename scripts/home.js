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
      `
      <div class="card place-card ${isHiddenClass}" data-placeid="${currentPlaceId}" style="cursor: pointer;">
        <img 
          src="${optimizedMainUrl}" 
          alt="${name}" 
          loading="lazy" 
          onerror="this.onerror=null; this.src='${originalMainUrl}';"
        >
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
    mapBtn.href = `https://www.google.com/maps/search/?api=1&query=${cleanCoords}`;
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
    if (typeof loadPlaceRecommendations === "function")
      loadPlaceRecommendations(idStr);
  }

  placeModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

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

// ==========================================
// 4. BUTTON ACTIONS (Save & Review)
// ==========================================

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
        user.saved_places.push({
          id: extractedId,
        });
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

document.addEventListener("DOMContentLoaded", () => {
  const calcModal = document.getElementById("calc-modal");
  const openCalcBtn = document.getElementById("open-calc-btn");
  const closeCalcBtn = document.getElementById("close-calc-modal");
  const aiBudgetBtn = document.getElementById("ai-budget-btn");

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

  async function fetchAIRecommendations(placeObj) {
    const costInputs = [inputs.accommodation, inputs.food, inputs.transport];
    costInputs.forEach((input) => {
      if (input) input.style.opacity = "0.5";
    });

    if (aiBudgetBtn) {
      aiBudgetBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> جاري الحساب...';
      aiBudgetBtn.style.background = "#e68a00";
      aiBudgetBtn.disabled = true;
    }

    try {
      const placeDataToSend = {
        placeName:
          placeObj["Landmark Name (English)"] ||
          placeObj.name ||
          "Giza Pyramids",
        location: placeObj["Location"] || "Egypt",
        category: placeObj["category"] || "Tourist Attraction",
        description: placeObj["Short History Summary"] || "",
      };

      const response = await fetch(`${API_BASE_URL}/ai/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(placeDataToSend),
      });

      const result = await response.json();

      if (result.status === "success" && result.data) {
        const currentRate = exchangeRates[currencySelect.value] || 1;

        if (inputs.accommodation)
          inputs.accommodation.value = Math.round(
            (result.data.accommodation || 1500) * currentRate,
          );
        if (inputs.food)
          inputs.food.value = Math.round(
            (result.data.food || 600) * currentRate,
          );
        if (inputs.transport)
          inputs.transport.value = Math.round(
            (result.data.transport || 300) * currentRate,
          );
      }
    } catch (error) {
      console.error("Failed to fetch smart defaults", error);
    } finally {
      costInputs.forEach((input) => {
        if (input) input.style.opacity = "1";
      });
      if (aiBudgetBtn) {
        aiBudgetBtn.innerHTML =
          '<i class="fas fa-magic"></i> اقترح ميزانية بالذكاء الاصطناعي';
        aiBudgetBtn.style.background = "#ff9800";
        aiBudgetBtn.disabled = false;
      }
      window.triggerTripCalculation();
    }
  }

  if (aiBudgetBtn) {
    aiBudgetBtn.addEventListener("click", () => {
      fetchAIRecommendations(window.currentModalPlace || {});
    });
  }

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

  window.addEventListener("click", (e) => {
    if (e.target === calcModal) calcModal.classList.remove("active");
  });

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
      input.addEventListener("blur", (e) => {
        let val = parseInt(e.target.value, 10);
        e.target.value = isNaN(val) || val < 0 ? "" : val;
        window.triggerTripCalculation();
      });
    }
  });

  if (currencySelect) {
    currencySelect.addEventListener("change", (e) => {
      const newCurrency = e.target.value;
      const oldRate = exchangeRates[previousCurrency];
      const newRate = exchangeRates[newCurrency];

      const convertField = (input) => {
        let val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
          let baseEGP = val / oldRate;
          let newVal = baseEGP * newRate;
          input.value = Math.round(newVal);
        }
      };

      convertField(inputs.transport);
      convertField(inputs.accommodation);
      convertField(inputs.food);

      previousCurrency = newCurrency;
      window.triggerTripCalculation();
    });
  }
});

// ==========================================
// 5. INITIALIZATION & CORE FEATURES
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
      if (placeModal) placeModal.classList.remove("active");
      document.body.style.overflow = "auto";
    };
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
        if (data.data.details) {
          openPlaceModal(data.data.details);
        } else if (data.data.prediction) {
          alert(
            `AI identified this as: ${data.data.prediction}\nBut full details are not in our database yet.`,
          );
        } else {
          alert(
            "AI couldn't identify this landmark clearly. Try another angle!",
          );
        }
      } else {
        alert("Error analyzing image: " + (data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("AI Scan Error:", err);
      alert("Make sure both Node.js and Python servers are running!");
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
          renderCards(d.data.places, container, true);

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

document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openTripPlannerBtn");
  const modal = document.getElementById("tripPlannerModal");
  const closeBtn = document.getElementById("closeTripPlannerBtn");

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      modal.classList.add("active");
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.remove("active");
    });
  }
});

let selectedCities = [];
let selectedInterests = [];

document.addEventListener("click", (e) => {
  const cityChip = e.target.closest(".city-chip:not(.interest-chip)");
  if (cityChip) {
    const city = cityChip.dataset.city;
    cityChip.classList.toggle("active");

    if (selectedCities.includes(city)) {
      selectedCities = selectedCities.filter((c) => c !== city);
    } else {
      selectedCities.push(city);
    }
    console.log("Selected Cities:", selectedCities);
  }

  const interestChip = e.target.closest(".interest-chip");
  if (interestChip) {
    const interest = interestChip.dataset.interest;
    interestChip.classList.toggle("active");

    if (selectedInterests.includes(interest)) {
      selectedInterests = selectedInterests.filter((i) => i !== interest);
    } else {
      selectedInterests.push(interest);
    }
    console.log("Selected Interests:", selectedInterests);
  }
});

const generateBtn = document.getElementById("generateTripBtn");
const tripLoading = document.getElementById("tripLoading");
const loadingMessage = document.getElementById("loadingMessage");

const loadingMessages = [
  "Analyzing destinations...",
  "Finding top attractions...",
  "Optimizing travel route...",
  "Calculating visit times...",
  "Building itinerary...",
  "Finalizing your trip...",
];

if (generateBtn) {
  generateBtn.addEventListener("click", () => {
    if (selectedCities.length === 0) {
      alert("Please select at least one city");
      return;
    }

    tripLoading.style.display = "block";
    document.getElementById("tripResult").innerHTML = "";

    let index = 0;
    const interval = setInterval(() => {
      loadingMessage.textContent = loadingMessages[index];
      index++;
      if (index >= loadingMessages.length) {
        index = 0;
      }
    }, 1000);

    setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/trip-planner`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cities: selectedCities,
            days: tripDays ? tripDays.value : 3,
            interests: selectedInterests,
            manualSelection: window.tripCart || [],
          }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        clearInterval(interval);
        tripLoading.style.display = "none";

        console.log("Trip Planner Response:", data);

        const itinerary = data?.data?.itinerary;

        if (!itinerary || !itinerary.days) {
          document.getElementById("tripResult").innerHTML = `
            <div class="trip-card error-card">
              ⚠️ Could not generate itinerary.
            </div>
          `;
          return;
        }

        let html = `
  <div id="myTripsList">
    <h3>✨ Your Egypt Adventure</h3>
`;

        itinerary.days.forEach((dayObj) => {
          html += `
    <div class="day-card">
      <h4>Day ${dayObj.day} - ${dayObj.city}</h4>
      <ul>
  `;

          dayObj.places.forEach((place) => {
            html += `
      <li style="margin-bottom:12px;">
        <strong>${place.name}</strong><br>
        ${place.time ? `<small>🕒 ${place.time}</small><br>` : ""}
        ${place.reason ? `<small>${place.reason}</small><br>` : ""}
        ${
          place.price_range
            ? `<span style="color:#e67e22;font-weight:bold;">
                💰 ${place.price_range}
              </span>`
            : ""
        }
      </li>
    `;
          });

          html += `
      </ul>
    </div>
  `;
        });

        html += `
  <button id="saveAiTripBtn"
          class="primary-btn"
          style="margin-top:20px;width:100%;">
      💾 Save Trip
  </button>
</div>
`;

        document.getElementById("tripResult").innerHTML = html;
        const saveBtn = document.getElementById("saveAiTripBtn");

        if (saveBtn) {
          saveBtn.addEventListener("click", async () => {
            const userId = localStorage.getItem("userId");

            if (!userId) {
              alert("Please login first");
              return;
            }

            try {
              const response = await fetch(`${API_BASE_URL}/user/save-trip`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  userId,
                  itinerary,
                  cities: selectedCities,
                  days: tripDays.value,
                }),
              });

              const result = await response.json();

              if (result.status === "success") {
                alert("Trip saved successfully!");
              }
            } catch (err) {
              console.error(err);
              alert("Failed to save trip");
            }
          });
        }
      } catch (error) {
        clearInterval(interval);
        tripLoading.style.display = "none";

        document.getElementById("tripResult").innerHTML = `
          <div class="trip-card error-card">
            ⚠️ Failed to connect to AI.
          </div>
        `;

        console.error(error);
      }
    }, 2000);
  });
}

const tripDays = document.getElementById("tripDays");
const daysDisplay = document.querySelector(".days-display");

if (tripDays && daysDisplay) {
  tripDays.addEventListener("input", () => {
    daysDisplay.textContent = `${tripDays.value} Days`;
  });
}

// ==========================================
// 9. PROGRESS TRACKER & TABS LOGIC
// ==========================================
const tabCreate = document.getElementById("tabCreateTrip");
const tabTrips = document.getElementById("tabMyTrips");
const plannerCont = document.getElementById("plannerContainer");
const trackerCont = document.getElementById("trackerContainer");

if (tabCreate && tabTrips) {
  tabCreate.addEventListener("click", () => {
    tabCreate.classList.add("active");
    tabCreate.style.background = "#fff";
    tabCreate.style.color = "#0b4a6f";
    tabCreate.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";

    tabTrips.classList.remove("active");
    tabTrips.style.background = "transparent";
    tabTrips.style.color = "#666";
    tabTrips.style.boxShadow = "none";

    if (plannerCont) plannerCont.style.display = "block";
    if (trackerCont) trackerCont.style.display = "none";
  });

  tabTrips.addEventListener("click", () => {
    tabTrips.classList.add("active");
    tabTrips.style.background = "#fff";
    tabTrips.style.color = "#0b4a6f";
    tabTrips.style.boxShadow = "0 2px 5px rgba(0,0,0,0.05)";

    tabCreate.classList.remove("active");
    tabCreate.style.background = "transparent";
    tabCreate.style.color = "#666";
    tabCreate.style.boxShadow = "none";

    if (plannerCont) plannerCont.style.display = "none";
    if (trackerCont) trackerCont.style.display = "block";

    loadMyTripsTracker();
  });
}

async function loadMyTripsTracker() {
  const userId = localStorage.getItem("userId");
  const container = document.getElementById("myTripsList");

  if (!container) return;

  if (!userId) {
    container.innerHTML = `<div class="error-card" style="text-align:center; padding:20px; color:#e74c3c; background:#fdf0ed; border-radius:12px;">Please sign in to track your trips.</div>`;
    return;
  }

  container.innerHTML = `<div class="spinner"></div><p style="text-align:center; margin-top:10px; color:#666;">Syncing your adventures...</p>`;

  try {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`);
    const data = await res.json();
    const trips = data.data.user.saved_trips || [];

    if (trips.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 30px; color:#666;"><i class="fas fa-suitcase-rolling" style="font-size:3rem; margin-bottom:15px; color:#ddd;"></i><br>You haven't saved any trips yet.<br>Go to "Plan New Trip" to create one!</div>`;
      return;
    }

    let html = "";

    trips.reverse().forEach((trip) => {
      let totalPlaces = 0;
      let completedPlaces = 0;
      let tasksHtml = "";

      if (trip.itinerary && trip.itinerary.days) {
        trip.itinerary.days.forEach((day) => {
          tasksHtml += `<h5 style="margin: 15px 0 8px 0; color:#0b4a6f; border-bottom: 2px dashed #eee; padding-bottom: 5px; font-size:1.1rem;">📅 Day ${day.day} - ${day.city}</h5>`;

          day.places.forEach((place, pIndex) => {
            totalPlaces++;
            const placeName =
              typeof place === "string" ? place : place.name || "Attraction";
            const uniqueId = `chk_${trip.tripId}_d${day.day}_p${pIndex}`;

            const isChecked = localStorage.getItem(uniqueId) === "true";
            if (isChecked) completedPlaces++;

            tasksHtml += `
              <div class="place-task ${isChecked ? "completed" : ""}" id="taskDiv_${uniqueId}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: ${isChecked ? "#f0fdf4" : "#f9f9f9"}; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid ${isChecked ? "#27ae60" : "#ccc"}; transition: all 0.3s ease; flex-wrap: wrap; gap: 10px;">
                <label style="display:flex; align-items:center; gap:12px; cursor:pointer; flex:1; min-width: 200px;">
                  <input type="checkbox" class="trip-checkbox" data-id="${uniqueId}" ${isChecked ? "checked" : ""} style="width:20px; height:20px; accent-color:#27ae60; cursor:pointer;">
                  <span class="task-text" style="font-weight:bold; font-size:1rem; color:${isChecked ? "#888" : "#2c3e50"}; text-decoration:${isChecked ? "line-through" : "none"}; transition: 0.3s;">${placeName}</span>
                </label>
                <div class="task-actions" style="display:flex; gap:8px;">
                  <button onclick="alert('🔄 AI Swap feature is planned for V2! This will use the Recommendation AI to replace this spot.')" style="border:none; background:#e0f2fe; color:#0284c7; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.8rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);"><i class="fas fa-exchange-alt"></i> Swap</button>
                  <button onclick="alert('✏️ Manual Edit feature coming soon!')" style="border:none; background:#fef08a; color:#c2410c; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.8rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);"><i class="fas fa-edit"></i> Edit</button>
                </div>
              </div>
            `;
          });
        });
      }

      const progressPercent =
        totalPlaces === 0
          ? 0
          : Math.round((completedPlaces / totalPlaces) * 100);

      html += `
        <div class="day-card" style="margin-bottom:25px; border: 1px solid #f0f0f0; border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); background:#fff;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 style="margin:0; color:#e67e22; font-size:1.2rem;">🌍 Trip to ${trip.cities.join(", ")}</h4>
            <span class="day-badge" id="badge_${trip.tripId}" style="background:linear-gradient(90deg, #27ae60, #2ecc71); color:white; padding:5px 12px; border-radius:20px; font-weight:bold; font-size:1rem; transition: 0.4s;">${progressPercent}%</span>
          </div>
          
          <div class="progress-container" style="width: 100%; height: 12px; background: #eee; border-radius: 10px; margin-top: 15px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
            <div class="progress-fill" id="progBar_${trip.tripId}" style="height: 100%; background: linear-gradient(90deg, #27ae60, #2ecc71); width: ${progressPercent}%; transition: width 0.5s ease-in-out;"></div>
          </div>
          
          <div style="margin-top: 20px; max-height: 400px; overflow-y: auto; padding-right: 5px;">
            ${tasksHtml}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    document.querySelectorAll(".trip-checkbox").forEach((chk) => {
      chk.addEventListener("change", (e) => {
        const id = e.target.dataset.id;
        const taskDiv = document.getElementById(`taskDiv_${id}`);
        const tripId = id.split("_")[1];
        const taskText = taskDiv.querySelector(".task-text");

        if (e.target.checked) {
          localStorage.setItem(id, "true");
          taskDiv.style.borderLeftColor = "#27ae60";
          taskDiv.style.background = "#f0fdf4";
          taskText.style.color = "#888";
          taskText.style.textDecoration = "line-through";
        } else {
          localStorage.removeItem(id);
          taskDiv.style.borderLeftColor = "#ccc";
          taskDiv.style.background = "#f9f9f9";
          taskText.style.color = "#2c3e50";
          taskText.style.textDecoration = "none";
        }

        const tripCard = taskDiv.closest(".day-card");
        const totalCheckboxes =
          tripCard.querySelectorAll(".trip-checkbox").length;
        const checkedBoxes = tripCard.querySelectorAll(
          ".trip-checkbox:checked",
        ).length;
        const newPercent = Math.round((checkedBoxes / totalCheckboxes) * 100);

        document.getElementById(`progBar_${tripId}`).style.width =
          `${newPercent}%`;
        document.getElementById(`badge_${tripId}`).textContent =
          `${newPercent}%`;
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="error-card" style="text-align:center; padding:20px; color:#e74c3c; background:#fdf0ed; border-radius:12px;">Failed to load trips.</div>`;
  }
}
