// ==========================================
// 1. SIGNUP LOGIC
// ==========================================
async function signup() {
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const passInput = document.getElementById("pass");

  const name = nameInput?.value.trim();
  const email = emailInput?.value.trim();
  const pass = passInput?.value.trim();

  const popup = document.getElementById("popup");
  const msg = document.getElementById("msg");

  if (!name || !email || !pass) {
    if (msg) msg.textContent = "Please fill all fields!";
    if (popup) popup.style.display = "flex";
    return;
  }

  if (msg) msg.textContent = "Creating account...";
  if (popup) popup.style.display = "flex";

  try {
    const response = await fetch("http://127.0.0.1:3000/api/v1/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: name, // إرسال الاسم كـ username للـ Backend
        email: email,
        password: pass,
      }),
    });

    const data = await response.json();

    if (data.status === "success") {
      const user = data.data.user;

      // ✅ تخزين البيانات بشكل سليم لتجنب undefined
      localStorage.setItem("userId", user.id);
      localStorage.setItem("username", user.username);
      localStorage.setItem("userProfile", JSON.stringify(user));

      if (msg) msg.textContent = "Account created successfully!";

      setTimeout(() => {
        window.location.href = "home.html";
      }, 1200);
    } else {
      if (msg) msg.textContent = data.message || "Email already exists!";
    }
  } catch (error) {
    if (msg) msg.textContent = "Server is offline. Please try again later.";
    console.error("Signup Error:", error);
  }
}

// ==========================================
// 2. LOGIN LOGIC
// ==========================================
async function login() {
  const emailField = document.getElementById("emailField");
  const passField = document.getElementById("passField");

  const email = emailField?.value.trim();
  const pass = passField?.value.trim();

  const popup = document.getElementById("loginPopup");
  const message = document.getElementById("popupMessage");

  if (!email || !pass) {
    if (message) message.textContent = "Please enter email and password";
    if (popup) popup.style.display = "flex";
    return;
  }

  if (message) message.textContent = "Checking credentials...";
  if (popup) popup.style.display = "flex";

  try {
    const response = await fetch("http://127.0.0.1:3000/api/v1/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass }),
    });

    const data = await response.json();

    if (data.status === "success") {
      const user = data.data.user;

      // ✅ تخزين البيانات بشكل سليم لتجنب undefined
      localStorage.setItem("userId", user.id);
      localStorage.setItem("username", user.username);
      localStorage.setItem("userProfile", JSON.stringify(user));

      if (message) message.textContent = "Login successful! Welcome back.";

      setTimeout(() => {
        window.location.href = "home.html";
      }, 1200);
    } else {
      if (message)
        message.textContent = data.message || "Invalid email or password.";
    }
  } catch (error) {
    if (message) message.textContent = "Network error. Check your connection.";
    console.error("Login Error:", error);
  }
}

// ==========================================
// 3. POPUP UTILITIES
// ==========================================
function closePopup() {
  const popup = document.getElementById("popup");
  if (popup) popup.style.display = "none";
}

function closeLoginPopup() {
  const popup = document.getElementById("loginPopup");
  if (popup) popup.style.display = "none";
}
