// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import cookieParser from "cookie-parser";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====== Configuración simple de sesión (cookie) ======
const ADMIN_PASS = process.env.ADMIN_PASS || "lafina123325";
const COOKIE_NAME = "lafina_admin";
function isAuthed(req) {
  return req.cookies?.[COOKIE_NAME] === "1";
}

// ====== “BD” JSON en disco ======
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "products.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");

// util
const readProducts = () => JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
const writeProducts = (arr) =>
  fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2));

// ====== archivos estáticos ======
app.use(express.static(path.join(__dirname, "public")));

// Rutas para index y admin (evita “Cannot GET /index.html”)
app.get(["/", "/index.html"], (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/stock.html", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "stock.html"));
});

// ====== API ======
// Estado sesión
app.get("/api/me", (req, res) => {
  res.json({ ok: true, admin: isAuthed(req) });
});

// Login
app.post("/api/auth/admin", (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASS) {
    res.cookie(COOKIE_NAME, "1", { httpOnly: true, sameSite: "lax" });
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: "unauthorized" });
});

// Logout
app.post("/api/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// Productos
app.get("/api/products", (_req, res) => {
  res.json({ ok: true, items: readProducts() });
});

app.post("/api/products", (req, res) => {
  if (!isAuthed(req)) return res.status(401).json({ ok: false });
  const { name, stock, price, code, category, image } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: "name" });

  const list = readProducts();
  const id = crypto.randomUUID();
  list.push({
    id,
    name,
    stock: Number(stock) || 0,
    price: Number(price) || 0,
    code: (code || "").toString(),
    category: (category || "Todos").toLowerCase(),
    image: image || ""
  });
  writeProducts(list);
  res.json({ ok: true, id });
});

// NUEVO: eliminar
app.delete("/api/products/:id", (req, res) => {
  if (!isAuthed(req)) return res.status(401).json({ ok: false });
  const id = req.params.id;
  const list = readProducts();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ ok: false });
  list.splice(idx, 1);
  writeProducts(list);
  res.json({ ok: true });
});

// ====== Upload de imágenes (a /public/uploads) ======
const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || ".jpg");
    cb(null, `${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

app.post("/api/upload", (req, res, next) => {
  if (!isAuthed(req)) return res.status(401).json({ ok: false });
  next();
}, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false });
  // URL pública
  const url = `/uploads/${req.file.filename}`;
  res.json({ ok: true, url });
});

// ====== Arranque ======
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("Óptica La Fina corriendo en http://localhost:" + PORT);
});
