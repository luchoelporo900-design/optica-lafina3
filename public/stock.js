// ===== util =====
const $ = (q)=>document.querySelector(q);
let ROLE = "guest";

// login rápido con prompt (o endpoint real si está)
async function ensureAdmin(){
  if(ROLE === "admin") return true;
  const pass = prompt("Contraseña admin (tip: lafina123325):", "");
  if(pass === null) return false;

  try{
    const resp = await fetch("/api/auth/admin", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ password: pass })
    });
    if(resp.ok){ ROLE = "admin"; return true; }
  }catch(e){ /* ignore */ }

  if(pass === "lafina123325"){ ROLE = "admin"; return true; }
  alert("Contraseña incorrecta");
  return false;
}

// abrir selector de archivos
$("#pickFile").onclick = async ()=>{
  const ok = await ensureAdmin(); if(!ok) return;
  $("#pFile").click();
};

// subir archivo al servidor y completar URL
$("#pFile").onchange = async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;

  const ok = await ensureAdmin(); if(!ok) return;

  const fd = new FormData();
  fd.append("image", file);

  const up = await fetch("/api/upload", {
    method: "POST",
    headers: { "x-role": "admin" }, // requisito del backend
    body: fd
  });

  const data = await up.json();
  if(!data.ok){
    alert(data.error || "No se pudo subir la imagen");
    return;
  }

  // completa el campo URL y muestra preview
  $("#pImage").value = data.url;                 // ej: /uploads/1698690000_foto.jpg
  $("#preview").src = data.url;
  $("#preview").style.display = "inline-block";
  alert("Imagen subida ✔");
};

// agregar producto
$("#addBtn").onclick = async ()=>{
  const ok = await ensureAdmin(); if(!ok) return;

  const name = $("#pName").value.trim();
  const stock = Number($("#pStock").value || 0);
  const price = Number($("#pPrice").value || 0);
  const code = $("#pCode").value.trim();
  const category = $("#pCategory").value;
  const image = $("#pImage").value.trim();

  if(!name){ alert("Nombre requerido"); return; }

  const r = await fetch("/api/products", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "x-role":"admin" },
    body: JSON.stringify({ name, stock, price, code, category, image })
  });

  const data = await r.json();
  if(!data.ok){ alert(data.error || "No se pudo agregar"); return; }

  // limpiar
  $("#pName").value = "";
  $("#pStock").value = "";
  $("#pPrice").value = "";
  $("#pCode").value = "";
  $("#pCategory").value = "Recetado";
  $("#pImage").value = "";
  $("#pFile").value = "";
  $("#preview").style.display = "none";

  alert("Producto agregado ✔");
};
