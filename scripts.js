// ----------------------------------------------
// 1. CONSTANTES & UTILES
// ----------------------------------------------
const API_URL = "https://script.google.com/macros/s/AKfycbzX0KHJwAxZwX2qKKLFolqhARNF5BDuLRQSzlM3oYkG9-EoV_83oLkov2Vr5QhGKrvv/exec"; // ← Remplace par ton URL Web App

// Helper : afficher une alerte sous forme de bannière
function showAlert(type, message, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const color = type === "error" ? "red" : "green";
  container.innerHTML = `
    <div class="bg-${color}-100 border border-${color}-300 text-${color}-800 px-4 py-2 rounded mb-2">
      ${message}
    </div>
  `;
  setTimeout(() => { container.innerHTML = ""; }, 3000);
}

// Helper : obtenir utilisateur connecté depuis localStorage
function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser") || "null");
}

// Helper : mettre à jour la barre de navigation selon l’état de connexion
function updateNav() {
  const user = getCurrentUser();
  const navLogin = document.getElementById("nav-login");
  const navRegister = document.getElementById("nav-register");
  const navDashClient = document.getElementById("nav-dashboard-client");
  const navDashDriver = document.getElementById("nav-dashboard-driver");
  const btnLogout = document.getElementById("btn-logout");

  if (user) {
    if (navLogin) navLogin.classList.add("hidden");
    if (navRegister) navRegister.classList.add("hidden");
    if (user.role === "client" && navDashClient) navDashClient.classList.remove("hidden");
    if (user.role === "driver" && navDashDriver) navDashDriver.classList.remove("hidden");
    if (btnLogout) {
      btnLogout.classList.remove("hidden");
      btnLogout.addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "index.html";
      });
    }
  } else {
    if (navLogin) navLogin.classList.remove("hidden");
    if (navRegister) navRegister.classList.remove("hidden");
    if (navDashClient) navDashClient.classList.add("hidden");
    if (navDashDriver) navDashDriver.classList.add("hidden");
    if (btnLogout) btnLogout.classList.add("hidden");
  }
}

// Exécute à chaque chargement de page
document.addEventListener("DOMContentLoaded", updateNav);

// Helper : appel POST générique vers APP SCRIPT
async function apiPost(path, body = {}) {
  try {
    const res = await fetch(`${API_URL}?path=${path}`, {
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
if (window.location.pathname.endsWith("login.html")) {
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
        if (res.role === "client") window.location.href = "dashboard-client.html";
        else window.location.href = "dashboard-driver.html";
      }, 800);
    } else {
      showAlert("error", res.message, "alert-container");
    }
  });
}

// ----------------------------------------------
// 3. PAGE register.html
// ----------------------------------------------
// (Gestion déjà intégrée directement dans le HTML pour redirection étape 2)

// ----------------------------------------------
// 4. PAGE profile-client.html
// ----------------------------------------------
if (window.location.pathname.endsWith("profile-client.html")) {
  // Si pas d’info temporaire, on retourne à inscription
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
    // 1) Créer l’utilisateur
    const regRes = await apiPost("registerUser", {
      name: fullName, email, password, role, phone
    });
    if (!regRes.success) {
      showAlert("error", regRes.message, "alert-container");
      return;
    }
    // 2) Compléter le profil
    const profRes = await apiPost("completeProfile", {
      email, role: "client", fullName, phone, address
    });
    if (profRes.success) {
      localStorage.setItem("currentUser", JSON.stringify({ email, role: "client" }));
      localStorage.removeItem("temp_email");
      localStorage.removeItem("temp_password");
      localStorage.removeItem("temp_role");
      showAlert("success", "Profil client enregistré !", "alert-container");
      setTimeout(() => window.location.href = "dashboard-client.html", 800);
    } else {
      showAlert("error", profRes.message, "alert-container");
    }
  });
}

// ----------------------------------------------
// 5. PAGE profile-driver.html
// ----------------------------------------------
if (window.location.pathname.endsWith("profile-driver.html")) {
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
    const vehicleType = document.getElementById("driver-vehicle").value;
    const plateNumber = document.getElementById("driver-plate").value.trim();
    if (!fullName || !phone || !licenseNumber || !vehicleType || !plateNumber) {
      showAlert("error", "Veuillez remplir tous les champs.", "alert-container");
      return;
    }
    // 1) Créer l’utilisateur
    const regRes = await apiPost("registerUser", {
      name: fullName, email, password, role, phone
    });
    if (!regRes.success) {
      showAlert("error", regRes.message, "alert-container");
      return;
    }
    // 2) Compléter le profil
    const profRes = await apiPost("completeProfile", {
      email, role: "driver", fullName, phone, licenseNumber, vehicleType, plateNumber
    });
    if (profRes.success) {
      localStorage.setItem("currentUser", JSON.stringify({ email, role: "driver" }));
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

// ----------------------------------------------
// 6. PAGE dashboard-client.html
// ----------------------------------------------
if (window.location.pathname.endsWith("dashboard-client.html")) {
  const user = getCurrentUser();
  if (!user || user.role !== "client") {
    window.location.href = "login.html";
  }
  const email = user.email;

  // Afficher commandes existantes
  async function loadClientOrders() {
    const orders = await apiPost("getRequestsByClientId", { email });
    const tbody = document.getElementById("client-orders-table");
    tbody.innerHTML = "";
    orders.forEach(order => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 border-b";
      tr.innerHTML = `
        <td class="px-4 py-2">${order.id}</td>
        <td class="px-4 py-2">${order.type || "—"}</td>
        <td class="px-4 py-2">${order.distanceKm || "—"} km</td>
        <td class="px-4 py-2">${order.fee} €</td>
        <td class="px-4 py-2">${order.status}</td>
        <td class="px-4 py-2">${order.paymentStatus}</td>
        <td class="px-4 py-2">
          ${order.status === "En attente" && order.paymentStatus === "paid"
            ? `<button onclick="cancelOrder('${order.id}')" class="text-red-500 hover:underline">Annuler</button>`
            : `<a href="track-order.html?orderId=${order.id}" class="text-blue-600 hover:underline">Suivre</a>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Calcul du tarif
  document.getElementById("btn-calc-fee").addEventListener("click", async () => {
    const km = parseFloat(document.getElementById("order-km").value);
    const urgent = document.getElementById("order-urgent").checked;
    if (isNaN(km) || km <= 0) {
      showAlert("error", "Entrez une distance valide.", "alert-container");
      return;
    }
    const res = await apiPost("calculateFee", { type: "purchase", urgent });
    if (res.fee !== undefined) {
      document.getElementById("fee-display").textContent = `Tarif estimé : ${res.fee.toFixed(2)} €`;
    } else {
      showAlert("error", "Impossible de calculer le tarif.", "alert-container");
    }
  });

  // Création et paiement de la commande
  document.getElementById("new-order-form").addEventListener("submit", async e => {
    e.preventDefault();
    const from = document.getElementById("order-from").value.trim();
    const to = document.getElementById("order-to").value.trim();
    const km = parseFloat(document.getElementById("order-km").value);
    const urgent = document.getElementById("order-urgent").checked;

    if (!from || !to || isNaN(km) || km <= 0) {
      showAlert("error", "Tous les champs sont obligatoires.", "alert-container");
      return;
    }

    // 1) Calculer tarif
    const feeRes = await apiPost("calculateFee", { type: "purchase", urgent });
    if (!feeRes.fee) {
      showAlert("error", "Impossible de calculer le tarif.", "alert-container");
      return;
    }
    const fee = feeRes.fee;

    // 2) Créer PaymentIntent
    const piRes = await apiPost("createPaymentIntent", { amount: fee, currency: "eur", clientEmail: email });
    if (!piRes.clientSecret) {
      showAlert("error", "Impossible d’initier le paiement.", "alert-container");
      return;
    }
    // Pour simplifier, on simule un paiement réussi
    //  Normalement, on intègre Stripe.js ici
    showAlert("success", "Paiement simulé (paiement réussi). Création de la commande...", "alert-container");

    // 3) Création de la commande
    const orderRes = await apiPost("createRequest", {
      email, from, to, distanceKm: km, urgent,
      latitudePU: 0, longitudePU: 0, latitudeDO: 0, longitudeDO: 0,
      paymentIntentId: piRes.paymentIntentId
    });
    if (orderRes.requestId) {
      showAlert("success", `Commande créée (ID : ${orderRes.requestId}).`, "alert-container");
      setTimeout(loadClientOrders, 1000);
    } else {
      showAlert("error", "Impossible de créer la commande.", "alert-container");
    }
  });

  // Charger initialement
  loadClientOrders();
}

// ----------------------------------------------
// 7. PAGE dashboard-driver.html
// ----------------------------------------------
if (window.location.pathname.endsWith("dashboard-driver.html")) {
  const user = getCurrentUser();
  if (!user || user.role !== "driver") {
    window.location.href = "login.html";
  }
  const email = user.email;

  // Charger commandes non assignées
  async function loadUnassigned() {
    const orders = await apiPost("listUnassignedRequests");
    const tbody = document.getElementById("unassigned-orders-table");
    tbody.innerHTML = "";
    orders.forEach(order => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 border-b";
      tr.innerHTML = `
        <td class="px-4 py-2">${order.id}</td>
        <td class="px-4 py-2">${order.clientEmail}</td>
        <td class="px-4 py-2">${order.type}</td>
        <td class="px-4 py-2">${order.distanceKm || "—"} km</td>
        <td class="px-4 py-2">${order.fee} €</td>
        <td class="px-4 py-2">
          <button onclick="acceptOrder('${order.id}')" class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition">
            Accepter
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Accepter une commande
  window.acceptOrder = async function(orderId) {
    const res = await apiPost("assignCourier", { requestId: parseInt(orderId), courierEmail: email });
    if (res.status === "success") {
      showAlert("success", "Commande acceptée.", "alert-container");
      loadUnassigned();
      loadDriverOrders();
    } else {
      showAlert("error", res.message, "alert-container");
    }
  };

  // Charger commandes du livreur
  async function loadDriverOrders() {
    const orders = await apiPost("getRequestsByCourierId", { courierEmail: email });
    const tbody = document.getElementById("driver-orders-table");
    tbody.innerHTML = "";
    orders.forEach(order => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50 border-b";
      tr.innerHTML = `
        <td class="px-4 py-2">${order.id}</td>
        <td class="px-4 py-2">${order.type}</td>
        <td class="px-4 py-2">${order.status}</td>
        <td class="px-4 py-2">
          ${order.status === "Pending"
            ? `<button onclick="markPicked('${order.id}')" class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition">Pris</button>`
            : order.status === "Picked"
            ? `<button onclick="markDelivered('${order.id}')" class="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600 transition">Livré</button>`
            : `<span class="text-green-600 font-semibold">Livré</span>`
          }
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.markPicked = async function(orderId) {
    const res = await apiPost("updateRequestStatus", { requestId: parseInt(orderId), action: "Picked" });
    if (res.status === "success") {
      showAlert("success", "Commande prise en charge.", "alert-container");
      loadDriverOrders();
    } else {
      showAlert("error", res.message, "alert-container");
    }
  };

  window.markDelivered = async function(orderId) {
    const res = await apiPost("updateRequestStatus", { requestId: parseInt(orderId), action: "Delivered" });
    if (res.status === "success") {
      showAlert("success", "Commande livrée.", "alert-container");
      loadDriverOrders();
    } else {
      showAlert("error", res.message, "alert-container");
    }
  };

  // Charger initialement
  loadUnassigned();
  loadDriverOrders();
}
