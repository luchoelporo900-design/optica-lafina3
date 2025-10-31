/* ÓPTICA LA FINA – APP JS COMPLETO
   - Carga productos desde /api/products
   - Render tarjeta con imagen segura (uploads o URL absoluta)
   - Favoritos (localStorage)
   - WhatsApp múltiple
   - Zoom de imagen (modal)
   - Filtros básicos y búsqueda
*/

// === Config ===
const API_PRODUCTS = '/api/products';
const LS_FAVS_KEY = 'lafina:favs';
const WHATSAPP_PHONE = ''; // opcional: ej. '595971234567' sin +

// === Estado ===
let ALL = [];
let VIEW = [];
let FAVS = new Set(JSON.parse(localStorage.getItem(LS_FAVS_KEY) || '[]'));

// === Helpers ===
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function toPY(n) {
  const num = Number(n || 0);
  return `Gs ${num.toLocaleString('es-PY')}`;
}

function imgSrcFrom(item) {
  if (!item) return '/public/logo.png';
  const v = (item.image || item.img || '').toString().trim();
  if (!v) return '/public/logo.png';
  // si es URL completa, usar tal cual
  if (/^https?:\/\//i.test(v)) return v;
  // si es nombre de archivo subido
  return `/uploads/${v}`;
}

function saveFavs() {
  localStorage.setItem(LS_FAVS_KEY, JSON.stringify([...FAVS]));
  updateFavBar();
}

function isFav(id) {
  return FAVS.has(String(id));
}

// === Render ===
function cardHTML(item) {
  const id = item.id ?? item._id ?? item.code ?? crypto.randomUUID();
  const src = imgSrcFrom(item);
  const favClass = isFav(id) ? 'is-fav' : '';

  return `
    <div class="card" data-id="${id}">
      <div class="thumb-wrap">
        <img class="thumb" src="${src}" alt="${item.name || 'Producto'}"
             loading="lazy" onerror="this.src='/public/logo.png'">
      </div>
      <div class="card-body">
        <div class="title">${item.name || 'Producto'}</div>
        <div class="price">${toPY(item.price)}</div>
        <div class="meta">Código: ${item.code || '-'}</div>
        <div class="meta">Categoría: ${item.category || '-'}</div>
        <div class="actions">
          <button class="btn btn-wa" data-action="wa">WhatsApp</button>
          <button class="btn btn-outline ${favClass}" data-action="fav">
            ${isFav(id) ? 'Quitar' : 'Favoritos'}
          </button>
        </div>
      </div>
    </div>`;
}

function renderList(list) {
  const grid = $('.grid') || $('#grid') || document.body;
  grid.innerHTML = (list && list.length) ? list.map(cardHTML).join('') :
    `<div class="empty">Sin resultados.</div>`;
}

function updateFavBar() {
  const bar = $('#favBar');
  const count = FAVS.size;
  if (!bar) return;
  bar.querySelector('.count').textContent = count;
  bar.style.display = count ? 'flex' : 'none';
}

// === Interacción ===
function attachGridEvents() {
  const grid = $('.grid') || $('#grid');
  if (!grid) return;

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const id = card.dataset.id;
    const item = VIEW.find(x => String(x.id ?? x._id ?? x.code) === String(id))
      || ALL.find(x => String(x.id ?? x._id ?? x.code) === String(id));

    // Zoom al tocar la foto
    if (e.target.classList.contains('thumb')) {
      const src = e.target.getAttribute('src');
      openModal(src, item?.name || 'Imagen');
      return;
    }

    // Botones
    const action = e.target.dataset.action;
    if (!action) return;

    if (action === 'wa') {
      const txt = buildWhatsText([item]);
      openWhats(txt);
    }

    if (action === 'fav') {
      if (isFav(id)) FAVS.delete(String(id));
      else FAVS.add(String(id));
      saveFavs();
      renderList(VIEW);
    }
  });
}

function attachSearchAndFilters() {
  // Búsqueda
  const q = $('#search') || $('#q');
  if (q) {
    q.addEventListener('input', () => {
      const t = q.value.toLowerCase().trim();
      VIEW = ALL.filter(it => {
        const str = `${it.name} ${it.code} ${it.category}`.toLowerCase();
        return str.includes(t);
      });
      renderList(VIEW);
    });
  }

  // Filtros por categoría (botones con data-cat)
  $$('.chip[data-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.cat;
      $$('.chip[data-cat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      VIEW = (cat === 'Todos')
        ? [...ALL]
        : ALL.filter(x => (x.category || '').toLowerCase() === cat.toLowerCase());
      renderList(VIEW);
    });
  });
}

function attachFavBar() {
  const bar = $('#favBar');
  if (!bar) return;
  bar.querySelector('button').addEventListener('click', () => {
    const selected = [...FAVS].map(id =>
      ALL.find(x => String(x.id ?? x._id ?? x.code) === String(id))
    ).filter(Boolean);
    const txt = buildWhatsText(selected);
    openWhats(txt);
  });
}

function buildWhatsText(items) {
  const lines = [
    'Hola 👋 me interesan estos modelos:',
    ...items.map((p, i) => {
      const src = imgSrcFrom(p);
      return `${i + 1}. ${p.name || 'Producto'} — ${toPY(p.price)}\n   Código: ${p.code || '-'}\n   Img: ${src}`;
    })
  ];
  return encodeURIComponent(lines.join('\n'));
}

function openWhats(text) {
  const base = 'https://wa.me';
  const url = WHATSAPP_PHONE
    ? `${base}/${WHATSAPP_PHONE}?text=${text}`
    : `${base}/?text=${text}`;
  window.open(url, '_blank');
}

// === Modal para zoom ===
function openModal(src, title = '') {
  let modal = $('#imgModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'imgModal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-body">
        <img alt="">
        <button class="modal-close" title="Cerrar">×</button>
        <div class="modal-title"></div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.modal-backdrop').onclick =
    modal.querySelector('.modal-close').onclick = () => modal.classList.remove('show');
  }
  modal.querySelector('img').src = src;
  modal.querySelector('.modal-title').textContent = title;
  modal.classList.add('show');
}

// === Carga inicial ===
async function loadProducts() {
  try {
    const r = await fetch(API_PRODUCTS, { credentials: 'include' });
    if (!r.ok) throw new Error('No se pudo cargar');
    const data = await r.json();
    ALL = Array.isArray(data) ? data : (data.items || []);
    // Asegurar id
    ALL = ALL.map(p => ({ ...p, id: p.id ?? p._id ?? p.code ?? crypto.randomUUID() }));
    VIEW = [...ALL];
    renderList(VIEW);
    updateFavBar();
  } catch (err) {
    console.error(err);
    const grid = $('.grid') || $('#grid');
    if (grid) grid.innerHTML = `<div class="empty">No se pudieron cargar los productos.</div>`;
  }
}

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
  attachGridEvents();
  attachSearchAndFilters();
  attachFavBar();
  loadProducts();
});
