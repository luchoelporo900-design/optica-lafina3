// ====== CONFIG ======
const WHATSAPP_PHONE = ""; // ej "5959XXXXXXXX" (sin +) o dejar vacío para elegir contacto
const ORDERED_CATS = ["Todos","Hombre","Mujer","Niños","Sol","Recetado","Metal","Acetato","Titanio"];

// ====== STATE ======
let PRODUCTS = [];
let FAVS = new Set(JSON.parse(localStorage.getItem("lafina:favs")||"[]"));
let state = { q:"", cat:"Todos" };

// ====== DOM ======
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const grid = $("#grid"), statusEl = $("#status"), chipsEl = $("#chips"), qEl = $("#q");
const fab = $("#sendWA");
const lightbox = $("#lightbox"), lightImg = $("#lightImg"), closeLb = $("#closeLb");

function formatGs(n){ return Number(n||0).toLocaleString("es-PY"); }
function siteUrl(){ return location.origin; }
function saveFavs(){ localStorage.setItem("lafina:favs", JSON.stringify([...FAVS])); updateFab(); }
function updateFab(){ const n=FAVS.size; fab.textContent = n?`Enviar por WhatsApp (${n})`:"Enviar por WhatsApp"; fab.style.display = n? "inline-flex":"none"; }

document.addEventListener("DOMContentLoaded", async ()=>{
  await loadProducts();
  buildChips();
  bindEvents();
  render();
  updateFab();
});

async function loadProducts(){
  statusEl.textContent = "Cargando productos…";
  grid.style.display = "none";
  try{
    const r = await fetch("/api/products");
    const data = await r.json();
    PRODUCTS = Array.isArray(data.items) ? data.items : [];
  }catch(e){
    statusEl.textContent = "Error de red";
    return;
  }
  if(PRODUCTS.length===0){
    statusEl.innerHTML = "Aún no hay productos. <a class='admin-link' href='/stock.html'>Agregar ahora</a>";
    return;
  }
  statusEl.textContent = "";
  grid.style.display = "grid";
}

function presentCats(){
  const s = new Set(PRODUCTS.map(p => (p.category||"").trim()).filter(Boolean));
  return ["Todos", ...ORDERED_CATS.filter(c => c!=="Todos" && s.has(c))];
}
function buildChips(){
  const cats = presentCats();
  chipsEl.innerHTML = cats.map(c => `<button class="chip ${c===state.cat?"active":""}" data-cat="${c}">${c}</button>`).join("");
}

function bindEvents(){
  chipsEl.addEventListener("click", e=>{
    const b=e.target.closest(".chip"); if(!b) return;
    state.cat = b.dataset.cat; $$(".chip").forEach(x=>x.classList.toggle("active",x===b)); render();
  });
  qEl.addEventListener("input", ()=>{ state.q = qEl.value.toLowerCase(); render(); });

  grid.addEventListener("click", e=>{
    const fav = e.target.closest("[data-fav]"); if(fav){ toggleFav(fav.dataset.fav); return; }
    const img = e.target.closest("[data-img]"); if(img){ openLightbox(img.dataset.img); }
  });
  closeLb.onclick = closeLightbox;
  lightbox.addEventListener("click", e=>{ if(e.target===lightbox) closeLightbox(); });
  fab.onclick = sendWhatsApp;
}

function render(){
  const term = state.q;
  const cat  = state.cat;
  const list = PRODUCTS.filter(p=>{
    const okCat = (cat==="Todos") || ((p.category||"").trim()===cat);
    const txt = `${p.name||""} ${p.code||""}`.toLowerCase();
    return okCat && (!term || txt.includes(term));
  });

  if(list.length===0){
    grid.innerHTML=""; statusEl.textContent = "Sin resultados."; grid.style.display="none"; updateFab(); return;
  }
  statusEl.textContent=""; grid.style.display="grid";

  grid.innerHTML = list.map(p=>{
    const img = p.image ? `<img data-img="${p.image}" src="${p.image}" alt="${p.name}">` : `<div class="noimg">Sin imagen</div>`;
    const favActive = FAVS.has(p.id) ? "active" : "";
    return `
      <div class="card">
        <div class="thumb" title="Ver grande">${img}</div>
        <div class="box">
          <div class="t1">${p.name||"Producto"}</div>
          <div>Gs ${formatGs(p.price)}</div>
          ${p.code? `<div class="muted">Código: ${p.code}</div>`:""}
          ${p.category? `<div class="muted">Categoría: ${p.category}</div>`:""}
          <div class="row">
            <button class="btn fav ${favActive}" data-fav="${p.id}">${FAVS.has(p.id)?"✓ En favoritos":"Favoritos"}</button>
            <a class="btn wa" href="${singleWA(p)}" target="_blank" rel="noopener">WhatsApp</a>
          </div>
        </div>
      </div>`;
  }).join("");

  $$(".btn.fav").forEach(b=>{
    const id=b.dataset.fav; b.textContent = FAVS.has(id)?"✓ En favoritos":"Favoritos";
    b.classList.toggle("active", FAVS.has(id));
  });

  updateFab();
}

function toggleFav(id){
  if(FAVS.has(id)) FAVS.delete(id); else FAVS.add(id);
  saveFavs();
}
function openLightbox(src){ lightImg.src = src||""; lightbox.classList.remove("hidden"); }
function closeLightbox(){ lightImg.src=""; lightbox.classList.add("hidden"); }

function singleWA(p){
  const msg = encodeURIComponent(`Hola, quiero este producto:\n${p.name}${p.code? " ("+p.code+")":""}\nPrecio: Gs ${formatGs(p.price)}\n${siteUrl()}`);
  return WHATSAPP_PHONE ? `https://wa.me/${WHATSAPP_PHONE}?text=${msg}` : `https://wa.me/?text=${msg}`;
}
function sendWhatsApp(){
  if(FAVS.size===0){ alert("No tienes productos en favoritos."); return; }
  const list = PRODUCTS.filter(p=>FAVS.has(p.id));
  const lines = list.map((p,i)=>`${i+1}. ${p.name}${p.code?" ("+p.code+")":""} — Gs ${formatGs(p.price)}`);
  const msg = encodeURIComponent(`Hola, quiero estos productos:\n${lines.join("\n")}\n\n${siteUrl()}`);
  const url = WHATSAPP_PHONE ? `https://wa.me/${WHATSAPP_PHONE}?text=${msg}` : `https://wa.me/?text=${msg}`;
  window.open(url,"_blank");
}
