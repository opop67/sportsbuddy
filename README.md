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
- **Database:** Postgres inside Compose; data persists in the `pgdata` volume.  
- Only **`web`** and **`db`** start by default. Do not run **`web`** and **`web-dev`** both mapped to port **3000** at the same time.

Set a strong session secret in production:

```bash
export SESSION_SECRET=$(openssl rand -hex 32)
docker compose up --build
```

### Development (live reload)

Mounts source into the container and runs **nodemon**:

```bash
docker compose --profile dev up --build db web-dev
```

Edit files on your machine; the server restarts on change. Database data still uses the same volume.

### Stop and remove containers

```bash
docker compose down
```

To also remove the database volume (wipes data):

```bash
docker compose down -v
```

## Run without Docker

1. Install PostgreSQL and create a database and user (or use defaults matching `DATABASE_URL`).
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

   Or for production mode: `npm start`

On first start, the app creates required tables and seeds demo arrangements if the database is empty.

## Using the app

1. Open **http://localhost:3000** — login page.  
2. Create an account via **Register**, or log in.  
3. **Home** — overview, link to arrangements and profile.  
4. **Arrangements** — list sessions; **Arrange** opens the create form; **Join** / **Unjoin** updates participation (stored in PostgreSQL).  
5. **Profile**, **Levels**, **Badges** — mostly client-side extras; auth is server-side.

## Admin (database browser)

**http://localhost:3000/admin** — ER-style diagram of app tables and clickable rows to inspect data. Intended for **local development**; protect or disable in production.

## Configuration

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for signing session cookies (set a strong value in production) |
| `PORT` | HTTP port (default **3000**) |
| `NODE_ENV` | `production` or `development` |
| `TRUST_PROXY` | Set to `1` if behind an HTTPS reverse proxy (affects secure cookies in production) |

## Project layout

- `server/` — Express app, auth, arrangements API, admin routes, DB bootstrap  
- `public/` — HTML pages, `css/styles.css`, `js/api.js`  
- `docker-compose.yml` — `db`, `web`, optional `web-dev`  
- `DATABASE.md` — database documentation (tables, sessions, ER notes)

## License

Private project (`package.json` marks the package as private).
