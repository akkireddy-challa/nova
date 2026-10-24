# Contributing to Nova

Thanks for helping out. Nova is small and early, so focused pull requests are the most useful. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

Requires [Bun](https://bun.sh) 1.2+ and Git.

```bash
git clone https://github.com/akkireddy-challa/nova.git
cd nova
bun install
cp .env.example .env   # configure at least one provider, or run Ollama
bun dev
```

## Checks

Run these before opening a PR. CI runs the same ones:

```bash
bun test          # unit tests
bun run lint      # ESLint
bun run build     # production build
```

## Branch workflow

1. Create a branch from `main` (for example `feat/brave-search` or `fix/ollama-timeout`).
2. Commit your work there and open a pull request into `main`.
3. `main` is protected. A PR can merge only after CI passes.

## Adding an LLM provider

1. Create `src/lib/providers/<name>.ts` that implements the `LLMProvider` interface from `src/lib/providers/types.ts`. You need `isConfigured`, `listModels`, `defaultModel`, `generate`, and optionally `stream`.
   - Read credentials from environment variables, and document them in `.env.example` and the README providers table.
   - Return `usage` only when the API actually reports token counts. Never estimate them.
   - Throw `ProviderError` on failure, and keep API keys and request URLs out of the message.
2. Add the id to `ProviderId` and register the provider in `src/lib/providers/index.ts`.
3. Add tests with a mocked `fetch`, so tests make no real network calls and need no API keys. Cover the configured and unconfigured cases, a successful response, and an error response.

## Adding a search provider

1. Add a module under `src/lib/research/` that takes a query and returns real results (title, URL, snippet) from the provider's API.
2. Gate it on its own API key env var, document the variable, and keep DuckDuckGo as the keyless fallback.
3. Add tests with a mocked `fetch`.

## Rule: no fake data

Don't show invented data as if it were real. That means no `Math.random()` metrics, no made-up telemetry, no scripted "thinking" steps, and no hardcoded fallback results or sources. If something isn't available, say so in the UI or return an error. PRs that add fake data won't be merged.

## Reporting issues

Use GitHub Issues for bugs and feature requests. For security vulnerabilities, see [SECURITY.md](SECURITY.md).
