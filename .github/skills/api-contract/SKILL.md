---
name: api-contract
description: "Use when defining endpoint contracts, request and response shapes, validation, pagination, and error handling for SAM services."
---

# API Contract

## Purpose
Keep frontend and backend integration predictable through explicit, versioned contracts.

## Use When
- Creating new endpoint specs
- Updating payload fields
- Investigating integration bugs

## Contract Checklist
- Method and path
- Auth and role requirements
- Request schema
- Response schema
- Error schema
- Pagination/filter/sort semantics
- Versioning notes

## Rules
- Keep error shape consistent across endpoints.
- Use server-side validation with clear messages.
- Avoid breaking changes without version bumps.
- Document nullability and default values explicitly.
