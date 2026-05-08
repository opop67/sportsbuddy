const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

// Primær DB-connection string; fallback bruges ved lokal udvikling.
const connectionString =
  process.env.DATABASE_URL || "postgresql://app:app@localhost:5432/sportsbuddy";

// Opretter en shared PostgreSQL connection pool til hele appen.
const pool = new Pool({ connectionString });

// Sikrer at nødvendige tabeller findes før serveren starter requests.
async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(80) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS arrangements (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      sport VARCHAR(120) NOT NULL,
      players INTEGER NOT NULL CHECK (players > 0),
      location VARCHAR(255) NOT NULL,
      fee INTEGER NOT NULL DEFAULT 0 CHECK (fee >= 0),
      level INTEGER NOT NULL DEFAULT 5 CHECK (level >= 1 AND level <= 10),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS arrangements_created_at_idx
    ON arrangements (created_at DESC);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS arrangement_participants (
      arrangement_id INTEGER NOT NULL REFERENCES arrangements (id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (arrangement_id, user_id)
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS arrangement_participants_user_idx
    ON arrangement_participants (user_id);
  `);
  await pool.query(`
    INSERT INTO arrangement_participants (arrangement_id, user_id)
    SELECT a.id, a.user_id FROM arrangements a
    ON CONFLICT (arrangement_id, user_id) DO NOTHING;
  `);

  await seedDemoArrangementsIfEmpty();

  await pool.query(`
    INSERT INTO arrangement_participants (arrangement_id, user_id)
    SELECT a.id, a.user_id FROM arrangements a
    ON CONFLICT (arrangement_id, user_id) DO NOTHING;
  `);
}

// Indsaetter de tre tidligere "nearby" demo-arrangements naar databasen er tom (foerste start).
async function seedDemoArrangementsIfEmpty() {
  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM arrangements");
  if (rows[0].c > 0) return;

  const demoUsername = "nearby_demo";
  const hash = await bcrypt.hash("no-login-" + Math.random().toString(36), 10);
  await pool.query(
    `INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING`,
    [demoUsername, hash]
  );
  const userRes = await pool.query(`SELECT id FROM users WHERE username = $1`, [demoUsername]);
  const userId = userRes.rows[0].id;

  await pool.query(
    `INSERT INTO arrangements (user_id, sport, players, location, fee, level, created_at) VALUES
     ($1, 'Padel', 4, 'City Padel Club', 240, 7, NOW() - INTERVAL '3 days'),
     ($1, 'Football', 12, 'North Arena', 0, 5, NOW() - INTERVAL '2 days'),
     ($1, 'Badminton', 4, 'Sportshall B', 120, 6, NOW() - INTERVAL '1 day')`,
    [userId]
  );
}

module.exports = { pool, ensureSchema };
