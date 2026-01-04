/* =====================================================
   GLOBAL STATE
===================================================== */
let products = [];
let cart = [];
let faceVerified = false;
let faceStream = null;

/* =====================================================
   HELPERS
===================================================== */
const $ = id => document.getElementById(id);

const getUser = () =>
    JSON.parse(localStorage.getItem("loggedInUser"));

const requireLogin = () => {
    if (!getUser()) {
        alert("Please login first.");
        return false;
    }
    return true;
};

/* =====================================================
   DOM READY
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    updateNavbar();
    updateMarketplaceState();
    updateCartCount();

    $("sellBtn")?.addEventListener("click", openSellModal);
    $("sendChatBtn")?.addEventListener("click", sendChat);
    $("searchInput")?.addEventListener("input", filterMarketplace);
    $("priceFilter")?.addEventListener("change", filterMarketplace);

    // --- NEW: handle sell form submit ---
    const sellForm = $("sellForm");
    if (sellForm) {
        sellForm.addEventListener("submit", function (e) {
            e.preventDefault(); // prevent page reload
            addProduct();       // call your function
        });
    }
});

/* =====================================================
   NAVBAR
===================================================== */
function updateNavbar() {
    const loginBtn = $("loginBtn");
    const logoutBtn = $("logoutBtn");

    if (!loginBtn || !logoutBtn) return;

    if (getUser()) {
        loginBtn.style.display = "none";
        logoutBtn.classList.remove("d-none");
    } else {
        loginBtn.style.display = "block";
        logoutBtn.classList.add("d-none");
    }
}

/* =====================================================
   MARKETPLACE
===================================================== */
function updateMarketplaceState() {
    const list = $("productList");
    const empty = $("emptyMarketplace");
    if (!list || !empty) return;

    empty.style.display = list.children.length ? "none" : "block";
}

/* =====================================================
   ADD PRODUCT
===================================================== */
function addProduct() {
    if (!getUser()) {
        alert("Please login to sell items.");
        return;
    }

    // SELLER INFO
    const sellerName = document.getElementById("sellerName").value.trim();
    const sellerContact = document.getElementById("sellerContact").value.trim();
    const sellerAddress = document.getElementById("sellerAddress").value.trim();

    // PRODUCT INFO
    const name = document.getElementById("pName").value.trim();
    const price = parseFloat(document.getElementById("pPrice").value);
    const desc = document.getElementById("pDesc").value.trim();
    const imageFile = document.getElementById("pImage").files[0];

    // PAYMENT OPTIONS
    const payments = [];
    if (document.getElementById("payGCash").checked) payments.push("GCash");
    if (document.getElementById("payMaya").checked) payments.push("Maya");
    if (document.getElementById("payCash").checked) payments.push("Cash on Delivery");

    // LOGISTICS OPTIONS
    const logistics = [];
    if (document.getElementById("logLalamove").checked) logistics.push("Lalamove");
    if (document.getElementById("logGrab").checked) logistics.push("Grab Express");
    if (document.getElementById("logJT").checked) logistics.push("J&T Express");
    if (document.getElementById("logMeetup").checked) logistics.push("Meet-up");

    // TERMS & CONDITIONS
    const agreeTerms = document.getElementById("agreeTerms").checked;

    if (!sellerName || !sellerContact || !sellerAddress || !name || !price || payments.length === 0 || logistics.length === 0) {
        alert("Please complete all required fields.");
        return;
    }

    if (!agreeTerms) {
        alert("You must agree to the Terms & Conditions.");
        return;
    }

    // CREATE PRODUCT OBJECT
    const product = {
        id: Date.now(),
        sellerName,
        sellerContact,
        sellerAddress,
        name,
        price,
        desc,
        payments,
        logistics,
        imageURL: imageFile ? URL.createObjectURL(imageFile) : null
    };

    // ADD TO STATE
    products.push(product);

    // RENDER IN MARKETPLACE
    renderProduct(product);

    // RESET FORM
    document.getElementById("sellForm").reset();
    document.getElementById("emptyMarketplace").style.display = "none";

    // CLOSE MODAL
    bootstrap.Modal.getInstance(document.getElementById("sellModal")).hide();

    alert("Product listed successfully!");
}

function getCheckedValues(ids, rename = {}) {
    return ids
        .filter(id => $(id)?.checked)
        .map(id => rename[id] || $(id).dataset?.label || $(id).value || $(id).id.replace("pay", "").replace("log", ""));
}

/* =====================================================
   RENDER PRODUCT
===================================================== */
function renderProduct(product) {
    const col = document.createElement("div");
    col.className = "col-md-4 mb-4";
    col.dataset.id = product.id;

    col.innerHTML = `
    <div class="card h-100 shadow-sm border-0">
        ${product.imageURL ? `<img src="${product.imageURL}" class="card-img-top">` : ""}
        <div class="card-body d-flex flex-column">
            <h5 class="fw-bold">${product.name}</h5>
            <p class="text-truncate" title="${product.desc}">${product.desc}</p>
            <p class="fw-bold text-success mb-2">₱${product.price.toFixed(2)}</p>

            <!-- PAYMENT & LOGISTICS -->
            <div class="mb-2 small text-muted">
                <div><strong>Payments:</strong> ${product.payments.join(", ") || "None"}</div>
                <div><strong>Logistics:</strong> ${product.logistics.join(", ") || "None"}</div>
            </div>

            <div class="d-grid gap-2 mt-auto">
                <button class="btn btn-sm btn-primary add-cart">Add to Cart</button>
                <button class="btn btn-sm btn-outline-secondary contact-seller">Contact Seller</button>
            </div>
        </div>
    </div>
    `;

    col.querySelector(".add-cart").onclick = () => addToCart(product.id);
    col.querySelector(".contact-seller").onclick = () => contactSeller(product.id);

    $("productList").appendChild(col);
}

/* =====================================================
   CART
===================================================== */
function updateCartCount() {
    const badgeMobile = $("cartCountMobile");
    const badgeDesktop = $("cartCountDesktop");
    if (badgeMobile) badgeMobile.textContent = cart.length;
    if (badgeDesktop) badgeDesktop.textContent = cart.length;
}


function addToCart(id) {
    if (!requireLogin()) return;

    if (cart.some(item => item.id === id)) {
        alert("Item already in cart.");
        return;
    }

    const product = products.find(p => p.id === id);
    if (!product) return;

    cart.push({ ...product });
    updateCartCount();
    renderCart();

    alert(`"${product.name}" added to cart!`);
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartCount();
    renderCart();
}

function renderCart() {
    const cartItems = $("cartItems");
    const emptyText = $("emptyCartText");
    const totalEl = $("cartTotal");

    if (!cartItems) return;
    cartItems.innerHTML = "";

    if (!cart.length) {
        emptyText.style.display = "block";
        totalEl.textContent = "0.00";
        return;
    }

    emptyText.style.display = "none";
    let total = 0;

    cart.forEach(item => {
        total += item.price;

        const paymentOptions = item.payments.map(p => `<option value="${p}">${p}</option>`).join("");
        const logisticsOptions = item.logistics.map(l => `<option value="${l}">${l}</option>`).join("");

        const el = document.createElement("div");
        el.className = "border-bottom pb-2 mb-3 d-flex flex-column gap-2";

        el.innerHTML = `
            <div class="d-flex gap-2 align-items-center">
                ${item.imageURL ? `<img src="${item.imageURL}" style="width:60px;height:60px;border-radius:6px;object-fit:cover;">` : ""}
                <div class="flex-grow-1">
                    <strong>${item.name}</strong><br>
                    ₱${item.price.toFixed(2)}
                </div>
                <button class="btn btn-sm btn-danger">&times;</button>
            </div>

            <!-- Payment & Logistics Dropdowns -->
            <div class="d-flex gap-2 flex-wrap">
                <div>
                    <label class="form-label small mb-1">Payment</label>
                    <select class="form-select form-select-sm">${paymentOptions}</select>
                </div>
                <div>
                    <label class="form-label small mb-1">Logistics</label>
                    <select class="form-select form-select-sm">${logisticsOptions}</select>
                </div>
            </div>
        `;

        el.querySelector("button").onclick = () => removeFromCart(item.id);
        cartItems.appendChild(el);
    });

    totalEl.textContent = total.toFixed(2);
}

function checkoutCart() {
    if (!cart.length) return alert("Cart is empty!");

    cart.forEach(item => {
        document.querySelector(`[data-id="${item.id}"]`)?.remove();
        products = products.filter(p => p.id !== item.id);
    });

    cart = [];
    updateCartCount();
    renderCart();
    updateMarketplaceState();

    bootstrap.Modal.getInstance($("cartModal")).hide();
    alert("Checkout successful!");
}

/* =====================================================
   CHAT
===================================================== */
function contactSeller(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    // Display seller info for this product
    $("chatSellerInfo").innerHTML = `
        <div class="mb-2">
            <strong>Seller:</strong> ${product.sellerName}<br>
            <strong>Contact:</strong> ${product.sellerContact}<br>
            <strong>Address:</strong> ${product.sellerAddress}<br>
            <strong>Product:</strong> ${product.name}
        </div>
    `;

    // Clear previous chat messages to avoid mixing with other products
    $("chatMessages").innerHTML = "";

    // Store currently active product in modal
    $("chatMessages").dataset.productId = product.id;

    new bootstrap.Modal($("chatModal")).show();
}


const productChats = JSON.parse(localStorage.getItem("productChats")) || {}; // load chats

function sendChat() {
    const input = $("chatMessageInput");
    const msg = input.value.trim();
    if (!msg) return;

    const productId = $("chatMessages").dataset.productId;
    if (!productChats[productId]) productChats[productId] = [];

    productChats[productId].push({ sender: "You", message: msg });

    // Save to localStorage
    localStorage.setItem("productChats", JSON.stringify(productChats));

    renderChat(productId);
    input.value = "";
}

function renderChat(productId) {
    const chatDiv = $("chatMessages");
    chatDiv.innerHTML = "";

    if (!productChats[productId]) return;

    productChats[productId].forEach(msgObj => {
        chatDiv.innerHTML += `<div><strong>${msgObj.sender}:</strong> ${msgObj.message}</div>`;
    });

    chatDiv.scrollTop = chatDiv.scrollHeight;
}


/* =====================================================
   AUTH
===================================================== */
function login() {
    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value.trim();

    const users = JSON.parse(localStorage.getItem("users")) || [];

    const user = users.find(
        u => u.email === email && u.password === password
    );

    if (!user) {
        alert("Invalid email or password.");
        return;
    }

    localStorage.setItem("loggedInUser", JSON.stringify(user));
    updateNavbar();
    bootstrap.Modal.getInstance($("loginModal")).hide();
}


function register() {
    const clearance = $("regBarangayClearance").files[0];
    const govID = $("regGovID").files[0];

    if (!clearance || !govID) {
        alert("Please upload barangay clearance and government ID.");
        return;
    }

    const users = JSON.parse(localStorage.getItem("users")) || [];

    const email = $("regEmail").value.trim();
    const password = $("regPassword").value.trim();

    if (!email || !password) {
        alert("Missing credentials");
        return;
    }

    if (users.some(u => u.email === email)) {
        alert("Email already registered.");
        return;
    }

    const user = {
        name: $("regName").value.trim(),
        address: $("regAddress").value.trim(),
        email,
        password
    };

    users.push(user);
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("loggedInUser", JSON.stringify(user));

    updateNavbar();
    bootstrap.Modal.getInstance($("registerModal")).hide();
    alert("Account registered successfully!");
}


function logout() {
    localStorage.removeItem("loggedInUser");
    updateNavbar();
    alert("Logged out");
}

/* =====================================================
   FACE SCAN (CAMERA)
===================================================== */
async function startFaceScan() {
    const video = $("faceVideo");
    const status = $("faceStatus");

    try {
        faceStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user" },
            audio: false
        });

        video.srcObject = faceStream;
        status.textContent = "Scanning face...";

        setTimeout(() => {
            faceVerified = true;
            status.textContent = "Face verified ✔️";
            status.classList.add("text-success");
            faceStream.getTracks().forEach(t => t.stop());
        }, 3000);
    } catch {
        alert("Camera permission denied.");
    }
}

/* =====================================================
   FILTER
===================================================== */
function filterMarketplace() {
    const search = $("searchInput").value.toLowerCase();
    const filter = $("priceFilter").value;

    document.querySelectorAll("#productList .col-md-4").forEach(card => {
        const text = card.innerText.toLowerCase();

        // Correctly select the price <p> that contains "₱"
        const priceEl = Array.from(card.querySelectorAll("p")).find(p => p.innerText.includes("₱"));
        const price = priceEl ? parseFloat(priceEl.innerText.replace("₱", "")) : 0;

        let visible = text.includes(search);

        if (filter === "low") visible = visible && price < 500;
        if (filter === "mid") visible = visible && price >= 500 && price <= 1000;
        if (filter === "high") visible = visible && price > 1000;

        card.style.display = visible ? "block" : "none";
    });
}


function openSellModal() {
    if (!requireLogin()) return;
    new bootstrap.Modal($("sellModal")).show();
}
