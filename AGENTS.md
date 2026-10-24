<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Workflow rules for all agents

- Work on the `dev` branch. Pull `dev` before starting and before every commit.
- Never push to `main`. It is protected: changes reach `main` only through a pull request from `dev` that passes CI.
- When a set of goals is done, open ONE pull request `dev` -> `main` summarizing what changed, how it was tested, and what is still fake or missing.
- Before every commit run `bun test`, `bun run lint`, and `bun run build`; all must pass. Do not relax lint rules or weaken tests to make them pass.
- Never show fake data as real: no `Math.random()` metrics, invented telemetry, scripted "agent thoughts", or hardcoded fallback results. Mock data belongs only in `tests/`.
- Never execute request-supplied code on the server.
- Do not add AI co-author trailers or "Generated with" lines to commits or pull requests.
- Log progress and open questions in `docs/team/STANDUP.md`.
