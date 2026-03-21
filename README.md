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

## 5c — Import full v738 operational data (batches, students, faculty)

Use this when you want the app preloaded with current three-year student and faculty data from the
legacy v738 reference file.

```bash
# Dry run — preview import counts only
npm run db:import:v738:dry

# Full import (idempotent upsert)
npm run db:import:v738
```

This imports:
- Batch master data for active years (`2027`, `2028`, `2029`)
- Student roster data mapped into those batches
- Faculty records mapped by department

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
| `/dashboard` | Role-aware operational dashboard (includes principal view when assigned) | All authenticated users |
| `/cycles` | Academic cycle list and cycle creation | Admin / Principal / HoD |
| `/cycles/[cycleId]` | Cycle detail and guided session plan CRUD (batch-aware course/faculty filtering) | Admin / Principal / HoD |
| `/cycles/[cycleId]/teams` | Team generation, editing, and export for a cycle | Admin / Principal / HoD / Faculty |
| `/cycles/[cycleId]/assignments` | P3 assignment engine — Bloom's taxonomy, 4 types, reserves, approval, export | Admin / Principal / HoD / Faculty |
| `/cycles/[cycleId]/sessions/[sessionId]/grades` | Role-wise grade entry, finalization, and lock workflow | Admin / Principal / HoD |
| `/cycles/[cycleId]/sessions/[sessionId]/role-mapping` | Auto role mapping per team for a specific session | Admin / Principal / HoD / Faculty |
| `/batches` | Batch list and batch creation | Admin / Principal / HoD |
| `/batches/[batchId]` | Batch detail and student management | Admin / Principal / HoD |
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
| `GET/POST` | `/api/cycles` | Session role (Admin/Principal/HoD) | List cycles / create cycle |
| `GET/PATCH` | `/api/cycles/[cycleId]` | Session role (Admin/Principal/HoD) | Read or edit cycle; activate/complete transitions |
| `GET` | `/api/cycles/options` | Session role (Admin/Principal/HoD) | Fetch batch/course/faculty options for planning |
| `GET/POST/PATCH` | `/api/cycles/[cycleId]/teams` | Session role (Admin/Principal/HoD/Faculty for read) | List generated teams / generate teams by size / edit teams (move student, rename) |
| `GET` | `/api/cycles/[cycleId]/teams/export` | Session role | Export teams as CSV or JSON (`?format=csv\|json`) |
| `GET/POST/PATCH` | `/api/cycles/[cycleId]/assignments` | Session role (Admin/Principal/HoD/Faculty for read) | P3 assignment engine — generate with Bloom's taxonomy, 4 types, 12+3 reserve / approve / activate reserve |
| `GET` | `/api/cycles/[cycleId]/assignments/export` | Session role | Export assignments as CSV or JSON (`?format=csv\|json`) |
| `GET/POST` | `/api/cycles/[cycleId]/sessions` | Session role (Admin/Principal/HoD) | List or create session plans for a cycle (validates batch-course-faculty compatibility) |
| `PATCH/DELETE` | `/api/cycles/[cycleId]/sessions/[sessionId]` | Session role (Admin/Principal/HoD) | Update session plan or delete it |
| `GET/PATCH` | `/api/cycles/[cycleId]/sessions/[sessionId]/grades` | Session role (Admin/HoD/Faculty) | Load rubric + roster + grade records, save draft role grades |
| `POST` | `/api/cycles/[cycleId]/sessions/[sessionId]/grades/finalize` | Session role (Admin/HoD/Faculty) | Finalize one role for all students; auto-lock session when all 3 roles are finalized |
| `GET/POST` | `/api/cycles/[cycleId]/sessions/[sessionId]/role-mappings` | Session role (Admin/Principal/HoD/Faculty for read) | View role mappings / auto-generate presenter-reviewer-strategist mapping per team |
| `GET/POST` | `/api/batches` | Session role (Admin/Principal/HoD) | List or create batches |
| `GET` | `/api/batches/options` | Session role (Admin/Principal/HoD) | Fetch department options for batch forms |
| `GET/PATCH/DELETE` | `/api/batches/[batchId]` | Session role (Admin/Principal/HoD) | Read, update, or delete a batch |
| `GET/POST` | `/api/batches/[batchId]/students` | Session role (Admin/Principal/HoD) | List or add students in a batch |
| `PATCH/DELETE` | `/api/batches/[batchId]/students/[studentId]` | Session role (Admin/Principal/HoD) | Update or delete student record |
| `GET` | `/api/mentors/alumni` | None | List alumni mentors (search + pagination) |
| `GET` | `/api/mentors/alumni/[id]` | None | Single alumni mentor profile |
| `GET` | `/api/reports/[cycleId]/gate` | None | Check if a cycle is ready for reports |
| `POST` | `/api/reports/[cycleId]/generate` | None | Generate report for a completed cycle |
| `GET` | `/api/reports/[cycleId]/pdf` | None | Download one-click PDF snapshot for cycle report summary |

Cycle and grade UX improvements:
- Session planner auto-suggests next `Block/Session` sequence from existing plans.
- Team generation and assignment generation are available under cycle-level tools.
- Session planner now includes an in-page step-by-step flow guide with an example path from session planning to teams, assignments, role mapping, and grading.
- Each session row now provides deep links to Teams and Assignments with matching Batch/Course pre-selected.
- Teams page now handles empty/non-JSON API failures gracefully and shows actionable HTTP error messages instead of JSON parser exceptions.
- Teams API now returns an explicit migration hint when database schema is behind (missing Team table).
- Teams and Assignments deep-link preselection now uses server-side `searchParams` handoff, preventing runtime page failures in strict render modes.
- Role mapping supports auto-rotate assignment of Presenter/Reviewer/Strategist per team per session.
- Grade entry shows rubric-dimension tooltips (description/anchor) for clarity.
- Grade entry includes per-student cross-role progress indicators.

### Reviewer authentication

Endpoints that require reviewer access expect two headers:

```
Authorization: Bearer <REVIEW_API_TOKEN>
x-user-email: admin@example.com
```

The user identified by `x-user-email` must exist in the database **and** have an `ADMIN` or `HOD` role assignment.  
The admin review console at `/admin/registrations` provides a UI for this — it stores credentials locally in the browser.

Authentication runtime note:
- Auth.js host trust is enabled in config (`trustHost: true`) so local development at `localhost` does not fail with `UntrustedHost`.

---

## CI/CD and branch protection

CI is enabled via GitHub Actions at `.github/workflows/ci.yml`.

- On every push and PR to `main`, it runs: install, Prisma client generation, lint, and production build.
- Branch protection is enforced on `main`:
	- Pull requests are required for changes.
	- Status check `Lint, Type-check & Build` is required before merge.
	- Direct pushes are blocked by protection rules.

This keeps `main` stable by preventing unreviewed and failing changes from being merged.

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
| `npm run db:import:v738` | Import v738 batches, students, and faculty |
| `npm run db:import:v738:dry` | Dry run — preview v738 import counts |
| `npm run db:bootstrap-admin` | Create / reset the first ADMIN user |

---

## Container deployment baseline (M11)

`apps/web` now includes containerization artifacts:

- `Dockerfile` — multi-stage production image build
- `.dockerignore` — excludes build/runtime-local files

Build and run locally:

```bash
cd apps/web
docker build -t sam-web:local .
docker run --rm -p 3000:3000 --env-file .env sam-web:local
```

---

## Further reading

- [Architecture and route map](docs/architecture.md)
- [Report generation requirements](docs/sam-student-progress-report-requirements.md)
- [Implementation status](docs/implementation-status.md)
- [Department syllabuses](docs/syllabus/)

