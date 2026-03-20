# SAM Web App Architecture

## Stack
- Next.js (App Router)
- PostgreSQL
- Prisma ORM
- Tailwind CSS

## Primary User Groups
- Faculty
- Head of Department (HoD)
- Principal / Admin
- Students (born approximately 2004-2009 in current cohorts)
- Alumni (new role for mentor directory and future mentoring workflows)

## Core Goal
Rebuild the SAM legacy single-file web app into a modular, maintainable platform while preserving behavior parity.

## UX and Interaction Direction
- Highly professional look and feel suitable for engineering college operations.
- Role-first, intuitive screens with reduced click depth for common workflows.
- Desktop-first optimization for Faculty, HoD, and Principal operational tasks.
- Mobile-friendly student views for assignment visibility and grade report viewing.
- Use the legacy reference HTML only as functional behavior source; visual style does not need parity.

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
- /mentors
- /mentors/alumni
- /admin

## Role Matrix (Current and Planned)
- Admin: full institution configuration, cycle governance, report publishing, high-risk operations.
- Principal: institution-wide dashboards and cross-department reporting.
- HoD: department-level monitoring, faculty/batch/course oversight, report readiness tracking.
- Faculty: operational workflows (teams, schedule, grading, report generation where allowed).
- Student: read-focused access to assignments and personal reports, mobile-priority consumption.
- Alumni (planned): mentor profile visibility and future mentor engagement workflows.

## Navigation and Click Efficiency Rules
- Role-based default landing after login:
	- Admin/Principal -> institution dashboard
	- HoD -> department dashboard
	- Faculty -> active cycle workbench
	- Student -> my assignments and my reports
	- Alumni -> mentor profile and mentor directory context
- Keep critical operations within 1-2 transitions from landing page.
- Avoid deep nested navigation for daily faculty tasks.

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
- AlumniMentor
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
- GET /api/mentors/alumni
- GET /api/mentors/alumni/[mentorId]

## Mentor Directory Requirement (New)
- Students and Faculty must be able to view the alumni mentor list.
- Mentor list is read-first in initial phase (search/filter/profile view).
- Include this in Phase 1.5 even if mentor interaction features are deferred.

## Invariants
- Report generation endpoint rejects if cycle completion predicate fails.
- Export endpoints require a generated ReportSnapshot.
- Grade/cycle finalization events write AuditLog entries.

## Notes
This architecture is the baseline for pilot implementation and should be revised only via explicit architecture decisions.