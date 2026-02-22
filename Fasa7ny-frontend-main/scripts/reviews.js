/**
 * Fasa7ny - Review System Module
 * Handles fetching existing reviews and submitting new ones
 */

// Global state for the active landmark being viewed
let currentActivePlaceId = null;

/**
 * Fetches all reviews for a specific landmark from the server
 * @param {string} placeId - The ID of the landmark
 */
async function loadReviews(placeId) {
  currentActivePlaceId = placeId;
  const container = document.getElementById("reviewsList");
  container.innerHTML = `<div class="spinner" style="width:25px; height:25px;"></div>`;

  try {
    const response = await fetch(
      `http://localhost:3000/api/v1/places/${placeId}/reviews`,
    );
    const data = await response.json();

    if (data.status === "success" && data.data.reviews.length > 0) {
      container.innerHTML = "";
      data.data.reviews.forEach((review) => {
        const reviewHtml = `
                    <div class="review-item">
                        <div class="review-header">
                            <span class="reviewer-name">${review.username || "Anonymous Traveler"}</span>
                            <span class="review-stars">${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</span>
                        </div>
                        <p class="review-text">${review.comment}</p>
                    </div>
                `;
        container.insertAdjacentHTML("beforeend", reviewHtml);
      });
    } else {
      container.innerHTML = `<p style="text-align:center; color:#94a3b8; font-style:italic;">No reviews yet. Share your experience!</p>`;
    }
  } catch (error) {
    console.error("Critical: Failed to fetch reviews:", error);
    container.innerHTML = `<p style="color:#ef4444;">Could not load reviews. Check server connection.</p>`;
  }
}

/**
 * Validates and submits a new user review to the Backend
 */
async function submitReview() {
  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");
  const comment = document.getElementById("reviewComment").value.trim();
  const ratingElement = document.querySelector('input[name="stars"]:checked');

  // 1. Security & Validation Check
  if (!userId) {
    alert("Authentication Required: Please sign in to post a review.");
    return;
  }
  if (!ratingElement || !comment) {
    alert("Incomplete Data: Please provide both a star rating and a comment.");
    return;
  }

  const rating = ratingElement.value;

  try {
    const response = await fetch(
      `http://localhost:3000/api/v1/places/${currentActivePlaceId}/reviews`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, username, rating, comment }),
      },
    );

    const data = await response.json();

    if (data.status === "success") {
      // Reset UI form upon successful submission
      document.getElementById("reviewComment").value = "";
      ratingElement.checked = false;
      // Hot-reload reviews list
      loadReviews(currentActivePlaceId);
    }
  } catch (error) {
    console.error("Error: Review submission failed:", error);
    alert("Network Error: Unable to post your review at this time.");
  }
}
