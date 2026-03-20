---
name: deployment-strategy
description: "Use when planning deployment topology, preview environments, rollout method, post-deploy verification, and incident rollback for SAM."
---

# Deployment Strategy

## Purpose
Define how changes move safely from pull request to production.

## Use When
- Choosing rollout style (blue/green, canary, rolling)
- Configuring preview environments for PRs
- Defining release verification and rollback criteria

## Strategy Checklist
- Per-PR preview deployment
- Environment-specific configuration management
- Database migration compatibility and backout plan
- Smoke tests after deployment
- Monitoring, alerts, and error budget thresholds

## Rules
- Prefer progressive rollout for high-risk changes.
- Validate critical user journeys immediately post-deploy.
- Automate rollback triggers where safe and possible.
- Keep deployment docs aligned with actual workflow files.
