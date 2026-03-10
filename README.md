# 🕵️ I Am Detective

> **Detective-mode criminal case explorer** — Browse real open legal cases, read structured dossiers, explore visual relationship graphs, build auto-generated timelines, and annotate evidence.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui |
| **Backend** | Go 1.23, Gin framework |
| **Database** | PostgreSQL 15 |
| **Cache** | Redis 7 |
| **External APIs** | [CourtListener](https://www.courtlistener.com/api/) (US case law) |

---

## Prerequisites

- **Go** ≥ 1.23 — [install](https://go.dev/doc/install)
- **Node.js** ≥ 18 — [install](https://nodejs.org/)
- **Docker** + **Docker Compose** — [install](https://docs.docker.com/get-docker/)
- **Git**

---

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/<your-org>/iamdetective.git
cd iamdetective
```

### 2. Start Postgres & Redis

```bash
docker compose up -d
```

This spins up:
- **PostgreSQL** on `localhost:5432` (user: `user`, password: `password`, db: `iamdetective`)
- **Redis** on `localhost:6379`

### 3. Set up the backend

```bash
cd backend

# Copy the example env file and fill in your API tokens
cp .env.example .env
# Edit .env — add your COURTLISTENER_API_TOKEN (get one at https://www.courtlistener.com/sign-in/)

# Run database migrations
psql "postgres://user:password@localhost:5432/iamdetective?sslmode=disable" -f migrations/001_create_users.sql
psql "postgres://user:password@localhost:5432/iamdetective?sslmode=disable" -f migrations/002_create_cases.sql
psql "postgres://user:password@localhost:5432/iamdetective?sslmode=disable" -f migrations/003_create_persons.sql
psql "postgres://user:password@localhost:5432/iamdetective?sslmode=disable" -f migrations/004_create_events.sql
psql "postgres://user:password@localhost:5432/iamdetective?sslmode=disable" -f migrations/005_create_annotations.sql
psql "postgres://user:password@localhost:5432/iamdetective?sslmode=disable" -f migrations/006_create_crime_stats.sql

# Start the API server
go run ./cmd
```

The API will be available at **http://localhost:8080**.

### 4. Set up the frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at **http://localhost:3000**.

---

## Project Structure

```
iamdetective/
├── backend/
│   ├── cmd/                  # Application entrypoint (main.go)
│   ├── internal/
│   │   ├── handlers/         # HTTP route handlers (Gin)
│   │   ├── models/           # Data models (Case, Person, Event, etc.)
│   │   ├── repository/       # Database access layer (Postgres)
│   │   └── services/         # External API clients (CourtListener, Redis)
│   ├── migrations/           # SQL migration files
│   ├── .env.example          # Environment variable template
│   ├── go.mod
│   └── go.sum
├── frontend/
│   ├── app/                  # Next.js App Router pages
│   │   ├── page.tsx          # Homepage (search + recent cases)
│   │   └── cases/
│   │       ├── page.tsx      # Case search/browse page
│   │       └── [id]/
│   │           └── page.tsx  # Case dossier detail page
│   ├── src/components/       # shadcn/ui components
│   ├── package.json
│   └── next.config.ts
├── docker-compose.yml        # Postgres + Redis containers
├── prd.md                    # Product Requirements Document
└── README.md                 # ← You are here
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/cases/search?q=&jurisdiction=&status=&page=&limit=` | Search cases |
| `GET` | `/api/v1/cases/:id` | Get a single case |
| `GET` | `/api/v1/cases/:id/related` | Get related cases |

### Quick test

```bash
# Health check
curl http://localhost:8080/health

# Search for cases
curl "http://localhost:8080/api/v1/cases/search?q=apple"

# Get a specific case
curl http://localhost:8080/api/v1/cases/<case-id>
```

A full test script is available at `backend/test_api.sh`:

```bash
cd backend && chmod +x test_api.sh && ./test_api.sh
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | API port (default: `8080`) |
| `GIN_MODE` | No | Gin mode: `debug` or `release` |
| `DATABASE_URL` | **Yes** | Postgres connection string |
| `REDIS_URL` | No | Redis address (default: `localhost:6379`) |
| `COURTLISTENER_API_TOKEN` | No | CourtListener API token for searching US case law |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID (not yet implemented) |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret (not yet implemented) |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth client ID (not yet implemented) |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth secret (not yet implemented) |
| `FBI_API_KEY` | No | FBI Crime Data Explorer API key (not yet implemented) |

> **⚠️ Never commit `.env` files.** The `.gitignore` is configured to exclude them.

---

## Development Workflow

```bash
# Terminal 1 — Infra
docker compose up -d

# Terminal 2 — Backend
cd backend && go run ./cmd

# Terminal 3 — Frontend
cd frontend && npm run dev
```

### Stopping everything

```bash
# Kill the servers
fuser -k 8080/tcp   # backend
fuser -k 3000/tcp   # frontend

# Stop containers
docker compose down
```

---

## Common Issues

| Problem | Solution |
|---------|----------|
| `bind: address already in use` on port 8080 | Run `fuser -k 8080/tcp` to kill the stale process |
| Frontend shows "Failed to fetch" | Make sure the backend is running — CORS middleware is included |
| Cases show "Unknown" fields | The CourtListener API may not return all fields for every case |
| `docker compose up` fails | Make sure Docker Desktop is running |
| Migrations fail with "relation already exists" | Tables already exist — safe to ignore |

---

## License

MIT
