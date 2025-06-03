// scripts.js

// ----------------------------------------------
// 1. الثوابت الرئيسة
// ----------------------------------------------

// رابط Google Apps Script (الـ Web App) الذي نشرته
const API_BASE_URL =
  "https://script.google.com/macros/s/AKfycbzKTpDZZXhf5PF-XFI_jsfyv6SE8QWfG2sDAhWmeF9r8NL4IX6XuLhzi7R0Cioa6ihl/exec";

// مفتاح Stripe العام (يمكنك استبداله بمفتاحك الخاص من لوحة Stripe)
const STRIPE_PUBLIC_KEY = "pk_test_XXXXXXXXXXXXXX";

// مفتاح Google Maps API (Geocoding)
const GOOGLE_MAPS_API_KEY = "AIzaSy…XXXXXXXXXX";

// مفتاح التخزين في localStorage لحفظ بيانات المستخدم
const STORAGE_KEY_USER = "urgentgo_user";

// ----------------------------------------------
// 2. دوال التخزين محليًا (localStorage)
// ----------------------------------------------
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

// ----------------------------------------------
// 3. دالة عرض رسائل الحالة (Alert)
// ----------------------------------------------
function showAlert(type, message, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="alert ${type === "success" ? "alert-success" : "alert-error"}">
      ${message}
    </div>
  `;
  setTimeout(() => {
    container.innerHTML = "";
  }, 3000);
}

// ----------------------------------------------
// 4. دوال التواصل مع Google Apps Script API
// ----------------------------------------------

// POST إلى Google Apps Script
async function postToApi(path, body) {
  try {
    const response = await fetch(`${API_BASE_URL}?path=${encodeURIComponent(path)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("API Error Response Text:", errText);
      throw new Error("فشل الاتصال بالـ API.");
    }
    return await response.json();
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  }
}

// GET من Google Apps Script
async function getFromApi(path) {
  try {
    const response = await fetch(`${API_BASE_URL}?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      const errText = await response.text();
      console.error("API Error Response Text:", errText);
      throw new Error("فشل الاتصال بالـ API.");
    }
    return await response.json();
  } catch (err) {
    console.error("API Error:", err);
    throw err;
  }
}

// ----------------------------------------------
// 5. حساب التكلفة فور تغيير نوع الطلب أو خانة "عاجل"
// ----------------------------------------------
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

// ----------------------------------------------
// 6. Geocoding: تحويل عنوان نصي إلى إحداثيات
// ----------------------------------------------
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
    throw new Error("فشل في تحويل العنوان إلى إحداثيات.");
  }
}

// ----------------------------------------------
// 7. استخدام GPS لوضع عنوان الالتقاط تلقائيًا
// ----------------------------------------------
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
// 8. تسجيل الدخول (Login) وإنشاء حساب (Register) - index.html
// ----------------------------------------------
async function handleLogin(e) {
  e.preventDefault();
  const phoneInput = document.getElementById("login-phone");
  const phone = phoneInput.value.trim();
  if (!phone) {
    return showAlert("error", "رجاءً أدخل رقم الهاتف.", "alert-container");
  }
  const btn = document.getElementById("btn-login-submit");
  btn.disabled = true;
  btn.textContent = "جارٍ التحقق…";
  try {
    const user = await postToApi("getUserByPhone", { phone });
    if (user && user.id) {
      saveUserToLocal(user);
      showAlert("success", "تمّ تسجيل الدخول بنجاح.", "alert-container");
      setTimeout(() => {
        if (user.role === "client") window.location.href = "client.html";
        else window.location.href = "courier.html";
      }, 800);
    } else {
      showAlert("error", "هذا الرقم غير مسجل. يمكنك إنشاء حساب جديد.", "alert-container");
      btn.disabled = false;
      btn.textContent = "تسجيل الدخول";
    }
  } catch {
    showAlert("error", "خطأ في الاتصال. حاول مجددًا.", "alert-container");
    btn.disabled = false;
    btn.textContent = "تسجيل الدخول";
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const nameInput = document.getElementById("reg-name");
  const phoneInput = document.getElementById("reg-phone");
  const emailInput = document.getElementById("reg-email");
  const roleSelect = document.getElementById("reg-role");

  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const email = emailInput.value.trim();
  const role = roleSelect.value;

  if (!name || !phone) {
    return showAlert("error", "الاسم ورقم الهاتف مطلوبان.", "alert-container");
  }

  const btn = document.getElementById("btn-register-submit");
  btn.disabled = true;
  btn.textContent = "جارٍ الإنشاء…";
  try {
    const res = await postToApi("createUser", { name, phone, email, role });
    if (res.id) {
      const newUser = { id: res.id, name, phone, email, role };
      saveUserToLocal(newUser);
      showAlert("success", "تمّ إنشاء الحساب بنجاح.", "alert-container");
      setTimeout(() => {
        if (role === "client") window.location.href = "client.html";
        else window.location.href = "courier.html";
      }, 800);
    } else {
      showAlert("error", "فشل في إنشاء الحساب. حاول لاحقًا.", "alert-container");
      btn.disabled = false;
      btn.textContent = "إنشاء الحساب";
    }
  } catch {
    showAlert("error", "خطأ في الاتصال. حاول مجددًا.", "alert-container");
    btn.disabled = false;
    btn.textContent = "إنشاء الحساب";
  }
}

// ----------------------------------------------
// 9. إنشاء الطلب مع دمج Stripe (client.html)
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

  // 9.1 حساب التكلفة
  const feeRes = await postToApi("calculateFee", { type, urgent });
  const fee = feeRes.fee;
  if (fee === null) return;

  // 9.2 إنشاء PaymentIntent في الـ Backend
  let pi;
  try {
    pi = await postToApi("createPaymentIntent", {
      amount: fee,
      currency: "eur",
      clientId: currentUser.id
    });
  } catch {
    return showAlert("error", "فشل في إنشاء طلب الدفع.", "alert-container");
  }

  // 9.3 تهيئة Stripe.js Elements
  const stripe = Stripe(STRIPE_PUBLIC_KEY);
  const { clientSecret } = pi;

  // 9.4 تأكيد الدفع عبر بطاقة المستخدم
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

  // 9.5 بعد نجاح الدفع، ننشئ الطلب في Google Sheets
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
// 10. جلب وعرض طلبات العميل (client.html)
// ----------------------------------------------
async function loadClientRequests() {
  try {
    const clientReqs = await postToApi("getRequestsByClientId", { clientId: currentUser.id });
    const tbody = document.querySelector("#requests-table");
    tbody.innerHTML = "";
    clientReqs.forEach((req) => {
      const tr = document.createElement("tr");
      tr.className = "border-b hover:bg-gray-50";
      tr.innerHTML = `
        <td class="px-4 py-2 text-center">${req.requestId}</td>
        <td class="px-4 py-2 text-center">${req.type}</td>
        <td class="px-4 py-2">${req.description}</td>
        <td class="px-4 py-2 text-center">${req.status}</td>
        <td class="px-4 py-2 text-center">${req.fee}€</td>
        <td class="px-4 py-2 text-center">${req.paymentStatus}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch {
    showAlert("error", "فشل في جلب طلبات العميل.", "alert-container");
  }
}

// ----------------------------------------------
// 11. إدارة طلبات الساعي (courier.html)
// ----------------------------------------------
async function loadUnassignedRequests() {
  try {
    const reqs = await getFromApi("listUnassignedRequests");
    const tbody = document.querySelector("#unassigned-requests-table");
    tbody.innerHTML = "";
    reqs.forEach((req) => {
      const tr = document.createElement("tr");
      tr.className = "border-b hover:bg-gray-50";
      tr.innerHTML = `
        <td class="px-4 py-2 text-center">${req.requestId}</td>
        <td class="px-4 py-2 text-center">${req.type}</td>
        <td class="px-4 py-2">${req.description}</td>
        <td class="px-4 py-2">${req.pickupAddress}</td>
        <td class="px-4 py-2">${req.deliveryAddress}</td>
        <td class="px-4 py-2 text-center">${req.fee}€</td>
        <td class="px-4 py-2 text-center">
          <button
            class="bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded-md transition-all"
            onclick="acceptRequest(${req.requestId})"
          >
            قبول
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch {
    showAlert("error", "فشل في جلب الطلبات المتاحة.", "alert-container");
  }
}

async function acceptRequest(requestId) {
  try {
    const res = await postToApi("assignCourier", { requestId, courierId: currentUser.id });
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
  try {
    const myReqs = await postToApi("getRequestsByCourierId", { courierId: currentUser.id });
    const tbody = document.querySelector("#my-requests-table");
    tbody.innerHTML = "";
    myReqs.forEach((req) => {
      let actionButtons = "";
      if (req.status === "pending") {
        actionButtons = `<button class="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-md transition-all" onclick="markPicked(${req.requestId})">استلام</button>`;
      } else if (req.status === "picked") {
        actionButtons = `<button class="bg-indigo-500 hover:bg-indigo-600 text-white py-1 px-3 rounded-md transition-all" onclick="markDelivered(${req.requestId})">توصيل</button>`;
      } else if (req.status === "delivered") {
        actionButtons = `<span class="text-green-600 font-semibold">تمّ التسليم</span>`;
      }
      const tr = document.createElement("tr");
      tr.className = "border-b hover:bg-gray-50";
      tr.innerHTML = `
        <td class="px-4 py-2 text-center">${req.requestId}</td>
        <td class="px-4 py-2 text-center">${req.type}</td>
        <td class="px-4 py-2">${req.description}</td>
        <td class="px-4 py-2 text-center">${req.status}</td>
        <td class="px-4 py-2 text-center">${actionButtons}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch {
    showAlert("error", "فشل في جلب طلباتك الحالية.", "alert-container");
  }
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
