/**
 * Fasa7ny - Smart Search Logic (Fixed & Safe with Live Search)
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
    // تنظيف النتائج لو المستخدم مسح كل الكلام
    searchResultsContainer.innerHTML = "";
    return;
  }

  searchResultsContainer.innerHTML = "";
  if (searchLoadingState) searchLoadingState.classList.remove("hidden");

  try {
    const response = await fetch(`${window.API_BASE_URL}/recommend-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword,
        filters,
        sort,
        page: 1, // لدعم الـ Pagination اللي ضيفناه في app.js
        limit: 12,
      }),
    });

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

// ==========================================
// 🚀 Events Binding (Live Search & Debounce)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const searchBtn = document.getElementById("searchBtn");
  const searchInput = document.getElementById("searchInput");

  // 1. البحث عند الضغط على زر البحث
  if (searchBtn) {
    searchBtn.addEventListener("click", performSmartSearch);
  }

  // 2. البحث المباشر أثناء الكتابة (Live Search)
  let debounceTimer;
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      // مسح العداد إذا استمر المستخدم في الكتابة
      clearTimeout(debounceTimer);

      // تنفيذ البحث بعد التوقف عن الكتابة بـ 400 ملي ثانية
      debounceTimer = setTimeout(() => {
        performSmartSearch();
      }, 400);
    });

    // التنفيذ الفوري عند الضغط على Enter لتجاوز الانتظار
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        clearTimeout(debounceTimer);
        performSmartSearch();
      }
    });
  }

  // 3. تحديث البحث تلقائياً عند تغيير أي فلتر (مدينة، فئة، الخ)
  ["filterCity", "filterCategory", "filterBudget", "sortBy"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", performSmartSearch);
    }
  });
});
