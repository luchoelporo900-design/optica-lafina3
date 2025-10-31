// server.js  —  Óptica La Fina (Express + sesiones + JSON + upload)

const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "lafina123325";

// --- rutas y carpetas ---
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const UP_DIR = path.join(ROOT, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");

// --- asegurar carpetas/archivos ---
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UP_DIR)) fs.mkdirSync(UP_DIR);
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ items: [] }, null, 2));

// --- util DB simple ---
function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return { items: [] }; }
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- middlewares básicos ---
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "lafina_session_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { sameSite: "lax" }
}));

// --- estáticos ---
app.use("/uploads", express.static(UP_DIR));
app.use(express.static(PUBLIC_DIR));  // sirve index.html, app.js, etc.

// --- auth helpers ---
function isAdmin(req) { return !!req.session.admin; }
function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, error: "No autorizado" });
  next();
}

// --- auth endpoints ---
app.get("/api/me", (req, res) => res.json({ ok: isAdmin(req) }));

app.post("/api/auth/admin", (req, res) => {
  const { password } = req.body || {};
  if (String(password || "") === String(ADMIN_PASSWORD)) {
    req.session.admin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, error: "Clave incorrecta" });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// --- productos ---
app.get("/api/products", (req, res) => {
  const db = readDB();
  res.json({ ok: true, items: db.items || [] });
});

app.post("/api/products", requireAdmin, (req, res) => {
  const { name, price = 0, stock = 0, code = "", category = "", image = "" } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: "Nombre requerido" });

  const db = readDB();
  db.items = db.items || [];
  db.items.push({
    id: Date.now().toString(36),
    name: String(name),
    price: Number(price) || 0,
    stock: Number(stock) || 0,
    code: String(code || ""),
    category: String(category || ""),
    image: String(image || "")
  });
  writeDB(db);
  res.json({ ok: true });
});

// --- subida de imágenes ---
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UP_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || ".png");
    cb(null, Date.now().toString(36) + ext.toLowerCase());
  }
});
const upload = multer({ storage });

app.post("/api/upload", requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "Archivo faltante" });
  // URL pública que el frontend puede usar
  return res.json({ ok: true, url: `/uploads/${req.file.filename}` });
});

// --- rutas de conveniencia ---
app.get("/stock.html", (_, res) => res.sendFile(path.join(PUBLIC_DIR, "stock.html")));
app.get("/", (_, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));

// --- arranque ---
app.listen(PORT, () => {
  console.log(`La Fina corriendo en http://localhost:${PORT}`);
});
