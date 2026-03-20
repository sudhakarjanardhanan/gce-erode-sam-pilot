---
name: data-model
description: "Use when defining entities, relationships, validation rules, and schema contracts for SAM web-app features."
---

# Data Model

## Purpose
Create consistent entity definitions used by frontend, backend, and tests.

## Core Entities
- Department
- Faculty
- Batch
- Course
- Cycle
- Session
- Assignment
- GradeRecord
- UserRole

## Use When
- Adding a new screen
- Designing API payloads
- Writing seed data or fixtures

## Output
- Entity fields and types
- Relationship map
- Required/optional constraints
- Validation rules

## Rules
- Use stable IDs for all entities.
- Keep date/time fields ISO 8601.
- Define enum values for statuses and roles.
- Document derived fields separately from stored fields.
