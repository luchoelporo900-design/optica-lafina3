// server.js
import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(cookieParser());

const __dirname = path.resolve();
const PORT = process.env.PORT || 10000;

// ==== RUTAS ESTÁTICAS ====
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ==== BASE DE DATOS SIMPLE (JSON LOCAL) ====
const dbFile = path.join(__dirname, "data.json");
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, "[]");

function loadData() {
  return JSON.parse(fs.readFileSync(dbFile, "utf-8"));
}
function saveData(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

// ==== AUTENTICACIÓN SIMPLE ====
const ADMIN_PASS = "lafina123325";
app.post("/api/auth/admin", (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASS) {
    res.cookie("session", "admin", { httpOnly: true, sameSite: "strict" });
    return res.json({ ok: true });
  }
  res.status(401).json({ ok: false });
});
app.post("/api/logout", (req, res) => {
  res.clearCookie("session");
  res.json({ ok: true });
});
app.get("/api/me", (req, res) => {
  res.json({ ok: req.cookies.session === "admin" });
});

// ==== SUBIDA DE IMÁGENES ====
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  },
});
const upload = multer({ storage });

app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.cookies.session || req.cookies.session !== "admin") {
    return res.status(401).json({ ok: false, error: "noAuth" });
  }
  if (!req.file)
    return res.status(400).json({ ok: false, error: "noFile" });

  const filePath = "/uploads/" + req.file.filename;
  res.json({ ok: true, path: filePath });
});

// ==== CRUD DE PRODUCTOS ====
app.get("/api/products", (req, res) => {
  res.json(loadData());
});

app.post("/api/products", (req, res) => {
  if (!req.cookies.session || req.cookies.session !== "admin") {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
  const products = loadData();
  const newItem = {
    id: Date.now().toString(36),
    name: req.body.name,
    stock: req.body.stock || 0,
    price: req.body.price || 0,
    code: req.body.code || "",
    category: req.body.category || "General",
    image: req.body.image || "",
  };
  products.push(newItem);
  saveData(products);
  res.json({ ok: true, product: newItem });
});

app.delete("/api/products/:id", (req, res) => {
  if (!req.cookies.session || req.cookies.session !== "admin") {
    return res.status(401).json({ ok: false });
  }
  const products = loadData();
  const filtered = products.filter(p => p.id !== req.params.id);
  saveData(filtered);
  res.json({ ok: true });
});

// ==== INICIO ====
app.listen(PORT, () => {
  console.log("✅ Servidor en puerto", PORT);
});
