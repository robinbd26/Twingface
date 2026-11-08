# SDD ledger — plan: docs/superpowers/plans/2026-10-09-phase-3-authentication.md

Pre-flight: workspace is not a Git repository, so tasks run in place without commit ranges.
Pre-flight: Task 1 produces schemas consumed by Tasks 4 and 5; names and contracts match the plan.
Pre-flight: Task 2 produces token/password helpers consumed by Task 3; names and contracts match the plan.
Pre-flight: Task 3 produces session lifecycle helpers consumed by Tasks 4 and 5; names and contracts match the plan.
Task 1: Ruling: use `npm.cmd` rather than `npm` on this Windows host — PowerShell blocks npm.ps1 by execution policy — cost if wrong: commands need the .cmd shim.
Task 1: Ruling: use `prisma generate --no-engine` — existing `next start` and stale Prisma migration processes lock the Windows query engine binary; the engine-less client generation completed — cost if wrong: query runtime must use the existing engine/processes must be stopped before standard regeneration.
