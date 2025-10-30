const $ = (q)=>document.querySelector(q);
let ROLE = "guest";
const FALLBACK_IMG = "https://images.unsplash.com/photo-1523289333742-be1143f6b766?q=80&w=1200&auto=format&fit=crop";

function setRole(r){
  ROLE = r;
  $("#status").textContent = r === "admin" ? "Administrador" : "Invitado";
}

async function fetchJSON(url, opts={}){ const r = await fetch(url, opts); return r.json(); }

async function requireLogin(){
  const pass = $("#adminPass").value.trim();
  try{
    const res = await fetch("/api/auth/admin", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ password: pass })
    });
    if(res.ok){
      setRole("admin");
      $("#loginModal").classList.add("hidden");
      await loadProducts();
      return;
    }
  }catch(e){}
  // Fallback local (por si algo pasa con el endpoint)
  if(pass === "lafina123325"){
    setRole("admin");
    $("#loginModal").classList.add("hidden");
    await loadProducts();
  }else{
    alert("Contraseña incorrecta");
  }
}

    });
    if(res.ok){ setRole("admin"); $("#loginModal").classList.add("hidden"); await loadProducts(); return; }
  }catch(e){}
  // Fallback local si el endpoint no está
  if(pass === "lafina123325"){ setRole("admin"); $("#loginModal").classList.add("hidden"); await loadProducts(); }
  else alert("Contraseña incorrecta");
}

async function loadProducts(){
  const data = await fetchJSON("/api/products");
  const list = data.products || [];
  const tb = $("#stockTable tbody"); tb.innerHTML = "";
  list.forEach(p=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.stock}</td>
      <td>${Number(p.price||0).toLocaleString("es-PY")}</td>
      <td>${p.code||""}</td>
      <td>${p.category||""}</td>
      <td>${p.image?'<a href="'+p.image+'" target="_blank">ver</a>':''}</td>
      <td>
        <button data-act="edit" data-id="${p.id}">Editar</button>
        <button data-act="del" data-id="${p.id}">Borrar</button>
      </td>`;
    tb.appendChild(tr);
  });

  tb.onclick = async (e)=>{
    const btn = e.target.closest("button"); if(!btn) return;
    const id = btn.dataset.id; if(!id) return;
    if(btn.dataset.act==="del"){
      if(!confirm("¿Borrar producto?")) return;
      await fetch(`/api/products/${id}`, { method:"DELETE", headers:{ "x-role": ROLE }});
      await loadProducts();
    }else{
      const prod = list.find(x=>x.id===id);
      const name = prompt("Nombre:", prod.name); if(name===null) return;
      const stock = prompt("Stock:", prod.stock); if(stock===null) return;
      const price = prompt("Precio:", prod.price); if(price===null) return;
      const code = prompt("Código:", prod.code||""); if(code===null) return;
      const category = prompt("Categoría:", prod.category||"Recetado"); if(category===null) return;
      const image = prompt("URL imagen:", prod.image||""); if(image===null) return;

      await fetch(`/api/products/${id}`, {
        method:"PUT",
        headers:{ "Content-Type":"application/json", "x-role": ROLE },
        body: JSON.stringify({
          name, stock:Number(stock), price:Number(price),
          code, category, image
        })
      });
      await loadProducts();
    }
  };
}

$("#adminEnter").onclick = requireLogin;

$("#addBtn").onclick = async ()=>{
  if(ROLE!=="admin"){ alert("Primero iniciá sesión de administrador"); return; }
  const name = $("#pName").value.trim();
  const stock = Number($("#pStock").value||0);
  const price = Number($("#pPrice").value||0);
  const code = $("#pCode").value.trim();
  const category = $("#pCategory").value;
  const image = ($("#pImage").value.trim()) || "";
  if(!name) return alert("Nombre requerido");
  await fetch("/api/products", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "x-role": ROLE },
    body: JSON.stringify({ name, stock, price, code, category, image })
  });
  $("#pName").value=""; $("#pStock").value=""; $("#pPrice").value="";
  $("#pCode").value=""; $("#pCategory").value="Recetado"; $("#pImage").value="";
  await loadProducts();
};

// Al cargar, mostrar modal de login
window.addEventListener("DOMContentLoaded", async ()=>{
  setRole("guest");
  // el listado se carga después del login
});
async function requireLogin(){
  const pass = $("#adminPass").value.trim();
  try{
    const res = await fetch("/api/auth/admin", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ password: pass })
    });
    if(res.ok){
      setRole("admin");
      $("#loginModal").classList.add("hidden");
      await loadProducts();
      return;
    }
  }catch(e){}
  // Fallback local (por si algo pasa con el endpoint)
  if(pass === "lafina123325"){
    setRole("admin");
    $("#loginModal").classList.add("hidden");
    await loadProducts();
  }else{
    alert("Contraseña incorrecta");
  }
}
$("#pickFile").onclick = ()=> $("#pFile").click();

$("#pFile").onchange = async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  // subir al servidor
  const fd = new FormData();
  fd.append("image", file);
  const up = await fetch("/api/upload", {
    method: "POST",
    headers: { "x-role": ROLE }, // necesitamos ser admin
    body: fd
  });
  const data = await up.json();
  if(!data.ok){ alert(data.error || "No se pudo subir"); return; }
  // poner la URL subida en el campo pImage
  $("#pImage").value = data.url; // ej: /uploads/1698680000_tufoto.jpg
  alert("Imagen subida ✔");
};
