// public/app.js

// Teléfono de WhatsApp (opcional). Si lo tenés, ponelo así: "5959XXXXXXXX".
// Si lo dejás vacío, abrirá WhatsApp con el mensaje pero sin número.
const WHATSAPP_PHONE = ""; 

const ORDERED_CATS = ["Todos","Hombre","Mujer","Niños","Sol","Recetado","Metal","Acetato","Titanio"];

let PRODUCTS = [];
let state = { q: "", cat: "Todos" };

const $ = s => document.querySelector(s);
const grid = $("#grid");
const statusEl = $("#status");
const chipsEl = $("#chips");
const qEl = $("#q");

document.addEventListener("DOMContentLoaded", async () => {
  // Pintar chips desde el inicio (aunque no haya productos aún)
  buildChips(ORDERED_CATS);
  await loadProducts();
  // Si hay productos, reconstruyo chips con las categorías presentes (manteniendo orden)
  const present = new Set(PRODUCTS.map(p => (p.category||"").trim()));
  const cats = ["Todos", ...ORDERED_CATS.filter(c=>c!=="Todos" && present.has(c))];
  buildChips(cats.length>1 ? cats : ORDERED_CATS);
  bindEvents();
  render();
});

async function loadProducts(){
  statusEl.textContent = "Cargando productos…";
  grid.style.display = "none";
  PRODUCTS = [];
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

function buildChips(cats){
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
    const code = p.code ? ` (${p.code})` : "";
    const img = p.image ? `<img src="${p.image}" alt="${p.name}">` : `<div style="height:180px;display:grid;place-items:center;background:#0d0d0d" class="muted">Sin imagen</div>`;

    // Mensaje de WhatsApp
    const msg = encodeURIComponent(`Hola, quiero este producto:\n${p.name||"Producto"}${code}\nPrecio: Gs ${price}`);
    const waHref = WHATSAPP_PHONE
      ? `https://wa.me/${WHATSAPP_PHONE}?text=${msg}`
      : `https://wa.me/?text=${msg}`;

    return `
      <div class="card">
        ${img}
        <div class="box">
          <div style="font-weight:700">${p.name||"Producto"}</div>
          <div>Gs ${price}</div>
          ${p.code? `<div class="muted" style="font-size:.9em">Código: ${p.code}</div>`:""}
          ${p.category? `<div class="muted" style="font-size:.9em">Categoría: ${p.category}</div>`:""}
          <div class="row">
            <a class="btn wa" href="${waHref}" target="_blank" rel="noopener">WhatsApp</a>
          </div>
        </div>
      </div>
    `;
  }).join("");
}
