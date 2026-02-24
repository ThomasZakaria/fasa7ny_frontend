// ==========================================
// Profile Page Logic - Final Fixed Version
// ==========================================

const DEFAULT_PLACE_IMAGE =
  "https://s7g10.scene7.com/is/image/barcelo/pyramids-of-giza-facts_ancient-pyramids-of-giza?&&fmt=webp-alpha&qlt=75&wid=1300&fit=crop,1";

document.addEventListener("DOMContentLoaded", () => {
  loadProfileData();
});

/**
 * دالة مساعدة لاختيار الرابط الصحيح للصورة من البيانات
 */
function getValidProfileImg(item) {
  if (!item) return DEFAULT_PLACE_IMAGE;
  // البحث في كل المسميات الممكنة للصورة (تحويلها لـ String أولاً لتجنب الأخطاء)
  const url = item.image || item.img || item["Main Image URL"] || "";
  const isValid =
    typeof url === "string" && url.startsWith("http") && !url.includes("[URL]");
  return isValid ? url : DEFAULT_PLACE_IMAGE;
}

/**
 * 1. جلب بيانات المستخدم وعرض الاسم والبريد
 */
async function loadProfileData() {
  const userId = localStorage.getItem("userId");

  if (!userId || userId === "undefined") {
    window.location.href = "auth.html";
    return;
  }

  try {
    const response = await fetch(
      `http://127.0.0.1:3000/api/v1/users/${userId}`,
    );
    const result = await response.json();

    if (result.status === "success" && result.data.user) {
      const user = result.data.user;

      // حفظ النسخة الأحدث لضمان عدم ظهور undefined مستقبلاً
      localStorage.setItem("userProfile", JSON.stringify(user));
      localStorage.setItem("username", user.username || user.name);

      // ✅ حل مشكلة الاسم: نتحقق من كل الاحتمالات
      const displayName =
        user.username ||
        user.name ||
        localStorage.getItem("username") ||
        "Tourist";
      document.getElementById("profileName").textContent = displayName;
      document.getElementById("profileEmail").textContent =
        user.email || "No Email";

      // رسم الأقسام
      renderInterests(user.interests || []);
      renderHistory(user.scan_history || []);
      renderSavedPlaces(user.saved_places || []);
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    // حالة احتياطية قوية
    const fallbackUser = JSON.parse(
      localStorage.getItem("userProfile") || "{}",
    );
    const fallbackName =
      fallbackUser.username ||
      fallbackUser.name ||
      localStorage.getItem("username") ||
      "Tourist";
    document.getElementById("profileName").textContent = fallbackName;
  }
}

/**
 * 2. رسم الاهتمامات (Interests)
 */
function renderInterests(interestsArray) {
  const container = document.getElementById("interestsContainer");
  if (!container) return;
  container.innerHTML = "";

  if (!interestsArray || interestsArray.length === 0) {
    container.innerHTML =
      "<p style='color:#888; font-size: 0.9rem;'>No interests added yet.</p>";
    return;
  }

  interestsArray.forEach((tag, index) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.innerHTML = `
      <i class="fas fa-hashtag"></i> ${tag} 
      <i class="fas fa-times" onclick="removeInterest(${index})" style="margin-left: 8px; cursor: pointer; color: #e74c3c;"></i>
    `;
    container.appendChild(span);
  });
}

/**
 * 3. إضافة وحذف الاهتمامات
 */
async function addInterest() {
  const input = document.getElementById("interestInput");
  const newInterest = input.value.trim();
  const userId = localStorage.getItem("userId");

  if (!newInterest || !userId) return;

  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  if (!userProfile.interests) userProfile.interests = [];

  if (
    userProfile.interests.some(
      (i) => i.toLowerCase() === newInterest.toLowerCase(),
    )
  ) {
    alert("This interest is already added!");
    return;
  }

  userProfile.interests.push(newInterest);

  await updateInterestsInBackend(userId, userProfile.interests);
  localStorage.setItem("userProfile", JSON.stringify(userProfile));
  renderInterests(userProfile.interests);
  input.value = "";
}

async function removeInterest(index) {
  const userId = localStorage.getItem("userId");
  const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
  if (!userProfile.interests || !userId) return;

  userProfile.interests.splice(index, 1);
  await updateInterestsInBackend(userId, userProfile.interests);
  localStorage.setItem("userProfile", JSON.stringify(userProfile));
  renderInterests(userProfile.interests);
}

async function updateInterestsInBackend(userId, interests) {
  try {
    await fetch("http://127.0.0.1:3000/api/v1/user/update-interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, interests }),
    });
  } catch (err) {
    console.error("Sync Error:", err);
  }
}

/**
 * 4. رسم تاريخ المسح (مع إصلاح %% والترتيب)
 */
function renderHistory(historyArray) {
  const container = document.getElementById("historyContainer");
  if (!container) return;
  container.innerHTML = "";

  if (!historyArray || historyArray.length === 0) {
    container.innerHTML = `<p class="empty-msg">No scans yet. Try the AI Scanner!</p>`;
    return;
  }

  // ترتيب من الأحدث للأقدم
  const sortedHistory = [...historyArray].reverse();

  sortedHistory.forEach((item) => {
    const date = item.scannedAt
      ? new Date(item.scannedAt).toLocaleDateString()
      : "Recently";

    // ✅ إصلاح مشكلة الأرقام الطويلة والعلامة المزدوجة %%
    let confidenceVal = item.confidence
      ? String(item.confidence).replace("%", "")
      : "99";
    let formattedConfidence = parseFloat(confidenceVal).toFixed(2);

    const cardHtml = `
      <div class="card history-card" style="display: flex; align-items: center; margin-bottom: 15px; overflow: hidden; text-align: left;">
        <img src="${getValidProfileImg(item)}" alt="${item.place_name}" 
             style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
        <div style="padding: 15px; flex: 1;">
          <h3 style="color: #0b4a6f; font-size: 1.1rem; margin-bottom: 5px; padding:0;">${item.place_name}</h3>
          <p style="font-size: 0.85rem; color:#666; margin-bottom: 5px;">
            <i class="fas fa-calendar-alt"></i> ${date}
          </p>
          <span class="confidence-badge" style="background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: bold;">
            Match: ${formattedConfidence}%
          </span>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", cardHtml);
  });
}

/**
 * 5. رسم الأماكن المحفوظة
 */
function renderSavedPlaces(savedPlaces) {
  const container = document.getElementById("savedContainer");
  if (!container) return;
  container.innerHTML = "";

  if (!savedPlaces || savedPlaces.length === 0) {
    container.innerHTML = `<p class="empty-msg">No saved places yet.</p>`;
    return;
  }

  savedPlaces.forEach((place) => {
    const cardHtml = `
      <div class="card">
        <img src="${getValidProfileImg(place)}" alt="${place.name}" 
             style="width: 100%; height: 180px; object-fit: cover;"
             onerror="this.onerror=null; this.src='${DEFAULT_PLACE_IMAGE}'">
        <div style="padding: 20px; text-align: left;">
          <h3 style="color: #0b4a6f; margin-bottom: 5px; padding:0;">${place.name}</h3>
          <p style="color:#666; font-size: 0.9rem; margin-bottom: 10px;">
            <i class="fas fa-map-marker-alt"></i> ${place.location || "Egypt"}
          </p>
          <div style="color:#e74c3c; font-weight:bold; font-size: 0.9rem;">
            <i class="fas fa-heart"></i> Saved
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", cardHtml);
  });
}

function logout() {
  localStorage.clear();
  window.location.href = "auth.html";
}
