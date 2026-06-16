// ==========================================
// Profile Page Logic - Final Fixed Version
// ==========================================
const API_BASE_URL = "${API_BASE_URL}";
const DEFAULT_PLACE_IMAGE =
  "https://s7g10.scene7.com/is/image/barcelo/pyramids-of-giza-facts_ancient-pyramids-of-giza?&&fmt=webp-alpha&qlt=75&wid=1300&fit=crop,1";

document.addEventListener("DOMContentLoaded", () => {
  loadProfileData();
  loadProfileTripsTracker(); // تشغيل الـ Tracker أول ما الصفحة تفتح
});

/**
 * دالة مساعدة لاختيار الرابط الصحيح للصورة من البيانات
 */
function getValidProfileImg(item) {
  if (!item) return DEFAULT_PLACE_IMAGE;
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
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    const result = await response.json();

    if (result.status === "success" && result.data.user) {
      const user = result.data.user;

      document.getElementById("profileName").textContent =
        user.username || user.name || "Tourist";
      document.getElementById("profileEmail").textContent = user.email || "";

      renderInterests(user.interests || []);
      renderHistory(user.scan_history || []);
      renderSavedPlaces(user.saved_places || []);
    } else {
      document.getElementById("profileName").textContent = "User not found";
    }
  } catch (err) {
    console.error("Profile Load Error:", err);
    document.getElementById("profileName").textContent =
      "Error loading profile";
  }
}

/**
 * 2. تسجيل الخروج
 */
function logout() {
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
  localStorage.removeItem("userProfile");
  window.location.href = "auth.html";
}

/**
 * 3. رسم الاهتمامات
 */
function renderInterests(interests) {
  const container = document.getElementById("interestsContainer");
  if (!container) return;
  container.innerHTML = "";

  if (interests.length === 0) {
    container.innerHTML = `<p class="empty-msg" style="color:#666;">No interests added yet.</p>`;
    return;
  }

  interests.forEach((interest) => {
    const tagHtml = `
      <div class="tag" style="background:#e0f2fe; color:#0b4a6f; padding:8px 15px; border-radius:20px; display:inline-flex; align-items:center; gap:8px;">
        <span>${interest}</span>
        <i class="fas fa-times" style="cursor:pointer; color:#e74c3c;" onclick="removeInterest('${interest}')"></i>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", tagHtml);
  });
}

async function addInterest() {
  const input = document.getElementById("newInterest");
  const value = input.value.trim();
  if (!value) return;

  const userId = localStorage.getItem("userId");
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    const result = await response.json();
    const user = result.data.user;
    let interests = user.interests || [];

    if (!interests.includes(value)) {
      interests.push(value);
      await fetch(`${API_BASE_URL}/user/update-interests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, interests }),
      });
      input.value = "";
      renderInterests(interests);
    }
  } catch (err) {
    console.error("Add Interest Error:", err);
  }
}

async function removeInterest(interest) {
  const userId = localStorage.getItem("userId");
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`);
    const result = await response.json();
    const user = result.data.user;
    let interests = user.interests || [];

    interests = interests.filter((i) => i !== interest);
    await fetch(`${API_BASE_URL}/user/update-interests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, interests }),
    });
    renderInterests(interests);
  } catch (err) {
    console.error("Remove Interest Error:", err);
  }
}

/**
 * 4. رسم تاريخ المسح (Scan History)
 */
function renderHistory(history) {
  const container = document.getElementById("historyContainer");
  if (!container) return;
  container.innerHTML = "";

  if (!history || history.length === 0) {
    container.innerHTML = `<p class="empty-msg" style="color:#666;">No scanning history found.</p>`;
    return;
  }

  history.forEach((item) => {
    const confidence = item.confidence || 0;
    const formattedConfidence =
      typeof confidence === "number" ? confidence.toFixed(1) : confidence;

    const cardHtml = `
      <div class="card" style="border:1px solid #eee; border-radius:12px; overflow:hidden;">
        <img src="${getValidProfileImg(item)}" alt="${item.name || item.place}" 
             style="width: 100%; height: 180px; object-fit: cover;"
             onerror="this.onerror=null; this.src='${DEFAULT_PLACE_IMAGE}'">
        <div style="padding: 15px; text-align: left;">
          <h3 style="color: #0b4a6f; margin-bottom: 5px; font-size:1.1rem;">${item.name || item.place}</h3>
          <p style="color:#666; font-size: 0.85rem; margin-bottom: 10px;">
            <i class="far fa-clock"></i> ${new Date(item.date).toLocaleDateString()}
          </p>
          <span style="background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">
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
    container.innerHTML = `<p class="empty-msg" style="color:#666;">No saved places yet.</p>`;
    return;
  }

  savedPlaces.forEach((place) => {
    const cardHtml = `
      <div class="card" style="border:1px solid #eee; border-radius:12px; overflow:hidden;">
        <img src="${getValidProfileImg(place)}" alt="${place.name}" 
             style="width: 100%; height: 180px; object-fit: cover;"
             onerror="this.onerror=null; this.src='${DEFAULT_PLACE_IMAGE}'">
        <div style="padding: 15px; text-align: left;">
          <h3 style="color: #0b4a6f; margin-bottom: 5px; font-size:1.1rem; padding:0;">${place.name}</h3>
          <p style="color:#666; font-size: 0.85rem; margin-bottom: 10px;">
            <i class="fas fa-map-marker-alt"></i> ${place.location || "Egypt"}
          </p>
        </div>
      </div>
    `;
    container.insertAdjacentHTML("beforeend", cardHtml);
  });
}

/**
 * 6. جلب الرحلات المحفوظة وعرضها (My Trips Tracker)
 */
async function loadProfileTripsTracker() {
  const userId = localStorage.getItem("userId");
  const container = document.getElementById("profileTripsList");

  if (!container) return;

  if (!userId) {
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#e74c3c; background:#fdf0ed; border-radius:12px;">Please sign in to track your trips.</div>`;
    return;
  }

  container.innerHTML = `<div class="spinner" style="margin: 0 auto;"></div><p style="text-align:center; margin-top:10px; color:#666;">Syncing your adventures...</p>`;

  try {
    const res = await fetch(`${API_BASE_URL}/users/${userId}`);
    const data = await res.json();
    const trips = data.data.user.saved_trips || [];

    if (trips.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 30px; color:#666;"><i class="fas fa-suitcase-rolling" style="font-size:3rem; margin-bottom:15px; color:#ddd;"></i><br>You haven't saved any trips yet.<br>Go to Home page to plan your first adventure!</div>`;
      return;
    }

    let html = "";

    // الترتيب من الأحدث للأقدم
    trips.reverse().forEach((trip) => {
      let totalPlaces = 0;
      let completedPlaces = 0;
      let tasksHtml = "";

      if (trip.itinerary && trip.itinerary.days) {
        trip.itinerary.days.forEach((day) => {
          tasksHtml += `<h5 style="margin: 15px 0 8px 0; color:#0b4a6f; border-bottom: 1px solid #eee; padding-bottom: 5px; font-size:1.1rem;">📅 Day ${day.day} - ${day.city}</h5>`;

          day.places.forEach((place, pIndex) => {
            totalPlaces++;
            const placeName =
              typeof place === "string" ? place : place.name || "Attraction";
            // استخدام نفس الـ ID الفريد عشان المزامنة تتم عبر LocalStorage
            const uniqueId = `chk_${trip.tripId}_d${day.day}_p${pIndex}`;

            const isChecked = localStorage.getItem(uniqueId) === "true";
            if (isChecked) completedPlaces++;

            tasksHtml += `
              <div class="place-task" id="profTaskDiv_${uniqueId}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: ${isChecked ? "#f0fdf4" : "#f9f9f9"}; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid ${isChecked ? "#27ae60" : "#ccc"}; transition: all 0.3s ease; flex-wrap: wrap; gap: 10px;">
                <label style="display:flex; align-items:center; gap:12px; cursor:pointer; flex:1; min-width: 200px;">
                  <input type="checkbox" class="prof-trip-checkbox" data-id="${uniqueId}" ${isChecked ? "checked" : ""} style="width:20px; height:20px; accent-color:#27ae60; cursor:pointer;">
                  <span class="prof-task-text" style="font-weight:bold; font-size:1rem; color:${isChecked ? "#888" : "#2c3e50"}; text-decoration:${isChecked ? "line-through" : "none"}; transition: 0.3s;">${placeName}</span>
                </label>
                <div class="task-actions" style="display:flex; gap:8px;">
                  <button onclick="alert('🔄 AI Swap feature is planned for V2!')" style="border:none; background:#e0f2fe; color:#0284c7; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.8rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);"><i class="fas fa-exchange-alt"></i> Swap</button>
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
        <div class="prof-day-card" style="margin-bottom:25px; border: 1px solid #f0f0f0; border-radius: 16px; padding: 20px; background:#fff;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h4 style="margin:0; color:#e67e22; font-size:1.2rem;">🌍 Trip to ${trip.cities.join(", ")}</h4>
            <span id="profBadge_${trip.tripId}" style="background:linear-gradient(90deg, #27ae60, #2ecc71); color:white; padding:5px 12px; border-radius:20px; font-weight:bold; font-size:1rem; transition: 0.4s;">${progressPercent}%</span>
          </div>
          
          <div style="width: 100%; height: 12px; background: #eee; border-radius: 10px; margin-top: 15px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
            <div id="profProgBar_${trip.tripId}" style="height: 100%; background: linear-gradient(90deg, #27ae60, #2ecc71); width: ${progressPercent}%; transition: width 0.5s ease-in-out;"></div>
          </div>
          
          <div style="margin-top: 20px;">
            ${tasksHtml}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // تفعيل تفاعل الـ Checkboxes والمزامنة
    document.querySelectorAll(".prof-trip-checkbox").forEach((chk) => {
      chk.addEventListener("change", (e) => {
        const id = e.target.dataset.id;
        const taskDiv = document.getElementById(`profTaskDiv_${id}`);
        const tripId = id.split("_")[1];
        const taskText = taskDiv.querySelector(".prof-task-text");

        if (e.target.checked) {
          localStorage.setItem(id, "true"); // المزامنة
          taskDiv.style.borderLeftColor = "#27ae60";
          taskDiv.style.background = "#f0fdf4";
          taskText.style.color = "#888";
          taskText.style.textDecoration = "line-through";
        } else {
          localStorage.removeItem(id); // المزامنة
          taskDiv.style.borderLeftColor = "#ccc";
          taskDiv.style.background = "#f9f9f9";
          taskText.style.color = "#2c3e50";
          taskText.style.textDecoration = "none";
        }

        const tripCard = taskDiv.closest(".prof-day-card");
        const totalCheckboxes = tripCard.querySelectorAll(
          ".prof-trip-checkbox",
        ).length;
        const checkedBoxes = tripCard.querySelectorAll(
          ".prof-trip-checkbox:checked",
        ).length;
        const newPercent = Math.round((checkedBoxes / totalCheckboxes) * 100);

        document.getElementById(`profProgBar_${tripId}`).style.width =
          `${newPercent}%`;
        document.getElementById(`profBadge_${tripId}`).textContent =
          `${newPercent}%`;
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#e74c3c;">Failed to load trips.</div>`;
  }
}
