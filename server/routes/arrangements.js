const express = require("express");
const { pool } = require("../db");
const authRouter = require("./auth");

const router = express.Router();
const requireUser = authRouter.requireUser;

// Liste over arrangements (alle brugere), nyeste foerst — til feed og badge-taelling.
router.get("/arrangements", requireUser, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.user_id, a.sport, a.players, a.location, a.fee, a.level, a.created_at,
              u.username AS creator_username
       FROM arrangements a
       JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT 100`
    );
    return res.json({ arrangements: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Serverfejl." });
  }
});

// Opretter arrangement for den loggede bruger.
router.post("/arrangements", requireUser, async (req, res) => {
  const sport = String(req.body.sport || "").trim();
  const location = String(req.body.location || "").trim();
  const players = Number(req.body.players);
  const fee = Number(req.body.fee);

  if (!sport || sport.length > 120) {
    return res.status(400).json({ error: "Udfyld sport." });
  }
  if (!location || location.length > 255) {
    return res.status(400).json({ error: "Udfyld sted." });
  }
  if (!Number.isFinite(players) || players < 1 || players > 500) {
    return res.status(400).json({ error: "Antal spillere skal vaere 1–500." });
  }
  if (!Number.isFinite(fee) || fee < 0 || fee > 1_000_000) {
    return res.status(400).json({ error: "Ugyldigt beloeb." });
  }

  const level = Math.floor(Math.random() * 4) + 5;

  try {
    const result = await pool.query(
      `INSERT INTO arrangements (user_id, sport, players, location, fee, level)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, sport, players, location, fee, level, created_at`,
      [req.session.userId, sport, Math.floor(players), location, Math.floor(fee), level]
    );
    const row = result.rows[0];
    row.creator_username = req.session.username;
    return res.status(201).json({ arrangement: row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Serverfejl." });
  }
});

module.exports = router;
