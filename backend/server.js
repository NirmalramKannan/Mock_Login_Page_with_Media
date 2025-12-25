require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./db");
const authMiddleware = require("./authMiddleware");
const path = require("path");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(
  "/media",
  express.static(path.join(__dirname, "public", "media"), {
    setHeaders: (res) => {
      // Cache static assets for 1 day (good for dev; can increase later)
      res.setHeader("Cache-Control", "public, max-age=86400");
    },
  })
);

function setAuthCookie(res, token) {
  res.cookie("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

app.get("/api/health", (req, res) => res.json({ ok: true }));

//register
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required." });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }


    const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      "INSERT INTO users (email, password_hash) VALUES (?, ?)",
      [email, password_hash]
    );

    const user = { id: result.insertId, email };

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    setAuthCookie(res, token);

    return res.status(201).json({ user: { id: user.id, email: user.email } });
  } catch (err) {

    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Email already registered." });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
});

//login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required." });
    }

    const [rows] = await db.query(
      "SELECT id, email, password_hash FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    setAuthCookie(res, token);

    return res.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
});

//me
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  return res.json({ user: { id: req.user.userId, email: req.user.email } });
});

//logout
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
  });
  res.json({ ok: true });
});

//get media
app.get("/api/media", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, title, file_path, media_type FROM media ORDER BY id DESC"
    );
    res.json({ media: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

//get favourites
app.get("/api/favourites", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const [rows] = await db.query(
      `
      SELECT m.id, m.title, m.file_path, m.media_type
      FROM favourites f
      JOIN media m ON m.id = f.media_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      `,
      [userId]
    );

    res.json({ favourites: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

//set favourite
app.post("/api/favourites/:mediaId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const mediaId = Number(req.params.mediaId);
    if (!Number.isFinite(mediaId)) return res.status(400).json({ message: "Invalid media id." });

    await db.query(
      "INSERT IGNORE INTO favourites (user_id, media_id) VALUES (?, ?)",
      [userId, mediaId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

//remove favourite
app.delete("/api/favourites/:mediaId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const mediaId = Number(req.params.mediaId);
    if (!Number.isFinite(mediaId)) return res.status(400).json({ message: "Invalid media id." });

    await db.query(
      "DELETE FROM favourites WHERE user_id = ? AND media_id = ?",
      [userId, mediaId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});


const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API running: http://localhost:${port}`));
