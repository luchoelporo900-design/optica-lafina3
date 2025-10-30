console.log("La Fina v11");

const $ = (q)=>document.querySelector(q);
const $$ = (q)=>Array.from(document.querySelectorAll(q));

const WHATSAPP_PHONE = "5959XXXXXXXX"; // <-- tu número sin +
let PRODUCTS = [];
let FAVORITES = new Set();
let CURRENT_CAT = "Todos";
let ROLE = "guest"; // guest | admin

function format(n){ return Number(n||0).toLocaleString("es-PY"); }
function shortId(id){ return (id||"").slice(-6).toUpperCase(); }

// ---------- CATALOGO ----------
const FALLBACK_IMG = "https://images.unsplash.com/photo-1523289333742-be1143f6b766?q=80&w=1200&auto=format&fit=crop";

async function fetchJSON(url,opts={}){ const r = await fetch(url,opts); return r.json(); }

async function loadProducts(){
  const data = await fetchJSON("/api/products");
  PRODUCTS = (data.products||[]).map(p=>({
    id: p.id,
    title: p.name,
    price: p.price,
    stock: p.stock,
    code: p.code || shortId(p.id),
    category: p.category || "Recetado",
    image: p.image || FALLBACK_IMG
  }));
  renderGrid();
  if(ROLE==="admin"){ renderStockTable(); loadSales(); }
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

// ---------- ADMIN UI ----------
function setRole(role){
  ROLE = role;
  $$(".adminOnly").forEach(el => el.classList.toggle("hidden", role!=="admin"));
}

function setActiveTab(id){
  $$(".tab").forEach(t=>t.classList.add("hidden"));
  $$(".tabs button").forEach(b=>b.classList.remove("active"));
  $(`#${id}`).classList.remove("hidden");
  const btn = $(`.tabs button[data-tab="${id}"]`);
  if(btn) btn.classList.add("active");
}

async function renderStockTable(){
  const tbody = $("#stockTable tbody");
  if(!tbody) return;
  tbody.innerHTML = "";
  PRODUCTS.forEach(p=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.title}</td>
      <td>${p.stock}</td>
      <td>${format(p.price)}</td>
      <td>
        <button class="btn" data-act="edit" data-id="${p.id}">Editar</button>
        <button class="btn" data-act="del" data-id="${p.id}">Borrar</button>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.onclick = async (e)=>{
    const btn = e.target.closest("button"); if(!btn) return;
    const id = btn.dataset.id;
    if(btn.dataset.act==="del"){
      if(!confirm("¿Borrar producto?")) return;
      await fetch(`/api/products/${id}`, { method:"DELETE", headers:{ "x-role":"admin" }});
      await loadProducts();
    }else{
      const p = PRODUCTS.find(x=>x.id===id);
      const name = prompt("Nombre:", p.title); if(name===null) return;
      const stock = prompt("Stock:", p.stock); if(stock===null) return;
      const price = prompt("Precio:", p.price); if(price===null) return;
      await fetch(`/api/products/${id}`, {
        method:"PUT",
        headers:{ "Content-Type":"application/json", "x-role":"admin" },
        body: JSON.stringify({ name, stock:Number(stock), price:Number(price) })
      });
      await loadProducts();
    }
  };
}

async function loadSales(){
  const data = await fetchJSON("/api/sales");
  const tbody = $("#salesTable tbody");
  if(!tbody) return;
  tbody.innerHTML = "";
  (data.sales||[]).slice().reverse().forEach(s=>{
    const detail = s.items.map(i=>`${i.qty}× ${i.name}`).join(", ");
    const tr = document.createElement("tr");
    const date = new Date(s.date);
    tr.innerHTML = `<td>${date.toLocaleString()}</td><td>${detail}</td><td>${format(s.total||0)}</td>`;
    tbody.appendChild(tr);
  });
}

// ---------- BIND UI ----------
function bindUI(){
  // Tabs
  $$(".tabs button").forEach(btn=>{
    btn.onclick = ()=> setActiveTab(btn.dataset.tab);
  });

  // Catálogo
  $("#q").addEventListener("input", renderGrid);
  $("#chips").addEventListener("click", (e)=>{
    const chip = e.target.closest(".chip"); if(!chip) return;
    $$(".chip").forEach(c=>c.classList.remove("active"));
    chip.classList.add("active");
    CURRENT_CAT = chip.dataset.cat;
    renderGrid();
  });
  $("#waFavs").onclick = sendFavsWA;

  // Modal admin
  $("#adminLink").onclick = ()=> $("#loginModal").classList.remove("hidden");
  $("#adminCancel").onclick = ()=> $("#loginModal").classList.add("hidden");

  // Login real contra backend
  $("#adminEnter").onclick = async ()=>{
    const password = $("#adminPass").value.trim();
    const res = await fetch("/api/auth/admin", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ password })
    });
    if(res.ok){
      setRole("admin");
      $("#loginModal").classList.add("hidden");
      setActiveTab("stock");
      renderStockTable();
      loadSales();
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
