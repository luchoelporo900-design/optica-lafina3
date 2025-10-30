const $ = s => document.querySelector(s);

// Mostrar/ocultar áreas
function showAdminArea(show) {
  $("#adminArea").style.display = show ? "block" : "none";
  $("#loginBox").style.display = show ? "none" : "block";
}

// Login
$("#btnLogin").onclick = async () => {
  const pw = $("#adminPass").value.trim();
  $("#loginMsg").textContent = "";
  const r = await fetch("/api/auth/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: pw }),
    credentials: "include" // <- envía/recibe cookie
  });
  if (r.ok) {
    showAdminArea(true);
  } else {
    $("#loginMsg").textContent = "Contraseña incorrecta";
  }
};

// Al cargar, ver si ya hay sesión
window.addEventListener("DOMContentLoaded", async ()=>{
  const r = await fetch("/api/me", { credentials: "include" });
  const data = await r.json();
  showAdminArea(!!data.ok);
});

// Subir imagen (galería)
$("#pickFile").onclick = ()=> $("#pFile").click();

$("#pFile").onchange = async (e)=>{
  const file = e.target.files?.[0];
  if(!file) return;
  const fd = new FormData();
  fd.append("image", file);
  const up = await fetch("/api/upload", {
    method: "POST",
    body: fd,
    credentials: "include"
  });
  const data = await up.json();
  if(!data.ok){ alert(data.error || "No se pudo subir"); return; }
  $("#pImage").value = data.url;
  const prev = $("#preview");
  prev.src = data.url; prev.style.display = "inline-block";
  alert("Imagen subida ✔");
};

// Agregar producto
$("#addBtn").onclick = async ()=>{
  const name = $("#pName").value.trim();
  const stock = Number($("#pStock").value || 0);
  const price = Number($("#pPrice").value || 0);
  const code = $("#pCode").value.trim();
  const category = $("#pCategory").value;
  const image = $("#pImage").value.trim();
  if(!name){ alert("Nombre requerido"); return; }

  const r = await fetch("/api/products", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ name, stock, price, code, category, image }),
    credentials: "include"
  });
  const data = await r.json();
  if(!data.ok){ alert(data.error || "No se pudo agregar"); return; }

  $("#pName").value=""; $("#pStock").value=""; $("#pPrice").value="";
  $("#pCode").value=""; $("#pCategory").value="Recetado"; $("#pImage").value="";
  $("#pFile").value=""; $("#preview").style.display="none";
  alert("Producto agregado ✔");
};
