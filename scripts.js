const API_URL = "https://script.google.com/macros/s/AKfycbzBLlXlwArIS1KrZDJNIJPpn1cfgA0YJSZxz5fs25jB64ngEMp3hMatf7hSPVashceG/exec";

// Affichage de messages (error ou success)
function showAlert(message, type = 'error', containerId = "alert-container") {
  const container = document.getElementById(containerId);
  if (!container) return;
  const bgColor = type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
  container.innerHTML = `
    <div class="p-3 mb-4 text-sm rounded ${bgColor}">
      ${message}
    </div>`;
  setTimeout(() => { container.innerHTML = ""; }, 5000);
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser") || "null");
}

function updateNav() {
  const user = getCurrentUser();
  document.getElementById("nav-login")?.classList.toggle("hidden", !!user);
  document.getElementById("nav-register")?.classList.toggle("hidden", !!user);
  document.getElementById("nav-dashboard-client")?.classList.toggle("hidden", !(user && user.role === "client"));
  document.getElementById("nav-dashboard-driver")?.classList.toggle("hidden", !(user && user.role === "driver"));
  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) {
    logoutBtn.classList.toggle("hidden", !user);
    logoutBtn.onclick = () => {
      localStorage.clear();
      window.location.href = "index.html";
    };
  }
}
document.addEventListener("DOMContentLoaded", updateNav);

// Appel POST générique avec gestion des erreurs et message serveur
async function apiPost(path, data = {}) {
  try {
    const res = await fetch(`${API_URL}?path=${encodeURIComponent(path)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      // HTTP status != 2xx
      return { success: false, message: `Erreur HTTP: ${res.status}` };
    }
    const json = await res.json();
    if (!json.success) {
      // réponse من السيرفر فيها success=false مع رسالة
      return { success: false, message: json.message || "Erreur inconnue du serveur." };
    }
    return json;
  } catch (e) {
    console.error("Erreur API", e);
    return { success: false, message: "Erreur réseau ou serveur." };
  }
}

// --------- login.html ----------
if (window.location.pathname.includes("login.html")) {
  document.getElementById("login-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    if (!email || !password) return showAlert("Champs requis.", "error");

    const res = await apiPost("loginUser", { email, password });
    if (res.success) {
      localStorage.setItem("currentUser", JSON.stringify({ email, role: res.role }));
      showAlert("Connexion réussie", "success");
      setTimeout(() => {
        window.location.href = res.role === "client" ? "dashboard-client.html" : "dashboard-driver.html";
      }, 1000);
    } else {
      showAlert(res.message, "error");
    }
  });
}

// --------- profile-client.html ----------
if (window.location.pathname.includes("profile-client.html")) {
  const email = localStorage.getItem("temp_email");
  const password = localStorage.getItem("temp_password");
  const role = localStorage.getItem("temp_role");
  if (!email || !password || role !== "client") window.location.href = "register.html";

  document.getElementById("profile-client-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const name = document.getElementById("client-name").value.trim();
    const phone = document.getElementById("client-phone").value.trim();
    const address = document.getElementById("client-address").value.trim();
    if (!name || !phone || !address) return showAlert("Champs requis.", "error");

    const regRes = await apiPost("registerUser", { name, email, password, role, phone });
    if (!regRes.success) return showAlert(regRes.message, "error");

    const profRes = await apiPost("completeProfile", { email, role, fullName: name, phone, address });
    if (profRes.success) {
      localStorage.setItem("currentUser", JSON.stringify({ email, role }));
      localStorage.removeItem("temp_email");
      localStorage.removeItem("temp_password");
      localStorage.removeItem("temp_role");
      showAlert("Profil enregistré", "success");
      setTimeout(() => window.location.href = "dashboard-client.html", 1000);
    } else {
      showAlert(profRes.message, "error");
    }
  });
}

// --------- profile-driver.html ----------
if (window.location.pathname.includes("profile-driver.html")) {
  const email = localStorage.getItem("temp_email");
  const password = localStorage.getItem("temp_password");
  const role = localStorage.getItem("temp_role");
  if (!email || !password || role !== "driver") window.location.href = "register.html";

  document.getElementById("profile-driver-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const name = document.getElementById("driver-name").value.trim();
    const phone = document.getElementById("driver-phone").value.trim();
    const license = document.getElementById("driver-license").value.trim();
    const vehicle = document.getElementById("driver-vehicle").value;
    const plate = document.getElementById("driver-plate").value.trim();
    if (!name || !phone || !license || !vehicle || !plate) return showAlert("Champs requis.", "error");

    const regRes = await apiPost("registerUser", { name, email, password, role, phone });
    if (!regRes.success) return showAlert(regRes.message, "error");

    const profRes = await apiPost("completeProfile", { email, role, fullName: name, phone, licenseNumber: license, vehicleType: vehicle, plateNumber: plate });
    if (profRes.success) {
      localStorage.setItem("currentUser", JSON.stringify({ email, role }));
      localStorage.removeItem("temp_email");
      localStorage.removeItem("temp_password");
      localStorage.removeItem("temp_role");
      showAlert("Profil enregistré", "success");
      setTimeout(() => window.location.href = "dashboard-driver.html", 1000);
    } else {
      showAlert(profRes.message, "error");
    }
  });
}
