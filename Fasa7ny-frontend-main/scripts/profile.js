// ==========================================
// Profile Page Logic
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  loadProfileData();
});

function loadProfileData() {
  const userStr = localStorage.getItem("userProfile");

  if (!userStr) {
    window.location.href = "auth.html";
    return;
  }

  const user = JSON.parse(userStr);

  document.getElementById("profileName").textContent = user.name || "Tourist";
  document.getElementById("profileEmail").textContent =
    user.email || "No Email";

  // رسم الاهتمامات وتاريخ البحث
  renderInterests(user.interests);
  renderHistory(user.scan_history);
  renderSavedPlaces();
}

// --- 🌟 Interests Logic (Add, Remove, Render) ---
function renderInterests(interestsArray) {
  const container = document.getElementById("interestsContainer");
  container.innerHTML = "";

  const tags = interestsArray || [];

  if (tags.length === 0) {
    container.innerHTML =
      "<p style='color:#888; font-size: 0.9rem;'>No interests added yet.</p>";
    return;
  }

  tags.forEach((tag, index) => {
    const span = document.createElement("span");
    span.className = "tag";
    // ضفنا علامة (X) جنب كل اهتمام عشان المستخدم يقدر يمسحه
    span.innerHTML = `
      <i class="fas fa-hashtag"></i> ${tag} 
      <i class="fas fa-times" onclick="removeInterest(${index})" style="margin-left: 8px; cursor: pointer; color: #e74c3c;" title="Remove"></i>
    `;
    container.appendChild(span);
  });
}

// دالة إضافة اهتمام جديد
async function addInterest() {
  const input = document.getElementById("interestInput");
  const newInterest = input.value.trim();

  if (!newInterest) return;

  const userStr = localStorage.getItem("userProfile");
  if (!userStr) return;

  const user = JSON.parse(userStr);
  if (!user.interests) user.interests = []; // لو مفيش array نكريت واحدة

  // منع إضافة نفس الاهتمام مرتين
  if (
    user.interests
      .map((i) => i.toLowerCase())
      .includes(newInterest.toLowerCase())
  ) {
    alert("This interest is already added!");
    return;
  }

  // إضافة الاهتمام محلياً
  user.interests.push(newInterest);

  // حفظ في الداتا بيز
  await updateInterestsInBackend(user.id, user.interests);

  // تحديث المتصفح والشاشة
  localStorage.setItem("userProfile", JSON.stringify(user));
  renderInterests(user.interests);
  input.value = ""; // تفريغ المربع
}

// دالة مسح اهتمام
async function removeInterest(index) {
  const userStr = localStorage.getItem("userProfile");
  if (!userStr) return;

  const user = JSON.parse(userStr);
  if (!user.interests) return;

  // مسح الاهتمام من الـ Array
  user.interests.splice(index, 1);

  // حفظ في الداتا بيز
  await updateInterestsInBackend(user.id, user.interests);

  // تحديث المتصفح والشاشة
  localStorage.setItem("userProfile", JSON.stringify(user));
  renderInterests(user.interests);
}

// دالة التواصل مع الـ Backend لحفظ الاهتمامات
async function updateInterestsInBackend(userId, interests) {
  try {
    await fetch("http://localhost:3000/api/v1/user/update-interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, interests }),
    });
  } catch (err) {
    console.error("Failed to update interests in DB", err);
  }
}

// --- History Logic ---
function renderHistory(historyArray) {
  const container = document.getElementById("historyContainer");
  container.innerHTML = "";

  if (!historyArray || historyArray.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-camera-retro" style="font-size: 2.5rem; color: #ccc; margin-bottom: 10px; display: block;"></i>
        You haven't scanned any landmarks yet. Try the AI Scanner!
      </div>
    `;
    return;
  }

  historyArray.forEach((item) => {
    const date = item.scannedAt
      ? new Date(item.scannedAt).toLocaleDateString()
      : "Recently";

    const cardHtml = `
      <div class="card" style="cursor: default;">
        <img src="https://images.unsplash.com/photo-1539650116574-8efeb43e2b50?q=80&w=600&auto=format&fit=crop" alt="History" />
        <div style="padding: 20px; text-align: left;">
          <h3 style="color: #0b4a6f; margin-bottom: 5px; padding: 0;">${item.place_name}</h3>
          <p style="color: #666; font-size: 0.85rem; margin-bottom: 5px;">
            <i class="fas fa-calendar-alt"></i> Scanned on: ${date}
          </p>
          <div style="display:inline-block; background:#e8f5e9; color:#2e7d32; padding:3px 10px; border-radius:15px; font-size:0.8rem; font-weight:bold;">
            AI Match: ${item.confidence || "99"}%
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", cardHtml);
  });
}

function renderSavedPlaces() {
  const container = document.getElementById("savedContainer");
  const savedPlaces = [
    {
      name: "Pyramid of Djoser",
      location: "Saqqara",
      img: "https://images.unsplash.com/photo-1600521605613-267f814b1eb7?q=80&w=600&auto=format&fit=crop",
    },
    {
      name: "Karnak Temple",
      location: "Luxor",
      img: "https://images.unsplash.com/photo-1572005408401-44754eb0531c?q=80&w=600&auto=format&fit=crop",
    },
  ];

  container.innerHTML = "";

  savedPlaces.forEach((place) => {
    const cardHtml = `
      <div class="card">
        <img src="${place.img}" alt="${place.name}" />
        <div style="padding: 20px; text-align: left;">
          <h3 style="color: #0b4a6f; margin-bottom: 5px; padding: 0;">${place.name}</h3>
          <p style="color: #666; font-size: 0.9rem; margin-bottom: 10px;">
            <i class="fas fa-map-marker-alt"></i> ${place.location}
          </p>
          <button style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:1rem; font-weight:600;">
            <i class="fas fa-heart"></i> Saved
          </button>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", cardHtml);
  });
}
function renderSavedPlaces() {
  const container = document.getElementById("savedContainer");

  // جلب الداتا الحقيقية للمستخدم
  const userStr = localStorage.getItem("userProfile");
  if (!userStr) return;
  const user = JSON.parse(userStr);
  const savedPlaces = user.saved_places || [];

  container.innerHTML = "";

  if (savedPlaces.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="far fa-heart" style="font-size: 2.5rem; color: #ccc; margin-bottom: 10px; display: block;"></i>
        You haven't saved any places yet. Explore categories and save your favorites!
      </div>
    `;
    return;
  }

  savedPlaces.forEach((place) => {
    const cardHtml = `
      <div class="card" style="cursor: default;">
        <img src="${place.img}" alt="${place.name}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1539650116574-8efeb43e2b50?q=80&w=600&auto=format&fit=crop'" />
        <div style="padding: 20px; text-align: left;">
          <h3 style="color: #0b4a6f; margin-bottom: 5px; padding: 0;">${place.name}</h3>
          <p style="color: #666; font-size: 0.9rem; margin-bottom: 10px;">
            <i class="fas fa-map-marker-alt"></i> ${place.location}
          </p>
          <div style="color:#e74c3c; font-size:1rem; font-weight:600;">
            <i class="fas fa-heart"></i> Saved
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", cardHtml);
  });
}

// ==========================================
// Logout Logic
// ==========================================
function logout() {
  localStorage.removeItem("username");
  localStorage.removeItem("userId");
  localStorage.removeItem("userProfile");
  window.location.href = "auth.html";
}
