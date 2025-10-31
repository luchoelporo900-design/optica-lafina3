import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "lafina123325";

const DATA_FILE = path.join(__dirname, "data.json");
const UPLOAD_DIR = path.join(__dirname, "uploads");

// --- util json ---
function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return { products: [] };
  }
}
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// --- middlewares ---
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, "public")));

// --- auth helpers ---
const COOKIE_NAME = "lafina_admin";
function isAuthed(req) {
  return req.cookies?.[COOKIE_NAME] === "1";
}
function requireAuth(req, res, next) {
  if (!isAuthed(req)) return res.status(401).json({ ok: false, error: "unauthorized" });
  next();
}

// --- auth api ---
app.post("/api/auth/admin", (req, res) => {
  const { password } = req.body || {};
  if (password && password === ADMIN_PASSWORD) {
    res.cookie(COOKIE_NAME, "1", { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 8 });
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false, error: "bad_password" });
});
app.post("/api/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});
app.get("/api/me", (req, res) => res.json({ admin: isAuthed(req) }));

// --- upload ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const base = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, base);
  },
});
const upload = multer({ storage });

app.post("/api/upload", requireAuth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: "no_file" });
  const url = `/uploads/${req.file.filename}`;
  res.json({ ok: true, url });
});

// --- products list ---
app.get("/api/products", (_req, res) => {
  const data = readData();
  res.json(data.products || []);
});

// --- add product ---
app.post("/api/products", requireAuth, (req, res) => {
  const { name, stock, price, code, category, image } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: "name_required" });
  const data = readData();
  const id = String(Date.now());
  data.products.unshift({
    id,
    name,
    stock: Number(stock || 0),
    price: Number(price || 0),
    code: (code || "").trim(),
    category: (category || "otros").toLowerCase(),
    image: image || "",
    createdAt: new Date().toISOString(),
  });
  writeData(data);
  res.json({ ok: true, id });
});

// --- DELETE product (NUEVO) ---
app.delete("/api/products/:id", requireAuth, (req, res) => {
  const { id } = req.params;
  const data = readData();
  const item = data.products.find(p => p.id === id);
  if (!item) return res.status(404).json({ ok: false, error: "not_found" });

  // borrar imagen física si es /uploads/...
  if (item.image && item.image.startsWith("/uploads/")) {
    const localPath = path.join(__dirname, item.image);
    if (fs.existsSync(localPath)) {
      try { fs.unlinkSync(localPath); } catch {}
    }
  }
  data.products = data.products.filter(p => p.id !== id);
  writeData(data);
  res.json({ ok: true });
});

// --- routes ---
app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/stock.html", (_req, res) => res.sendFile(path.join(__dirname, "public", "stock.html")));

app.listen(PORT, () => console.log("Óptica La Fina corriendo en", PORT));
