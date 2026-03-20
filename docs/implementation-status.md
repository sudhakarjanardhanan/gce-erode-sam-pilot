# SAM Pilot — Implementation Status

Last updated: 2026-03-19 (auth + CI added)
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
| apply migrations to live DB | ⬜ | Waiting for PostgreSQL instance at `localhost:5432` |

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

---

## Authentication and access control

| Feature | Status | Notes |
|---|---|---|
| Reviewer auth helper (`src/lib/auth/reviewerAuth.ts`) | ✅ | Bearer token + DB-backed role check |
| `GET /api/registration` protected (Admin/HoD only) | ✅ | |
| `PATCH /api/registration/[id]/review` protected (Admin only) | ✅ | |
| Full session-based auth (login / logout / JWT / sessions) | ✅ | Auth.js v5 credentials provider, JWT strategy |
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
| Multi-page PDF export | ⬜ | |
| Report publish / share workflow | ⬜ | |

---

## Academic cycle management (operational UI)

| Feature | Status | Notes |
|---|---|---|
| Cycle CRUD API | ⬜ | |
| Session plan management UI | ⬜ | |
| Grade entry UI (per role: Presenter / Reviewer / Strategist) | ⬜ | |
| Grade finalization and lock workflow | ⬜ | |
| Batch and student management | ⬜ | |

---

## Dashboards and role homepages

| Role | Status | Notes |
|---|---|---|
| Admin dashboard | ⬜ | |
| Principal dashboard | ⬜ | |
| HoD dashboard | ⬜ | |
| Faculty dashboard | ⬜ | |
| Student (Viewer) dashboard | ⬜ | |
| Alumni dashboard | ⬜ | |

---

## Architecture and documentation

| Document | Status |
|---|---|
| `docs/architecture.md` — route map, role matrix, UX direction | ✅ |
| `docs/sam-student-progress-report-requirements.md` | ✅ |
| `docs/syllabus/*.md` — all 8 departments | ✅ |
| `docs/implementation-status.md` — this file | ✅ |
| GitHub Actions CI workflow (lint + build on push/PR) | ✅ | `.github/workflows/ci.yml` |
| Root `README.md` — setup and access guide | ✅ |

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
| M7 — Academic cycle management UI | ⬜ |
| CI/CD — Lint + type-check + build on every push | ✅ Done |
| M8 — Grade entry and finalization UI | ⬜ |
| M9 — Role-specific dashboards | ⬜ |
| M10 — PDF report export | ⬜ |
| M11 — Production deployment | ⬜ |
