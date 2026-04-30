---
# opencode-workflow-mu9x
title: Command patch system
status: todo
type: feature
priority: high
created_at: 2026-04-30T13:11:29Z
updated_at: 2026-04-30T13:18:29Z
---

# Spec: Command Patch System

## Objective

Enable patching of upstream slash commands (sourced from the `agent-skills` submodule) without modifying the submodule itself.

**Problem:** Commands in `dist/commands/` are copied verbatim from `agent-skills/.claude/commands/` by the tsdown build. There is no mechanism to customize them locally. Editing the submodule directly is not appropriate, and hand-editing `dist/` is overwritten on each build.

**Solution:** A patch-file system. Developers place structured patch files in `src/command-patches/`. At build time, these patches are merged onto the upstream command content before writing to `dist/commands/`. Upstream is always the base; local patches are applied on top.

**Users:** Developers maintaining this package who need to extend, adjust, or prepend/append content to upstream commands as part of this workflow plugin.

**Success looks like:**

- Running `pnpm start` (tsdown build) produces `dist/commands/` files that are the upstream commands with patches applied
- A patch for `spec.md` that appends a line produces the expected merged output
- When the submodule is updated, patches continue to apply cleanly (or fail with a clear error if context is gone)
- No changes needed to the submodule or to `dist/` by hand

---

## Tech Stack

- **Language:** TypeScript (ESM, Node 22+)
- **Build tool:** tsdown with a custom plugin
- **Test runner:** Node built-in test runner (`node --test`)
- **Formatter/Linter:** oxfmt / oxlint

---

## Commands

```
Build:    pnpm start          # runs tsdown, applies patches, outputs dist/
Test:     pnpm test           # node --test (runs src/commands.test.ts and new patch tests)
Lint:     pnpm lint           # oxlint
Lint fix: pnpm lint:fix       # oxlint --fix
Format:   pnpm fmt            # oxfmt
```

---

## Project Structure

```
src/
  commands.ts              # Existing: loads commands at runtime from dist/commands/
  commands.test.ts         # Existing: tests for loadCommand / loadCommands
  main.ts                  # Existing: plugin entry point
  prompt-patch.md          # Existing: system prompt patch
  command-patches/         # NEW: patch files (one per upstream command to patch)
    spec.md                # Example: patch for spec.md command
    build.md               # Example: patch for build.md command
    ...
  patch.ts                 # NEW: patch apply logic (pure function, testable)
  patch.test.ts            # NEW: unit tests for patch logic
tsdown.config.ts           # UPDATED: custom plugin to apply patches during build
dist/
  commands/                # OUTPUT: merged upstream + patches (do not edit by hand)
agent-skills/
  .claude/commands/        # Upstream source (read-only submodule)
```

---

## Patch File Format

Patch files live in `src/command-patches/<command-name>.md` and use YAML front-matter + an optional body section.

```markdown
---
# All fields are optional. Only specified fields are changed.
description: "Overridden description" # replaces the upstream description
prepend: |
  Some text added before the upstream body.

append: |
  Some text added after the upstream body.
---

<!-- If a body section is present below the front-matter, it FULLY REPLACES the upstream body. -->
<!-- Leave empty (no content below ---) to only use prepend/append/description. -->
```

**Merge rules (applied in order):**

1. Start with upstream file content (front-matter + body)
2. If patch `description` is set → replace upstream `description` field
3. If patch has `prepend` → insert before upstream body
4. If patch body (below `---`) is non-empty → fully replace upstream body (prepend/append still apply after)
5. If patch has `append` → insert after body

This means `prepend` + `append` are additive (safe for submodule upgrades), while a full body replacement is a hard override.

---

## Code Style

Follow existing patterns in `src/commands.ts`:

```typescript
// Pure functions, explicit types, no default exports
export function applyPatch(upstream: string, patch: string): string {
  // ...
}

// Named exports only
export type PatchFrontmatter = {
  description?: string;
  prepend?: string;
  append?: string;
};
```

- All new logic in `src/patch.ts` as pure, synchronous functions (no FS I/O — that stays in the tsdown plugin)
- The tsdown plugin in `tsdown.config.ts` handles FS orchestration and calls `applyPatch`
- No magic; all transformations are explicit and auditable

---

## Testing Strategy

**Framework:** Node built-in test runner (`node --test`)

**Test locations:**

- `src/patch.test.ts` — unit tests for `applyPatch` and `parsePatchFrontmatter`
- `src/commands.test.ts` — existing tests remain unchanged

**Coverage expectations:**

- All patch merge rules covered by unit tests (description override, prepend, append, body replace, combinations)
- Edge cases: no patch file exists (upstream passes through unchanged), empty patch body, patch with only `append`

**No integration tests against the filesystem** — the build is the integration test; run `pnpm start` and inspect `dist/commands/`.

---

## Boundaries

**Always:**

- Run `pnpm test` before committing patch logic changes
- Keep `src/patch.ts` pure (no FS calls) so it is easily testable
- Commit patch files (`src/command-patches/`) alongside code changes

**Ask first:**

- Adding new npm dependencies
- Changing the patch file format schema (breaking change for existing patches)
- Fully replacing an upstream body rather than using prepend/append (prefer additive patches)

**Never:**

- Edit files in `agent-skills/` (the submodule)
- Edit `dist/commands/` by hand
- Silently drop upstream content — if a patch cannot be applied, the build must fail with a clear error

---

## Success Criteria

1. `pnpm start` succeeds and `dist/commands/spec.md` reflects a patch applied on top of the upstream content
2. `pnpm test` passes, including new unit tests for all merge rules
3. A patch file with only `append` leaves the upstream description and body intact and adds the appended text at the end
4. Removing a patch file causes the upstream command to pass through to `dist/` unchanged (no regression)
5. No changes required to `agent-skills/`, `src/commands.ts`, or `src/main.ts`

---

## Open Questions

1. **Error handling on patch apply failure** — Should the build warn and continue (with upstream as fallback) or fail hard? _(Recommendation: fail hard — silent fallback hides mistakes.)_
2. **Should `src/command-patches/` support adding brand-new commands not in upstream?** _(Currently out of scope — this spec only covers patching existing ones. New commands can go directly in a separate `src/commands/` directory if needed later.)_

---

# Implementation Plan

## Overview

Build the command patch system in three vertical slices: first the pure logic layer with tests, then the build integration, then the example patch that proves the end-to-end path.

## Dependency Graph

```
src/patch.ts (pure functions: parsePatchFrontmatter, applyPatch)
    │
    ├── src/patch.test.ts (unit tests for all merge rules)
    │
    └── tsdown.config.ts (plugin reads FS, calls applyPatch, writes dist/commands/)
            │
            └── src/command-patches/*.md (patch files consumed at build time)
```

Implementation order: patch logic → tests → build plugin → example patch → end-to-end verification.

---

## Phase 1: Core Patch Logic

### Task 1: Implement `src/patch.ts` — pure patch functions

**Description:** Create `src/patch.ts` with two exported pure functions: `parsePatchFrontmatter` (parses YAML front-matter from a patch file string) and `applyPatch` (applies a parsed patch to an upstream command string). No FS calls. No side effects.

**Acceptance criteria:**

- [ ] `parsePatchFrontmatter(patchContent)` returns `{ description?, prepend?, append? }` and the body below `---`
- [ ] `applyPatch(upstream, patch)` applies merge rules in order: description override → prepend → body replace (if patch body non-empty) → append
- [ ] Returns upstream unchanged when patch is an empty string or has no fields set
- [ ] Named exports only; no default export; explicit TypeScript types (`PatchFrontmatter`)

**Verification:**

- [ ] `pnpm test` passes (tests written in Task 2 cover this)
- [ ] `pnpm lint` clean
- [ ] `pnpm fmt` clean

**Dependencies:** None

**Files touched:**

- `src/patch.ts` (new)

**Estimated scope:** S

---

### Task 2: Write unit tests in `src/patch.test.ts`

**Description:** Cover every merge rule and edge case for `applyPatch` and `parsePatchFrontmatter` using the Node built-in test runner.

**Acceptance criteria:**

- [ ] Description override: patch `description` replaces upstream description
- [ ] Prepend only: upstream description and body unchanged; text prepended before body
- [ ] Append only: upstream description and body unchanged; text appended after body
- [ ] Body replace: patch body fully replaces upstream body; prepend/append still apply
- [ ] All three fields set together (description + prepend + body replace + append): correct merged output
- [ ] Empty patch (no front-matter fields, no body): upstream returned unchanged
- [ ] No patch file case handled (caller responsibility — tested via "upstream pass-through" assertion)

**Verification:**

- [ ] `pnpm test` exits 0 with all assertions passing
- [ ] No skipped or pending tests

**Dependencies:** Task 1

**Files touched:**

- `src/patch.test.ts` (new)

**Estimated scope:** S

### Checkpoint: Phase 1

- [ ] `pnpm test` passes (all tests green)
- [ ] `pnpm lint` clean
- [ ] `pnpm fmt` clean
- [ ] Human review of `src/patch.ts` API surface before proceeding

---

## Phase 2: Build Integration

### Task 3: Add patch plugin to `tsdown.config.ts`

**Description:** Extend `tsdown.config.ts` with a custom plugin that, after the `copy` step copies upstream commands to `dist/commands/`, reads any matching file from `src/command-patches/`, calls `applyPatch`, and writes the merged result back to `dist/commands/`. If a patch file exists but `applyPatch` throws, the build must fail hard (no silent fallback).

**Acceptance criteria:**

- [ ] Plugin runs after upstream commands are copied
- [ ] For each file in `dist/commands/*.md`, if `src/command-patches/<name>.md` exists, the merged output is written to `dist/commands/<name>.md`
- [ ] If no patch file exists for a command, the upstream file is left unchanged
- [ ] Build fails with a clear error message if patch application throws
- [ ] No changes to `src/commands.ts`, `src/main.ts`, or the `agent-skills/` submodule

**Verification:**

- [ ] `pnpm start` succeeds with no patches present (regression test)
- [ ] `pnpm start` with a minimal test patch produces merged output in `dist/commands/`
- [ ] `pnpm lint` clean

**Dependencies:** Task 1 (uses `applyPatch`)

**Files touched:**

- `tsdown.config.ts` (updated)

**Estimated scope:** S–M

---

### Task 4: Add example patch `src/command-patches/spec.md`

**Description:** Create a real patch for `spec.md` using only `append` (additive, safe for submodule upgrades). This exercises the full pipeline and serves as the canonical example for future patch authors.

**Acceptance criteria:**

- [ ] `src/command-patches/spec.md` uses YAML front-matter with only `append` set
- [ ] `pnpm start` produces `dist/commands/spec.md` that contains the upstream content with the appended text at the end
- [ ] Upstream description and body are intact in the output
- [ ] File is committed alongside the code changes

**Verification:**

- [ ] `pnpm start` exits 0
- [ ] `diff` or manual inspection confirms `dist/commands/spec.md` = upstream + appended content
- [ ] `pnpm test` still passes (no regressions)

**Dependencies:** Task 3

**Files touched:**

- `src/command-patches/spec.md` (new)

**Estimated scope:** XS

### Checkpoint: Phase 2

- [ ] `pnpm start` succeeds end-to-end
- [ ] `pnpm test` passes
- [ ] `dist/commands/spec.md` visually correct (upstream + patch)
- [ ] Human review of plugin code and example patch before final commit

---

## Phase 3: Polish and Verification

### Task 5: Final acceptance run

**Description:** Verify all five spec success criteria are met. Remove any temp/debug artifacts. Ensure `src/command-patches/` is committed.

**Acceptance criteria:**

- [ ] SC1: `pnpm start` succeeds; `dist/commands/spec.md` reflects the applied patch
- [ ] SC2: `pnpm test` passes including all new unit tests
- [ ] SC3: A patch with only `append` leaves upstream description and body intact
- [ ] SC4: Removing `src/command-patches/spec.md` and running `pnpm start` produces unpatched `dist/commands/spec.md`
- [ ] SC5: No changes to `agent-skills/`, `src/commands.ts`, or `src/main.ts`

**Verification:**

- [ ] All five success criteria checked manually
- [ ] `pnpm lint` + `pnpm fmt` clean

**Dependencies:** Tasks 1–4

**Files touched:** none (verification only)

**Estimated scope:** XS

### Checkpoint: Complete

- [ ] All acceptance criteria met
- [ ] All tests green
- [ ] Ready for review and commit

---

## Risks and Mitigations

| Risk                                                                          | Impact | Mitigation                                                                                        |
| ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| tsdown `copy` runs async; plugin hook timing unclear                          | High   | Verify plugin hook order in tsdown docs; use `buildEnd` or equivalent post-copy hook              |
| YAML parse of upstream front-matter differs from patch front-matter structure | Medium | Keep `parsePatchFrontmatter` focused only on patch files; upstream parsing stays in `commands.ts` |
| Submodule update breaks patch context (body replace)                          | Low    | Prefer `append`-only patches; document body-replace as an explicit risk                           |

## Open Questions (from spec)

1. **Error handling:** Spec recommends fail-hard. Plan adopts this — build throws on patch failure.
2. **New commands from patches:** Out of scope per spec. Not implemented.
