
const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

let ROLE = null;
let PRODUCTS = [];
let CART = [];

function setRole(role) {
  ROLE = role;
  $("#roleBadge").textContent = role ? role.toUpperCase() : "";
  if (role) {
    $("#authView").classList.add("hidden");
    $("#dashboard").classList.remove("hidden");
    $$(".adminOnly").forEach(el => el.style.display = (ROLE === "admin" ? "" : "none"));
  }
}

async function loginGuest() {
  const res = await fetch("/api/auth/guest", { method: "POST" });
  const data = await res.json();
  if (data.ok) setRole("guest");
}

async function loginAdmin() {
  const password = $("#adminPass").value;
  const res = await fetch("/api/auth/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (res.ok) {
    const data = await res.json();
    if (data.ok) setRole("admin");
  } else {
    alert("Contraseña incorrecta");
  }
}

function setActiveTab(tabId) {
  $$(".tab").forEach(t => t.classList.add("hidden"));
  $$(".tabs button").forEach(b => b.classList.remove("active"));
  $(`#${tabId}`).classList.remove("hidden");
  $(`.tabs button[data-tab="${tabId}"]`).classList.add("active");
}

async function loadProducts() {
  const res = await fetch("/api/products");
  const data = await res.json();
  PRODUCTS = data.products || [];
  renderProducts();
  buildSaleForm();
}

function renderProducts() {
  const tbody = $("#stockTable tbody");
  tbody.innerHTML = "";
  PRODUCTS.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.stock}</td>
      <td>${p.price.toLocaleString()}</td>
      <td class="adminOnly">
        <div class="actions">
          <button class="secondary" data-act="edit" data-id="${p.id}">Editar</button>
          <button class="secondary" data-act="del" data-id="${p.id}">Borrar</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  $$(".adminOnly").forEach(el => el.style.display = (ROLE === "admin" ? "" : "none"));
  tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    if (act === "del") {
      if (!confirm("¿Borrar producto?")) return;
      await fetch(`/api/products/${id}`, { method: "DELETE", headers: { "x-role": ROLE } });
      await loadProducts();
    } else if (act === "edit") {
      const p = PRODUCTS.find(x => x.id === id);
      const name = prompt("Nombre:", p.name);
      if (name === null) return;
      const stock = prompt("Stock:", p.stock);
      if (stock === null) return;
      const price = prompt("Precio:", p.price);
      if (price === null) return;
      await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-role": ROLE },
        body: JSON.stringify({ name, stock: Number(stock), price: Number(price) })
      });
      await loadProducts();
    }
  }, { once: true });
}

function buildSaleForm() {
  const wrap = $("#ventaForm");
  wrap.innerHTML = "";
  CART = [];
  PRODUCTS.forEach(p => {
    const row = document.createElement("div");
    row.style.marginBottom = "8px";
    row.innerHTML = `
      <label>${p.name} (${p.stock} disp.)</label>
      <input type="number" min="0" value="0" data-id="${p.id}" style="width:100px;margin-left:8px;">
    `;
    wrap.appendChild(row);
  });
}

async function confirmSale() {
  const qtyInputs = $$("#ventaForm input[type='number']");
  const items = [];
  qtyInputs.forEach(inp => {
    const qty = Number(inp.value);
    if (qty > 0) items.push({ productId: inp.dataset.id, qty });
  });
  if (items.length === 0) return alert("Seleccioná al menos 1 producto");
  const res = await fetch("/api/sales", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
  const data = await res.json();
  if (!data.ok) {
    alert(data.error || "Error al guardar venta");
  } else {
    alert("Venta registrada ✔");
    await loadProducts();
    await loadSales();
    setActiveTab("ventas");
  }
}

async function loadSales() {
  const res = await fetch("/api/sales");
  const data = await res.json();
  const sales = data.sales || [];
  const tbody = $("#salesTable tbody");
  tbody.innerHTML = "";
  sales.slice().reverse().forEach(s => {
    const detail = s.items.map(i => `${i.qty}× ${i.name}`).join(", ");
    const tr = document.createElement("tr");
    const date = new Date(s.date);
    tr.innerHTML = `
      <td>${date.toLocaleString()}</td>
      <td>${detail}</td>
      <td>${(s.total||0).toLocaleString()}</td>
    `;
    tbody.appendChild(tr);
  });
}

function bindUI() {
  $("#guestBtn").addEventListener("click", loginGuest);
  $("#adminBtn").addEventListener("click", loginAdmin);
  $$(".tabs button").forEach(btn => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });
  $("#addBtn").addEventListener("click", async () => {
    const name = $("#pName").value.trim();
    const stock = Number($("#pStock").value || 0);
    const price = Number($("#pPrice").value || 0);
    if (!name) return alert("Nombre requerido");
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-role": ROLE },
      body: JSON.stringify({ name, stock, price })
    });
    $("#pName").value = ""; $("#pStock").value = ""; $("#pPrice").value = "";
    await loadProducts();
  });
  $("#confirmSale").addEventListener("click", confirmSale);
}

window.addEventListener("DOMContentLoaded", async () => {
  bindUI();
  setActiveTab("stock");
  await loadProducts();
  await loadSales();
});
