// ==========================================
// 0. GLOBAL DATA & MODAL LOGIC
// ==========================================
window.globalPlacesMap = {};
let globalPlaceIdCounter = 0;
let currentModalPlace = null;

const placeModal = document.getElementById("placeModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalSaveBtn = document.getElementById("modalSaveBtn");
const modalSaveIcon = document.getElementById("modalSaveIcon");
const modalSaveText = document.getElementById("modalSaveText");

function openPlaceModal(placeData) {
  if (!placeData) return;
  currentModalPlace = placeData;

  document.getElementById("modalTitle").textContent =
    placeData["Landmark Name (English)"] || "Unknown Landmark";
  document.getElementById("modalArabicName").textContent =
    placeData["Arabic Name"] || "";
  document.getElementById("modalLocation").textContent =
    placeData["Location"] || "Egypt";
  document.getElementById("modalTime").textContent =
    placeData["workingTime"] || "09:00 - 17:00";
  document.getElementById("modalPrice").textContent =
    placeData["price"] || "Free";
  document.getElementById("modalCategory").textContent =
    placeData["category"] || "Historical";
  document.getElementById("modalHistory").textContent =
    placeData["Short History Summary"] || "No historical data available.";

  const img =
    placeData["image"] ||
    placeData["Main Image URL"] ||
    "https://images.unsplash.com/photo-1539650116574-8efeb43e2b50?q=80&w=600&auto=format&fit=crop";
  document.getElementById("modalImg").src = img;

  const mapLink = document.getElementById("modalMapLink");
  if (placeData["Coordinates"]) {
    const coords = placeData["Coordinates"].split(",");
    mapLink.href = `https://www.google.com/maps/search/?api=1&query=${coords[0].trim()},${coords[1].trim()}`;
    mapLink.style.display = "inline-flex";
  } else {
    mapLink.style.display = "none";
  }

  const rating = Math.round(placeData["averageRating"] || 4);
  document.getElementById("modalStars").textContent =
    "★".repeat(rating) + "☆".repeat(5 - rating);

  // تحديث حالة زرار الحفظ
  const userProfileStr = localStorage.getItem("userProfile");
  if (userProfileStr && modalSaveIcon) {
    const userProfile = JSON.parse(userProfileStr);
    const placeName = placeData["Landmark Name (English)"];
    if (
      userProfile.saved_places &&
      userProfile.saved_places.find((p) => p.name === placeName)
    ) {
      modalSaveIcon.className = "fas fa-heart";
      modalSaveText.textContent = "Saved";
    } else {
      modalSaveIcon.className = "far fa-heart";
      modalSaveText.textContent = "Save Place";
    }
  }
  // ==========================================
  // 🌟 الجديد: جلب الأماكن القريبة للمكان المفتوح
  // ==========================================
  const modalNearbyCards = document.getElementById("modalNearbyCards");
  if (modalNearbyCards) {
    // إظهار علامة التحميل مؤقتاً
    modalNearbyCards.innerHTML =
      "<div class='spinner' style='width: 30px; height: 30px; border-width: 3px;'></div>";

    // التأكد من وجود إحداثيات للمكان
    if (placeData["Coordinates"]) {
      const coords = placeData["Coordinates"].split(",");
      const lat = coords[0].trim();
      const lng = coords[1].trim();
      const currentName = placeData["Landmark Name (English)"];

      // مناداة الـ API الخاص بالأماكن القريبة (في نطاق 30 كيلو مثلاً)
      fetch(
        `http://localhost:3000/api/v1/places/near-me?lat=${lat}&lng=${lng}&distance=30`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success" && data.data.places.length > 0) {
            // فلترة عشان نعزل المكان الحالي (عشان ميرشحش نفسه)، وناخد أول 3 أماكن بس
            const nearbyPlaces = data.data.places
              .filter((p) => p["Landmark Name (English)"] !== currentName)
              .slice(0, 3);

            if (nearbyPlaces.length > 0) {
              // نرسم الكروت باستخدام الدالة الأساسية بتاعتنا
              renderCards(nearbyPlaces, modalNearbyCards, false);

              // تصغير الصور والنصوص بالـ JS عشان تناسب حجم الـ Modal
              const miniImgs = modalNearbyCards.querySelectorAll(".card img");
              miniImgs.forEach((img) => (img.style.height = "120px"));
              const miniTitles = modalNearbyCards.querySelectorAll(".card h3");
              miniTitles.forEach((h) => (h.style.fontSize = "1rem"));
            } else {
              modalNearbyCards.innerHTML =
                "<p style='font-size: 0.9rem; color: #666;'>No other nearby places found.</p>";
            }
          } else {
            modalNearbyCards.innerHTML =
              "<p style='font-size: 0.9rem; color: #666;'>No nearby places found.</p>";
          }
        })
        .catch((err) => {
          console.error("Nearby fetch error:", err);
          modalNearbyCards.innerHTML =
            "<p style='color: red; font-size: 0.9rem;'>Failed to load nearby places.</p>";
        });
    } else {
      modalNearbyCards.innerHTML =
        "<p style='font-size: 0.9rem; color: #666;'>Location data unavailable for this place.</p>";
    }
  }

  // 🌟 إضافة مهمة: عمل Scroll لفوق في النافذة، عشان لو اليوزر داس على مكان مقترح، النافذة تفتح من أولها
  const modalContent = document.querySelector(".modal-content");
  if (modalContent) modalContent.scrollTo({ top: 0, behavior: "smooth" });
  placeModal.classList.add("active");
  document.body.style.overflow = "hidden";
  loadReviews(placeData.ID);
}

// منطق زرار الحفظ
if (modalSaveBtn) {
  modalSaveBtn.addEventListener("click", async () => {
    const userStr = localStorage.getItem("userProfile");
    const userId = localStorage.getItem("userId");

    if (!userStr || !userId) {
      alert("Please login to save places!");
      window.location.href = "auth.html";
      return;
    }

    if (!currentModalPlace) return;

    const placeToSave = {
      name: currentModalPlace["Landmark Name (English)"],
      location: currentModalPlace["Location"],
      img:
        currentModalPlace["image"] ||
        currentModalPlace["Main Image URL"] ||
        "https://images.unsplash.com/photo-1539650116574-8efeb43e2b50?q=80&w=600&auto=format&fit=crop",
    };

    try {
      modalSaveText.textContent = "Saving...";
      const res = await fetch("http://localhost:3000/api/v1/user/toggle-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, place: placeToSave }),
      });
      const data = await res.json();

      if (data.status === "success") {
        const userProfile = JSON.parse(userStr);
        userProfile.saved_places = data.data.saved_places;
        localStorage.setItem("userProfile", JSON.stringify(userProfile));

        const isSaved = userProfile.saved_places.find(
          (p) => p.name === placeToSave.name,
        );
        if (isSaved) {
          modalSaveIcon.className = "fas fa-heart";
          modalSaveText.textContent = "Saved";
        } else {
          modalSaveIcon.className = "far fa-heart";
          modalSaveText.textContent = "Save Place";
        }
      } else {
        alert("Server Error: " + (data.message || "Unknown"));
        modalSaveText.textContent = "Save Place";
      }
    } catch (err) {
      console.error(err);
      alert("Error saving place. Is the server running?");
      modalSaveText.textContent = "Save Place";
    }
  });
}

if (closeModalBtn) {
  closeModalBtn.addEventListener("click", () => {
    placeModal.classList.remove("active");
    document.body.style.overflow = "auto";
  });
}

if (placeModal) {
  placeModal.addEventListener("click", (e) => {
    if (e.target === placeModal) {
      placeModal.classList.remove("active");
      document.body.style.overflow = "auto";
    }
  });
}

document.body.addEventListener("click", (e) => {
  const card = e.target.closest(".place-card");
  if (card) {
    e.preventDefault();
    const placeId = card.getAttribute("data-placeid");
    const placeData = window.globalPlacesMap[placeId];
    if (placeData) openPlaceModal(placeData);
  }
});

// ==========================================
// 1. AI INTEGRATION LOGIC
// ==========================================
const uploadBtn = document.getElementById("uploadBtn");
const imageInput = document.getElementById("imageInput");
const loadingState = document.getElementById("loadingState");

if (uploadBtn && imageInput) {
  uploadBtn.addEventListener("click", () => imageInput.click());

  imageInput.addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    loadingState.classList.remove("hidden");
    uploadBtn.style.display = "none";

    const formData = new FormData();
    formData.append("image", file);

    const userId = localStorage.getItem("userId");
    if (userId) formData.append("userId", userId);

    try {
      const response = await fetch("http://localhost:3000/api/v1/detect", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      loadingState.classList.add("hidden");
      uploadBtn.style.display = "flex";

      if (data.status === "success" && data.data) {
        if (data.data.updatedHistory) {
          const userProfile = JSON.parse(localStorage.getItem("userProfile"));
          if (userProfile) {
            userProfile.scan_history = data.data.updatedHistory;
            localStorage.setItem("userProfile", JSON.stringify(userProfile));
          }
        }

        if (data.data.details) {
          openPlaceModal(data.data.details);
        } else {
          alert("Place identified by AI, but no details found in database.");
        }
      } else {
        alert(
          "Sorry, AI couldn't identify this landmark clearly. Error: " +
            (data.message || ""),
        );
      }
    } catch (error) {
      loadingState.classList.add("hidden");
      uploadBtn.style.display = "flex";
      alert("Network error! Please check your connection or Node.js server.");
    }
  });
}

// ==========================================
// 2. AUTH LOGIC (Navbar Update)
// ==========================================
const username = localStorage.getItem("username");
const loginBtn = document.getElementById("loginBtn");

if (username && loginBtn) {
  loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> ${username}`;
  loginBtn.href = "profile.html";
  loginBtn.style.background = "#ff9800";
  loginBtn.style.color = "#fff";
}

// ==========================================
// 3. SEARCH LOGIC
// ==========================================
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchResults = document.getElementById("searchResults");
const searchLoading = document.getElementById("searchLoading");

if (searchBtn) {
  searchBtn.addEventListener("click", performSearch);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") performSearch();
  });
}

async function performSearch() {
  const keyword = searchInput.value.trim();
  if (!keyword) return;

  searchResults.innerHTML = "";
  searchLoading.classList.remove("hidden");

  try {
    const userProfileStr = localStorage.getItem("userProfile");
    const userProfile = userProfileStr ? JSON.parse(userProfileStr) : {};

    const response = await fetch(
      "http://localhost:3000/api/v1/recommend-search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userProfile, keyword: keyword }),
      },
    );
    const data = await response.json();
    searchLoading.classList.add("hidden");

    if (data.status === "success" && data.data.recommendations.length > 0) {
      renderCards(data.data.recommendations, searchResults);
    } else {
      searchResults.innerHTML =
        "<p style='width: 100%; text-align: center;'>No places found.</p>";
    }
  } catch (error) {
    searchLoading.classList.add("hidden");
    searchResults.innerHTML =
      "<p style='width: 100%; text-align: center; color: red;'>Search failed. Is the server running?</p>";
  }
}

// ==========================================
// 4. NEAR ME LOGIC (With Timeout Protection)
// ==========================================
// ==========================================
// 4. NEAR ME LOGIC (Fixed & Safe)
// ==========================================
const getLocationBtn = document.getElementById("getLocationBtn");
const locationLoading = document.getElementById("locationLoading");
const nearMeCards = document.getElementById("nearMeCards");

if (getLocationBtn) {
  getLocationBtn.addEventListener("click", () => {
    // التحقق مما إذا كان المتصفح يدعم تحديد الموقع
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    nearMeCards.innerHTML = "";
    locationLoading.classList.remove("hidden");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          const res = await fetch(
            `http://localhost:3000/api/v1/places/near-me?lat=${lat}&lng=${lng}&limit=5`,
          );
          const data = await res.json();
          locationLoading.classList.add("hidden");

          if (data.status === "success" && data.data.places.length > 0) {
            renderCards(data.data.places, nearMeCards);
          } else {
            nearMeCards.innerHTML =
              "<p>No places found near your current location.</p>";
          }
        } catch (err) {
          locationLoading.classList.add("hidden");
          nearMeCards.innerHTML =
            "<p style='color:red;'>Failed to connect to server.</p>";
        }
      },
      (error) => {
        locationLoading.classList.add("hidden");
        // التعامل مع حظر النظام الموجود في صورك
        alert(
          "Location access denied. Please check your Windows Privacy settings.",
        );
      },
      { timeout: 10000 }, // مهلة 10 ثوانٍ
    );
  });
}
// ==========================================
// 5. DYNAMIC CATEGORIES LOGIC (With City Filter)
// ==========================================
const categoriesContainer = document.getElementById(
  "dynamicCategoriesContainer",
);
const categoriesContentWrapper = document.getElementById(
  "categoriesContentWrapper",
);
const cityFilter = document.getElementById("cityFilter");

/**
 * Listen for changes in the City Dropdown Filter
 */
if (cityFilter) {
  cityFilter.addEventListener("change", (e) => {
    fetchAndRenderCategories(e.target.value);
  });
}

/**
 * Fetch and Render Categories based on selected city
 * @param {string} selectedCity - Target city (default: 'all')
 */
async function fetchAndRenderCategories(selectedCity = "all") {
  if (!categoriesContentWrapper) return;

  const loadingState = document.getElementById("categoriesLoading");

  // Reset existing content and show loader
  categoriesContentWrapper.innerHTML = "";
  if (loadingState) loadingState.classList.remove("hidden");

  try {
    // Pass the city filter to the backend API
    const response = await fetch(
      `http://localhost:3000/api/v1/categories?city=${selectedCity}`,
    );
    const data = await response.json();

    if (loadingState) loadingState.classList.add("hidden");

    if (data.status === "success") {
      const groupedData = data.data;

      // Handle Empty State (No places for selected city)
      if (Object.keys(groupedData).length === 0) {
        categoriesContentWrapper.innerHTML = `
          <div style="text-align:center; padding: 40px; color: #64748b;">
            <i class="fas fa-map-marked-alt" style="font-size: 3rem; margin-bottom: 15px; color: #cbd5e1;"></i>
            <h3>No places found in this city yet.</h3>
            <p>Try selecting another city or 'All Egypt'.</p>
          </div>
        `;
        return;
      }

      // Render grouped places
      for (const [categoryName, places] of Object.entries(groupedData)) {
        const catSection = document.createElement("div");
        catSection.className = "category-block";

        const titleHtml = `<h3 style="text-align: left; margin: 40px 0 20px; color: #ff9800; font-size: 1.5rem; text-transform: capitalize;"><i class="fas fa-map"></i> ${categoryName}</h3>`;
        catSection.insertAdjacentHTML("beforeend", titleHtml);

        const wrapperDiv = document.createElement("div");
        wrapperDiv.className = "cards";
        catSection.appendChild(wrapperDiv);

        renderCards(places, wrapperDiv, true);

        // "Show More" Button Logic
        if (places.length > 4) {
          const btnContainer = document.createElement("div");
          btnContainer.className = "center-btn-container";

          const toggleBtn = document.createElement("button");
          toggleBtn.className = "view-all";
          toggleBtn.style.border = "none";
          toggleBtn.style.cursor = "pointer";
          toggleBtn.innerHTML = `Show More ${categoryName} <i class="fas fa-chevron-down" style="margin-left: 5px;"></i>`;

          toggleBtn.addEventListener("click", () => {
            const hiddenCards = wrapperDiv.querySelectorAll(".card.hidden");
            if (hiddenCards.length > 0) {
              hiddenCards.forEach((c) => c.classList.remove("hidden"));
              toggleBtn.innerHTML = `Show Less <i class="fas fa-chevron-up" style="margin-left: 5px;"></i>`;
            } else {
              const allCards = wrapperDiv.querySelectorAll(".card");
              allCards.forEach((c, idx) => {
                if (idx >= 4) c.classList.add("hidden");
              });
              toggleBtn.innerHTML = `Show More ${categoryName} <i class="fas fa-chevron-down" style="margin-left: 5px;"></i>`;
              wrapperDiv.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          });

          btnContainer.appendChild(toggleBtn);
          catSection.appendChild(btnContainer);
        }

        categoriesContentWrapper.appendChild(catSection);
      }
    }
  } catch (error) {
    if (loadingState) loadingState.classList.add("hidden");
    categoriesContentWrapper.innerHTML = `
        <div style="text-align:center; padding: 40px; color: #e74c3c;">
          <i class="fas fa-server" style="font-size: 3rem; margin-bottom: 15px;"></i>
          <h2>Cannot Connect to Server</h2>
          <p>Please make sure Node.js is running.</p>
        </div>
    `;
  }
}

/**
 * Initialize categories on page load based on the currently selected filter
 * Default is now set to 'cairo' via HTML selected attribute
 */
document.addEventListener("DOMContentLoaded", () => {
  const defaultCity = cityFilter ? cityFilter.value : "cairo";
  fetchAndRenderCategories(defaultCity);
});

// ==========================================
// 6. HELPER FUNCTION: RENDER CARDS
// ==========================================
function renderCards(places, container, limitToFour = false) {
  container.innerHTML = "";
  if (!places || places.length === 0) return;

  places.forEach((place, index) => {
    const name = place["Landmark Name (English)"] || "Unknown Place";
    const city = place["Location"] || "";
    const image =
      place["image"] ||
      place["Main Image URL"] ||
      "https://images.unsplash.com/photo-1539650116574-8efeb43e2b50?q=80&w=600&auto=format&fit=crop";

    const currentPlaceId = "place_" + globalPlaceIdCounter++;
    window.globalPlacesMap[currentPlaceId] = place;

    const isHiddenClass = limitToFour && index >= 4 ? "hidden" : "";

    const cardHtml = `
      <a href="#" class="card place-card ${isHiddenClass}" data-placeid="${currentPlaceId}">
        <img src="${image}" alt="${name}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1539650116574-8efeb43e2b50?q=80&w=600&auto=format&fit=crop'" />
        <div style="padding: 20px; text-align: left;">
          <h3 style="color: #0b4a6f; margin-bottom: 5px; padding: 0;">${name}</h3>
          <p style="color: #666; font-size: 0.9rem; margin-bottom: 10px;"><i class="fas fa-map-marker-alt"></i> ${city}</p>
        </div>
      </a>
    `;
    container.insertAdjacentHTML("beforeend", cardHtml);
  });
}

// ==========================================
// 7. INITIALIZATION (With Smart Auto-Detect GPS)
// ==========================================
/**
 * Safely initialize categories on page load.
 * Attempts to detect user's city via GPS (Reverse Geocoding).
 * Falls back to default HTML selection if GPS fails or is blocked.
 */
function initCategories() {
  const cityFilterElement = document.getElementById("cityFilter");
  // القيمة الاحتياطية (cairo) في حال فشل تحديد الموقع
  const defaultCity = cityFilterElement ? cityFilterElement.value : "cairo";

  // 1. التأكد من دعم المتصفح للـ Geolocation
  if (!navigator.geolocation) {
    fetchAndRenderCategories(defaultCity);
    return;
  }

  // 2. محاولة جلب الإحداثيات مع مهلة قصيرة (5 ثواني) عشان اليوزر مش يستنى كتير
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      try {
        // 3. تحويل الإحداثيات لاسم مدينة (Reverse Geocoding) باستخدام OpenStreetMap
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        );
        const data = await response.json();

        // استخراج اسم المحافظة أو المدينة من الرد
        const address = data.address || {};
        const stateName = (
          address.state ||
          address.city ||
          address.town ||
          ""
        ).toLowerCase();

        let detectedCity = defaultCity;

        // 4. مطابقة موقع المستخدم الفعلي مع الخيارات المتاحة في القائمة المنسدلة
        if (stateName.includes("cairo") || stateName.includes("giza")) {
          detectedCity = "cairo";
        } else if (stateName.includes("alexandria")) {
          detectedCity = "alexandria";
        } else if (stateName.includes("luxor")) {
          detectedCity = "luxor";
        } else if (stateName.includes("aswan")) {
          detectedCity = "aswan";
        } else if (
          stateName.includes("sinai") ||
          stateName.includes("sharm") ||
          stateName.includes("dahab")
        ) {
          detectedCity = "sinai";
        }

        // 5. تحديث شكل القائمة المنسدلة في الواجهة وجلب الأماكن
        if (cityFilterElement) cityFilterElement.value = detectedCity;
        fetchAndRenderCategories(detectedCity);
      } catch (error) {
        console.warn("Reverse geocoding API failed, falling back to default.");
        fetchAndRenderCategories(defaultCity);
      }
    },
    (error) => {
      // 6. في حالة رفض الصلاحيات (زي اللابتوب بتاعك) بنعرض الأماكن الافتراضية فوراً
      console.warn("GPS access blocked or timeout. Loading default city.");
      fetchAndRenderCategories(defaultCity);
    },
    {
      enableHighAccuracy: false, // سرعة أعلى في الاستجابة
      timeout: 5000, // لو اللابتوب معلق، بعد 5 ثواني هيكمل عادي
    },
  );
}

// 🚀 تشغيل الدالة بطريقة آمنة تتوافق مع سرعة تحميل المتصفح
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCategories);
} else {
  initCategories();
}
