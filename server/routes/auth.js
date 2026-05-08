const express = require("express");
const bcrypt = require("bcryptjs");
const { pool } = require("../db");

const router = express.Router();
// Bcrypt cost factor (jo højere, jo langsommere men stærkere hash).
const SALT_ROUNDS = 10;

// Middleware der kræver aktiv login-session før adgang.
function requireUser(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// Opretter ny bruger og starter session i samme request.
router.post("/register", async (req, res) => {
  // Normaliser input så vi undgår undefined/null-fejl.
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (!username || username.length < 2 || username.length > 80) {
    return res.status(400).json({ error: "Navn skal være 2–80 tegn." });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Adgangskode skal være mindst 6 tegn." });
  }

  try {
    // Hasher kodeord med bcrypt før lagring i databasen.
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash) VALUES ($1, $2)
       RETURNING id, username, created_at`,
      [username, hash]
    );
    const user = result.rows[0];
    // Gemmer minimal brugerinfo i server-side session.
    req.session.userId = user.id;
    req.session.username = user.username;
    return res.status(201).json({
      user: { id: user.id, username: user.username, created_at: user.created_at },
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Dette navn er allerede i brug." });
    }
    console.error(err);
    return res.status(500).json({ error: "Serverfejl." });
  }
});

// Logger bruger ind ved at validere kodeord mod gemt hash.
router.post("/login", async (req, res) => {
  const username = String(req.body.username || "").trim();
  const password = String(req.body.password || "");

  if (!username || !password) {
    return res.status(400).json({ error: "Udfyld navn og adgangskode." });
  }

  try {
    const result = await pool.query(
      `SELECT id, username, password_hash, created_at FROM users WHERE username = $1`,
      [username]
    );
    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ error: "Forkert navn eller adgangskode." });
    }
    // Sammenligner plaintext password mod bcrypt-hash.
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Forkert navn eller adgangskode." });
    }
    // Session oprettes først efter succesfuld validering.
    req.session.userId = row.id;
    req.session.username = row.username;
    return res.json({
      user: { id: row.id, username: row.username, created_at: row.created_at },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Serverfejl." });
  }
});

// Logger bruger ud ved at destruere session.
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Kunne ikke logge ud." });
    }
    // Rydder klient-cookie så browseren ikke sender gammel session-id.
    res.clearCookie("sportsbuddy.sid", { path: "/" });
    return res.json({ ok: true });
  });
});

// Returnerer brugerprofil for den aktuelt loggede session.
router.get("/me", requireUser, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, created_at FROM users WHERE id = $1`,
      [req.session.userId]
    );
    const row = result.rows[0];
    if (!row) {
      // Hvis bruger ikke findes længere, rydder vi ugyldig session.
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Not authenticated" });
    }
    return res.json({ user: row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Serverfejl." });
  }
});

router.requireUser = requireUser;
module.exports = router;
