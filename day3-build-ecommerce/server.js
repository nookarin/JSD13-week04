require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "vinylvault-dev-secret-change-in-production";
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/vinylvault";

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── MongoDB Connection + Model Loading ───────────────────
let User = null;
let Comment = null;
let dbReady = false;

mongoose.set("strictQuery", false);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("[DB] MongoDB connected");
    // Load models AFTER connection succeeds
    User = require("./models/User");
    Comment = require("./models/Comment");
    dbReady = true;
  })
  .catch((err) => {
    console.error("[DB] MongoDB connection error:", err.message);
    console.log("[DB] Running without database — auth features disabled");
  });

// Helper: check DB before auth routes
function requireDB(req, res, next) {
  if (!dbReady || !User) {
    return res.status(503).json({
      error: "Database not available. Please start MongoDB and try again.",
    });
  }
  next();
}

// ── Auth Middleware ──────────────────────────────────────
function authMiddleware(req, res, next) {
  if (!dbReady || !User) {
    return res.status(503).json({ error: "Database not available" });
  }
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ── Auth Routes ─────────────────────────────────────────

// POST /api/auth/signup
app.post("/api/auth/signup", requireDB, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      const field = existingUser.email === email ? "Email" : "Username";
      return res.status(409).json({ error: `${field} is already registered` });
    }

    const user = new User({ username, email, password });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error("[Auth] Signup error:", err.message);
    if (err.code === 11000) {
      return res.status(409).json({ error: "Username or email already taken" });
    }
    return res.status(500).json({ error: "Server error during signup" });
  }
});

// POST /api/auth/login
app.post("/api/auth/login", requireDB, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({ user, token });
  } catch (err) {
    console.error("[Auth] Login error:", err.message);
    return res.status(500).json({ error: "Server error during login" });
  }
});

// GET /api/auth/me
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ user });
  } catch (err) {
    console.error("[Auth] Me error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

// ── Comment Routes ──────────────────────────────────────

// GET /api/comments?title=...&artist=...
app.get("/api/comments", async (req, res) => {
  try {
    const { title, artist } = req.query;
    if (!title || !artist) {
      return res.status(400).json({ error: "title and artist are required" });
    }
    if (!dbReady || !Comment) {
      return res.json({ comments: [] });
    }
    const comments = await Comment.find({
      itemTitle: title,
      itemArtist: artist,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json({ comments });
  } catch (err) {
    console.error("[Comments] Fetch error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// POST /api/comments
app.post("/api/comments", authMiddleware, async (req, res) => {
  try {
    const { title, artist, text } = req.body;
    if (!title || !artist || !text) {
      return res.status(400).json({ error: "title, artist, and text are required" });
    }
    if (text.length > 1000) {
      return res.status(400).json({ error: "Comment must be at most 1000 characters" });
    }
    if (!dbReady || !Comment) {
      return res.status(503).json({ error: "Database not available" });
    }
    const user = await User.findById(req.userId).select("username");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const comment = new Comment({
      itemTitle: title,
      itemArtist: artist,
      userId: req.userId,
      username: user.username,
      text,
    });
    await comment.save();
    return res.status(201).json({ comment });
  } catch (err) {
    console.error("[Comments] Create error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// ── Catch-all: serve index.html for SPA ─────────────────
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ── Global error handler ────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[Server] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start Server ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] VinylVault running on http://localhost:${PORT}`);
});
