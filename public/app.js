/* Utilidades */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const api = p => fetch(p, {credentials:'include'});

/* Estado */
let PRODUCTS = [];
let FAVS = new Set();
let currentCat = 'Todos';

/* Construye URL segura para imagen, soporta path '/uploads/...' o absoluta */
const imgURL = (item) => {
  const u = item.image || item.img || '';
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('/')) return u;
  return `/uploads/${u}`;
};

/* Render de tarjetas */
const cardHTML = (it) => {
  const url = imgURL(it);
  return `
  <article class="card" data-id="${it.id}">
    <div class="imgbox" ${url ? `data-zoom="${url}"` : ''}>
      ${url ? `<img src="${url}" alt="${it.name||''}">` :
      `<img src="data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='600' height='450'><rect width='100%' height='100%' fill='%2313161c'/><text x='50%' y='50%' fill='%23a7b0bb' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='20'>Sin imagen</text></svg>`)}">`}
    </div>
    <div class="meta">
      <div class="title">${it.name||'—'}</div>
      <div class="price">Gs ${Number(it.price||0).toLocaleString('es-PY')}</div>
      <div class="code">Código: ${it.code||'—'}</div>
      <div class="cat">Categoría: ${it.category||'—'}</div>
    </div>
    <div class="actions">
      <button class="btn btn-wa" data-wa>WhatsApp</button>
      <button class="btn btn-fav ${FAVS.has(it.id)?'active':''}" data-fav>Favoritos</button>
    </div>
  </article>`;
};

/* Pintar listado */
function render(){
  const grid = $('#grid');
  const q = $('#search').value.trim().toLowerCase();
  let list = PRODUCTS.slice();

  if (currentCat !== 'Todos') list = list.filter(x => (x.category||'').toLowerCase() === currentCat.toLowerCase());
  if (q) list = list.filter(x =>
    (x.name||'').toLowerCase().includes(q) ||
    (x.code||'').toLowerCase().includes(q)
  );
  grid.innerHTML = list.map(cardHTML).join('') || `<p style="opacity:.75;text-align:center;margin:30px 0">Sin resultados.</p>`;

  // zoom
  $$('#grid .imgbox[data-zoom]').forEach(box=>{
    box.onclick=()=>{
      $('#zoomImg').src = box.dataset.zoom;
      $('#zoomDlg').showModal();
    };
  });

  // fav
  $$('#grid [data-fav]').forEach(btn=>{
    btn.onclick=()=>{
      const id = btn.closest('.card').dataset.id;
      if (FAVS.has(id)) FAVS.delete(id); else FAVS.add(id);
      btn.classList.toggle('active');
      $('.count').textContent = FAVS.size;
    };
  });

  // wa uno
  $$('#grid [data-wa]').forEach(btn=>{
    btn.onclick=()=>{
      const id = btn.closest('.card').dataset.id;
      const it = PRODUCTS.find(x=>String(x.id)===String(id));
      openWA([it]);
    };
  });

  $('.count').textContent = FAVS.size;
}

/* WhatsApp builder */
function openWA(items){
  const tel = ''; // si querés, poné tu número con formato internacional
  const lines = items.map(it => `• ${it.name} — Gs ${Number(it.price||0).toLocaleString('es-PY')} (cód: ${it.code||'—'})`);
  const msg = `Hola, me interesan estos productos:\n${lines.join('\n')}\n\n— Enviado desde Óptica La Fina`;
  const url = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
  window.open(url,'_blank');
}

/* Eventos UI */
$('#search').addEventListener('input', render);
$$('.chip').forEach(b=>{
  b.onclick=()=>{
    $$('.chip').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    currentCat = b.dataset.cat;
    render();
  };
});

$('#sendFavs').onclick=()=>{
  const items = PRODUCTS.filter(p=>FAVS.has(p.id));
  if (!items.length){ alert('No tienes favoritos seleccionados.'); return; }
  openWA(items);
};

$('#zoomClose').onclick=()=>$('#zoomDlg').close();

/* Carga de datos */
(async ()=>{
  try{
    const r = await api('/api/products');
    const data = await r.json();
    // Normalizar IDs
    PRODUCTS = (data||[]).map((x,i)=>({id: x.id ?? x._id ?? String(i+1), ...x}));
  }catch(e){
    console.error(e);
    PRODUCTS = [];
  }finally{
    render();
  }
})();
