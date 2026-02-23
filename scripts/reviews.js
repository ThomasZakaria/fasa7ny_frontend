/**
 * Fasa7ny - Review System Module
 * Handles fetching existing reviews and submitting new ones
 */

// متغير عالمي لتخزين معرف المكان النشط حالياً في الموديل
let currentActivePlaceId = null;

const REVIEWS_API_BASE = "http://127.0.0.1:3000/api/v1/places";

/**
 * جلب كافة التقييمات الخاصة بمكان معين من السيرفر
 * @param {string} placeId - المعرف الخاص بالمكان
 */
async function loadReviews(placeId) {
  currentActivePlaceId = placeId;
  const container = document.getElementById("reviewsList");
  if (!container) return;

  // إظهار علامة تحميل بسيطة
  container.innerHTML = `<div class="spinner" style="width:25px; height:25px; margin: 20px auto;"></div>`;

  try {
    const response = await fetch(`${REVIEWS_API_BASE}/${placeId}/reviews`);
    const data = await response.json();

    if (data.status === "success" && data.data.reviews.length > 0) {
      container.innerHTML = "";
      data.data.reviews.forEach((review) => {
        const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
        const reviewHtml = `
            <div class="review-item" style="border-bottom: 1px solid #eee; padding: 15px 0;">
                <div class="review-header" style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span class="reviewer-name" style="font-weight: 600; color: #0b4a6f;">
                        <i class="fas fa-user-circle"></i> ${review.username || "Anonymous Traveler"}
                    </span>
                    <span class="review-stars" style="color: #f1c40f;">${stars}</span>
                </div>
                <p class="review-text" style="color: #444; font-size: 0.95rem; line-height: 1.5; margin: 0;">
                    ${review.comment}
                </p>
                <small style="color: #999; font-size: 0.75rem;">
                    ${new Date(review.createdAt).toLocaleDateString()}
                </small>
            </div>
        `;
        container.insertAdjacentHTML("beforeend", reviewHtml);
      });
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding: 20px; color: #999;">
            <i class="far fa-comments" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
            No reviews yet. Be the first to share your experience!
        </div>`;
    }
  } catch (error) {
    console.error("Reviews Load Error:", error);
    container.innerHTML = `<p style="color:red; text-align:center;">Could not load reviews.</p>`;
  }
}

/**
 * التحقق من البيانات وإرسال تقييم جديد للسيرفر
 */
async function submitReview() {
  // جلب بيانات المستخدم من localStorage (يتم تخزينها عند تسجيل الدخول)
  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username");

  const commentInput = document.getElementById("reviewComment");
  const comment = commentInput ? commentInput.value.trim() : "";
  const ratingElement = document.querySelector('input[name="stars"]:checked');

  // 1. فحص الأمان وتسجيل الدخول
  if (!userId) {
    alert("Please Sign In first to post a review.");
    // اختياري: تحويل المستخدم لصفحة تسجيل الدخول
    // window.location.href = "auth.html";
    return;
  }

  // 2. فحص اكتمال البيانات
  if (!ratingElement || !comment) {
    alert("Please provide both a star rating and a comment.");
    return;
  }

  const rating = ratingElement.value;

  try {
    const response = await fetch(
      `${REVIEWS_API_BASE}/${currentActivePlaceId}/reviews`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          username: username || "Traveler",
          rating,
          comment,
        }),
      },
    );

    const data = await response.json();

    if (data.status === "success") {
      // 3. تصفير النموذج بعد النجاح
      commentInput.value = "";
      ratingElement.checked = false;

      // 4. إعادة تحميل القائمة فوراً لإظهار التقييم الجديد
      loadReviews(currentActivePlaceId);

      // رسالة نجاح بسيطة
      console.log("Review posted successfully!");
    } else {
      alert("Error: " + (data.message || "Could not post review."));
    }
  } catch (error) {
    console.error("Submission Error:", error);
    alert("Server connection failed. Please try again later.");
  }
}
