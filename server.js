// --- Óptica La Fina – servidor simple y robusto ---
const express = require("express");
const session = require("express-session");
const multer  = require("multer");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "lafina123325";

const ROOT = __dirname;
const PUB  = path.join(ROOT, "public");
const UP   = path.join(PUB, "uploads");
const DB   = path.join(ROOT, "data.json");

// helpers DB
async function readDB() {
  try {
    const raw = await fsp.readFile(DB, "utf8");
    const j = JSON.parse(raw);
    j.items ||= [];
    return j;
  } catch {
    return { items: [] };
  }
}
async function writeDB(data) {
  await fsp.writeFile(DB, JSON.stringify(data, null, 2), "utf8");
}

// preparar carpetas
(async () => {
  try { await fsp.mkdir(UP, { recursive: true }); } catch {}
  try { await fsp.access(DB); } catch { await writeDB({ items: [] }); }
})();

app.set("trust proxy", 1);
app.use(express.json({ limit: "10mb" }));
app.use(session({
  secret: process.env.SESSION_SECRET || "lafina-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { sameSite: "lax" }
}));

// estáticos
app.use(express.static(PUB, { index: "index.html" }));

// auth
app.post("/api/auth/admin", async (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    req.session.admin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, error: "unauthorized" });
});
app.post("/api/logout", (req, res) => {
  req.session.destroy(()=> res.json({ ok:true }));
});
app.get("/api/me", (req, res) => {
  res.json({ ok: true, admin: !!req.session.admin });
});

function needAdmin(req, res, next){
  if (req.session?.admin) return next();
  return res.status(401).json({ ok:false, error:"unauthorized" });
}

// productos
app.get("/api/products", async (_req, res) => {
  const db = await readDB();
  res.json({ ok:true, items: db.items });
});

app.post("/api/products", needAdmin, async (req, res) => {
  const { name, stock, price, code, category, image } = req.body || {};
  if (!name) return res.status(400).json({ ok:false, error:"name required" });

  const db = await readDB();
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  db.items.push({
    id,
    name: String(name).trim(),
    stock: Number(stock||0),
    price: Number(price||0),
    code: (code||"").toString().trim(),
    category: (category||"").toString().trim(),
    image: (image||"").toString().trim()
  });
  await writeDB(db);
  res.json({ ok:true, id });
});

// >>> NUEVO: eliminar producto (y su imagen local si corresponde)
app.delete("/api/products/:id", needAdmin, async (req, res) => {
  const { id } = req.params;
  const db = await readDB();
  const idx = db.items.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ ok:false, error:"not found" });

  const item = db.items[idx];
  db.items.splice(idx, 1);
  await writeDB(db);

  // si la imagen está en /uploads, la borramos del disco
  try {
    if (item.image && item.image.startsWith("/uploads/")) {
      const p = path.join(PUB, item.image.replace(/^\/+/, ""));
      await fsp.unlink(p).catch(()=>{});
    }
  } catch {}
  res.json({ ok:true });
});

// subida de imágenes
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UP),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || ".png").toLowerCase() || ".png";
    const name = "img_" + Date.now() + "_" + Math.random().toString(36).slice(2,7) + ext;
    cb(null, name);
  }
});
const upload = multer({ storage });

app.post("/api/upload", needAdmin, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok:false, error:"no file" });
  const url = "/uploads/" + req.file.filename;
  res.json({ ok:true, url });
});

// fallback (SPA simple)
app.get("*", (_req, res) => {
  res.sendFile(path.join(PUB, "index.html"));
});

app.listen(PORT, () => {
  console.log("La Fina online en puerto", PORT);
});
