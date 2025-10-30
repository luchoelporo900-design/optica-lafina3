const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

let ROLE = "guest";
let PRODUCTS = [];
let CART = []; // {id, name, price, qty}

const WHATSAPP_PHONE = "5959XXXXXXXX"; // ← PONÉ AQUÍ TU NÚMERO (sin +). Ej: 595981234567

function format(n){ return Number(n||0).toLocaleString(); }

function setRole(role){
  ROLE = role;
  $("#roleBadge").textContent = role.toUpperCase();
  const adminEls = $$(".adminOnly");
  adminEls.forEach(el => el.classList.toggle("hidden", role!=="admin"));
}

async function fetchJSON(url, opts={}){
  const res = await fetch(url, opts);
  return res.json();
}

async function loadProducts(){
  const data = await fetchJSON("/api/products");
  PRODUCTS = data.products || [];
  renderCatalog();
  renderStockTable();
}

function renderCatalog(){
  const grid = $("#cardGrid");
  grid.innerHTML = "";
  PRODUCTS.forEach(p=>{
    const card = document.createElement("div");
    card.className = "card product-card";
    card.innerHTML = `
      <div class="prod-title">${p.name}</div>
      <div class="prod-price">Gs. ${format(p.price)}</div>
      <div class="prod-stock">Disp: ${p.stock}</div>
      <div class="row">
        <button data-id="${p.id}" class="add">Añadir</button>
        <button data-id="${p.id}" class="sub secondary">-</button>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.onclick = (e)=>{
    const id = e.target.dataset.id;
    if(!id) return;
    const p = PRODUCTS.find(x=>x.id===id);
    if(!p) return;
    if(e.target.classList.contains("add")) addToCart(p);
    if(e.target.classList.contains("sub")) addToCart(p, -1);
  };

  renderCart();
}

function addToCart(p, delta=1){
  let line = CART.find(x=>x.id===p.id);
  if(!line){ line = { id:p.id, name:p.name, price:p.price, qty:0 }; CART.push(line); }
  line.qty = Math.max(0, line.qty + delta);
  if(line.qty===0) CART = CART.filter(x=>x.id!==p.id);
  renderCart();
}

function renderCart(){
  const list = $("#cartList");
  list.innerHTML = "";
  let total = 0;
  CART.forEach(i=>{
    total += i.qty * i.price;
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <span>${i.qty}× ${i.name}</span>
      <strong>Gs. ${format(i.qty*i.price)}</strong>
    `;
    list.appendChild(row);
  });
  $("#cartTotal").textContent = `Gs. ${format(total)}`;
}

function renderStockTable(){
  const tbody = $("#stockTable tbody");
  if(!tbody) return;
  tbody.innerHTML = "";
  PRODUCTS.forEach(p=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.stock}</td>
      <td>${format(p.price)}</td>
      <td>
        <button class="secondary" data-act="edit" data-id="${p.id}">Editar</button>
        <button class="secondary" data-act="del" data-id="${p.id}">Borrar</button>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.onclick = async (e)=>{
    const btn = e.target.closest("button");
    if(!btn) return;
    const id = btn.dataset.id;
    if(btn.dataset.act==="del"){
      if(!confirm("¿Borrar producto?")) return;
      await fetch(`/api/products/${id}`, { method:"DELETE", headers:{ "x-role": ROLE }});
      await loadProducts();
    }else{
      const p = PRODUCTS.find(x=>x.id===id);
      const name = prompt("Nombre:", p.name); if(name===null) return;
      const stock = prompt("Stock:", p.stock); if(stock===null) return;
      const price = prompt("Precio:", p.price); if(price===null) return;
      await fetch(`/api/products/${id}`, {
        method:"PUT",
        headers:{ "Content-Type":"application/json", "x-role": ROLE },
        body: JSON.stringify({ name, stock:Number(stock), price:Number(price) })
      });
      await loadProducts();
    }
  };
}

function setActiveTab(id){
  $$(".tab").forEach(t=>t.classList.add("hidden"));
  $$(".tabs button").forEach(b=>b.classList.remove("active"));
  $(`#${id}`).classList.remove("hidden");
  $(`.tabs button[data-tab="${id}"]`).classList.add("active");
}

function buildWhatsAppLink(){
  if(!CART.length){ alert("Agregá productos al carrito"); return; }
  const lines = CART.map(i=>`${i.qty}× ${i.name} - Gs. ${format(i.qty*i.price)}`);
  const total = CART.reduce((s,i)=>s+i.qty*i.price,0);
  const msg = `Hola! Quiero pedir:%0A${lines.join("%0A")}%0A%0ATotal: Gs. ${format(total)}`;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${msg}`;
}

function bindUI(){
  // Tabs
  $$(".tabs button").forEach(btn=>{
    btn.onclick = ()=> setActiveTab(btn.dataset.tab);
  });

  // WhatsApp
  $("#waBtn").onclick = ()=>{
    const url = buildWhatsAppLink();
    if(url) window.open(url, "_blank");
  };

  // Login modal
  $("#loginBtn").onclick = ()=> $("#loginModal").classList.remove("hidden");
  $("#closeModal").onclick = ()=> $("#loginModal").classList.add("hidden");
  $("#adminEnter").onclick = async ()=>{
    const password = $("#adminPass").value;
    const res = await fetch("/api/auth/admin", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ password })
    });
    if(res.ok){
      setRole("admin");
      $("#loginModal").classList.add("hidden");
      setActiveTab("stock");
    }else{
      alert("Contraseña incorrecta");
    }
  };
}

window.addEventListener("DOMContentLoaded", async ()=>{
  bindUI();
  setRole("guest");
  setActiveTab("catalogo");
  await loadProducts();
});
