# GCE Erode — SAM Pilot

![CI](https://github.com/sudhakarjanardhanan/gce-erode-sam-pilot/actions/workflows/ci.yml/badge.svg)

Student Assignment Model (SAM) platform rebuild for GCE Erode.  
Built with **Next.js 16 + PostgreSQL + Prisma 7 + Tailwind CSS**.

---

## Repository layout

```
gce-erode-sam-pilot/
├── apps/web/          Next.js web application (main app)
├── docs/              Architecture, syllabus, requirements, implementation status
├── reference/         Legacy HTML source (behaviour/data reference only)
└── README.md          This file
```

---

## Prerequisites

| Tool | Minimum version |
|---|---|
| Node.js | 20 |
| npm | 10 |
| Docker Desktop _(recommended for local DB)_ | Any recent |
| PostgreSQL _(if not using Docker)_ | 15 or 16 |

---

## 1 — Start the local PostgreSQL database

### Option A — Docker (recommended)

```bash
cd apps/web
docker compose up -d
```

This starts a PostgreSQL 16 container with:
- Database: `sam_dev`
- User / Password: `postgres` / `postgres`
- Port: `5432`

### Option B — Native PostgreSQL

Ensure a PostgreSQL server is running on `localhost:5432`.  
Create the database manually:

```sql
CREATE DATABASE sam_dev;
```

---

## 2 — Configure environment

```bash
cd apps/web
copy .env.example .env
```

The defaults in `.env.example` work with Docker Option A above.  
For custom setups, edit `apps/web/.env`:

```env
# Required — PostgreSQL connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sam_dev?schema=public"

# Required — Admin review API token (set a strong random value in production)
REVIEW_API_TOKEN="replace-with-strong-random-token"

# Required — NextAuth session signing key
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="replace-with-strong-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

---

## 3 — Install dependencies

```bash
cd apps/web
npm install
```

---

## 4 — Apply database migrations

```bash
# Development (creates/applies migrations interactively)
npm run prisma:migrate

# Or: deploy-only mode (production / CI)
npm run prisma:migrate:deploy
```

---

## 5 — Seed reference data

Parses department, course and rubric constants from the reference HTML into the database.

```bash
# Dry run — prints counts, touches no DB
npm run db:seed:dry

# Full seed
npm run db:seed
```

Expected dry-run output: **8 departments · 235 courses · 3 rubrics**.

---

## 5b — Bootstrap the first admin user

Run once after migrations and seed to create the initial admin account:

```bash
# Set these in apps/web/.env first:
#   ADMIN_EMAIL=admin@gceerode.ac.in
#   ADMIN_PASSWORD=YourStrongPassword123
#   ADMIN_NAME=SAM Admin

npm run db:bootstrap-admin
```

Then sign in at **http://localhost:3000/login** with those credentials.

---

## 6 — Start the development server

```bash
cd apps/web
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Available routes

| Path | Description | Who can access |
|---|---|---|
| `/` | Home / landing stub | Everyone |
| `/login` | Credentials login page | Public |
| `/register` | Registration profile selector | Public (anyone registering) |
| `/register/student` | Student registration form | Students |
| `/register/faculty` | Faculty registration form | Faculty |
| `/register/hod` | HoD registration form | HoDs |
| `/register/alumni` | Alumni mentor registration form | Alumni |
| `/admin/registrations` | Review and approve/reject registrations | Admin only |
| `/mentors` | Mentor directory home | All authenticated users |
| `/mentors/alumni` | Searchable, paginated alumni mentor list | All authenticated users |
| `/mentors/alumni/[id]` | Individual alumni mentor profile | All authenticated users |
| `/reports` | Academic cycle report list | Admin / HoD / Faculty |
| `/reports/[cycleId]` | Report detail for a cycle | Admin / HoD / Faculty |

---

## API reference (key endpoints)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/registration` | None | Submit a registration request |
| `GET` | `/api/registration` | Reviewer token + role | List registration requests (filterable) |
| `PATCH` | `/api/registration/[id]/review` | Admin token + role | Approve or reject a request |
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth internal | Credentials auth/session handlers |
| `GET` | `/api/mentors/alumni` | None | List alumni mentors (search + pagination) |
| `GET` | `/api/mentors/alumni/[id]` | None | Single alumni mentor profile |
| `GET` | `/api/reports/[cycleId]/gate` | None | Check if a cycle is ready for reports |
| `POST` | `/api/reports/[cycleId]/generate` | None | Generate report for a completed cycle |

### Reviewer authentication

Endpoints that require reviewer access expect two headers:

```
Authorization: Bearer <REVIEW_API_TOKEN>
x-user-email: admin@example.com
```

The user identified by `x-user-email` must exist in the database **and** have an `ADMIN` or `HOD` role assignment.  
The admin review console at `/admin/registrations` provides a UI for this — it stores credentials locally in the browser.

---

## CI/CD recommendation

Yes, CI/CD should be in place to keep the repository healthy.

- CI is now enabled via GitHub Actions at `.github/workflows/ci.yml`.
- On every push and PR to `main`, it runs: install, Prisma client generation, lint, and production build.
- This catches integration issues early and prevents regressions from silently reaching `main`.

To make the repo "always working", also enable branch protection on GitHub:

1. Require PRs for `main`.
2. Require CI status checks to pass before merge.
3. Block force-push and direct pushes to `main`.

---

## npm scripts (apps/web)

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server on port 3000 |
| `npm run build` | Production build |
| `npm run lint` | ESLint check |
| `npm run prisma:generate` | Regenerate Prisma client after schema changes |
| `npm run prisma:format` | Auto-format schema.prisma |
| `npm run prisma:migrate` | Create and apply a new migration (dev) |
| `npm run prisma:migrate:deploy` | Apply pending migrations (prod/CI) |
| `npm run prisma:studio` | Open Prisma Studio DB browser |
| `npm run db:seed` | Seed departments, courses, rubrics from reference |
| `npm run db:seed:dry` | Dry run — validate seed counts only |
| `npm run db:bootstrap-admin` | Create / reset the first ADMIN user |

---

## Further reading

- [Architecture and route map](docs/architecture.md)
- [Report generation requirements](docs/sam-student-progress-report-requirements.md)
- [Implementation status](docs/implementation-status.md)
- [Department syllabuses](docs/syllabus/)

