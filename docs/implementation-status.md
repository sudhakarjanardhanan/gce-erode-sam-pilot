# SAM Pilot — Implementation Status

Last updated: 2026-03-21 (algorithm alignment with reference platform — team ÷3 snap, auto-assignment creation, team-level role rotation, pairings table, grades page auth guard)
Branch: `main`

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Complete and committed |
| 🔶 | Scaffolded / partial — needs more work |
| ⬜ | Not started |

---

## Foundation

| Area | Status | Notes |
|---|---|---|
| Repository setup and monorepo layout | ✅ | `apps/web/` houses the Next.js app |
| Next.js 16 app scaffold (App Router + TypeScript + Tailwind) | ✅ | |
| Prisma 7 with adapter-pg + pg driver | ✅ | `src/lib/db.ts` singleton |
| PostgreSQL schema — core SAM models | ✅ | Users, Departments, Batches, Courses, Faculty, Students, Cycles, Sessions, Grades, Reports |
| Migration artifacts (SQL-based, ready to apply) | ✅ | `prisma/migrations/0001_init`, `0002_alumni_mentor`, `0003_registration_requests` |
| Docker Compose for local PostgreSQL | ✅ | `apps/web/docker-compose.yml` |
| `.env.example` with all required variables | ✅ | `DATABASE_URL`, `REVIEW_API_TOKEN` |
| Prisma seed script — departments / courses / rubrics | ✅ | 8 departments · 235 courses · 3 rubrics (dry-run verified) |
| apply migrations to live DB | ✅ | Local PostgreSQL running via Docker; migrations 0001-0005 applied |

---

## Reference data extraction

| Item | Status | Notes |
|---|---|---|
| CSE syllabus (`docs/syllabus/cse.md`) | ✅ | |
| ECE syllabus (`docs/syllabus/ece.md`) | ✅ | |
| EEE syllabus (`docs/syllabus/eee.md`) | ✅ | |
| MCE syllabus (`docs/syllabus/mce.md`) | ✅ | |
| ATE syllabus (`docs/syllabus/ate.md`) | ✅ | |
| IMT syllabus (`docs/syllabus/imt.md`) | ✅ | |
| DSC syllabus (`docs/syllabus/dsc.md`) | ✅ | |
| CVE syllabus (`docs/syllabus/cve.md`) | ✅ | |
| Rubric dimensions parsed into seed | ✅ | 3 rubrics (Presenter, Technical Reviewer, Feedback Strategist) |
| v738 operational master import (batches, students, faculty) | ✅ | Imported from `reference/sam_platform_v738_production.html` (22 active batches, 1254 students, 17 faculty) |

---

## Authentication and access control

| Feature | Status | Notes |
|---|---|---|
| Reviewer auth helper (`src/lib/auth/reviewerAuth.ts`) | ✅ | Bearer token + DB-backed role check |
| `GET /api/registration` protected (Admin/HoD only) | ✅ | |
| `PATCH /api/registration/[id]/review` protected (Admin only) | ✅ | |
| Full session-based auth (login / logout / JWT / sessions) | ✅ | Auth.js v5 credentials provider, JWT strategy |
| Local host trust for Auth.js | ✅ | `trustHost: true` enabled to prevent `UntrustedHost` errors on localhost |
| Login page UI | ✅ | `/login` with callbackUrl support |
| Session-aware nav bar | ✅ | Shows user name, sign-out, admin link |
| Role-gated route protection (Next.js proxy) | ✅ | `src/proxy.ts` — protects /admin, /reports, /mentors |
| Bootstrap script for first admin user | ✅ | `prisma/bootstrap-admin.ts` → `npm run db:bootstrap-admin` |

---

## Registration intake

| Feature | Status | Notes |
|---|---|---|
| `RegistrationRequest` schema + migration | ✅ | Migration 0003 |
| Public POST `/api/registration` endpoint | ✅ | Accepts all role types |
| Role selection landing page (`/register`) | ✅ | |
| Student registration form (`/register/student`) | ✅ | |
| Faculty registration form (`/register/faculty`) | ✅ | |
| HoD registration form (`/register/hod`) | ✅ | |
| Alumni registration form (`/register/alumni`) | ✅ | |
| Admin review console UI (`/admin/registrations`) | ✅ | Token-based auth, Approve/Reject buttons |
| Approve/Reject PATCH endpoint | ✅ | Writes reviewedAt + reviewerNotes |
| Post-approval user provisioning (auto-create `User` record) | ⬜ | |
| Email notification on approval/rejection | ⬜ | |

---

## Alumni mentor directory

| Feature | Status | Notes |
|---|---|---|
| `AlumniMentor` schema + migration | ✅ | Migration 0002 |
| `GET /api/mentors/alumni` with search + pagination | ✅ | `q`, `page`, `pageSize` params |
| `GET /api/mentors/alumni/[id]` profile detail | ✅ | |
| Alumni mentor list page with search + pagination UI | ✅ | `/mentors/alumni` |
| Alumni mentor profile detail page | ✅ | `/mentors/alumni/[id]` |
| Seeded sample alumni mentor records | ✅ | Via `prisma/seed.ts` |
| Admin CRUD for alumni mentor records | ⬜ | |
| Mentor–student connection / messaging | ⬜ | Out of scope for pilot |

---

## Report generation

| Feature | Status | Notes |
|---|---|---|
| Cycle gate logic (`src/lib/reports/cycleGate.ts`) | ✅ | Blocks report unless all sessions are COMPLETED |
| `GET /api/reports/[cycleId]/gate` | ✅ | Returns gate status + blocking session IDs |
| `POST /api/reports/[cycleId]/generate` | ✅ | Gated — only runs if cycle fully complete |
| Report list page (`/reports`) | ✅ | |
| Report detail page (`/reports/[cycleId]`) | ✅ | |
| Multi-page PDF export | ✅ | `GET /api/reports/[cycleId]/pdf` provides downloadable report snapshot PDF |
| Report publish / share workflow | ⬜ | |

---

## Academic cycle management (operational UI)

| Feature | Status | Notes |
|---|---|---|
| Cycle CRUD API | ✅ | `/api/cycles` + `/api/cycles/[cycleId]` (create/edit/activate/complete) |
| Session plan management UI | ✅ | `/cycles/[cycleId]` supports create/status-update/delete with helper text, intelligent batch-based course/faculty filtering, auto-suggested Block/Session defaults, and in-page flow guidance from session planning to teams/assignments/role-mapping/grades |
| Team generation | ✅ | `/cycles/[cycleId]/teams` + `POST /api/cycles/[cycleId]/teams` — ÷3-snap algorithm matching reference platform (`computeK` + `snapKToMultipleOf3` + `buildTeamChunks`); team count must be divisible by 3 for role rotation; sizes 4 or 5 only; atomically auto-creates one assignment per team in the same DB transaction; returns pairings preview table (block/session × P/TR/FP); deep-link preselection from session rows via server-side query handoff |
| Assignment generation | ✅ | `/cycles/[cycleId]/assignments` + `POST /api/cycles/[cycleId]/assignments` — assignments auto-created atomically at team generation time (one per team); explicit Regenerate from Teams available for reset; deep-link preselection from session rows via server-side query handoff |
| Session role mapping | ✅ | `/cycles/[cycleId]/sessions/[sessionId]/role-mapping` + `POST /api/cycles/[cycleId]/sessions/[sessionId]/role-mappings` — reference `pairIdx = (blockIndex−1)×3 + (sessionIndex−1)` formula; assigns 3 separate teams per session (one per role: Presenter / Tech Reviewer / Feedback Strategist); student representative cycles through team members by block |
| Grade entry UI (per role: Presenter / Reviewer / Strategist) | ✅ | `/cycles/[cycleId]/sessions/[sessionId]/grades` — server-side auth guard (ADMIN/HOD/PRINCIPAL/FACULTY only); rubric-based role scoring (0-5 per dimension), rubric-dimension tooltips, and per-student progress indicators |
| Grade finalization and lock workflow | ✅ | Role-wise finalize endpoint; session auto-locks when all three roles are finalized for all students |
| Batch and student management | ✅ | `/batches`, `/batches/[batchId]` with secured CRUD APIs for batches/students |

---

## Dashboards and role homepages

| Role | Status | Notes |
|---|---|---|
| Admin dashboard | ✅ | `/dashboard` role-aware metrics and quick actions |
| Principal dashboard | ✅ | Principal role introduced in schema with dedicated dashboard section for institution-level oversight |
| HoD dashboard | ✅ | `/dashboard` role-aware metrics and quick actions |
| Faculty dashboard | ✅ | `/dashboard` role-aware quick actions and operational summary |
| Student (Viewer) dashboard | ✅ | `/dashboard` authenticated summary view |
| Alumni dashboard | ✅ | `/dashboard` authenticated summary + mentor workflows |

---

## Architecture and documentation

| Document | Status |
|---|---|
| `docs/architecture.md` — route map, role matrix, UX direction | ✅ |
| `docs/sam-student-progress-report-requirements.md` | ✅ |
| `docs/syllabus/*.md` — all 8 departments | ✅ |
| `docs/implementation-status.md` — this file | ✅ |
| GitHub Actions CI workflow (lint + build on push/PR) | ✅ | `.github/workflows/ci.yml` |
| `main` branch protection (PRs + required CI + no direct pushes) | ✅ | Enforced via GitHub branch protection rules |
| Root `README.md` — setup and access guide | ✅ |
| Deployment container baseline | ✅ | `apps/web/Dockerfile` + `.dockerignore` |

---

## Milestone summary

| Milestone | Status |
|---|---|
| M1 — Repo + scaffold + schema + migrations | ✅ Done |
| M2 — Reference data extraction (syllabuses + seed) | ✅ Done |
| M3 — Report gate + basic report UI | ✅ Done |
| M4 — Alumni role + mentor directory | ✅ Done |
| M5 — Registration intake + admin review flow | ✅ Done |
| M6 — Session-based auth + middleware route protection | ✅ Done |
| M7 — Academic cycle management UI | ✅ Done (Cycle CRUD + Session plan CRUD + Batch/Student + Team/Assignment generation + Session role mapping) |
| CI/CD — Lint + type-check + build on every push | ✅ Done |
| M8 — Grade entry and finalization UI | ✅ Done |
| M9 — Role-specific dashboards | ✅ Done (role-aware shared dashboard baseline) |
| M10 — PDF report export | ✅ Done (cycle snapshot PDF download endpoint) |
| M11 — Production deployment | ✅ Done (container build/run baseline) |
