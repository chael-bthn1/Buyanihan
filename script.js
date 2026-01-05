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
    const stock = parseInt(document.getElementById("pStock").value); // NEW: Get stock
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

    // Validation with stock check
    if (!sellerName || !sellerContact || !sellerAddress || !name || !price || !stock || stock < 1 || payments.length === 0 || logistics.length === 0) {
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
        stock, // NEW: Add stock to product
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

    // Check if out of stock
    const isOutOfStock = product.stock <= 0;
    const stockBadge = isOutOfStock
        ? '<span class="badge bg-danger">Out of Stock</span>'
        : `<span class="badge bg-success">${product.stock} in stock</span>`;

    col.innerHTML = `
    <div class="card h-100 shadow-sm border-0">
        ${product.imageURL ? `<img src="${product.imageURL}" class="card-img-top">` : ""}
        <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <h5 class="fw-bold mb-0">${product.name}</h5>
                ${stockBadge}
            </div>
            <p class="text-truncate" title="${product.desc}">${product.desc}</p>
            <p class="fw-bold text-success mb-2">₱${product.price.toFixed(2)}</p>

            <!-- PAYMENT & LOGISTICS -->
            <div class="mb-2 small text-muted">
                <div><strong>Payments:</strong> ${product.payments.join(", ") || "None"}</div>
                <div><strong>Logistics:</strong> ${product.logistics.join(", ") || "None"}</div>
            </div>

            <div class="d-grid gap-2 mt-auto">
                <button class="btn btn-sm btn-primary add-cart" ${isOutOfStock ? 'disabled' : ''}>
                    ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                </button>
                <button class="btn btn-sm btn-outline-secondary contact-seller">Contact Seller</button>
            </div>
        </div>
    </div>
    `;

    if (!isOutOfStock) {
        col.querySelector(".add-cart").onclick = () => addToCart(product.id);
    }
    col.querySelector(".contact-seller").onclick = () => contactSeller(product.id);

    $("productList").appendChild(col);
}

/* =====================================================
   CART
===================================================== */
function updateCartCount() {
    const badgeMobile = $("cartCountMobile");
    const badgeDesktop = $("cartCountDesktop");
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (badgeMobile) badgeMobile.textContent = totalItems;
    if (badgeDesktop) badgeDesktop.textContent = totalItems;
}


function addToCart(id) {
    if (!requireLogin()) return;

    const product = products.find(p => p.id === id);
    if (!product) return;

    // Check if product has stock
    if (product.stock <= 0) {
        alert("This product is out of stock.");
        return;
    }

    // Check if item already exists in cart
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        // Check if we can add more
        if (existingItem.quantity >= product.stock) {
            alert(`Cannot add more. Only ${product.stock} available in stock.`);
            return;
        }
        existingItem.quantity++;
    } else {
        // Add new item with quantity 1
        cart.push({ ...product, quantity: 1 });
    }

    updateCartCount();
    renderCart();

    alert(`"${product.name}" added to cart!`);
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartCount();
    renderCart();
}

function updateQuantity(id, change) {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    const product = products.find(p => p.id === id);
    if (!product) return;

    const newQuantity = item.quantity + change;

    // Validate quantity
    if (newQuantity < 1) {
        removeFromCart(id);
        return;
    }

    if (newQuantity > product.stock) {
        alert(`Only ${product.stock} available in stock.`);
        return;
    }

    item.quantity = newQuantity;
    updateCartCount();
    renderCart();
}

function renderCart() {
    const cartItems = $("cartItems");
    const emptyText = $("emptyCartText");
    const totalEl = $("cartTotal");
    const addressSection = $("deliveryAddressSection");

    if (!cartItems) return;
    cartItems.innerHTML = "";

    if (!cart.length) {
        emptyText.style.display = "block";
        totalEl.textContent = "0.00";
        if (addressSection) addressSection.style.display = "none";
        return;
    }

    emptyText.style.display = "none";
    if (addressSection) addressSection.style.display = "block";

    let total = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        const paymentOptions = item.payments.map(p => `<option value="${p}">${p}</option>`).join("");
        const logisticsOptions = item.logistics.map(l => `<option value="${l}">${l}</option>`).join("");

        const el = document.createElement("div");
        el.className = "card mb-3 shadow-sm";

        el.innerHTML = `
            <div class="card-body">
                <!-- Item Header with Number -->
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="badge bg-secondary">Item ${index + 1}</span>
                    <button class="btn btn-sm btn-danger remove-btn">
                        <small>Remove</small>
                    </button>
                </div>

                <!-- Product Info -->
                <div class="d-flex gap-3 mb-3">
                    ${item.imageURL ? `<img src="${item.imageURL}" style="width:80px;height:80px;border-radius:8px;object-fit:cover;" class="flex-shrink-0">` : ""}
                    <div class="flex-grow-1">
                        <h6 class="fw-bold mb-1">${item.name}</h6>
                        <div class="text-muted small mb-2">${item.desc}</div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="text-muted small">₱${item.price.toFixed(2)} each</span>
                            <span class="text-muted">•</span>
                            <span class="badge bg-light text-dark">${item.stock} in stock</span>
                        </div>
                    </div>
                </div>

                <!-- Quantity Controls -->
                <div class="border-top pt-3 mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center gap-2">
                            <label class="small fw-semibold mb-0 me-2">Quantity:</label>
                            <div class="btn-group btn-group-sm" role="group">
                                <button class="btn btn-outline-secondary qty-minus">−</button>
                                <button class="btn btn-outline-secondary" disabled style="min-width:45px;">${item.quantity}</button>
                                <button class="btn btn-outline-secondary qty-plus">+</button>
                            </div>
                        </div>
                        <div class="text-end">
                            <div class="small text-muted">Subtotal</div>
                            <div class="fw-bold text-success h5 mb-0">₱${itemTotal.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

                <!-- Payment & Logistics -->
                <div class="border-top pt-3">
                    <div class="row g-2">
                        <div class="col-6">
                            <label class="form-label small fw-semibold mb-1">Payment Method</label>
                            <select class="form-select form-select-sm payment-select">${paymentOptions}</select>
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-semibold mb-1">Delivery Method</label>
                            <select class="form-select form-select-sm logistics-select">${logisticsOptions}</select>
                        </div>
                    </div>
                </div>
            </div>
        `;

        el.querySelector(".remove-btn").onclick = () => removeFromCart(item.id);
        el.querySelector(".qty-minus").onclick = () => updateQuantity(item.id, -1);
        el.querySelector(".qty-plus").onclick = () => updateQuantity(item.id, 1);

        // Store selected payment and logistics
        el.querySelector(".payment-select").addEventListener("change", (e) => {
            item.selectedPayment = e.target.value;
        });
        el.querySelector(".logistics-select").addEventListener("change", (e) => {
            item.selectedLogistics = e.target.value;
        });

        // Set default selections
        if (!item.selectedPayment) item.selectedPayment = item.payments[0];
        if (!item.selectedLogistics) item.selectedLogistics = item.logistics[0];

        cartItems.appendChild(el);
    });

    totalEl.textContent = total.toFixed(2);
}

function checkoutCart() {
    if (!cart.length) return alert("Cart is empty!");

    // Validate delivery address
    const addressInput = $("deliveryAddress");
    if (!addressInput || !addressInput.value.trim()) {
        alert("Please enter your delivery address before checking out.");
        addressInput?.focus();
        return;
    }

    const deliveryAddress = addressInput.value.trim();

    // Create order summary
    const orderDate = new Date().toLocaleString();
    let orderHTML = `
        <div class="alert alert-success">
            <h6 class="mb-1">✓ Your order has been placed successfully!</h6>
            <small>Order Date: ${orderDate}</small>
        </div>

        <div class="mb-3">
            <h6 class="fw-bold">Delivery Address:</h6>
            <p class="mb-0">${deliveryAddress}</p>
        </div>

        <h6 class="fw-bold mb-3">Order Items:</h6>
    `;

    let grandTotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        grandTotal += itemTotal;

        orderHTML += `
            <div class="border rounded p-3 mb-3">
                <div class="d-flex gap-3 mb-2">
                    ${item.imageURL ? `<img src="${item.imageURL}" style="width:80px;height:80px;border-radius:6px;object-fit:cover;">` : ""}
                    <div class="flex-grow-1">
                        <h6 class="fw-bold mb-1">${item.name}</h6>
                        <p class="mb-1 small text-muted">${item.desc}</p>
                        <p class="mb-0">
                            <span class="fw-bold">₱${item.price.toFixed(2)}</span> × ${item.quantity} = 
                            <span class="fw-bold text-success">₱${itemTotal.toFixed(2)}</span>
                        </p>
                    </div>
                </div>
                
                <div class="border-top pt-2 mt-2">
                    <div class="row small">
                        <div class="col-md-6 mb-2">
                            <strong>Seller:</strong> ${item.sellerName}<br>
                            <strong>Contact:</strong> ${item.sellerContact}<br>
                            <strong>Address:</strong> ${item.sellerAddress}
                        </div>
                        <div class="col-md-6">
                            <strong>Payment:</strong> ${item.selectedPayment || item.payments[0]}<br>
                            <strong>Logistics:</strong> ${item.selectedLogistics || item.logistics[0]}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Update product stock
        const product = products.find(p => p.id === item.id);
        if (product) {
            product.stock -= item.quantity;

            // Update the product card in marketplace
            const productCard = document.querySelector(`[data-id="${item.id}"]`);
            if (product.stock <= 0) {
                // Remove product from marketplace if out of stock
                productCard?.remove();
                products = products.filter(p => p.id !== item.id);
            } else if (productCard) {
                // Update stock badge
                const stockBadge = productCard.querySelector('.badge');
                if (stockBadge) {
                    stockBadge.textContent = `${product.stock} in stock`;
                }
            }
        }
    });

    orderHTML += `
        <div class="border-top pt-3 mt-3">
            <h5 class="text-end mb-0">Grand Total: <span class="text-success">₱${grandTotal.toFixed(2)}</span></h5>
        </div>
    `;

    // Show order summary modal
    $("orderSummaryContent").innerHTML = orderHTML;

    // Clear cart
    cart = [];
    updateCartCount();
    renderCart();
    addressInput.value = "";

    // Hide cart modal and show order summary
    bootstrap.Modal.getInstance($("cartModal")).hide();

    setTimeout(() => {
        new bootstrap.Modal($("orderSummaryModal")).show();
    }, 300);
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
