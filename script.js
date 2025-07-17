
// --- DOM Elements ---
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");

// --- State ---
let allProducts = [];
let selectedProducts = loadSelectedProducts();
let chatHistory = [];

// --- Utility: Save/load selected products from localStorage ---
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}
function loadSelectedProducts() {
  const data = localStorage.getItem("selectedProducts");
  return data ? JSON.parse(data) : [];
}

// --- Load and display products ---
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
}

function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card${selectedProducts.some(p => p.id === product.id) ? ' selected' : ''}" data-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button class="desc-toggle" data-id="${product.id}">Details</button>
        <div class="product-desc" id="desc-${product.id}" style="display:none;">${product.description}</div>
      </div>
    </div>
  `
    )
    .join("");
}

// --- Product selection logic ---
productsContainer.addEventListener("click", (e) => {
  // Toggle description
  if (e.target.classList.contains("desc-toggle")) {
    const id = e.target.getAttribute("data-id");
    const desc = document.getElementById(`desc-${id}`);
    desc.style.display = desc.style.display === "none" ? "block" : "none";
    return;
  }
  // Select/unselect product
  const card = e.target.closest(".product-card");
  if (!card) return;
  const id = parseInt(card.getAttribute("data-id"));
  const product = allProducts.find((p) => p.id === id);
  const idx = selectedProducts.findIndex((p) => p.id === id);
  if (idx === -1) {
    selectedProducts.push(product);
  } else {
    selectedProducts.splice(idx, 1);
  }
  saveSelectedProducts();
  displayProductsByCategory();
  renderSelectedProducts();
});

// --- Render selected products list ---
function renderSelectedProducts() {
  if (!selectedProducts.length) {
    selectedProductsList.innerHTML = '<em>No products selected.</em>';
    return;
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (p) => `
      <div class="selected-product">
        <img src="${p.image}" alt="${p.name}">
        <span>${p.name}</span>
        <button class="remove-selected" data-id="${p.id}">&times;</button>
      </div>
    `
    )
    .join("");
}

// Remove product from selected list
selectedProductsList.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-selected")) {
    const id = parseInt(e.target.getAttribute("data-id"));
    selectedProducts = selectedProducts.filter((p) => p.id !== id);
    saveSelectedProducts();
    displayProductsByCategory();
    renderSelectedProducts();
  }
});

// --- Category filter logic ---
async function displayProductsByCategory() {
  const selectedCategory = categoryFilter.value;
  if (!allProducts.length) await loadProducts();
  if (!selectedCategory) {
    productsContainer.innerHTML = `<div class="placeholder-message">Select a category to view products</div>`;
    return;
  }
  const filtered = allProducts.filter((p) => p.category === selectedCategory);
  displayProducts(filtered);
}
categoryFilter.addEventListener("change", displayProductsByCategory);

// --- Generate Routine with AI ---
generateRoutineBtn.addEventListener("click", async () => {
  if (!selectedProducts.length) {
    addMessageToChat("Please select at least one product to generate a routine.", "ai");
    return;
  }
  addMessageToChat("Generating your personalized routine...", "ai");
  // Add user message to chat history
  chatHistory.push({ role: "user", content: `Generate a skincare/haircare/makeup routine using these products: ${selectedProducts.map(p => `${p.name} (${p.brand})`).join(", ")}.` });
  // Call OpenAI via Cloudflare Worker
  const aiResponse = await getAIResponse([...chatHistory, { role: "user", content: `Here are the selected products: ${JSON.stringify(selectedProducts)}` }]);
  addMessageToChat(aiResponse, "ai");
  chatHistory.push({ role: "assistant", content: aiResponse });
});

// --- Chat logic ---
function addMessageToChat(text, sender = "user") {
  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${sender}`;
  msgDiv.innerHTML = text;
  chatWindow.appendChild(msgDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("userInput");
  const userMsg = input.value.trim();
  if (!userMsg) return;
  addMessageToChat(`<strong>You:</strong> ${userMsg}`, "user");
  chatHistory.push({ role: "user", content: userMsg });
  input.value = "";
  // Call OpenAI via Cloudflare Worker
  const aiResponse = await getAIResponse(chatHistory);
  addMessageToChat(`<strong>AI:</strong> ${aiResponse}`, "ai");
  chatHistory.push({ role: "assistant", content: aiResponse });
});

// --- OpenAI API via Cloudflare Worker ---
async function getAIResponse(messages) {
  const endpoint = "https://loreal-worker.crbuch.workers.dev";
  const body = {
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a helpful L'Oréal AI advisor. Only answer questions about L'Oréal products, routines, and beauty topics. If asked about anything else, politely refuse." },
      ...messages
    ],
    max_tokens: 400,
    temperature: 0.7
  };
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok || !data.choices) return "Sorry, I couldn't get a response. Please try again.";
    return data.choices[0].message.content.trim();
  } catch {
    return "Sorry, something went wrong. Please try again.";
  }
}

// --- On page load ---
window.addEventListener("DOMContentLoaded", async () => {
  await loadProducts();
  renderSelectedProducts();
  displayProductsByCategory();
});
