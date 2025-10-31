// ====== CONFIG ======
const WHATSAPP_PHONE = "595987459717"; // ej: "5959XXXXXXXX" (sin +). Vacío = abre WhatsApp para elegir contacto
const ORDERED_CATS = ["Todos","Hombre","Mujer","Niños","Sol","Recetado","Metal","Acetato","Titanio"];

// ====== STATE ======
let PRODUCTS = [];
let state = { q:"", cat:"Todos" };
let FAVS = new Set(JSON.parse(localStorage.getItem("lafina:favs") || "[]"));

// ====== HELPERS ======
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const grid    = $("#grid");
const statusEl= $("#status");
const chipsEl = $("#chips");
const qEl     = $("#q");
const fab     = $("#sendWA");

// Lightbox
const lightbox = $("#lightbox");
const lightImg = $("#lightImg");
const closeLb  = $("#closeLb");

function saveFavs(){
  localStorage.setItem("lafina:favs", JSON.stringify([...FAVS]));
  updateFab();
}
function toggleFav(id){
  if(FAVS.has(id)) FAVS.delete(id); else FAVS.add(id);
  saveFavs();
  // actualizar el botón de esa tarjeta
  const btn = grid.querySelector(`[data-fav="${id}"]`);
  if(btn) btn.classList.toggle("active", FAVS.has(id));
}
function formatGs(n){ return Number(n||0).toLocaleString("es-PY"); }
function updateFab(){
  const n = FAVS.size;
  fab.textContent = n>0 ? `Enviar por WhatsApp (${n})` : "Enviar por WhatsApp";
  fab.style.display = n>0 ? "inline-flex" : "none";
}

// ====== INIT ======
document.addEventListener("DOMContentLoaded", async ()=>{
  buildChips(ORDERED_CATS);
  await loadProducts();

  // Mostrar solo chips que existan en productos
  const present = new Set(PRODUCTS.map(p => (p.category||"").trim()));
  const cats = ["Todos", ...ORDERED_CATS.filter(c => c!=="Todos" && present.has(c))];
  buildChips(cats.length>1 ? cats : ORDERED_CATS);

  bindEvents();
  updateFab();
  render();
});

// ====== LOAD ======
async function loadProducts(){
  statusEl.textContent = "Cargando productos…";
  grid.style.display = "none";
  try{
    const r = await fetch("/api/products");
    const data = await r.json();
    PRODUCTS = (data.ok && Array.isArray(data.items)) ? data.items : [];
  }catch(e){
    statusEl.textContent = "Error: " + e.message;
    return;
  }
  if(PRODUCTS.length===0){
    statusEl.innerHTML = "Aún no hay productos. <a class='admin' href='stock.html'>Agregar ahora</a>";
    return;
  }
  statusEl.textContent = "";
  grid.style.display = "grid";
}

// ====== UI BUILD ======
function buildChips(cats){
  chipsEl.innerHTML = cats.map(c => `
    <button class="chip ${c===state.cat?"active":""}" data-cat="${c}">${c}</button>
  `).join("");
}

function bindEvents(){
  // chips
  chipsEl.addEventListener("click", e=>{
    const b = e.target.closest(".chip");
    if(!b) return;
    state.cat = b.dataset.cat;
    $$(".chip").forEach(x=>x.classList.toggle("active", x===b));
    render();
  });

  // search
  qEl.addEventListener("input", ()=>{
    state.q = qEl.value.toLowerCase();
    render();
  });

  // grid: favoritos + lightbox
  grid.addEventListener("click", e=>{
    const fav = e.target.closest("[data-fav]");
    if(fav){
      toggleFav(fav.dataset.fav);
      return;
    }
    const img = e.target.closest("[data-img]");
    if(img){
      openLightbox(img.dataset.img);
    }
  });

  // lightbox
  closeLb.onclick = closeLightbox;
  lightbox.addEventListener("click", (e)=>{ if(e.target===lightbox) closeLightbox(); });

  // FAB WhatsApp
  fab.onclick = sendWhatsApp;
}

// ====== RENDER ======
function render(){
  const term = state.q;
  const cat  = state.cat;

  const list = PRODUCTS.filter(p=>{
    const byCat = (cat==="Todos") || ((p.category||"").trim()===cat);
    const txt   = `${p.name||""} ${p.code||""}`.toLowerCase();
    const byQ   = term==="" || txt.includes(term);
    return byCat && byQ;
  });

  if(list.length===0){
    grid.innerHTML = "";
    statusEl.textContent = "Sin resultados.";
    grid.style.display = "none";
    updateFab();
    return;
  }
  statusEl.textContent = "";
  grid.style.display = "grid";

  grid.innerHTML = list.map(p=>{
    const price = formatGs(p.price);
    const code  = p.code ? ` (Código: ${p.code})` : "";
    const img   = p.image
      ? `<img data-img="${p.image}" src="${p.image}" alt="${p.name}">`
      : `<div class="noimg">Sin imagen</div>`;

    const favActive = FAVS.has(p.id) ? "active" : "";

    return `
      <div class="card">
        <div class="thumb" title="Ver grande">${img}</div>
        <div class="box">
          <div class="t1">${p.name||"Producto"}</div>
          <div>Gs ${price}</div>
          ${p.code? `<div class="muted">Código: ${p.code}</div>`:""}
          ${p.category? `<div class="muted">Categoría: ${p.category}</div>`:""}
          <div class="row">
            <button class="btn fav ${favActive}" data-fav="${p.id}">${FAVS.has(p.id)?"✓ En favoritos":"Favoritos"}</button>
            <a class="btn wa" href="${singleWA(p)}" target="_blank" rel="noopener">WhatsApp</a>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // actualizar textos de botones favoritos (por si cambió el set)
  $$(".btn.fav").forEach(b=>{
    const id = b.dataset.fav;
    b.textContent = FAVS.has(id) ? "✓ En favoritos" : "Favoritos";
    b.classList.toggle("active", FAVS.has(id));
  });

  updateFab();
}

// ====== WHATSAPP ======
function siteUrl(){
  return typeof location!=="undefined" ? location.origin : "";
}
function singleWA(p){
  const price = formatGs(p.price);
  const msg = encodeURIComponent(
    `Hola, quiero este producto:\n` +
    `${p.name}${p.code? " ("+p.code+")":""}\n` +
    `Precio: Gs ${price}\n${siteUrl()}`
  );
  return WHATSAPP_PHONE ? `https://wa.me/${WHATSAPP_PHONE}?text=${msg}` : `https://wa.me/?text=${msg}`;
}
function sendWhatsApp(){
  if(FAVS.size===0){ alert("No tienes productos en favoritos."); return; }
  const list = PRODUCTS.filter(p=>FAVS.has(p.id));
  const lines = list.map((p,i)=>{
    const price = formatGs(p.price);
    return `${i+1}. ${p.name}${p.code? " ("+p.code+")":""} — Gs ${price}`;
  });
  const msg = encodeURIComponent(
    `Hola, quiero estos productos:\n` +
    lines.join("\n") + `\n\n${siteUrl()}`
  );
  const url = WHATSAPP_PHONE ? `https://wa.me/${WHATSAPP_PHONE}?text=${msg}` : `https://wa.me/?text=${msg}`;
  window.open(url, "_blank");
}

// ====== LIGHTBOX ======
function openLightbox(src){
  lightImg.src = src;
  lightbox.classList.remove("hidden");
}
function closeLightbox(){
  lightImg.src = "";
  lightbox.classList.add("hidden");
}
