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
// 1. HELPERS & AUTH
// ==========================================

// قراءة الصورة بذكاء متوافقة مع الهيكل القديم والجديد للـ JSON
// ==========================================
// 1. HELPERS & AUTH
// ==========================================

// دالة للتحقق من صحة الرابط برمجياً
const isValidUrl = (url) =>
  typeof url === "string" && url.startsWith("http") && !url.includes("[URL]");

// 1. جلب الصورة الرئيسية (أو المعرض كبديل أول)
function getValidImageUrl(place) {
  if (!place) return DEFAULT_THUMB;

  // المحاولة الأولى: الصورة الرئيسية
  if (place.images && isValidUrl(place.images.main)) {
    return place.images.main;
  }

  // المحاولة الثانية: أول صورة صالحة من المعرض (Fallback 1)
  if (place.images && Array.isArray(place.images.gallery)) {
    const validGalleryImg = place.images.gallery.find(isValidUrl);
    if (validGalleryImg) return validGalleryImg;
  }

  // المحاولة الثالثة: الهيكل القديم
  const oldUrl = place.image || place.img || place["Main Image URL"];
  if (isValidUrl(oldUrl)) return oldUrl;

  // الملاذ الأخير: الصورة الافتراضية
  return DEFAULT_THUMB;
}

// 2. جلب صورة بديلة في حالة تلف الرابط أثناء التحميل (Network Error 404)
function getFallbackImageUrl(place) {
  if (!place) return DEFAULT_THUMB;

  // نبحث عن صورة في المعرض "مختلفة" عن الصورة الرئيسية التالفة
  if (place.images && Array.isArray(place.images.gallery)) {
    const fallback = place.images.gallery.find(
      (img) => isValidUrl(img) && img !== place.images.main,
    );
    if (fallback) return fallback;
  }

  return DEFAULT_THUMB;
}

// 3. دالة ضغط الصور (التي أضفناها لتسريع الموقع)
function optimizeImage(url, width = 400) {
  if (!url || url === DEFAULT_THUMB || url.includes("wsrv.nl")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp&q=70`;
}
// دالة قوية لجلب الاسم من السيرفر إذا كان مفقوداً (لحل مشكلة undefined)
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

    // 1. نجلب الرابط الأصلي من ملفك
    const originalMainUrl = getValidImageUrl(place);
    // 2. نصنع نسخة مضغوطة وسريعة
    const optimizedMainUrl = optimizeImage(originalMainUrl, 400);

    // السحر هنا: لو المضغوطة فشلت، نستخدم الأصلية فوراً قبل اللجوء للافتراضية!
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

  const historyEl = document.getElementById("modalHistory");
  if (historyEl)
    historyEl.innerText =
      placeData["Short History Summary"] || "Discover the wonders of Egypt.";

  // 2. معرض الصور المتطور
  const imgEl = document.getElementById("modalImg");
  const galleryEl = document.getElementById("modalGallery");

  let allImages = [];
  const mainImage = getValidImageUrl(placeData);
  if (mainImage && mainImage !== DEFAULT_THUMB) allImages.push(mainImage);

  // دعم هيكل JSON الجديد (images.gallery)
  if (placeData.images && Array.isArray(placeData.images.gallery)) {
    placeData.images.gallery.forEach((img) => {
      if (img && !allImages.includes(img) && !img.includes("[URL]"))
        allImages.push(img);
    });
  }
  // دعم الهيكل لو كانت الصور مصفوفة عادية
  else if (placeData.images && Array.isArray(placeData.images)) {
    placeData.images.forEach((img) => {
      if (img && !allImages.includes(img) && !img.includes("[URL]"))
        allImages.push(img);
    });
  }
  // دعم الهيكل لو كانت الصور نصاً (مفصولة بفاصلة)
  else if (placeData.images && typeof placeData.images === "string") {
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
  // رسم الصورة الرئيسية في المودال مع الحماية
  if (imgEl) {
    const originalHero = allImages.length > 0 ? allImages[0] : DEFAULT_THUMB;
    // نطلب الصورة مضغوطة بحجم 800 بكسل
    imgEl.src = optimizeImage(originalHero, 800);

    // لو فشل الضغط، نعود للصورة الأصلية فوراً
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

        // نطلب الصورة المصغرة بحجم 100 بكسل للسرعة القصوى
        thumb.src = optimizeImage(originalUrl, 100);

        // لو فشل السيرفر في ضغطها، نعرض الأصلية ولا نذهب للافتراضية
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

  // 3. إصلاح زر الخرائط (رابط صحيح لجوجل ماب)
  const mapBtn = document.getElementById("modalMapLink");
  if (mapBtn && placeData.Coordinates) {
    const cleanCoords = placeData.Coordinates.replace(/\s+/g, "");
    mapBtn.href = `https://maps.google.com/?q=${cleanCoords}`;
    mapBtn.style.display = "inline-flex";
  } else if (mapBtn) {
    mapBtn.style.display = "none";
  }

  // 4. الحفظ والمراجعات
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
  const placeId = currentModalPlace.ID || currentModalPlace._id;
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
        const user = JSON.parse(localStorage.getItem("userProfile") || "{}");
        if (!user.saved_places) user.saved_places = [];
        user.saved_places.push({
          id: currentModalPlace.ID || currentModalPlace._id,
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
      document.getElementById("reviewComment").value = "";
      if (typeof loadReviews === "function") loadReviews(placeId.toString());
      alert("Review posted!");
    }
  } catch (err) {
    console.error("Review Error:", err);
  }
}

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

      if (data.status === "success" && data.data.details) {
        openPlaceModal(data.data.details);
      } else {
        alert("AI couldn't identify this landmark clearly. Try another angle!");
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
