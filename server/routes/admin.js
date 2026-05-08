const express = require("express");
const { pool } = require("../db");

const router = express.Router();

const ALLOWED_TABLES = new Set(["users", "arrangements", "arrangement_participants", "session"]);

function quoteIdent(name) {
  if (!ALLOWED_TABLES.has(name)) {
    throw new Error("invalid_table");
  }
  return '"' + name.replace(/"/g, '""') + '"';
}

// Oversigt over kendte tabeller + row counts (session findes foerst naar nogen har logget ind).
router.get("/admin/meta", async (_req, res) => {
  const tables = [...ALLOWED_TABLES];
  const out = [];
  for (const name of tables) {
    try {
      const r = await pool.query(`SELECT COUNT(*)::int AS c FROM ${quoteIdent(name)}`);
      out.push({ name, rowCount: r.rows[0].c, available: true });
    } catch (err) {
      if (err.code === "42P01") {
        out.push({ name, rowCount: 0, available: false });
      } else {
        console.error(err);
        return res.status(500).json({ error: "Serverfejl." });
      }
    }
  }
  return res.json({ tables: out });
});

// Rækker for én whitelisted tabel (max 500), nyeste/id foerst hvor ORDER BY 1 giver mening.
router.get("/admin/table/:name", async (req, res) => {
  const name = String(req.params.name || "");
  if (!ALLOWED_TABLES.has(name)) {
    return res.status(404).json({ error: "Ukendt tabel." });
  }
  try {
    const ident = quoteIdent(name);
    const result = await pool.query(`SELECT * FROM ${ident} ORDER BY 1 DESC NULLS LAST LIMIT 500`);
    const columns = result.fields.map((f) => f.name);
    return res.json({ table: name, columns, rows: result.rows });
  } catch (err) {
    if (err.code === "42P01") {
      return res.status(404).json({ error: "Tabellen findes ikke endnu (fx session oprettes ved foerste login)." });
    }
    console.error(err);
    return res.status(500).json({ error: "Serverfejl." });
  }
});

module.exports = router;
