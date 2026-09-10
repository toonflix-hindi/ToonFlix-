// ============================================
// 🔐 APNA PASSWORD YAHAN SET KARO
// ============================================
const ADMIN_PASSWORD = "toonflix123";  // ← Ye apna password rakho
// ============================================

function handleLogin(e) {
  e.preventDefault();
  const input = document.getElementById("passwordInput").value;
  const errorEl = document.getElementById("loginError");

  if (input === ADMIN_PASSWORD) {
    // ✅ Correct password
    sessionStorage.setItem("toonflix_admin", "true");
    localStorage.setItem("toonflix_admin", "true");
    errorEl.textContent = "";
    window.location.href = "admin.html";
  } else {
    // ❌ Wrong password
    errorEl.textContent = "❌ Galat password! Dobara try karein.";
    document.getElementById("passwordInput").value = "";
    document.getElementById("passwordInput").focus();
  }
}

// Agar already logged in hai toh seedha admin panel bhej do
if (
  sessionStorage.getItem("toonflix_admin") === "true" ||
  localStorage.getItem("toonflix_admin") === "true"
) {
  window.location.href = "admin.html";
}