# Sportsbuddy

Web app for finding sports sessions: register, log in, create **arrangements** (sessions), **join** or **unjoin** them, and manage a simple profile. Uses **Node.js (Express)**, **PostgreSQL**, and static HTML/CSS/JS.

## Requirements

- **Docker** and **Docker Compose** (recommended), or  
- **Node.js 18+** and a running **PostgreSQL 16** instance if you run without Docker.

## Quick start (Docker, production-style)

From the project root:

```bash
docker compose up --build
```

- **App:** [http://localhost:3000](http://localhost:3000) (login)  
- **Register:** [http://localhost:3000/register.html](http://localhost:3000/register.html)  
- **Database:** Postgres in Compose; data persists in the **`pgdata`** volume.  
- By default only **`web`** and **`db`** start. Do **not** run **`web`** and **`web-dev`** together on port **3000**.

Set a strong session secret in production:

```bash
export SESSION_SECRET=$(openssl rand -hex 32)
docker compose up --build
```

### Development (live reload)

Mounts the repo into the container and runs **nodemon** (`Dockerfile.dev`):

```bash
docker compose --profile dev up --build db web-dev
```

Edit files on the host; the server restarts on change. The same Postgres volume is used.

### Stop and remove containers

```bash
docker compose down
```

To also remove the database volume (wipes all data):

```bash
docker compose down -v
```

## Run without Docker

1. Install PostgreSQL and create a database and user (or match `DATABASE_URL` to your setup).  
2. Install dependencies:

   ```bash
   npm install
   ```

3. Set environment variables (example):

   ```bash
   export DATABASE_URL=postgresql://app:app@localhost:5432/sportsbuddy
   export SESSION_SECRET=dev-only-change-me
   export NODE_ENV=development
   ```

4. Start the server:

   ```bash
   npm run dev
   ```

   Production-style (no file watcher): `npm start`

On first start, `ensureSchema()` in `server/db.js` creates **`users`**, **`arrangements`**, **`arrangement_participants`**, syncs host rows into participants, and if **`arrangements`** is empty, seeds demo data (user **`nearby_demo`** plus three sample sessions).

## Using the app

1. Open **http://localhost:3000** — login.  
2. **Register** a new account or log in.  
3. **Home** — overview; links to arrangements, profile, levels, badges.  
4. **Arrangements** — browse sessions; **Arrange** opens the create form; **Join** / **Unjoin** updates **`arrangement_participants`** in Postgres.  
5. **Profile**, **Levels**, **Badges** — extra UI; profile/levels/badges use **localStorage**; auth and arrangements are **server-side**.

## Admin (database browser)

- **Page:** [http://localhost:3000/admin](http://localhost:3000/admin) — Mermaid-style ER view and table data (whitelisted tables only).  
- **API:** `GET /api/admin/meta`, `GET /api/admin/table/:name`  

Intended for **local development** only. Remove or protect these routes in production.

## Configuration

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for signing session cookies (use a strong value in production) |
| `PORT` | HTTP port (default **3000**) |
| `NODE_ENV` | `production` or `development` |
| `TRUST_PROXY` | Set to `1` if behind an HTTPS reverse proxy (affects secure cookies in production) |

## Project layout

| Path | Role |
|------|------|
| `server/index.js` | Express app, session, static files, `/admin` route |
| `server/db.js` | Pool, `ensureSchema()`, demo seed |
| `server/routes/auth.js` | Register, login, logout, `/api/me` |
| `server/routes/arrangements.js` | CRUD-style arrangements, join/leave, `my-stats` |
| `server/routes/admin.js` | Read-only admin API |
| `public/` | HTML, `css/styles.css`, `js/api.js` |
| `docker-compose.yml` | Services: `db`, `web`, optional `web-dev` (profile `dev`) |
| **`DATABASE.md`** | **Tables, ER diagram, API summary, security notes** |

## License

Private project (`package.json` marks the package as private).
