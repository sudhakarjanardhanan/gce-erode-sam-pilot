---
name: audit-compliance-logging
description: "Use when defining audit trails, compliance events, and operational logging for sensitive SAM actions such as resets, clears, and admin workflows."
---

# Audit Compliance Logging

## Purpose
Capture reliable audit records for sensitive operations and policy enforcement.

## Use When
- Implementing admin reset/clear/wipe flows
- Adding traceability for grade and workflow changes
- Preparing compliance or incident review capability

## Audit Event Schema
- Actor identity and role
- Action type and target scope
- Before/after summary
- Timestamp and request correlation id
- Outcome (success, denied, failed) and reason

## Rules
- Treat destructive operations as mandatory audit events.
- Make logs tamper-evident and retention-aware.
- Exclude secrets and sensitive PII from log payloads.
- Provide searchable filters for incident investigation.
