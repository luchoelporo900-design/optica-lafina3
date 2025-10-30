
import express from "express";
import cors from "cors";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "lafina123325";

const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { users: [], products: [], sales: [] });

await db.read();
db.data ||= { users: [], products: [], sales: [] };

if (db.data.products.length === 0) {
  db.data.products.push(
    { id: nanoid(), name: "Lente CR-39 1.50", stock: 20, price: 90000 },
    { id: nanoid(), name: "Lente Policarbonato 1.59", stock: 15, price: 140000 },
    { id: nanoid(), name: "Marco básico", stock: 30, price: 120000 }
  );
  await db.write();
}

app.post("/api/auth/guest", (req, res) => {
  res.json({ ok: true, role: "guest" });
});

app.post("/api/auth/admin", (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) return res.json({ ok: true, role: "admin" });
  return res.status(401).json({ ok: false, error: "Contraseña incorrecta" });
});

function requireAdmin(req, res, next) {
  const role = req.header("x-role");
  if (role === "admin") return next();
  return res.status(403).json({ ok: false, error: "Solo admin." });
}

app.get("/api/products", async (req, res) => {
  await db.read();
  res.json({ ok: true, products: db.data.products });
});

app.post("/api/products", requireAdmin, async (req, res) => {
  const { name, stock, price } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: "Falta nombre" });
  const item = { id: nanoid(), name, stock: Number(stock) || 0, price: Number(price) || 0 };
  await db.read();
  db.data.products.push(item);
  await db.write();
  res.json({ ok: true, item });
});

app.put("/api/products/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, stock, price } = req.body || {};
  await db.read();
  const idx = db.data.products.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ ok: false, error: "No existe" });
  if (name !== undefined) db.data.products[idx].name = name;
  if (stock !== undefined) db.data.products[idx].stock = Number(stock);
  if (price !== undefined) db.data.products[idx].price = Number(price);
  await db.write();
  res.json({ ok: true, item: db.data.products[idx] });
});

app.delete("/api/products/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await db.read();
  const prev = db.data.products.length;
  db.data.products = db.data.products.filter(p => p.id !== id);
  await db.write();
  res.json({ ok: true, deleted: prev - db.data.products.length });
});

app.get("/api/sales", async (req, res) => {
  await db.read();
  res.json({ ok: true, sales: db.data.sales });
});

app.post("/api/sales", async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: "Items vacíos" });
  }
  await db.read();
  const sale = { id: nanoid(), date: new Date().toISOString(), items: [] , total: 0 };
  for (const it of items) {
    const p = db.data.products.find(x => x.id === it.productId);
    if (!p) return res.status(400).json({ ok: false, error: "Producto inválido" });
    const qty = Number(it.qty) || 1;
    if (p.stock < qty) return res.status(400).json({ ok: false, error: `Stock insuficiente de ${p.name}` });
    p.stock -= qty;
    const lineTotal = p.price * qty;
    sale.items.push({ productId: p.id, name: p.name, qty, price: p.price, lineTotal });
    sale.total += lineTotal;
  }
  db.data.sales.push(sale);
  await db.write();
  res.json({ ok: true, sale });
});

import { createRequire } from "module";
const require = createRequire(import.meta.url);
app.use(require("express").static(new URL("./public", import.meta.url).pathname));
import fs from "fs";
app.get("*", (_req, res) => res.sendFile(new URL("./public/index.html", import.meta.url).pathname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Óptica La Fina corriendo en http://localhost:${PORT}`));
