// ==========================================
// 1. SIGNUP LOGIC
// ==========================================
async function signup() {
  const name = document.getElementById("name")?.value.trim();
  const email = document.getElementById("email")?.value.trim();
  const pass = document.getElementById("pass")?.value.trim();

  const popup = document.getElementById("popup");
  const msg = document.getElementById("msg");

  if (!name || !email || !pass) {
    msg.textContent = "Please fill all fields!";
    popup.style.display = "flex";
    return;
  }

  msg.textContent = "Creating account...";
  popup.style.display = "flex";

  try {
    const response = await fetch("http://localhost:3000/api/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password: pass,
      }),
    });

    const data = await response.json();

    if (data.status === "success") {
      // حفظ البيانات في المتصفح
      localStorage.setItem("username", data.data.user.name);
      localStorage.setItem("userId", data.data.user.id);
      localStorage.setItem("userProfile", JSON.stringify(data.data.user));

      msg.textContent = "Account created successfully!";
      setTimeout(() => {
        window.location.href = "home.html";
      }, 1200);
    } else {
      msg.textContent = data.message || "Failed to create account.";
    }
  } catch (error) {
    msg.textContent = "Network error. Please check the server.";
  }
}

// ==========================================
// 2. LOGIN LOGIC
// ==========================================
async function login() {
  const email = document.getElementById("emailField")?.value.trim();
  const pass = document.getElementById("passField")?.value.trim();

  const popup = document.getElementById("loginPopup");
  const message = document.getElementById("popupMessage");

  if (!email || !pass) {
    message.textContent = "Please enter email and password";
    popup.style.display = "flex";
    return;
  }

  message.textContent = "Logging in...";
  popup.style.display = "flex";

  try {
    const response = await fetch("http://localhost:3000/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass }),
    });

    const data = await response.json();

    if (data.status === "success") {
      // حفظ البيانات في المتصفح عشان تظهر في الـ Navbar وتستخدم في الترشيحات
      localStorage.setItem("username", data.data.user.name);
      localStorage.setItem("userId", data.data.user.id);
      localStorage.setItem("userProfile", JSON.stringify(data.data.user));

      message.textContent = "Login successful!";
      setTimeout(() => {
        window.location.href = "home.html";
      }, 1200);
    } else {
      message.textContent = data.message || "Invalid credentials.";
    }
  } catch (error) {
    message.textContent = "Network error. Please check the server.";
  }
}
function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000); // تحديد مدة الصلاحية بالأيام
  document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

// طريقة الاستخدام وقت تسجيل الدخول:
// setCookie("username", data.data.user.name, 7); // يحفظ الاسم لمدة 7 أيام
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
