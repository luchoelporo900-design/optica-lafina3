// server.js — Óptica La Fina (admin + catálogo + imágenes)
// ==== Dependencias ====
import express from "express";
import path from "path";
import fs from "fs/promises";
import multer from "multer";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

// ==== Paths de proyecto ====
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const UP_DIR = path.join(PUBLIC_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "products.json");

// ==== Utilidades DB simple (archivo JSON) ====
async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UP_DIR, { recursive: true });
  try { await fs.access(DB_FILE); }
  catch { await fs.writeFile(DB_FILE, "[]", "utf8"); }
}
async function readDB() {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(raw);
  } catch { return []; }
}
async function writeDB(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

// ==== Middlewares ====
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use("/public", express.static(PUBLIC_DIR, { maxAge: "1h" }));

// CORS mínimo (si te sirve abrir desde móvil en misma URL, no hace falta)
app.use((req, res, next) => {
  res.setHeader("X-Powered-By", "Optica La Fina");
  next();
});

// ==== Autenticación muy simple con cookie httpOnly ====
// Nota: cambia esta clave si quieres
const ADMIN_PASSWORD = process.env.ADMIN_PASS || "lafina123325";

function isAuthed(req) {
  return req.cookies && req.cookies.admin === "1";
}
function requireAuth(req, res, next) {
  if (isAuthed(req)) return next();
  return res.status(401).json({ ok: false, error: "unauthorized" });
}

// Estado de sesión
app.get("/api/me", (req, res) => {
  res.json({ auth: isAuthed(req) });
});

// Login
app.post("/api/auth/admin", async (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    // Cookie httpOnly 1 día
    res.cookie("admin", "1", {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });
    return res.json({ ok: true });
  }
  return res.status(401).json({ ok: false });
});

// Logout
app.post("/api/logout", (req, res) => {
  res.clearCookie("admin");
  res.json({ ok: true });
});

// ==== Upload de imágenes ====
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UP_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || ".jpg").toLowerCase();
    const name = Date.now() + "_" + Math.random().toString(36).slice(2) + ext;
    cb(null, name);
  },
});
const upload = multer({ storage });

app.post("/api/upload", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false });
  const url = `/public/uploads/${req.file.filename}`;
  res.json({ ok: true, url });
});

// ==== Productos (CRUD básico) ====
// Listado (para catálogo y admin)
app.get("/api/products", async (_req, res) => {
  await ensureDirs();
  const items = await readDB();
  res.json(items);
});

// Crear
app.post("/api/products", requireAuth, async (req, res) => {
  await ensureDirs();
  const items = await readDB();
  const { name, stock, price, code, category, image } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: "name" });

  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: String(name).trim(),
    stock: Number(stock) || 0,
    price: Number(price) || 0,
    code: String(code || ""),
    category: String(category || "Recetado"),
    image: String(image || ""),
    createdAt: Date.now(),
  };
  items.push(item);
  await writeDB(items);
  res.json({ ok: true, item });
});

// Actualizar (bajar stock, cambiar precio, etc.)
app.put("/api/products/:id", requireAuth, async (req, res) => {
  await ensureDirs();
  const items = await readDB();
  const idx = items.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false });

  const patch = req.body || {};
  items[idx] = { ...items[idx], ...patch };
  await writeDB(items);
  res.json({ ok: true, item: items[idx] });
});

// Eliminar (quitar vendidos / eliminar de catálogo)
app.delete("/api/products/:id", requireAuth, async (req, res) => {
  await ensureDirs();
  const items = await readDB();
  const idx = items.findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false });

  // Si tenía imagen subida al servidor, la borramos del disco (opcional)
  try {
    const img = items[idx].image || "";
    if (img.startsWith("/public/uploads/")) {
      const localPath = path.join(PUBLIC_DIR, img.replace("/public/", ""));
      await fs.unlink(localPath).catch(() => {});
    }
  } catch {}
  items.splice(idx, 1);
  await writeDB(items);
  res.json({ ok: true });
});

// ==== Rutas de páginas ====
app.get("/", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));
app.get("/stock.html", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "stock.html")));

// ==== Start ====
await ensureDirs();
app.listen(PORT, () => console.log("Óptica La Fina en puerto", PORT));
