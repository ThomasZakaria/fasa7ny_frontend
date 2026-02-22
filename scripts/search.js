/**
 * Fasa7ny - Smart Search & Filtering Logic
 * Handles Keyword (Fuzzy Search) + Dropdown Filters
 */

const searchInputObj = document.getElementById("searchInput");
const searchBtnObj = document.getElementById("searchBtn");
const searchResultsContainer = document.getElementById("searchResults");
const searchLoadingState = document.getElementById("searchLoading");

// Filters
const filterCity = document.getElementById("filterCity");
const filterCategory = document.getElementById("filterCategory");
const filterBudget = document.getElementById("filterBudget");

if (searchBtnObj) {
  searchBtnObj.addEventListener("click", performSmartSearch);
  searchInputObj.addEventListener("keypress", (e) => {
    if (e.key === "Enter") performSmartSearch();
  });

  // تفعيل البحث التلقائي عند تغيير أي فلتر
  filterCity.addEventListener("change", performSmartSearch);
  filterCategory.addEventListener("change", performSmartSearch);
  filterBudget.addEventListener("change", performSmartSearch);
}

/**
 * Gathers user input and filters, then fetches recommendations from the backend
 */
async function performSmartSearch() {
  const keyword = searchInputObj.value.trim();
  const filters = {
    city: filterCity.value,
    category: filterCategory.value,
    budget: filterBudget.value,
  };

  // If everything is empty/default, don't search
  if (
    !keyword &&
    filters.city === "all" &&
    filters.category === "all" &&
    filters.budget === "any"
  ) {
    searchResultsContainer.innerHTML = "";
    return;
  }

  searchResultsContainer.innerHTML = "";
  searchLoadingState.classList.remove("hidden");

  try {
    const userProfileStr = localStorage.getItem("userProfile");
    const userProfile = userProfileStr ? JSON.parse(userProfileStr) : {};

    const response = await fetch("${API_BASE_URL}/api/v1/recommend-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userProfile, keyword, filters }),
    });

    const data = await response.json();
    searchLoadingState.classList.add("hidden");

    if (data.status === "success" && data.data.recommendations.length > 0) {
      // استخدام دالة renderCards الموجودة في home.js
      if (typeof renderCards === "function") {
        renderCards(data.data.recommendations, searchResultsContainer);
      }
    } else {
      searchResultsContainer.innerHTML = `<div style="text-align:center; padding:30px; width:100%;">
            <i class="fas fa-search-minus" style="font-size:3rem; color:#cbd5e1; margin-bottom:15px;"></i>
            <p style="color:#64748b; font-size:1.1rem;">No matching places found. Try adjusting your filters or spelling.</p>
         </div>`;
    }
  } catch (error) {
    console.error("Search Error:", error);
    searchLoadingState.classList.add("hidden");
    searchResultsContainer.innerHTML =
      "<p style='width: 100%; text-align: center; color: red;'>Search failed. Please check server connection.</p>";
  }
}
