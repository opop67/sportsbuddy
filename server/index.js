const path = require("path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { pool, ensureSchema } = require("./db");
const authRoutes = require("./routes/auth");
const arrangementRoutes = require("./routes/arrangements");
const adminRoutes = require("./routes/admin");

const PORT = process.env.PORT || 3000;
const app = express();

async function main() {
  // Initial bootstrapping: opretter schema hvis det mangler.
  await ensureSchema();

  // Parser JSON-body for API-requests.
  app.use(express.json());
  app.use(
    session({
      // Gemmer session-data i Postgres, så login overlever restart.
      store: new pgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      name: "sportsbuddy.sid",
      // Session-secret til signering af cookie.
      secret: process.env.SESSION_SECRET || "dev-only-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        // Secure cookie kun når vi kører bag HTTPS proxy i prod.
        secure: process.env.NODE_ENV === "production" && process.env.TRUST_PROXY === "1",
      },
    })
  );

  // Samler auth- og arrangement-routes under /api.
  app.use("/api", authRoutes);
  app.use("/api", arrangementRoutes);
  app.use("/api", adminRoutes);

  // Server statiske filer (HTML/CSS/JS) fra public-mappen.
  const publicDir = path.join(__dirname, "..", "public");

  app.get("/admin", (_req, res) => {
    res.sendFile(path.join(publicDir, "admin.html"));
  });

  app.use(express.static(publicDir));

  // Root-url sender brugeren til login-siden.
  app.get("/", (_req, res) => {
    res.sendFile(path.join(publicDir, "login.html"));
  });

  // Starter HTTP-serveren på alle interfaces.
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sportsbuddy listening on http://0.0.0.0:${PORT}`);
  });
}

// Global opstarts-fejl håndteres her.
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
