const express = require("express");
const { pool } = require("../db");
const authRouter = require("./auth");

const router = express.Router();
const requireUser = authRouter.requireUser;

// Antal som bruger har oprettet vs. deltaget i (via lookup-tabel).
router.get("/arrangements/my-stats", requireUser, async (req, res) => {
  try {
    const hosted = await pool.query(
      `SELECT COUNT(*)::int AS c FROM arrangements WHERE user_id = $1`,
      [req.session.userId]
    );
    const joined = await pool.query(
      `SELECT COUNT(*)::int AS c FROM arrangement_participants WHERE user_id = $1`,
      [req.session.userId]
    );
    return res.json({
      hostedCount: hosted.rows[0].c,
      joinedCount: joined.rows[0].c,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Serverfejl." });
  }
});

// Liste over arrangements (alle brugere), nyeste foerst — inkl. deltagerantal og om du er med.
router.get("/arrangements", requireUser, async (req, res) => {
  try {
    const uid = req.session.userId;
    const result = await pool.query(
      `SELECT a.id, a.user_id, a.sport, a.players, a.location, a.fee, a.level, a.created_at,
              u.username AS creator_username,
              (SELECT COUNT(*)::int FROM arrangement_participants p WHERE p.arrangement_id = a.id)
                AS participant_count,
              EXISTS (
                SELECT 1 FROM arrangement_participants p2
                WHERE p2.arrangement_id = a.id AND p2.user_id = $1
              ) AS joined_by_me
       FROM arrangements a
       JOIN users u ON u.id = a.user_id
       ORDER BY a.created_at DESC
       LIMIT 100`,
      [uid]
    );
    return res.json({ arrangements: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Serverfejl." });
  }
});

// Tilslut en bruger til et eksisterende arrangement (én raekke pr. bruger pr. arrangement).
router.post("/arrangements/:id/join", requireUser, async (req, res) => {
  const arrangementId = Number(req.params.id);
  if (!Number.isFinite(arrangementId) || arrangementId < 1) {
    return res.status(400).json({ error: "Ugyldigt arrangement." });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const lock = await client.query(
      `SELECT id, players FROM arrangements WHERE id = $1 FOR UPDATE`,
      [arrangementId]
    );
    const row = lock.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Arrangement findes ikke." });
    }
    const cnt = await client.query(
      `SELECT COUNT(*)::int AS c FROM arrangement_participants WHERE arrangement_id = $1`,
      [arrangementId]
    );
    const n = cnt.rows[0].c;
    if (n >= row.players) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Arrangementet er fuldt booket." });
    }
    try {
      await client.query(
        `INSERT INTO arrangement_participants (arrangement_id, user_id) VALUES ($1, $2)`,
        [arrangementId, req.session.userId]
      );
    } catch (ins) {
      if (ins.code === "23505") {
        await client.query("ROLLBACK");
        return res.status(409).json({ error: "Du deltager allerede." });
      }
      throw ins;
    }
    const after = await client.query(
      `SELECT COUNT(*)::int AS c FROM arrangement_participants WHERE arrangement_id = $1`,
      [arrangementId]
    );
    await client.query("COMMIT");
    return res.status(201).json({ ok: true, participant_count: after.rows[0].c });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {
      /* ignore */
    }
    console.error(err);
    return res.status(500).json({ error: "Serverfejl." });
  } finally {
    client.release();
  }
});

// Fjern loggede bruger fra deltagerlisten.
router.post("/arrangements/:id/leave", requireUser, async (req, res) => {
  const arrangementId = Number(req.params.id);
  if (!Number.isFinite(arrangementId) || arrangementId < 1) {
    return res.status(400).json({ error: "Ugyldigt arrangement." });
  }
  try {
    const exists = await pool.query(`SELECT 1 FROM arrangements WHERE id = $1`, [arrangementId]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: "Arrangement findes ikke." });
    }
    const del = await pool.query(
      `DELETE FROM arrangement_participants WHERE arrangement_id = $1 AND user_id = $2 RETURNING arrangement_id`,
      [arrangementId, req.session.userId]
    );
    if (del.rowCount === 0) {
      return res.status(404).json({ error: "Du deltager ikke i dette arrangement." });
    }
    const cnt = await pool.query(
      `SELECT COUNT(*)::int AS c FROM arrangement_participants WHERE arrangement_id = $1`,
      [arrangementId]
    );
    return res.json({ ok: true, participant_count: cnt.rows[0].c });
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
    await pool.query(
      `INSERT INTO arrangement_participants (arrangement_id, user_id) VALUES ($1, $2)
       ON CONFLICT (arrangement_id, user_id) DO NOTHING`,
      [row.id, req.session.userId]
    );
    row.creator_username = req.session.username;
    row.participant_count = 1;
    row.joined_by_me = true;
    return res.status(201).json({ arrangement: row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Serverfejl." });
  }
});

module.exports = router;
