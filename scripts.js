// ----------------------------------------------
// 1. CONSTANTES & UTILES
// ----------------------------------------------
const API_URL = "https://script.google.com/macros/s/AKfycbzBLlXlwArIS1KrZDJNIJPpn1cfgA0YJSZxz5fs25jB64ngEMp3hMatf7hSPVashceG/exec";

// Helper : afficher une alerte
function showAlert(type, message, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const color = type === "error" ? "red" : "green";
  container.innerHTML = `
    <div class="bg-${color}-100 border border-${color}-300 text-${color}-800 px-4 py-2 rounded mb-2">
      ${message}
    </div>
  `;
  setTimeout(() => { container.innerHTML = ""; }, 4000);
}

// Helper : utilisateur connecté
function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser") || "null");
}

// Mise à jour nav
function updateNav() {
  const user = getCurrentUser();
  const navLogin = document.getElementById("nav-login");
  const navRegister = document.getElementById("nav-register");
  const navDashClient = document.getElementById("nav-dashboard-client");
  const navDashDriver = document.getElementById("nav-dashboard-driver");
  const btnLogout = document.getElementById("btn-logout");

  if (user) {
    navLogin?.classList.add("hidden");
    navRegister?.classList.add("hidden");
    if (user.role === "client") navDashClient?.classList.remove("hidden");
    if (user.role === "driver") navDashDriver?.classList.remove("hidden");
    btnLogout?.classList.remove("hidden");
    btnLogout?.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "index.html";
    });
  } else {
    navLogin?.classList.remove("hidden");
    navRegister?.classList.remove("hidden");
    navDashClient?.classList.add("hidden");
    navDashDriver?.classList.add("hidden");
    btnLogout?.classList.add("hidden");
  }
}
document.addEventListener("DOMContentLoaded", updateNav);

// Requête POST
async function apiPost(path, body = {}) {
  try {
    const res = await fetch(API_URL + `?path=${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error("Erreur API:", err);
    return { success: false, message: "Erreur réseau" };
  }
}

// ----------------------------------------------
// 2. PAGE login.html
// ----------------------------------------------
if (window.location.pathname.includes("login.html")) {
  document.getElementById("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();

    if (!email || !password) {
      showAlert("error", "Veuillez remplir tous les champs.", "alert-container");
      return;
    }

    const res = await apiPost("loginUser", { email, password });
    if (res.success) {
      localStorage.setItem("currentUser", JSON.stringify({ email, role: res.role }));
      showAlert("success", "Connexion réussie !", "alert-container");
      setTimeout(() => {
        window.location.href = res.role === "client" ? "dashboard-client.html" : "dashboard-driver.html";
      }, 1000);
    } else {
      showAlert("error", res.message || "Erreur de connexion.", "alert-container");
    }
  });
}

// ----------------------------------------------
// 3. PAGE register.html (déjà géré par HTML avec redirection vers profile-client/driver.html)
// ----------------------------------------------

// ----------------------------------------------
// 4. PAGE profile-client.html
// ----------------------------------------------
if (window.location.pathname.includes("profile-client.html")) {
  const email = localStorage.getItem("temp_email");
  const password = localStorage.getItem("temp_password");
  const role = localStorage.getItem("temp_role");

  if (!email || !password || role !== "client") {
    window.location.href = "register.html";
  }

  document.getElementById("profile-client-form").addEventListener("submit", async e => {
    e.preventDefault();
    const fullName = document.getElementById("client-name").value.trim();
    const phone = document.getElementById("client-phone").value.trim();
    const address = document.getElementById("client-address").value.trim();

    if (!fullName || !phone || !address) {
      showAlert("error", "Veuillez remplir tous les champs.", "alert-container");
      return;
    }

    const regRes = await apiPost("registerUser", { name: fullName, email, password, role, phone });
    if (!regRes.success) {
      showAlert("error", regRes.message, "alert-container");
      return;
    }

    const profRes = await apiPost("completeProfile", { email, role, fullName, phone, address });
    if (profRes.success) {
      localStorage.setItem("currentUser", JSON.stringify({ email, role }));
      localStorage.removeItem("temp_email");
      localStorage.removeItem("temp_password");
      localStorage.removeItem("temp_role");
      showAlert("success", "Profil enregistré !", "alert-container");
      setTimeout(() => window.location.href = "dashboard-client.html", 800);
    } else {
      showAlert("error", profRes.message, "alert-container");
    }
  });
}

// ----------------------------------------------
// 5. PAGE profile-driver.html
// ----------------------------------------------
if (window.location.pathname.includes("profile-driver.html")) {
  const email = localStorage.getItem("temp_email");
  const password = localStorage.getItem("temp_password");
  const role = localStorage.getItem("temp_role");

  if (!email || !password || role !== "driver") {
    window.location.href = "register.html";
  }

  document.getElementById("profile-driver-form").addEventListener("submit", async e => {
    e.preventDefault();
    const fullName = document.getElementById("driver-name").value.trim();
    const phone = document.getElementById("driver-phone").value.trim();
    const licenseNumber = document.getElementById("driver-license").value.trim();
    const vehicleType = document.getElementById("driver-vehicle").value.trim();
    const plateNumber = document.getElementById("driver-plate").value.trim();

    if (!fullName || !phone || !licenseNumber || !vehicleType || !plateNumber) {
      showAlert("error", "Tous les champs sont obligatoires.", "alert-container");
      return;
    }

    const regRes = await apiPost("registerUser", { name: fullName, email, password, role, phone });
    if (!regRes.success) {
      showAlert("error", regRes.message, "alert-container");
      return;
    }

    const profRes = await apiPost("completeProfile", {
      email, role, fullName, phone, licenseNumber, vehicleType, plateNumber
    });
    if (profRes.success) {
      localStorage.setItem("currentUser", JSON.stringify({ email, role }));
      localStorage.removeItem("temp_email");
      localStorage.removeItem("temp_password");
      localStorage.removeItem("temp_role");
      showAlert("success", "Profil livreur enregistré !", "alert-container");
      setTimeout(() => window.location.href = "dashboard-driver.html", 800);
    } else {
      showAlert("error", profRes.message, "alert-container");
    }
  });
}
