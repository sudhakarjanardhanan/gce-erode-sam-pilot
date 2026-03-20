---
name: analytics-reporting
description: "Use when defining KPIs, aggregation logic, trend analysis, and dashboard/report data contracts for SAM grade and progress views."
---

# Analytics Reporting

## Purpose
Standardize metric definitions and reporting logic across dashboards.

## Use When
- Building or changing dashboard cards/charts
- Defining cumulative and cycle-based trends
- Debugging metric mismatches between pages

## Required Definitions
- Metric name and formula
- Grain (student, batch, dept, institution)
- Time window and cycle boundaries
- Inclusion/exclusion rules
- Rounding and display policy

## Rules
- Keep metric formulas versioned and documented.
- Use shared aggregation utilities to avoid drift.
- Validate dashboard totals against source records.
- Flag stale or incomplete data in UI.
