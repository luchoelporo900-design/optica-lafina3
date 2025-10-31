// server.js  (ES Module)
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import cookieParser from "cookie-parser";
import fs from "fs-extra";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// === CONFIG ===
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const UP_DIR = path.join(__dirname, "public", "uploads");
const DB_FILE = path.join(DATA_DIR, "products.json");

// Seguridad básica
const ADMIN_PASS = process.env.ADMIN_PASS || "lafina123325";
const COOKIE_SECRET = process.env.COOKIE_SECRET || "lafina_cookie_secret";
const AUTH_COOKIE = "lafina_auth";

// === MIDDLEWARES ===
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser(COOKIE_SECRET));

// CORS (por si luego abrís desde otro dominio/app)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Archivos estáticos
app.use(express.static(path.join(__dirname, "public"), { extensions: ["html"] }));

// ========= Helpers =========
await fs.ensureDir(DATA_DIR);
await fs.ensureDir(UP_DIR);
if (!(await fs.pathExists(DB_FILE))) await fs.writeJson(DB_FILE, [], { spaces: 2 });

const readDB = async () => (await fs.readJson(DB_FILE));
const writeDB = async (rows) => fs.writeJson(DB_FILE, rows, { spaces: 2 });

const isAuthed = (req) => req.signedCookies?.[AUTH_COOKIE] === "ok";
const requireAuth = (req, res, next) => (isAuthed(req) ? next() : res.status(401).json({ error: "unauthorized" }));

// ========= Auth =========
app.post("/api/auth/admin", async (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASS) return res.status(401).json({ ok: false, error: "bad_password" });
  // Cookie firmada, httpOnly
  res.cookie(AUTH_COOKIE, "ok", {
    httpOnly: true,
    sameSite: "lax",
    signed: true,
    maxAge: 1000 * 60 * 60 * 8, // 8 horas
  });
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie(AUTH_COOKIE);
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => res.json({ ok: isAuthed(req) }));

// ========= Productos =========
app.get("/api/products", async (req, res) => {
  const rows = await readDB();
  res.json(rows);
});

app.post("/api/products", requireAuth, async (req, res) => {
  const { name, stock, price, code, category, image } = req.body || {};
  if (!name) return res.status(400).json({ error: "name_required" });

  const item = {
    id: uuidv4(),
    name: String(name).trim(),
    stock: Number(stock || 0),
    price: Number(price || 0),
    code: code ? String(code).trim() : "",
    category: (category || "recetado").toLowerCase(),
    image: image || "",
    createdAt: Date.now(),
  };
  const rows = await readDB();
  rows.unshift(item);
  await writeDB(rows);
  res.json({ ok: true, item });
});

app.delete("/api/products/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  let rows = await readDB();
  const found = rows.find((r) => r.id === id);
  if (!found) return res.status(404).json({ error: "not_found" });

  // Si la imagen está en /uploads, la borramos del disco
  if (found.image && found.image.startsWith("/uploads/")) {
    const filePath = path.join(__dirname, "public", found.image);
    if (await fs.pathExists(filePath)) await fs.remove(filePath);
  }

  rows = rows.filter((r) => r.id !== id);
  await writeDB(rows);
  res.json({ ok: true });
});

// ========= Uploads =========
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UP_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({ storage });

app.post("/api/upload", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no_file" });
  // ruta pública
  const url = `/uploads/${req.file.filename}`;
  res.json({ ok: true, url });
});

// ========= Rutas de conveniencia =========
// Raíz => index.html (catálogo)
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
// Admin
app.get("/stock.html", (_req, res) => res.sendFile(path.join(__dirname, "public", "stock.html")));

// Start
app.listen(PORT, () => {
  console.log("Óptica La Fina escuchando en :" + PORT);
});
