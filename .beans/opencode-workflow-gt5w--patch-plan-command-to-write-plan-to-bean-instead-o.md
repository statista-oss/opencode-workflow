---
# opencode-workflow-gt5w
title: Patch plan command to write plan to bean instead of tasks/plan.md
status: completed
type: task
priority: normal
created_at: 2026-04-30T13:52:42Z
updated_at: 2026-04-30T13:53:16Z
---

Create a command patch for the plan command that changes the behavior to add the detailed plan to the matching bean (using the beans CLI) instead of saving it as tasks/plan.md and tasks/todo.md.

## Summary of Changes\n\nCreated `src/command-patches/plan.md` with an `append` patch strategy — mirrors the spec patch approach. The patch appends a single instruction telling the agent to add the detailed plan to the matching bean via the beans CLI instead of saving to `tasks/plan.md` and `tasks/todo.md`.\n\nBuild confirms patch applied: `dist/commands/plan.md`. All 15 tests pass.
