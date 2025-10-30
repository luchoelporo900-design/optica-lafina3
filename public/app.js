console.log("La Fina Catalog v10");

const $ = (q)=>document.querySelector(q);
const $$ = (q)=>Array.from(document.querySelectorAll(q));

const WHATSAPP_PHONE = "5959XXXXXXXX"; // ← poné tu número (sin +)
let PRODUCTS = [];
let FAVORITES = new Set();
let CURRENT_CAT = "Todos";

function format(n){ return Number(n||0).toLocaleString("es-PY"); }
function shortId(id){ return (id||"").slice(-6).toUpperCase(); }

// Imagen por defecto si el producto no trae
const FALLBACK_IMG = "https://images.unsplash.com/photo-1523289333742-be1143f6b766?q=80&w=1200&auto=format&fit=crop";

async function fetchJSON(url,opts={}){ const r = await fetch(url,opts); return r.json(); }

async function loadProducts(){
  const data = await fetchJSON("/api/products");
  // adaptamos al formato de tarjetas
  PRODUCTS = (data.products||[]).map(p=>({
    id: p.id,
    title: p.name,
    price: p.price,
    stock: p.stock,
    // campos opcionales si más adelante los guardamos en la DB
    code: p.code || shortId(p.id),
    category: p.category || "Recetado",
    image: p.image || FALLBACK_IMG
  }));
  renderGrid();
}

function renderGrid(){
  const grid = $("#grid"); grid.innerHTML = "";
  const q = $("#q").value.trim().toLowerCase();
  const items = PRODUCTS.filter(p=>{
    const byCat = (CURRENT_CAT==="Todos") || (p.category===CURRENT_CAT);
    const byQuery = !q || (p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    return byCat && byQuery;
  });

  for(const it of items){
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <img class="img" src="${it.image}" alt="${it.title}">
      <div class="body">
        <div class="title-sm">${it.title}</div>
        <div class="price">Gs ${format(it.price)}</div>
        <div class="meta">Código: ${it.code}</div>
        <div class="meta">Categoría: ${it.category}</div>
        <div class="row" style="margin-top:10px">
          <button class="btn btn-gold" data-wa="${it.id}">WhatsApp</button>
          <button class="btn btn-outline" data-fav="${it.id}">${FAVORITES.has(it.id)?"Quitar":"Favoritos"}</button>
        </div>
      </div>`;
    grid.appendChild(card);
  }

  grid.onclick = (e)=>{
    const wa = e.target.closest("[data-wa]");
    const fv = e.target.closest("[data-fav]");
    if(wa) sendWA(wa.dataset.wa);
    if(fv) toggleFav(fv.dataset.fav);
  };

  $("#favCount").textContent = FAVORITES.size;
}

function toggleFav(id){
  FAVORITES.has(id) ? FAVORITES.delete(id) : FAVORITES.add(id);
  renderGrid();
}

function sendWA(id){
  const p = PRODUCTS.find(x=>x.id===id); if(!p) return;
  const msg = encodeURIComponent(
    `Hola! Me interesa este modelo:\n`+
    `• ${p.title}\n`+
    `• Código: ${p.code}\n`+
    `• Precio: Gs ${format(p.price)}`
  );
  window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${msg}`,"_blank");
}

function sendFavsWA(){
  if(FAVORITES.size===0){ alert("No hay favoritos seleccionados"); return; }
  const list = PRODUCTS.filter(p=>FAVORITES.has(p.id))
    .map(p=>`• ${p.title} (Gs ${format(p.price)})`).join("\n");
  const msg = encodeURIComponent(`Hola! Estos son mis favoritos:\n${list}`);
  window.open(`https://wa.me/${WHATSAPP_PHONE}?text=${msg}`,"_blank");
}

function bindUI(){
  // búsqueda
  $("#q").addEventListener("input", renderGrid);

  // chips de categoría
  $("#chips").addEventListener("click", (e)=>{
    const chip = e.target.closest(".chip"); if(!chip) return;
    $$(".chip").forEach(c=>c.classList.remove("active"));
    chip.classList.add("active");
    CURRENT_CAT = chip.dataset.cat;
    renderGrid();
  });

  // favoritos -> whatsapp
  $("#waFavs").onclick = sendFavsWA;

  // admin modal
  $("#adminLink").onclick = ()=> $("#loginModal").classList.remove("hidden");
  $("#adminCancel").onclick = ()=> $("#loginModal").classList.add("hidden");
  $("#adminEnter").onclick = async ()=>{
    const password = $("#adminPass").value;
    const res = await fetch("/api/auth/admin", {
      method:"POST", headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ password })
    });
    if(res.ok){ location.href = "/stock"; } // simple redirección (o podemos mostrar pestañas)
    else alert("Contraseña incorrecta");
  };
}

window.addEventListener("DOMContentLoaded", async ()=>{
  bindUI();
  await loadProducts();// --- LOGIN LOCAL SIMPLIFICADO ---
$("#adminEnter").onclick = ()=>{
  const pass = $("#adminPass").value.trim();
  if(pass === "lafina123325"){
    alert("Acceso administrador correcto ✅");
    $("#loginModal").classList.add("hidden");
    window.location.href = "/stock"; // o cambiar por /admin.html si lo tenés
  } else {
    alert("Contraseña incorrecta ❌");
  }
};

});
