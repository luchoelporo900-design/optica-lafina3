// server.js  (ESM, sin fs-extra)
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import cookieParser from "cookie-parser";
import { v4 as uuidv4 } from "uuid";
import { promises as fs } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// === CONFIG ===
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const UP_DIR   = path.join(__dirname, "public", "uploads");
const DB_FILE  = path.join(DATA_DIR, "products.json");

const ADMIN_PASS   = process.env.ADMIN_PASS   || "lafina123325";
const COOKIE_SECRET= process.env.COOKIE_SECRET|| "lafina_cookie_secret";
const AUTH_COOKIE  = "lafina_auth";

// === HELPERS (fs nativo) ===
async function ensureDir(dir){ await fs.mkdir(dir, { recursive:true }); }
async function fileExists(p){ try { await fs.access(p); return true; } catch { return false; } }
async function readJSON(p, fallback){
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return fallback; }
}
async function writeJSON(p, data){
  await fs.writeFile(p, JSON.stringify(data, null, 2), "utf8");
}

// preparar carpetas y DB
await ensureDir(DATA_DIR);
await ensureDir(UP_DIR);
if (!(await fileExists(DB_FILE))) await writeJSON(DB_FILE, []);

// middlewares
app.use(express.json({ limit:"5mb" }));
app.use(cookieParser(COOKIE_SECRET));
app.use(express.static(path.join(__dirname, "public"), { extensions:["html"] }));

// CORS básico
app.use((req,res,next)=>{
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials","true");
  res.setHeader("Access-Control-Allow-Headers","Content-Type");
  res.setHeader("Access-Control-Allow-Methods","GET,POST,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

const isAuthed = (req)=> req.signedCookies?.[AUTH_COOKIE] === "ok";
const requireAuth = (req,res,next)=> isAuthed(req) ? next() : res.status(401).json({ error:"unauthorized" });

// AUTH
app.post("/api/auth/admin", async (req,res)=>{
  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASS) return res.status(401).json({ ok:false, error:"bad_password" });
  res.cookie(AUTH_COOKIE, "ok", { httpOnly:true, sameSite:"lax", signed:true, maxAge: 1000*60*60*8 });
  res.json({ ok:true });
});
app.post("/api/logout", (req,res)=>{ res.clearCookie(AUTH_COOKIE); res.json({ ok:true }); });
app.get("/api/me", (req,res)=> res.json({ ok: isAuthed(req) }));

// PRODUCTS
app.get("/api/products", async (_req,res)=> res.json(await readJSON(DB_FILE, [])));

app.post("/api/products", requireAuth, async (req,res)=>{
  const { name, stock, price, code, category, image } = req.body || {};
  if (!name) return res.status(400).json({ error:"name_required" });

  const item = {
    id: uuidv4(),
    name: String(name).trim(),
    stock: Number(stock || 0),
    price: Number(price || 0),
    code: (code||"").toString().trim(),
    category: (category||"recetado").toLowerCase(),
    image: image || "",
    createdAt: Date.now()
  };
  const rows = await readJSON(DB_FILE, []);
  rows.unshift(item);
  await writeJSON(DB_FILE, rows);
  res.json({ ok:true, item });
});

app.delete("/api/products/:id", requireAuth, async (req,res)=>{
  const { id } = req.params;
  let rows = await readJSON(DB_FILE, []);
  const found = rows.find(r => r.id === id);
  if (!found) return res.status(404).json({ error:"not_found" });

  if (found.image && found.image.startsWith("/uploads/")) {
    const fp = path.join(__dirname, "public", found.image);
    if (await fileExists(fp)) await fs.unlink(fp).catch(()=>{});
  }

  rows = rows.filter(r => r.id !== id);
  await writeJSON(DB_FILE, rows);
  res.json({ ok:true });
});

// UPLOAD (multer)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UP_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random()*1e6)}${ext}`);
  },
});
const upload = multer({ storage });

app.post("/api/upload", requireAuth, upload.single("image"), (req,res)=>{
  if (!req.file) return res.status(400).json({ error:"no_file" });
  res.json({ ok:true, url:`/uploads/${req.file.filename}` });
});

// Rutas conveniencia
app.get("/", (_req,res)=> res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/stock.html", (_req,res)=> res.sendFile(path.join(__dirname, "public", "stock.html")));

app.listen(PORT, ()=> console.log("Óptica La Fina escuchando en :" + PORT));
