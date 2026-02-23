/**
 * Fasa7ny - Smart Search Logic (Fixed & Safe)
 */
async function performSmartSearch() {
  // 1. فحص وجود العناصر الأساسية لمنع الانهيار
  const searchInputObj = document.getElementById("searchInput");
  const searchResultsContainer = document.getElementById("searchResults");
  const searchLoadingState = document.getElementById("searchLoading");

  if (!searchInputObj || !searchResultsContainer) return;

  const keyword = searchInputObj.value.trim();

  // فحص أمان للفلاتر (لو مش موجودة ياخد قيمة افتراضية)
  const cityEl = document.getElementById("filterCity");
  const catEl = document.getElementById("filterCategory");
  const budgetEl = document.getElementById("filterBudget");
  const sortEl = document.getElementById("sortBy");

  const filters = {
    city: cityEl ? cityEl.value : "all",
    category: catEl ? catEl.value : "all",
    budget: budgetEl ? budgetEl.value : "any",
  };

  const sort = sortEl ? sortEl.value : "relevance";

  // منع البحث لو الخانات فاضية تماماً
  if (!keyword && filters.city === "all" && filters.category === "all") {
    console.log("Search skipped: No criteria provided.");
    return;
  }

  searchResultsContainer.innerHTML = "";
  if (searchLoadingState) searchLoadingState.classList.remove("hidden");

  try {
    const response = await fetch(
      "http://127.0.0.1:3000/api/v1/recommend-search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          filters,
          sort,
          page: 1, // لدعم الـ Pagination اللي ضيفناه في app.js
          limit: 12,
        }),
      },
    );

    const data = await response.json();
    if (searchLoadingState) searchLoadingState.classList.add("hidden");

    if (
      data.status === "success" &&
      data.data.recommendations &&
      data.data.recommendations.length > 0
    ) {
      // التأكد من أن دالة renderCards متاحة للعمل
      if (typeof renderCards === "function") {
        renderCards(data.data.recommendations, searchResultsContainer);
      } else {
        console.error(
          "Critical Error: renderCards function not found. Make sure home.js is loaded.",
        );
      }
    } else {
      searchResultsContainer.innerHTML = `
        <div style="text-align:center; width:100%; padding:40px; color:#64748b;">
            <i class="fas fa-search-minus" style="font-size:3rem; margin-bottom:15px;"></i>
            <p>No matching places found. Try different keywords or filters.</p>
        </div>`;
    }
  } catch (error) {
    if (searchLoadingState) searchLoadingState.classList.add("hidden");
    console.error("Search Fetch Error:", error);
  }
}

// ربط الأزرار والفلاتر بأمان
document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");

  if (searchBtn) {
    searchBtn.onclick = performSmartSearch;
  }

  if (searchInput) {
    searchInput.onkeypress = (e) => {
      if (e.key === "Enter") performSmartSearch();
    };
  }

  // تحديث البحث عند تغيير أي فلتر تلقائياً (بشرط وجود العنصر)
  ["filterCity", "filterCategory", "filterBudget", "sortBy"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.onchange = performSmartSearch;
    }
  });
});
