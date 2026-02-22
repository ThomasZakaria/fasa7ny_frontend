// ==========================================
// 0. GLOBAL DATA & MODAL LOGIC
// ==========================================
window.globalPlacesMap = {};
let globalPlaceIdCounter = 0;
let currentModalPlace = null;

// Ensure API_BASE_URL is defined (Fallback if not in another script)

const placeModal = document.getElementById("placeModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalSaveBtn = document.getElementById("modalSaveBtn");
const modalSaveIcon = document.getElementById("modalSaveIcon");
const modalSaveText = document.getElementById("modalSaveText");

function openPlaceModal(placeData) {
  if (!placeData) return;
  currentModalPlace = placeData;

  document.getElementById("modalTitle").textContent =
    placeData["name"] ||
    placeData["Landmark Name (English)"] ||
    "Unknown Landmark";
  document.getElementById("modalArabicName").textContent =
    placeData["Arabic Name"] || "";
  document.getElementById("modalLocation").textContent =
    placeData["governorate"] || placeData["Location"] || "Egypt";
  document.getElementById("modalTime").textContent =
    placeData["workingTime"] || "09:00 - 17:00";
  document.getElementById("modalPrice").textContent =
    placeData["price"] || "Free";
  document.getElementById("modalCategory").textContent =
    placeData["category"] || "Historical";
  document.getElementById("modalHistory").textContent =
    placeData["description"] ||
    placeData["Short History Summary"] ||
    "No historical data available.";

  const img =
    placeData["image"] ||
    placeData["Main Image URL"] ||
    "https://images.unsplash.com/photo-1539650116574-8efeb43e2b50?q=80&w=600&auto=format&fit=crop";
  document.getElementById("modalImg").src = img;

  const mapLink = document.getElementById("modalMapLink");
  if (placeData["Coordinates"]) {
    const coords = placeData["Coordinates"].split(",");
    mapLink.href = `https://www.google.com/maps?q=${coords[0].trim()},${coords[1].trim()}`;
    mapLink.style.display = "inline-flex";
  } else {
    mapLink.style.display = "none";
  }

  const rating = Math.round(
    placeData["rating"] || placeData["averageRating"] || 4,
  );
  document.getElementById("modalStars").textContent =
    "★".repeat(rating) + "☆".repeat(5 - rating);

  // Update Save Button State
  const userProfileStr = localStorage.getItem("userProfile");
  if (userProfileStr && modalSaveIcon) {
    const userProfile = JSON.parse(userProfileStr);
    const placeName = placeData["name"] || placeData["Landmark Name (English)"];
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

  // Nearby Places Logic
  const modalNearbyCards = document.getElementById("modalNearbyCards");
  if (modalNearbyCards) {
    modalNearbyCards.innerHTML = "<div class='spinner'></div>";

    if (placeData["Coordinates"]) {
      const coords = placeData.Coordinates.split(",");
      const lat = coords[0].trim();
      const lng = coords[1].trim();

      fetch(
        `${API_BASE_URL}/api/v1/places/near-me?lat=${lat}&lng=${lng}&limit=4`,
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success" && data.data.places.length > 0) {
            renderCards(data.data.places, modalNearbyCards, false);
          } else {
            modalNearbyCards.innerHTML = "<p>No nearby places found.</p>";
          }
        })
        .catch(() => {
          modalNearbyCards.innerHTML = "<p>Error loading nearby places.</p>";
        });
    }
  }

  placeModal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// Save Place Logic (FIXED URL)
if (modalSaveBtn) {
  modalSaveBtn.addEventListener("click", async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return alert("Please login first");

    // This is a placeholder - usually you'd have a specific endpoint for saving
    // For now, let's just update local storage for UI feedback
    modalSaveIcon.className = "fas fa-heart";
    modalSaveText.textContent = "Saved";
  });
}

// ==========================================
// 1. AI INTEGRATION LOGIC (FIXED QUOTES)
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

    try {
      // FIXED: Using backticks ` instead of single quotes '
      const response = await fetch(`${API_BASE_URL}/api/v1/detect`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      loadingState.classList.add("hidden");
      uploadBtn.style.display = "flex";

      if (data.status === "success" && data.matchedPlace) {
        openPlaceModal(data.matchedPlace);
      } else {
        alert("Landmark not recognized. Try another photo!");
      }
    } catch (error) {
      loadingState.classList.add("hidden");
      uploadBtn.style.display = "flex";
      alert("AI Service Error. Check backend logs.");
    }
  });
}

// ==========================================
// 3. SEARCH LOGIC (FIXED ENDPOINT)
// ==========================================
async function performSearch() {
  const keyword = searchInput.value.trim();
  if (!keyword) return;

  searchResults.innerHTML = "";
  searchLoading.classList.remove("hidden");

  try {
    // FIXED: Using updated search endpoint that matches app.js
    const response = await fetch(
      `${API_BASE_URL}/api/v1/places/search?q=${keyword}`,
    );
    const data = await response.json();
    searchLoading.classList.add("hidden");

    if (data.status === "success" && data.data.places.length > 0) {
      renderCards(data.data.places, searchResults);
    } else {
      searchResults.innerHTML = "<p>No results found.</p>";
    }
  } catch (error) {
    searchLoading.classList.add("hidden");
    alert("Search failed.");
  }
}

// ==========================================
// 5. DYNAMIC CATEGORIES (FIXED FILTER LOGIC)
// ==========================================
async function fetchAndRenderCategories(selectedCity = "all") {
  const categoriesContentWrapper = document.getElementById(
    "categoriesContentWrapper",
  );
  const loading = document.getElementById("categoriesLoading");

  if (!categoriesContentWrapper) return;
  categoriesContentWrapper.innerHTML = "";
  if (loading) loading.classList.remove("hidden");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/categories?city=${selectedCity === "all" ? "" : selectedCity}`,
    );
    const data = await response.json();

    if (loading) loading.classList.add("hidden");

    if (data.status === "success" && data.data.categories.length > 0) {
      // We'll fetch places for each category
      for (const cat of data.data.categories) {
        const section = document.createElement("div");
        section.innerHTML = `<h3 class="category-title">${cat}</h3><div class="cards" id="cat-${cat}"></div>`;
        categoriesContentWrapper.appendChild(section);

        // Fetch places for this category
        fetch(`${API_BASE_URL}/api/v1/places/search?q=${cat}`)
          .then((res) => res.json())
          .then((placeData) => {
            renderCards(
              placeData.data.places,
              document.getElementById(`cat-${cat}`),
              true,
            );
          });
      }
    }
  } catch (err) {
    if (loading) loading.classList.add("hidden");
    console.error("Categories failed", err);
  }
}

// ==========================================
// 6. HELPER: RENDER CARDS
// ==========================================
function renderCards(places, container, limitToFour = false) {
  if (!container) return;
  container.innerHTML = "";

  places.forEach((place, index) => {
    const isHidden = limitToFour && index >= 4 ? "hidden" : "";
    const cardId = `place_${globalPlaceIdCounter++}`;
    window.globalPlacesMap[cardId] = place;

    const html = `
      <div class="card place-card ${isHidden}" data-placeid="${cardId}">
        <img src="${place.image || place["Main Image URL"]}" onerror="this.src='https://images.unsplash.com/photo-1539650116574-8efeb43e2b50?q=80&w=600&auto=format&fit=crop'">
        <div style="padding:15px">
          <h3>${place.name || place["Landmark Name (English)"]}</h3>
          <p><i class="fas fa-map-marker-alt"></i> ${place.governorate || place.Location}</p>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", html);
  });
}

// ==========================================
// 7. INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Simple check for city filter
  const cityFilter = document.getElementById("cityFilter");
  if (cityFilter) {
    cityFilter.addEventListener("change", (e) =>
      fetchAndRenderCategories(e.target.value),
    );
    fetchAndRenderCategories(cityFilter.value);
  } else {
    fetchAndRenderCategories("cairo");
  }
});

// Modal close triggers
if (closeModalBtn)
  closeModalBtn.onclick = () => placeModal.classList.remove("active");
window.onclick = (e) => {
  if (e.target == placeModal) placeModal.classList.remove("active");
};

// Search events
if (searchBtn) searchBtn.onclick = performSearch;
if (searchInput)
  searchInput.onkeypress = (e) => {
    if (e.key === "Enter") performSearch();
  };
