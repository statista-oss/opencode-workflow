---
# opencode-workflow-rdud
title: Patch spec command to write spec to bean instead of SPEC.md
status: completed
type: task
priority: normal
created_at: 2026-04-30T13:39:52Z
updated_at: 2026-04-30T13:41:20Z
---

Create a command patch for the spec command that changes the behavior to write the spec body into a bean (using the beans CLI) instead of saving it as SPEC.md in the project root.

## Summary of Changes\n\nUpdated `src/command-patches/spec.md` to use a body-replacement patch strategy. The patch replaces the entire upstream body, changing the line that instructed saving a SPEC.md file to instead write the spec into a bean via the beans CLI. The patched `/spec` command now:\n- Checks for an existing bean before creating a new one\n- Appends the spec content to the bean body using `beans update --body-append`\n- Confirms with the user which bean was updated\n\nBuild and all 15 tests pass.
