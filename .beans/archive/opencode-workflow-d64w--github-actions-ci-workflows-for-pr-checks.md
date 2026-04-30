---
# opencode-workflow-d64w
title: GitHub Actions CI Workflows for PR Checks
status: completed
type: feature
priority: normal
created_at: 2026-04-30T11:26:45Z
updated_at: 2026-04-30T11:33:37Z
---

Add GitHub Actions workflows that automatically run on every pull request to enforce code quality and correctness before merging.

## Objective

Add a single `.github/workflows/ci.yml` file triggered on `pull_request` events. Target users are contributors opening PRs against this repository.

**Success looks like:** Every PR automatically runs build, tests, and lint/format checks. A failing check blocks merge.

## Tech Stack

- Runtime: Node.js 24.x
- Package manager: pnpm 10.33.2
- Build: tsdown
- Test: Node.js built-in test runner (`node --test`)
- Linter: oxlint
- Formatter: oxfmt
- CI platform: GitHub Actions

## Commands

```bash
Install:      pnpm install --frozen-lockfile
Build:        pnpm run start
Test:         pnpm test
Lint:         pnpm run lint
Format check: pnpm run fmt --check
```

## Workflow Design

One job with sequential steps:

1. Checkout code
2. Set up pnpm 10.33.2
3. Set up Node.js 24.x (with pnpm store cache)
4. Install dependencies (`--frozen-lockfile`)
5. Build (`pnpm run start`)
6. Test (`pnpm test`)
7. Lint (`pnpm run lint`)
8. Format check (`pnpm run fmt --check`)

## Boundaries

- **Always:** Use `--frozen-lockfile`, pin actions to `@v4`, cache pnpm store
- **Ask first:** Matrix builds, secrets/env vars, push-to-main trigger, deploy jobs
- **Never:** Commit secrets, use `continue-on-error: true`, skip lockfile check

## Success Criteria

- [x] `.github/workflows/ci.yml` exists and is valid YAML
- [x] Workflow triggers on `pull_request` events
- [x] All four checks run in order: build → test → lint → format
- [x] A failing test causes the job to fail
- [x] A lint violation causes the job to fail
- [x] A format violation causes the job to fail
- [x] `pnpm install` uses the lockfile and caches the store between runs

## Summary of Changes

- Created `.github/workflows/ci.yml` with a single `ci` job that sequentially runs: install, build, test, lint, format check.
- Actions pinned to `@v4` (actions/checkout, pnpm/action-setup, actions/setup-node).
- pnpm store cached via `setup-node` cache option; `--frozen-lockfile` enforced on install.
- Created `src/ci-workflow.test.ts` with 7 tests (TDD: RED → GREEN) validating workflow structure.
- All 8 tests pass; build succeeds.
