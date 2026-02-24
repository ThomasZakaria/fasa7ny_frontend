/**
 * Fasa7ny - Explore Page Logic (View All)
 */
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get("category");
  const type = urlParams.get("type"); // للتمييز لو كان "Near Me"

  const titleEl = document.getElementById("exploreTitle");
  const container = document.getElementById("exploreGrid");
  const loader = document.getElementById("loading");

  if (category) {
    titleEl.innerHTML = `<i class="fas fa-landmark"></i> Exploring: ${category}`;
    await fetchAllByCategory(category, container, loader);
  } else if (type === "near-me") {
    titleEl.innerHTML = `<i class="fas fa-map-marker-alt"></i> Places Near You`;
    const lat = urlParams.get("lat");
    const lng = urlParams.get("lng");
    await fetchAllNearMe(lat, lng, container, loader);
  } else {
    titleEl.innerHTML = "All Places";
    await fetchAllByCategory("all", container, loader);
  }
});

// جلب كل الأماكن الخاصة بقسم معين باستخدام دالة البحث التي صنعناها في Backend
async function fetchAllByCategory(category, container, loader) {
  try {
    const res = await fetch("http://127.0.0.1:3000/api/v1/recommend-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keyword: "",
        filters: {
          city: "all",
          category: category === "General" ? "all" : category,
          budget: "any",
        },
        sort: "relevance",
        page: 1,
        limit: 100, // رقم كبير لجلب كل الداتا مرة واحدة للسكرول
      }),
    });
    const data = await res.json();
    loader.classList.add("hidden");

    if (data.status === "success" && data.data.recommendations.length > 0) {
      if (typeof renderCards === "function") {
        // نمرر false للـ limit لكي يرسم كل الكروت بلا إخفاء
        renderCards(data.data.recommendations, container, false);
      }
    } else {
      container.innerHTML =
        "<p style='text-align:center; width:100%;'>No places found in this category.</p>";
    }
  } catch (err) {
    loader.classList.add("hidden");
    console.error(err);
  }
}

// جلب كل الأماكن القريبة
async function fetchAllNearMe(lat, lng, container, loader) {
  if (!lat || !lng) return;
  try {
    const res = await fetch(
      `http://127.0.0.1:3000/api/v1/places/near-me?lat=${lat}&lng=${lng}&distance=100`,
    );
    const data = await res.json();
    loader.classList.add("hidden");

    if (data.status === "success" && data.data.places.length > 0) {
      if (typeof renderCards === "function")
        renderCards(data.data.places, container, false);
    } else {
      container.innerHTML =
        "<p style='text-align:center; width:100%;'>No nearby places found.</p>";
    }
  } catch (err) {
    loader.classList.add("hidden");
  }
}
