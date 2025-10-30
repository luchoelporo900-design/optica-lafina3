// public/app.js
document.addEventListener("DOMContentLoaded", () => {
  cargarCatalogo();
});

async function cargarCatalogo() {
  const cont = document.querySelector("#catalogo");
  if (!cont) return;

  cont.innerHTML = `<p>Cargando productos...</p>`;
  try {
    const res = await fetch("/api/products");
    const data = await res.json();

    if (!data.ok) throw new Error(data.error || "No se pudo cargar.");

    const items = Array.isArray(data.items) ? data.items : [];

    if (items.length === 0) {
      cont.innerHTML = `<p style="opacity:.8">Sin productos por ahora.</p>`;
      return;
    }

    // Render básico
    const cards = items.map(it => {
      const img = it.image ? `<img src="${it.image}" alt="${it.name}" style="width:100%;height:180px;object-fit:cover;border-radius:10px 10px 0 0;">` : "";
      const price = (it.price ?? 0).toLocaleString("es-PY");
      return `
        <div style="background:#121212;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;box-shadow:0 0 12px rgba(0,0,0,.25);">
          ${img}
          <div style="padding:12px;text-align:left;">
            <div style="font-weight:700;margin-bottom:4px">${it.name || "Producto"}</div>
            <div style="opacity:.9">Gs ${price}</div>
            ${it.code ? `<div style="opacity:.6;font-size:.9em">Código: ${it.code}</div>` : ""}
            ${it.category ? `<div style="opacity:.6;font-size:.9em">Categoría: ${it.category}</div>` : ""}
          </div>
        </div>
      `;
    }).join("");

    cont.innerHTML = `
      <div style="display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));padding:16px;max-width:1100px;margin:0 auto;">
        ${cards}
      </div>
    `;
  } catch (e) {
    cont.innerHTML = `<p style="color:#ff9a9a">Error: ${e.message}</p>`;
  }
}
