// ==========================================
// Profile Page Logic - Final Fixed Version
// ==========================================
const API_BASE_URL = window.API_BASE_URL;
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
async function loadProfileTripsTracker() {
  const userId = localStorage.getItem("userId");
  const container = document.getElementById("profileTripsList");
  const heroContainer = document.getElementById("activeTripHeroContainer");

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

    // Sync navbar trip counts dynamically
    document
      .querySelectorAll("#navTripsCount")
      .forEach((el) => (el.textContent = trips.length));
    const statsTripsEl = document.getElementById("statsTotalTrips");
    if (statsTripsEl) statsTripsEl.textContent = trips.length;

    if (trips.length === 0) {
      if (heroContainer) heroContainer.innerHTML = "";
      container.innerHTML = `<div style="text-align:center; padding: 30px; color:#666;"><i class="fas fa-suitcase-rolling" style="font-size:3rem; margin-bottom:15px; color:#ddd;"></i><br>You haven't saved any adventures yet.<br>Go to Home page to plan your first adventure!</div>`;
      return;
    }

    let globalVisited = 0;
    let globalTotal = 0;

    const getCityCoverImg = (cities) => {
      const primaryCity = cities && cities[0] ? cities[0].toLowerCase() : "";
      if (primaryCity.includes("cairo"))
        return "https://images.unsplash.com/photo-1572252017456-29bf24beefdf?auto=format&fit=crop&w=600&q=70";
      if (primaryCity.includes("giza"))
        return "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=600&q=70";
      if (primaryCity.includes("luxor"))
        return "https://images.unsplash.com/photo-1543157145-f78c636d023d?auto=format&fit=crop&w=600&q=70";
      if (primaryCity.includes("aswan"))
        return "https://images.unsplash.com/photo-1599933310672-0402f1a6fbfb?auto=format&fit=crop&w=600&q=70";
      if (primaryCity.includes("alexandria"))
        return "https://images.unsplash.com/photo-1568322422998-8432ef2e6c43?auto=format&fit=crop&w=600&q=70";
      return "https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=600&q=70";
    };

    // Classify trip details and verify statuses
    const processedTrips = trips.map((trip) => {
      let tripTotalPlaces = 0;
      let tripCompletedPlaces = 0;
      let nextAttraction = "Journey Complete!";
      let foundNext = false;

      if (trip.itinerary && trip.itinerary.days) {
        trip.itinerary.days.forEach((day) => {
          day.places.forEach((place, pIndex) => {
            tripTotalPlaces++;
            globalTotal++;
            const uniqueId = `chk_${trip.tripId}_d${day.day}_p${pIndex}`;
            const isChecked = localStorage.getItem(uniqueId) === "true";
            if (isChecked) {
              tripCompletedPlaces++;
              globalVisited++;
            } else if (!foundNext) {
              nextAttraction =
                typeof place === "string" ? place : place.name || "Attraction";
              foundNext = true;
            }
          });
        });
      }

      const percent =
        tripTotalPlaces === 0
          ? 0
          : Math.round((tripCompletedPlaces / tripTotalPlaces) * 100);
      let status = "upcoming";
      if (percent === 100 && tripTotalPlaces > 0) {
        status = "completed";
      }

      return {
        ...trip,
        percent,
        totalPlaces: tripTotalPlaces,
        completedPlaces: tripCompletedPlaces,
        nextAttraction,
        status,
      };
    });

    // Compute active status logic: the latest uncompleted journey block
    const reverseTrips = [...processedTrips].reverse();
    const activeTripIndex = reverseTrips.findIndex(
      (t) => t.status !== "completed",
    );
    if (activeTripIndex !== -1) {
      reverseTrips[activeTripIndex].status = "active";
    }

    // Set Dashboard Live Metrics
    const visitedEl = document.getElementById("statsPlacesVisited");
    const remainingEl = document.getElementById("statsPlacesRemaining");
    const rateEl = document.getElementById("statsCompletionRate");

    if (visitedEl) visitedEl.textContent = globalVisited;
    if (remainingEl) remainingEl.textContent = globalTotal - globalVisited;
    if (rateEl)
      rateEl.textContent = `${globalTotal === 0 ? 0 : Math.round((globalVisited / globalTotal) * 100)}%`;

    // Render Active Trip Hero Panel
    const activeTrip = reverseTrips.find((t) => t.status === "active");
    if (activeTrip && heroContainer) {
      const nowString = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      heroContainer.innerHTML = `
        <div class="active-trip-hero">
          <div class="active-trip-hero-bg" style="background-image: url('${getCityCoverImg(activeTrip.cities)}');"></div>
          <div class="active-trip-hero-content">
            <span style="background: #ff9800; color: white; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase;">⭐ Active Adventure</span>
            <h3 style="margin: 10px 0 5px 0; font-size: 1.4rem; color: white;">Expedition inside ${activeTrip.cities.join(", ")}</h3>
            <p style="font-size: 0.9rem; opacity: 0.9; margin-bottom: 15px; color: white;"><i class="fas fa-map-pin"></i> Next Stop: <b>${activeTrip.nextAttraction}</b></p>
            
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-bottom: 6px;">
              <span>Progress Vector</span>
              <span><b>${activeTrip.percent}%</b></span>
            </div>
            <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.2); border-radius: 10px; overflow: hidden; margin-bottom: 15px;">
              <div style="height: 100%; background: #22c55e; width: ${activeTrip.percent}%;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <button onclick="document.getElementById('tripCard_${activeTrip.tripId}').scrollIntoView({behavior: 'smooth', block: 'center'})" style="background: white; color: #0b4a6f; border: none; font-size: 0.85rem; padding: 8px 16px; border-radius: 8px; font-weight: bold; cursor: pointer;">Continue Journey</button>
              <span style="font-size: 0.75rem; opacity: 0.7;"><i class="far fa-clock"></i> Synced today at ${nowString}</span>
            </div>
          </div>
        </div>
      `;
    } else if (heroContainer) {
      heroContainer.innerHTML = "";
    }

    // Build the categorized travel board content HTML maps
    let finalHtml = "";

    const renderTripGroup = (title, icon, statusType) => {
      const filtered = reverseTrips.filter((t) => t.status === statusType);
      if (filtered.length === 0) return "";

      let sectionHtml = `<div class="adventure-section-title"><i class="${icon}"></i> ${title}</div>`;

      filtered.forEach((trip) => {
        let daysHtml = "";

        if (trip.itinerary && trip.itinerary.days) {
          trip.itinerary.days.forEach((day, dayIdx) => {
            let placesHtml = "";

            day.places.forEach((place, pIndex) => {
              const uniqueId = `chk_${trip.tripId}_d${day.day}_p${pIndex}`;
              const isChecked = localStorage.getItem(uniqueId) === "true";
              const placeName =
                typeof place === "string" ? place : place.name || "Attraction";

              placesHtml += `
                <div id="profTaskDiv_${uniqueId}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: ${isChecked ? "#f0fdf4" : "#f9f9f9"}; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid ${isChecked ? "#27ae60" : "#ccc"}; transition: all 0.3s ease;">
                  <label style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1;">
                    <input type="checkbox" class="prof-trip-checkbox" data-id="${uniqueId}" data-tripid="${trip.tripId}" ${isChecked ? "checked" : ""} style="width:18px; height:18px; accent-color:#27ae60; cursor:pointer;">
                    <span class="prof-task-text" style="font-weight:600; font-size:0.92rem; color:${isChecked ? "#888" : "#2c3e50"}; text-decoration:${isChecked ? "line-through" : "none"};">${placeName}</span>
                  </label>
                </div>
              `;
            });

            daysHtml += `
              <div class="day-accordion-item">
                <div class="day-acc-header" onclick="window.toggleDayAccordion('${trip.tripId}_d${day.day}')">
                  <span style="font-weight:600; color:#0b4a6f;"><i class="far fa-calendar-alt"></i> Day ${day.day} - ${day.city || "Destination"}</span>
                  <i class="fas fa-chevron-down" style="font-size:0.8rem; color:#64748b;"></i>
                </div>
                <div id="dayBody_${trip.tripId}_d${day.day}" class="day-acc-body" style="${dayIdx === 0 ? "display: block;" : "display: none;"}">
                  ${placesHtml}
                </div>
              </div>
            `;
          });
        }

        sectionHtml += `
          <div id="tripCard_${trip.tripId}" class="dashboard-trip-card">
            <div class="trip-banner-cover">
              <img class="trip-banner-img" src="${getCityCoverImg(trip.cities)}" alt="Cover">
              <div class="trip-banner-overlay"></div>
              <span class="status-badge-pill status-${trip.status}">${trip.status}</span>
              <div class="trip-banner-content">
                <h4 style="margin:0; font-size:1.15rem; font-weight:700; color: white;">Journey to ${trip.cities.join(", ")}</h4>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px; font-size:0.85rem; opacity:0.9;">
                  <span>${trip.days} Days Adventure</span>
                  <span id="cardPercentText_${trip.tripId}" style="font-weight:bold;">${trip.percent}% Complete</span>
                </div>
              </div>
            </div>
            <div>
              ${daysHtml}
            </div>
          </div>
        `;
      });

      return sectionHtml;
    };

    finalHtml += renderTripGroup("Active Trips", "fas fa-bolt", "active");
    finalHtml += renderTripGroup(
      "Upcoming Trips",
      "fas fa-hourglass-start",
      "upcoming",
    );
    finalHtml += renderTripGroup(
      "Completed Trips",
      "fas fa-check-double",
      "completed",
    );

    container.innerHTML = finalHtml;

    // Expandable Day Accordions Engine
    window.toggleDayAccordion = (id) => {
      const el = document.getElementById(`dayBody_${id}`);
      if (el) {
        el.style.display = el.style.display === "none" ? "block" : "none";
      }
    };

    // Attach dynamic state sync events
    document.querySelectorAll(".prof-trip-checkbox").forEach((chk) => {
      chk.addEventListener("change", (e) => {
        const id = e.target.dataset.id;
        const taskDiv = document.getElementById(`profTaskDiv_${id}`);
        const taskText = taskDiv.querySelector(".prof-task-text");

        if (e.target.checked) {
          localStorage.setItem(id, "true");
          taskDiv.style.borderLeftColor = "#27ae60";
          taskDiv.style.background = "#f0fdf4";
          taskText.style.color = "#888";
          taskText.style.textDecoration = "line-through";
        } else {
          localStorage.removeItem(id);
          taskDiv.style.borderLeftColor = "#ccc";
          taskDiv.style.background = "#f9f9f9";
          taskText.style.color = "#2c3e50";
          taskText.style.textDecoration = "none";
        }

        // Live calculation loops to update dashboard components instantly
        loadProfileTripsTracker();
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = `<div style="text-align:center; padding:20px; color:#e74c3c;">Failed to load adventures.</div>`;
  }
}
// تأثير الإضاءة (يُضاف في نهاية profile.js)
document.addEventListener("DOMContentLoaded", () => {
  // التحقق هل هناك تنقل لسكشن معين
  if (window.location.hash === "#myTripsTracker") {
    const trackerSection = document.getElementById("myTripsTracker");

    if (trackerSection) {
      // 1. تأخير بسيط لضمان تحميل البيانات أولاً
      setTimeout(() => {
        // 2. التنقل السلس
        trackerSection.scrollIntoView({ behavior: "smooth", block: "center" });

        // 3. إضافة تأثير الإضاءة
        trackerSection.classList.add("highlight-tracker");

        // 4. إزالة التأثير بعد ثانيتين
        setTimeout(() => {
          trackerSection.classList.remove("highlight-tracker");
        }, 2000);
      }, 500);
    }
  }
});
