---
# opencode-workflow-mu9x
title: Command patch system
status: todo
type: feature
priority: high
created_at: 2026-04-30T13:11:29Z
updated_at: 2026-04-30T13:11:29Z
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
