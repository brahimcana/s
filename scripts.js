// scripts.js

// 1. ثابت الـ Web App (Apps Script URL)
const API_BASE_URL = "https://script.google.com/macros/s/AKfycbzPsn_l4mppwJzi1yq9XOWPX5GilvpEg4SZPaOv2F8rUw-ZfqZyi7dQpLYsINtogNRm/exec";

// 2. مفتاح Stripe العام (ضع مفتاحك من لوحة Stripe)
const STRIPE_PUBLIC_KEY = "pk_test_XXXXXXXXXXXXXX";

// 3. Google Maps API Key
const GOOGLE_MAPS_API_KEY = "AIzaSy…XXXXXXXXXX";

// 4. مفتاح التخزين في localStorage
const STORAGE_KEY_USER = "urgentgo_user";

// 5. دوال التخزين محليًا
function saveUserToLocal(userObj) {
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userObj));
}
function getUserFromLocal() {
  const raw = localStorage.getItem(STORAGE_KEY_USER);
  return raw ? JSON.parse(raw) : null;
}
function logout() {
  localStorage.removeItem(STORAGE_KEY_USER);
  window.location.href = "index.html";
}

// 6. دالة عرض رسائل الحالة
function showAlert(type, message, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="alert ${type === "success" ? "alert-success" : "alert-error"}">
      ${message}
    </div>`;
  setTimeout(() => (container.innerHTML = ""), 3000);
}

// 7. دوال التواصل مع API (Apps Script)
async function postToApi(path, body) {
  try {
    const response = await fetch(`${API_BASE_URL}?path=${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return await response.json();
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  }
}
async function getFromApi(path) {
  try {
    const response = await fetch(`${API_BASE_URL}?path=${path}`);
    return await response.json();
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  }
}

// 8. دالة لحساب التكلفة وعرضها فور اختيار “نوع الطلب” أو “عاجل”
async function updateFeeDisplay() {
  const type = document.getElementById("req-type").value;
  const urgent = document.getElementById("req-urgent").checked;
  try {
    const res = await postToApi("calculateFee", { type, urgent });
    document.getElementById("fee-display").textContent = `الرسوم: ${res.fee}€`;
    return res.fee;
  } catch {
    showAlert("error", "فشل في حساب التكلفة.", "alert-container");
    return null;
  }
}

// 9. تحويل عنوان نصي إلى إحداثيات (Geocoding)
async function geocode(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === "OK" && data.results.length > 0) {
    return {
      lat: data.results[0].geometry.location.lat,
      lng: data.results[0].geometry.location.lng
    };
  } else {
    throw new Error("Geocoding failed.");
  }
}

// 10. تحديد موقع الالتقاط عبر GPS
function setPickupFromGPS() {
  if (!navigator.geolocation) {
    return showAlert("error", "المتصفح لا يدعم تحديد الموقع.", "alert-container");
  }
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      try {
        const data = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
        ).then((r) => r.json());
        if (data.status === "OK" && data.results.length > 0) {
          document.getElementById("req-pickup").value = data.results[0].formatted_address;
        } else {
          showAlert("error", "تعذر إيجاد عنوان من GPS.", "alert-container");
        }
      } catch {
        showAlert("error", "خطأ في جلب العنوان من GPS.", "alert-container");
      }
    },
    () => {
      showAlert("error", "تعذر الحصول على إحداثيات GPS.", "alert-container");
    }
  );
}

// ----------------------------------------------
// 11. تسجيل الدخول/التسجيل (index.html)
// ----------------------------------------------
async function handleLogin(e) {
  e.preventDefault();
  const phone = document.getElementById("login-phone").value.trim();
  if (!phone) return showAlert("error", "رجاءً أدخل رقم الهاتف.", "alert-container");
  try {
    const user = await postToApi("getUserByPhone", { phone });
    if (user && user.id) {
      saveUserToLocal(user);
      showAlert("success", "تمّ تسجيل الدخول.", "alert-container");
      setTimeout(() => {
        if (user.role === "client") window.location.href = "client.html";
        else window.location.href = "courier.html";
      }, 800);
    } else {
      showAlert("error", "هذا الرقم غير مسجل. أنشئ حسابًا جديدًا.", "alert-container");
    }
  } catch {
    showAlert("error", "خطأ في الاتصال.", "alert-container");
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById("reg-name").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const role = document.getElementById("reg-role").value;
  if (!name || !phone) {
    return showAlert("error", "الاسم ورقم الهاتف مطلوبان.", "alert-container");
  }
  try {
    const res = await postToApi("createUser", { name, phone, email, role });
    if (res.id) {
      const newUser = { id: res.id, name, phone, email, role };
      saveUserToLocal(newUser);
      showAlert("success", "تمّ إنشاء الحساب.", "alert-container");
      setTimeout(() => {
        if (role === "client") window.location.href = "client.html";
        else window.location.href = "courier.html";
      }, 800);
    } else {
      showAlert("error", "فشل في إنشاء الحساب.", "alert-container");
    }
  } catch {
    showAlert("error", "خطأ في الاتصال.", "alert-container");
  }
}

// ----------------------------------------------
// 12. إنشاء الطلب وربطه بـ Stripe (client.html)
// ----------------------------------------------
async function createRequestHandler(e) {
  e.preventDefault();
  const type = document.getElementById("req-type").value;
  const description = document.getElementById("req-desc").value.trim();
  const pickupAddress = document.getElementById("req-pickup").value.trim();
  const deliveryAddress = document.getElementById("req-delivery").value.trim();
  const urgent = document.getElementById("req-urgent").checked;
  if (!description || !pickupAddress || !deliveryAddress) {
    return showAlert("error", "يرجى ملء جميع الحقول.", "alert-container");
  }

  // 12.1 حساب التكلفة
  const feeRes = await postToApi("calculateFee", { type, urgent });
  const fee = feeRes.fee;
  if (fee === null) return;

  // 12.2 إنشاء PaymentIntent
  let pi;
  try {
    pi = await postToApi("createPaymentIntent", {
      amount: fee,
      currency: "eur",
      clientId: currentUser.id
    });
  } catch {
    return showAlert("error", "فشل في إنشاء PaymentIntent.", "alert-container");
  }

  // 12.3 إعداد Stripe.js
  const stripe = Stripe(STRIPE_PUBLIC_KEY);
  const { clientSecret } = pi;

  // 12.4 تأكيد الدفع ببطاقة المستخدم
  const { error } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: cardElement,
      billing_details: {
        name: currentUser.name,
        email: currentUser.email
      }
    }
  });
  if (error) {
    return showAlert("error", `فشل الدفع: ${error.message}`, "alert-container");
  }

  // 12.5 بعد نجاح الدفع، ننشئ الطلب في Google Sheets
  try {
    const pu = await geocode(pickupAddress);
    const du = await geocode(deliveryAddress);
    const reqBody = {
      clientId: currentUser.id,
      type,
      description,
      pickupAddress,
      deliveryAddress,
      urgent,
      latitudePU: pu.lat,
      longitudePU: pu.lng,
      latitudeDO: du.lat,
      longitudeDO: du.lng,
      paymentIntentId: pi.paymentIntentId
    };
    const createRes = await postToApi("createRequest", reqBody);
    if (createRes.requestId) {
      showAlert("success", `تمّ إنشاء الطلب رقم ${createRes.requestId}`, "alert-container");
      setTimeout(loadClientRequests, 1000);
      document.getElementById("new-request-form").reset();
      document.getElementById("fee-display").textContent = "";
    } else {
      showAlert("error", "فشل في إنشاء الطلب.", "alert-container");
    }
  } catch (err) {
    console.error(err);
    showAlert("error", "خطأ أثناء إنشاء الطلب.", "alert-container");
  }
}

// ----------------------------------------------
// 13. جلب وعرض طلبات العميل (client.html)
// ----------------------------------------------
async function loadClientRequests() {
  const clientReqs = await postToApi("getRequestsByClientId", { clientId: currentUser.id });
  const tbody = document.querySelector("#requests-table tbody");
  tbody.innerHTML = "";
  clientReqs.forEach((req) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${req.requestId}</td>
      <td>${req.type}</td>
      <td>${req.description}</td>
      <td>${req.status}</td>
      <td>${req.fee}€</td>
      <td>${req.paymentStatus}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ----------------------------------------------
// 14. إدارة طلبات الساعي (courier.html)
// ----------------------------------------------
async function loadUnassignedRequests() {
  const reqs = await getFromApi("listUnassignedRequests");
  const tbody = document.querySelector("#unassigned-requests-table tbody");
  tbody.innerHTML = "";
  reqs.forEach((req) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${req.requestId}</td>
      <td>${req.type}</td>
      <td>${req.description}</td>
      <td>${req.pickupAddress}</td>
      <td>${req.deliveryAddress}</td>
      <td>${req.fee}€</td>
      <td><button class="btn-small" onclick="acceptRequest(${req.requestId})">قبول</button></td>
    `;
    tbody.appendChild(tr);
  });
}

async function acceptRequest(requestId) {
  try {
    const res = await postToApi("assignCourier", {
      requestId,
      courierId: currentUser.id
    });
    if (res.success) {
      showAlert("success", `تمّ قبول الطلب رقم ${requestId}`, "alert-container");
      setTimeout(() => {
        loadUnassignedRequests();
        loadMyRequests();
      }, 500);
    } else {
      showAlert("error", res.error || "فشل في قبول الطلب.", "alert-container");
    }
  } catch {
    showAlert("error", "خطأ في الاتصال.", "alert-container");
  }
}

async function loadMyRequests() {
  const myReqs = await postToApi("getRequestsByCourierId", { courierId: currentUser.id });
  const tbody = document.querySelector("#my-requests-table tbody");
  tbody.innerHTML = "";
  myReqs.forEach((req) => {
    let actionButtons = "";
    if (req.status === "pending") {
      actionButtons = `<button class="btn-small" onclick="markPicked(${req.requestId})">استلام</button>`;
    } else if (req.status === "picked") {
      actionButtons = `<button class="btn-small" onclick="markDelivered(${req.requestId})">توصيل</button>`;
    } else if (req.status === "delivered") {
      actionButtons = `<span>تمّ التسليم</span>`;
    }
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${req.requestId}</td>
      <td>${req.type}</td>
      <td>${req.description}</td>
      <td>${req.status}</td>
      <td>${actionButtons}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function markPicked(requestId) {
  try {
    const res = await postToApi("updateRequestStatus", { requestId, action: "picked" });
    if (res.success) {
      showAlert("success", `تمّ استلام الطلب رقم ${requestId}`, "alert-container");
      setTimeout(loadMyRequests, 500);
    } else {
      showAlert("error", res.error || "خطأ في التحديث.", "alert-container");
    }
  } catch {
    showAlert("error", "خطأ في الاتصال.", "alert-container");
  }
}

async function markDelivered(requestId) {
  try {
    const res = await postToApi("updateRequestStatus", { requestId, action: "delivered" });
    if (res.success) {
      showAlert("success", `تمّ توصيل الطلب رقم ${requestId}`, "alert-container");
      setTimeout(loadMyRequests, 500);
    } else {
      showAlert("error", res.error || "خطأ في التحديث.", "alert-container");
    }
  } catch {
    showAlert("error", "خطأ في الاتصال.", "alert-container");
  }
}
