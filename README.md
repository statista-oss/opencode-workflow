# opencode-workflow

An [OpenCode](https://opencode.ai) plugin that brings the [agent-skills](https://github.com/addyosmani/agent-skills) engineering workflow library into OpenCode's runtime.

## What it does

AI coding agents default to the shortest path — skipping specs, tests, and security reviews. This plugin enforces the structured workflows that production-quality engineering requires.

It packages 20 skills, 7 slash commands, 3 specialist agent personas, and 4 reference checklists directly into OpenCode, then injects a system prompt that maps every user intent to the right skill automatically.

```text
  DEFINE          PLAN           BUILD          VERIFY         REVIEW          SHIP
 ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐      ┌──────┐
 │ Idea │ ───▶ │ Spec │ ───▶ │ Code │ ───▶ │ Test │ ───▶ │  QA  │ ───▶ │  Go  │
 │Refine│      │  PRD │      │ Impl │      │Debug │      │ Gate │      │ Live │
 └──────┘      └──────┘      └──────┘      └──────┘      └──────┘      └──────┘
```

## How it works

The plugin registers three things with OpenCode:

1. **Skills directory** — 20 `SKILL.md` files, each a structured workflow with steps, verification gates, and anti-rationalization tables. OpenCode's `skill` tool loads them on demand.
2. **Slash commands** — 7 commands (`/spec`, `/plan`, `/build`, `/test`, `/review`, `/code-simplify`, `/ship`) that map to the development lifecycle.
3. **System prompt patch** — injects intent-to-skill mapping rules so skills activate automatically (e.g. designing an API triggers `api-and-interface-design`, building UI triggers `frontend-ui-engineering`).

## Skills

| Phase  | Skill                                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Define | `idea-refine`, `spec-driven-development`                                                                                                                           |
| Plan   | `planning-and-task-breakdown`                                                                                                                                      |
| Build  | `incremental-implementation`, `test-driven-development`, `context-engineering`, `source-driven-development`, `frontend-ui-engineering`, `api-and-interface-design` |
| Verify | `browser-testing-with-devtools`, `debugging-and-error-recovery`                                                                                                    |
| Review | `code-review-and-quality`, `code-simplification`, `security-and-hardening`, `performance-optimization`                                                             |
| Ship   | `git-workflow-and-versioning`, `ci-cd-and-automation`, `deprecation-and-migration`, `documentation-and-adrs`, `shipping-and-launch`                                |

## Agent Personas

Three specialist personas for targeted reviews, available as OpenCode subagents:

- **code-reviewer** — Senior Staff Engineer; five-axis code review
- **test-engineer** — QA Specialist; test strategy and coverage analysis
- **security-auditor** — Security Engineer; vulnerability detection and OWASP assessment

## Tech stack

- TypeScript, ESM, Node.js, pnpm
- [`@opencode-ai/plugin`](https://opencode.ai/docs) — plugin host API
- [`tsdown`](https://github.com/sxzz/tsdown) — bundler
- `oxlint` + `oxfmt` — linting and formatting
- `agent-skills` — git submodule

## Development

```bash
pnpm install       # install dependencies
pnpm start         # build (outputs to dist/)
pnpm test          # run tests
pnpm lint          # lint
pnpm fmt           # format
```

## License

MIT
