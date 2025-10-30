// ===== Imports ÚNICOS =====
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from "multer";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { nanoid } from "nanoid";

// ===== Paths base =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== App =====
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Anti-cache para frontend (evita que el navegador te muestre viejo)
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// ===== LowDB =====
const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { products: [], sales: [] });
await db.read();
db.data ||= { products: [], sales: [] };
if (!Array.isArray(db.data.products)) db.data.products = [];
if (!Array.isArray(db.data.sales)) db.data.sales = [];
await db.write();

// ===== Auth (simple) =====
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "lafina123325";
app.post("/api/auth/admin", (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) return res.json({ ok: true, role: "admin" });
  return res.status(401).json({ ok: false, error: "Contraseña incorrecta" });
});
const requireAdmin = (req, res, next) =>
  req.header("x-role") === "admin" ? next() : res.status(403).json({ ok: false, error: "Solo admin." });

// ===== Uploads (galería) =====
const uploadsDir = path.join(__dirname, "uploads");
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

// ===== Productos API =====
app.get("/api/products", async (_req, res) => {
  await db.read();
  // defaults por si hay datos viejos
  db.data.products = (db.data.products || []).map(p => ({
    id: p.id || nanoid(),
    name: p.name,
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

// ===== Upload endpoint =====
app.post("/api/upload", requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "Archivo faltante" });
  res.json({ ok: true, url: `/uploads/${req.file.filename}` });
});

// ===== Estáticos =====
app.use(express.static(path.join(__dirname, "public"), { etag: false, lastModified: false, maxAge: 0 }));

// ===== Start =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`La Fina corriendo en :${PORT}`));

