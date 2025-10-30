// ===== Imports =====
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import crypto from "crypto";
import multer from "multer";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { nanoid } from "nanoid";

// ===== Paths base =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");
const uploadsDir = path.join(__dirname, "uploads");

// ===== App =====
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));

// Anti-cache básico para evitar vistas viejas
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// ===== DB (LowDB) =====
const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { products: [], sales: [] });
await db.read();
db.data ||= { products: [], sales: [] };
if (!Array.isArray(db.data.products)) db.data.products = [];
if (!Array.isArray(db.data.sales)) db.data.sales = [];
await db.write();

// ===== Sesiones (cookie HttpOnly) =====
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "lafina123325";
const SESSIONS = new Map(); // token -> { createdAt }

function parseCookie(str = "") {
  return Object.fromEntries(
    str.split(";")
      .map(v => v.trim().split("=").map(decodeURIComponent))
      .filter(a => a[0])
  );
}

app.post("/api/auth/admin", (req, res) => {
  const { password } = req.body || {};
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: "Contraseña incorrecta" });
  }
  const token = crypto.randomBytes(24).toString("hex");
  SESSIONS.set(token, { createdAt: Date.now() });
  const isProd = (process.env.NODE_ENV || "production") !== "development";
  res.setHeader(
    "Set-Cookie",
    `lafina_ses=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400${isProd ? "; Secure" : ""}`
  );
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  const cookies = parseCookie(req.headers.cookie || "");
  const ok = cookies.lafina_ses && SESSIONS.has(cookies.lafina_ses);
  res.json({ ok });
});

app.post("/api/logout", (req, res) => {
  const cookies = parseCookie(req.headers.cookie || "");
  const t = cookies.lafina_ses;
  if (t) SESSIONS.delete(t);
  res.setHeader("Set-Cookie", "lafina_ses=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
  res.json({ ok: true });
});

const requireAdmin = (req, res, next) => {
  const cookies = parseCookie(req.headers.cookie || "");
  const token = cookies.lafina_ses;
  if (token && SESSIONS.has(token)) return next();
  return res.status(403).json({ ok: false, error: "Solo admin." });
};

// ===== Uploads =====
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  }
});
const upload = multer({ storage });
app.use("/uploads", express.static(uploadsDir));

app.post("/api/upload", requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "Archivo faltante" });
  res.json({ ok: true, url: `/uploads/${req.file.filename}` });
});

// ===== Productos API =====
app.get("/api/products", async (_req, res) => {
  await db.read();
  // normalizar por si hay registros viejos
  db.data.products = (db.data.products || []).map(p => ({
    id: p.id || nanoid(),
    name: p.name || "",
    stock: Number(p.stock) || 0,
    price: Number(p.price) || 0,
    code: p.code || "",
    category: p.category || "Recetado",
    image: p.image || ""
  }));
  await db.write();
  res.json({ ok: true, products: db.data.products });
});

app.post("/api/products", requireAdmin, async (req, res) => {
  const { name, stock, price, code, category, image } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: "Falta nombre" });
  await db.read();
  const item = {
    id: nanoid(),
    name,
    stock: Number(stock) || 0,
    price: Number(price) || 0,
    code: (code || "").trim(),
    category: (category || "Recetado").trim(),
    image: (image || "").trim()
  };
  db.data.products.push(item);
  await db.write();
  res.json({ ok: true, item });
});

app.put("/api/products/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, stock, price, code, category, image } = req.body || {};
  await db.read();
  const p = db.data.products.find(x => x.id === id);
  if (!p) return res.status(404).json({ ok: false, error: "No existe" });
  if (name !== undefined) p.name = name;
  if (stock !== undefined) p.stock = Number(stock);
  if (price !== undefined) p.price = Number(price);
  if (code !== undefined) p.code = (code || "").trim();
  if (category !== undefined) p.category = (category || "").trim();
  if (image !== undefined) p.image = (image || "").trim();
  await db.write();
  res.json({ ok: true, item: p });
});

app.delete("/api/products/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await db.read();
  const before = db.data.products.length;
  db.data.products = db.data.products.filter(p => p.id !== id);
  await db.write();
  res.json({ ok: true, deleted: before - db.data.products.length });
});

// ===== Estáticos =====
app.use(express.static(publicDir, { etag: false, lastModified: false, maxAge: 0 }));

// (Opcional) Ruta explícita al admin por si el estático no lo toma
app.get("/stock.html", (_req, res) => {
  res.sendFile(path.join(publicDir, "stock.html"));
});

// ===== Start =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Óptica La Fina corriendo en :${PORT}`));
