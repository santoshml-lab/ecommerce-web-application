// =====================================================
// CONFIGURATION
// =====================================================


const API_BASE_URL =
    "https://ecommerce-web-application-1g0v.onrender.com";


// Import Supabase client
import { supabase } from "./supabase.js";


// =====================================================
// GLOBAL STATE
// =====================================================

let products = [];
let cart = [];


// =====================================================
// INITIALIZE
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

    loadCart();

    await loadProducts();

    await checkUser();

    renderCart();

});


// =====================================================
// LOAD PRODUCTS
// =====================================================

async function loadProducts() {

    const container =
        document.getElementById("products-container");

    try {

        const response =
            await fetch(`${API_BASE_URL}/products`);

        if (!response.ok) {
            throw new Error("Failed to load products");
        }

        const data =
            await response.json();

        products =
            data.products || [];

        renderProducts();

    } catch (error) {

        console.error("Products error:", error);

        container.innerHTML = `
            <p>
                Unable to load products.
                Please try again later.
            </p>
        `;
    }
}


// =====================================================
// RENDER PRODUCTS
// =====================================================

function renderProducts() {

    const container =
        document.getElementById("products-container");

    if (!products.length) {

        container.innerHTML = `
            <p>
                No products available.
            </p>
        `;

        return;
    }

    container.innerHTML = "";

    products.forEach(product => {

        const card =
            document.createElement("div");

        card.className =
            "product-card";

        const image =
            product.image_url ||
            "https://via.placeholder.com/400x250?text=Product";

        const stock =
            Number(product.stock || 0);

        card.innerHTML = `

            <img
                src="${image}"
                alt="${escapeHTML(product.name)}"
                onerror="this.src='https://via.placeholder.com/400x250?text=Product'"
            >

            <h3>
                ${escapeHTML(product.name)}
            </h3>

            <p>
                ${escapeHTML(
                    product.description || "No description"
                )}
            </p>

            <div class="product-price">
                ₹${Number(product.price).toFixed(2)}
            </div>

            <div class="product-stock">
                ${
                    stock > 0
                    ? `Stock: ${stock}`
                    : "Out of stock"
                }
            </div>

            <button
                class="add-cart-btn"
                onclick="addToCart(${product.id})"
                ${stock <= 0 ? "disabled" : ""}
            >
                ${
                    stock > 0
                    ? "Add to Cart 🛒"
                    : "Out of Stock"
                }
            </button>

        `;

        container.appendChild(card);

    });
}


// =====================================================
// ADD TO CART
// =====================================================

window.addToCart = function(productId) {

    const product =
        products.find(
            p => Number(p.id) === Number(productId)
        );

    if (!product) {

        alert("Product not found");

        return;
    }

    const existing =
        cart.find(
            item =>
                Number(item.id) === Number(productId)
        );

    if (existing) {

        if (
            existing.quantity >=
            Number(product.stock)
        ) {

            alert("Maximum available stock reached");

            return;
        }

        existing.quantity++;

    } else {

        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price),
            image_url: product.image_url,
            quantity: 1
        });

    }

    saveCart();

    renderCart();

    alert("Product added to cart 🛒");
};


// =====================================================
// REMOVE FROM CART
// =====================================================

window.removeFromCart = function(productId) {

    cart =
        cart.filter(
            item =>
                Number(item.id) !== Number(productId)
        );

    saveCart();

    renderCart();
};


// =====================================================
// CHANGE QUANTITY
// =====================================================

window.changeQuantity = function(
    productId,
    change
) {

    const item =
        cart.find(
            item =>
                Number(item.id) === Number(productId)
        );

    if (!item) {
        return;
    }

    const product =
        products.find(
            p =>
                Number(p.id) === Number(productId)
        );

    item.quantity += change;

    if (item.quantity <= 0) {

        removeFromCart(productId);

        return;
    }

    if (
        product &&
        item.quantity > Number(product.stock)
    ) {

        item.quantity =
            Number(product.stock);

        alert("Stock limit reached");
    }

    saveCart();

    renderCart();
};


// =====================================================
// RENDER CART
// =====================================================

function renderCart() {

    const container =
        document.getElementById("cart-container");

    const totalElement =
        document.getElementById("cart-total");

    if (!container) {
        return;
    }

    if (!cart.length) {

        container.innerHTML = `
            <p>Your cart is empty.</p>
        `;

        if (totalElement) {
            totalElement.textContent =
                "0.00";
        }

        return;
    }

    let total = 0;

    container.innerHTML = "";

    cart.forEach(item => {

        const itemTotal =
            Number(item.price) *
            Number(item.quantity);

        total += itemTotal;

        const div =
            document.createElement("div");

        div.className =
            "cart-item";

        div.innerHTML = `

            <div>

                <h3>
                    ${escapeHTML(item.name)}
                </h3>

                <p>
                    ₹${Number(item.price).toFixed(2)}
                </p>

            </div>

            <div class="cart-controls">

                <button
                    onclick="changeQuantity(${item.id}, -1)"
                >
                    −
                </button>

                <span>
                    ${item.quantity}
                </span>

                <button
                    onclick="changeQuantity(${item.id}, 1)"
                >
                    +
                </button>

                <button
                    class="remove-btn"
                    onclick="removeFromCart(${item.id})"
                >
                    Remove
                </button>

            </div>

        `;

        container.appendChild(div);

    });

    if (totalElement) {

        totalElement.textContent =
            total.toFixed(2);

    }
}


// =====================================================
// SAVE CART
// =====================================================

function saveCart() {

    localStorage.setItem(
        "shopflow_cart",
        JSON.stringify(cart)
    );
}


// =====================================================
// LOAD CART
// =====================================================

function loadCart() {

    const savedCart =
        localStorage.getItem(
            "shopflow_cart"
        );

    if (!savedCart) {
        cart = [];
        return;
    }

    try {

        cart =
            JSON.parse(savedCart);

        if (!Array.isArray(cart)) {
            cart = [];
        }

    } catch {

        cart = [];
    }
}


// =====================================================
// CHECK CURRENT USER
// =====================================================

async function checkUser() {

    const {
        data,
        error
    } = await supabase.auth.getUser();

    if (error) {

        console.error(
            "User check error:",
            error
        );

        return null;
    }

    return data.user;
}


// =====================================================
// LOGIN
// =====================================================

window.login = async function(event) {

    event.preventDefault();

    const email =
        document.getElementById(
            "login-email"
        ).value.trim();

    const password =
        document.getElementById(
            "login-password"
        ).value;

    const message =
        document.getElementById(
            "login-message"
        );

    message.textContent =
        "Logging in...";

    try {

        const {
            data,
            error
        } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw error;
        }

        message.textContent =
            "Login successful! ✅";

        setTimeout(() => {

            closeModal("login-modal");

            loadOrders();

        }, 700);

    } catch (error) {

        console.error(error);

        message.textContent =
            error.message ||
            "Login failed.";
    }
};


// =====================================================
// SIGNUP
// =====================================================

window.signup = async function(event) {

    event.preventDefault();

    const email =
        document.getElementById(
            "signup-email"
        ).value.trim();

    const password =
        document.getElementById(
            "signup-password"
        ).value;

    const message =
        document.getElementById(
            "signup-message"
        );

    message.textContent =
        "Creating account...";

    try {

        const {
            data,
            error
        } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            throw error;
        }

        if (
            data.user &&
            !data.session
        ) {

            message.textContent =
                "Signup successful! Please verify your email. 📧";

        } else {

            message.textContent =
                "Account created successfully! ✅";

        }

    } catch (error) {

        console.error(error);

        message.textContent =
            error.message ||
            "Signup failed.";
    }
};


// =====================================================
// LOGOUT
// =====================================================

window.logout = async function() {

    const {
        error
    } = await supabase.auth.signOut();

    if (error) {

        alert(
            "Logout failed: " +
            error.message
        );

        return;
    }

    alert("Logged out successfully 👋");

    loadOrders();
};


// =====================================================
// CHECKOUT
// =====================================================

window.checkout = async function() {

    if (!cart.length) {

        alert(
            "Your cart is empty."
        );

        return;
    }

    const user =
        await checkUser();

    if (!user) {

        alert(
            "Please login before checkout."
        );

        showLogin();

        return;
    }

    const items =
        cart.map(item => ({
            product_id: Number(item.id),
            quantity: Number(item.quantity)
        }));

    try {

        const {
            data: sessionData
        } = await supabase.auth.getSession();

        const session =
            sessionData.session;

        if (!session) {

            alert(
                "Session expired. Please login again."
            );

            return;
        }

        const response =
            await fetch(
                `${API_BASE_URL}/orders`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${session.access_token}`
                    },

                    body: JSON.stringify({
                        items
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Checkout failed"
            );
        }

        alert(
            "Order placed successfully! 🎉"
        );

        cart = [];

        saveCart();

        renderCart();

        await loadProducts();

        await loadOrders();

        document
            .getElementById("orders")
            ?.scrollIntoView({
                behavior: "smooth"
            });

    } catch (error) {

        console.error(
            "Checkout error:",
            error
        );

        alert(
            error.message ||
            "Unable to place order."
        );
    }
};


// =====================================================
// LOAD ORDERS
// =====================================================

async function loadOrders() {

    const container =
        document.getElementById(
            "orders-container"
        );

    if (!container) {
        return;
    }

    const user =
        await checkUser();

    if (!user) {

        container.innerHTML = `
            <p>
                Login to view your orders.
            </p>
        `;

        return;
    }

    try {

        const {
            data: sessionData
        } = await supabase.auth.getSession();

        const session =
            sessionData.session;

        if (!session) {
            return;
        }

        const response =
            await fetch(
                `${API_BASE_URL}/orders`,
                {
                    headers: {
                        "Authorization":
                            `Bearer ${session.access_token}`
                    }
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Failed to load orders"
            );
        }

        renderOrders(
            data.orders || []
        );

    } catch (error) {

        console.error(
            "Orders error:",
            error
        );

        container.innerHTML = `
            <p>
                Unable to load orders.
            </p>
        `;
    }
}


// =====================================================
// RENDER ORDERS
// =====================================================

function renderOrders(orders) {

    const container =
        document.getElementById(
            "orders-container"
        );

    if (!orders.length) {

        container.innerHTML = `
            <p>
                No orders found.
            </p>
        `;

        return;
    }

    container.innerHTML = "";

    orders.forEach(order => {

        const card =
            document.createElement("div");

        card.className =
            "order-card";

        const date =
            order.created_at
                ? new Date(
                    order.created_at
                ).toLocaleString()
                : "N/A";

        const items =
            order.order_items || [];

        card.innerHTML = `

            <h3>
                Order #${order.id}
            </h3>

            <p>
                Date: ${date}
            </p>

            <p>
                Total:
                <strong>
                    ₹${Number(
                        order.total_amount
                    ).toFixed(2)}
                </strong>
            </p>

            <p>
                Status:
                <span class="order-status">
                    ${escapeHTML(
                        order.status
                    )}
                </span>
            </p>

            <div>

                <strong>
                    Items:
                </strong>

                <ul>
                    ${
                        items.map(item => `
                            <li>
                                Product #${item.product_id}
                                × ${item.quantity}
                            </li>
                        `).join("")
                    }
                </ul>

            </div>
        `;

        container.appendChild(card);

    });
}


// =====================================================
// MODAL FUNCTIONS
// =====================================================

window.showLogin = function() {

    const modal =
        document.getElementById(
            "login-modal"
        );

    if (modal) {

        modal.style.display =
            "flex";
    }
};


window.showSignup = function() {

    const modal =
        document.getElementById(
            "signup-modal"
        );

    if (modal) {

        modal.style.display =
            "flex";
    }
};


window.closeModal = function(id) {

    const modal =
        document.getElementById(id);

    if (modal) {

        modal.style.display =
            "none";
    }
};


// =====================================================
// CLOSE MODAL WHEN CLICKING OUTSIDE
//
