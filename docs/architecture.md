# SAM Web App Architecture

## Stack
- Next.js (App Router)
- PostgreSQL
- Prisma ORM
- Tailwind CSS

## Core Goal
Rebuild the SAM legacy single-file web app into a modular, maintainable platform while preserving behavior parity.

## Key Workflow Rule
Report generation is the final step and is enabled only after all sessions in a cycle are completed.

## Route Map
- /login
- /dashboard
- /cycles
- /cycles/[cycleId]
- /departments
- /departments/[deptId]
- /batches
- /batches/[batchId]
- /faculty
- /courses
- /sessions
- /sessions/[sessionId]
- /grades
- /grades/[sessionId]
- /reports
- /reports/[cycleId]
- /admin

## Report Gate Predicate
For cycle C:
- SessionPlan count where cycleId=C and status != COMPLETED must be 0
- SessionPlan count where cycleId=C must be > 0
- AcademicCycle.status must be COMPLETED

If predicate fails, report route must show blocked state with:
- total sessions
- completed sessions
- remaining sessions
- links to pending sessions

## Domain Entities
- User
- RoleAssignment
- Department
- Faculty
- Batch
- Course
- Rubric
- RubricOverride
- AcademicCycle
- SessionPlan
- SessionRecord
- GradeRecord
- ReportSnapshot
- AuditLog

## API Surface (Initial)
- GET /api/cycles
- POST /api/cycles
- GET /api/cycles/[cycleId]
- PATCH /api/cycles/[cycleId]
- GET /api/sessions?cycleId=...
- PATCH /api/sessions/[sessionId]/status
- GET /api/grades?sessionId=...
- POST /api/grades/[sessionId]/save
- POST /api/grades/[sessionId]/finalize
- GET /api/reports/[cycleId]
- POST /api/reports/[cycleId]/generate
- GET /api/export/[cycleId]/csv
- GET /api/export/[cycleId]/json

## Invariants
- Report generation endpoint rejects if cycle completion predicate fails.
- Export endpoints require a generated ReportSnapshot.
- Grade/cycle finalization events write AuditLog entries.

## Notes
This architecture is the baseline for pilot implementation and should be revised only via explicit architecture decisions.