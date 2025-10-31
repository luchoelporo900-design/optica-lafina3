<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ÓPTICA LA FINA — ADMIN</title>
  <style>
    :root{--bg:#0b0b0c;--panel:#141416;--text:#ececf0;--muted:#b7b8bd;--gold:#e4b64c;--gold2:#b88f35;--red:#ff6666}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,Segoe UI,Roboto,Inter,Arial}
    .wrap{max-width:1100px;margin:auto;padding:20px}
    header{display:flex;justify-content:space-between;align-items:center}
    .brand{display:flex;align-items:center;gap:10px;font-weight:700}
    .brand img{width:28px;height:28px;border-radius:50%}
    a.btn-link{color:var(--gold);text-decoration:none;border:1px solid var(--gold);padding:8px 12px;border-radius:8px}
    .line{height:2px;background:linear-gradient(90deg,var(--gold),var(--gold2));margin:14px 0 24px;border-radius:2px}
    h1{font-size:26px;color:var(--gold);margin:8px 0 12px}
    .panel{background:var(--panel);border:1px solid #2b2c30;border-radius:14px;padding:18px}
    input,select{background:#0f1012;border:1px solid #2e2f35;color:#fff;border-radius:8px;padding:10px;outline:none}
    input:focus{border-color:var(--gold)}
    .row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
    .btn{background:var(--gold);border:none;border-radius:8px;padding:10px 14px;color:#000;font-weight:700;cursor:pointer}
    .btn-sec{background:none;border:1px solid var(--gold);color:var(--gold);border-radius:8px;padding:9px 12px;cursor:pointer}
    .btn-danger{background:var(--red);color:#000;border:none}
    .muted{color:var(--muted);font-size:13px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    th,td{border-bottom:1px solid #2b2c30;padding:10px;text-align:left;font-size:14px}
    th{color:#d9d9dd}
    .pwbox{position:relative;display:inline-block}
    .eye{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#aaa;cursor:pointer}
    .footer{text-align:center;margin:22px 0 6px;color:#cfcfd4}
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div class="brand">
        <img src="/public/logo.png" alt="logo">
        ÓPTICA LA FINA — ADMIN
      </div>
      <a href="/index.html" class="btn-link">Volver al catálogo</a>
    </header>

    <div class="line"></div>

    <h1>Acceso administrador</h1>

    <!-- Login -->
    <div id="loginBox" class="panel">
      <div class="row">
        <div class="pwbox">
          <input id="adminPass" type="password" placeholder="Contraseña" autocomplete="off" style="padding-right:38px;width:260px">
          <button id="togglePw" class="eye">👁️</button>
        </div>
        <button id="btnLogin" class="btn">Entrar</button>
        <span id="loginMsg" class="muted"></span>
      </div>
    </div>

    <!-- Panel admin -->
    <div id="adminBox" class="panel" style="display:none">
      <div class="row" style="justify-content:space-between">
        <b>Agregar producto</b>
        <button id="btnLogout" class="btn-sec">Cerrar sesión</button>
      </div>

      <div class="row" style="margin-top:8px">
        <input id="pName" placeholder="Nombre" />
        <input id="pStock" placeholder="Stock" inputmode="numeric" />
        <input id="pPrice" placeholder="Precio" inputmode="numeric" />
        <input id="pCode" placeholder="Código (opcional)" />
        <select id="pCategory">
          <option>Recetado</option><option>Sol</option><option>Metal</option>
          <option>Acetato</option><option>Titanio</option>
          <option>Hombre</option><option>Mujer</option><option>Niños</option>
        </select>
      </div>

      <div class="row" style="margin-top:8px">
        <input id="pImage" placeholder="URL de imagen (opcional)" style="flex:1" />
        <input id="pickFile" type="file" accept="image/*" hidden />
        <button id="btnPick" class="btn-sec">Subir imagen</button>
        <button id="btnAdd" class="btn">Agregar</button>
      </div>
      <div id="msg" class="muted"></div>

      <div class="line"></div>

      <div class="row" style="justify-content:space-between">
        <b>Inventario</b>
        <input id="q" placeholder="Buscar…" style="width:240px" />
      </div>

      <table id="tbl">
        <thead>
          <tr>
            <th>Imagen</th><th>Nombre</th><th>Código</th><th>Categoría</th>
            <th>Precio</th><th>Stock</th><th>Acciones</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>

    <div class="footer">© Óptica La Fina — Santaní PY</div>
  </div>

  <script>
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);
    const note = (el, t, ok) => { el.textContent=t; el.style.color = ok ? "#8f8" : "#f88"; };

    // Mostrar/Ocultar contraseña
    $("#togglePw").onclick = () => {
      const i=$("#adminPass");
      const show = i.type === "password";
      i.type = show ? "text" : "password";
      $("#togglePw").textContent = show ? "🙈" : "👁️";
    };

    function showLogin(v){ $("#loginBox").style.display = v ? "block" : "none"; }
    function showAdmin(v){ $("#adminBox").style.display = v ? "block" : "none"; }

    async function checkMe(){
      try{
        const r = await fetch("/api/me",{credentials:"include"});
        const d = await r.json();
        if(r.ok && d.auth){ showLogin(false); showAdmin(true); loadTable(); }
        else { showLogin(true); showAdmin(false); }
      }catch{ showLogin(true); showAdmin(false); }
    }

    $("#btnLogin").onclick = async ()=>{
      const pw = $("#adminPass").value.trim();
      $("#adminPass").value = "";
      $("#loginMsg").textContent = "";
      try{
        const r = await fetch("/api/auth/admin",{
          method:"POST", headers:{"Content-Type":"application/json"},
          credentials:"include", body:JSON.stringify({password:pw})
        });
        if(r.ok){ showLogin(false); showAdmin(true); loadTable(); }
        else note($("#loginMsg"), "Contraseña incorrecta", false);
      }catch{ note($("#loginMsg"), "Error de red", false); }
    };

    $("#btnLogout").onclick = async ()=>{
      await fetch("/api/logout",{method:"POST",credentials:"include"});
      showAdmin(false); showLogin(true);
    };

    // Subir imagen
    $("#btnPick").onclick = ()=> $("#pickFile").click();
    $("#pickFile").onchange = async (e)=>{
      const f = e.target.files[0]; if(!f) return;
      $("#msg").textContent = "Subiendo...";
      const fd = new FormData(); fd.append("image", f);
      try{
        const r = await fetch("/api/upload",{method:"POST",body:fd,credentials:"include"});
        const d = await r.json();
        if(r.ok && d.url){ $("#pImage").value = d.url; note($("#msg"), "Imagen subida ✓", true); }
        else note($("#msg"), "No se pudo subir", false);
      }catch{ note($("#msg"), "Error al subir", false); }
    };

    // Agregar producto
    $("#btnAdd").onclick = async ()=>{
      const payload = {
        name: $("#pName").value.trim(),
        stock: $("#pStock").value.trim(),
        price: $("#pPrice").value.trim(),
        code: $("#pCode").value.trim(),
        category: $("#pCategory").value,
        image: $("#pImage").value.trim()
      };
      if(!payload.name){ note($("#msg"), "Nombre requerido", false); return; }
      $("#msg").textContent = "Guardando...";
      try{
        const r = await fetch("/api/products",{
          method:"POST", headers:{"Content-Type":"application/json"},
          credentials:"include", body: JSON.stringify(payload)
        });
        if(r.ok){ note($("#msg"), "Producto agregado ✓", true);
          ["#pName","#pStock","#pPrice","#pCode","#pImage"].forEach(s=>$(s).value="");
          loadTable();
        } else note($("#msg"), "Error al guardar", false);
      }catch{ note($("#msg"), "Error", false); }
    };

    // Cargar tabla inventario
    let all = [];
    async function loadTable(){
      const r = await fetch("/api/products");
      all = await r.json();
      draw(all);
    }
    function fmt(n){ return Number(n||0).toLocaleString("es-PY"); }
    function draw(list){
      const q = $("#q").value.trim().toLowerCase();
      const body = $("#tbl tbody");
      body.innerHTML = "";
      list
        .filter(it => !q || (it.name||"").toLowerCase().includes(q) || (it.code||"").toLowerCase().includes(q))
        .sort((a,b)=>b.createdAt - a.createdAt)
        .forEach(it=>{
          const tr = document.createElement("tr");

          const imgTd = document.createElement("td");
          imgTd.innerHTML = it.image ? `<img src="${it.image}" alt="" style="width:54px;height:54px;object-fit:cover;border-radius:8px;border:1px solid #2b2c30">` : "—";
          tr.appendChild(imgTd);

          tr.innerHTML += `
            <td>${it.name||"—"}</td>
            <td>${it.code||"—"}</td>
            <td>${it.category||"—"}</td>
            <td>Gs ${fmt(it.price)}</td>
            <td>${fmt(it.stock)}</td>
          `;

          const act = document.createElement("td");
          const b1 = document.createElement("button");
          b1.className = "btn-sec";
          b1.textContent = "Vendido (-1)";
          b1.onclick = async ()=>{
            const newStock = Math.max(0, Number(it.stock||0) - 1);
            if(newStock === 0){
              if(!confirm("El stock llegará a 0. ¿Eliminar el producto?")) return;
              await fetch(`/api/products/${it.id}`, { method:"DELETE", credentials:"include" });
            }else{
              await fetch(`/api/products/${it.id}`, {
                method:"PUT", headers:{"Content-Type":"application/json"},
                credentials:"include", body:JSON.stringify({ stock: newStock })
              });
            }
            loadTable();
          };

          const b2 = document.createElement("button");
          b2.className = "btn-danger";
          b2.style.marginLeft = "8px";
          b2.textContent = "Eliminar";
          b2.onclick = async ()=>{
            if(!confirm(`Eliminar "${it.name}"?`)) return;
            await fetch(`/api/products/${it.id}`, { method:"DELETE", credentials:"include" });
            loadTable();
          };

          act.appendChild(b1);
          act.appendChild(b2);
          tr.appendChild(act);

          body.appendChild(tr);
        });
    }
    $("#q").oninput = ()=> draw(all);

    // Iniciar
    checkMe();
  </script>
</body>
</html>
