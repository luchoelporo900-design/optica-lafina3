// public/app.js

const ORDERED_CATS = ["Todos","Hombre","Mujer","Niños","Sol","Recetado","Metal","Acetato","Titanio"];

let PRODUCTS = [];
let state = { q: "", cat: "Todos" };

const $ = s => document.querySelector(s);
const grid = $("#grid");
const statusEl = $("#status");
const chipsEl = $("#chips");
const qEl = $("#q");

document.addEventListener("DOMContentLoaded", async () => {
  await loadProducts();
  buildChips();
  bindEvents();
  render();
});

async function loadProducts(){
  statusEl.textContent = "Cargando productos…";
  grid.style.display = "none";
  try{
    const r = await fetch("/api/products");
    const data = await r.json();
    if(!data.ok) throw new Error(data.error||"No se pudo cargar");
    PRODUCTS = Array.isArray(data.items)? data.items : [];
  }catch(e){
    statusEl.textContent = "Error: " + e.message;
    return;
  }
  if(PRODUCTS.length === 0){
    statusEl.innerHTML = "Aún no hay productos. <a href='stock.html' class='admin'>Agregar ahora</a>";
    return;
  }
  statusEl.textContent = "";
  grid.style.display = "grid";
}

function buildChips(){
  const present = new Set(PRODUCTS.map(p => (p.category||"").trim()));
  const cats = ["Todos", ...ORDERED_CATS.filter(c=>c!=="Todos" && present.has(c))];
  chipsEl.innerHTML = cats.map(c => `
    <button class="chip ${c===state.cat?"active":""}" data-cat="${c}">${c}</button>
  `).join("");
}

function bindEvents(){
  chipsEl.addEventListener("click", (e)=>{
    const b = e.target.closest(".chip");
    if(!b) return;
    state.cat = b.dataset.cat;
    [...chipsEl.querySelectorAll(".chip")].forEach(x=>x.classList.toggle("active", x===b));
    render();
  });
  qEl.addEventListener("input", ()=>{
    state.q = qEl.value.toLowerCase();
    render();
  });
}

function render(){
  const term = state.q;
  const cat = state.cat;

  const list = PRODUCTS.filter(p=>{
    const byCat = (cat==="Todos") || ((p.category||"").trim()===cat);
    const txt = `${p.name||""} ${p.code||""}`.toLowerCase();
    const byQ = term==="" || txt.includes(term);
    return byCat && byQ;
  });

  if(list.length===0){
    grid.innerHTML = "";
    statusEl.textContent = "Sin resultados.";
    grid.style.display = "none";
    return;
  }

  statusEl.textContent = "";
  grid.style.display = "grid";

  grid.innerHTML = list.map(p=>{
    const price = Number(p.price||0).toLocaleString("es-PY");
    const img = p.image ? `<img src="${p.image}" alt="${p.name}">` : `<div style="height:180px;display:grid;place-items:center;background:#0d0d0d" class="muted">Sin imagen</div>`;
    return `
      <div class="card">
        ${img}
        <div class="box">
          <div style="font-weight:700">${p.name||"Producto"}</div>
          <div>Gs ${price}</div>
          ${p.code? `<div class="muted" style="font-size:.9em">Código: ${p.code}</div>`:""}
          ${p.category? `<div class="muted" style="font-size:.9em">Categoría: ${p.category}</div>`:""}
        </div>
      </div>
    `;
  }).join("");
}
