# Sprint 2 Contracts

Shared interfaces for the parallel Sprint 2 work. Code to these so areas integrate without coordination.

## Provider layer (`src/lib/providers/`)

Types live in `src/lib/providers/types.ts` (already written; do not change without noting it in STANDUP.md).

`src/lib/providers/index.ts` exports:

```ts
getProvider(id: ProviderId): LLMProvider
getConfiguredProviders(): Promise<LLMProvider[]>
listAvailableModels(): Promise<AvailableModel[]>          // only configured providers; [] when none
parseModelId(id: string): ModelSelection | null            // "anthropic:claude-sonnet-5-5" -> {provider, model}
resolveModel(id?: string): Promise<ModelSelection>        // id or first available default; throws NoProviderConfiguredError
generate(selection: ModelSelection, request: Omit<LLMRequest, 'model'>): Promise<LLMResult>
```

Environment variables:

| Variable                               | Purpose                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) | Gemini                                                             |
| `GEMINI_MODEL`                         | Optional default Gemini model                                      |
| `ANTHROPIC_API_KEY`                    | Claude                                                             |
| `ANTHROPIC_MODEL`                      | Optional, default `claude-sonnet-5-5`                              |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL`    | OpenAI or any OpenAI-compatible API (OpenRouter, Groq, ...)        |
| `OPENAI_MODEL`                         | Optional default model                                             |
| `OLLAMA_BASE_URL`                      | Default `http://localhost:11434`; configured only if reachable     |
| `OLLAMA_MODEL`                         | Optional default local model                                       |
| `TAVILY_API_KEY`, `BRAVE_API_KEY`      | Optional search providers; DuckDuckGo HTML is the keyless fallback |

## HTTP API

### `GET /api/v1/models`

```json
{
  "object": "list",
  "data": [
    {
      "id": "anthropic:claude-sonnet-5-5",
      "object": "model",
      "provider": "anthropic",
      "model": "claude-sonnet-5-5",
      "owned_by": "Anthropic",
      "is_default": true
    }
  ]
}
```

`data` is empty when nothing is configured. The UI uses that to show onboarding.

### `POST /api/agent`

Request: `{ prompt, mode, model?, attachments?, thinkingBudget?, context? }` where `model` is a `"provider:model"` id (omitted = first available default).

Success (200): the existing `GatewayResponse` shape from `src/lib/ai-gateway.ts`:

- `content`: string
- `artifact?`: `GenerativeArtifact` (from `src/lib/types.ts`), built only from validated LLM output and real sources
- `thoughts`: `AgentThought[]`. **Only steps that actually happened**, e.g. `{agentName: "Web search", action: "Found 6 results via DuckDuckGo", status: "success"}`, `{agentName: "LLM", action: "anthropic:claude-sonnet-5-5 responded in 2.1s", ...}`
- `provider`: `ProviderId`
- `telemetry`: real `latencyMs`, `model`; `tokenCount`/`tokensPerSec` from provider usage, or `0` when the provider did not report usage

Errors: `{ "error": string, "code": "NO_PROVIDER" | "PROVIDER_ERROR" | "INVALID_OUTPUT" | "BAD_REQUEST" }`
with status 503 / 502 / 502 / 400 respectively. Messages must not contain API keys or request URLs.

## Rules for every Sprint 2 agent

- Edit only the files your brief lists. Other agents are editing other files in the same working tree at the same time.
- Do not run `bun add` / `bun install` (deps `zod` and `@anthropic-ai/sdk` are installed). Do not run `bun run build`, `git commit`, `git stash`, `git checkout`, or `git reset`.
- Run `npx tsc --noEmit -p .`, `bun test <your test files>`, and `npx eslint <your files>`. Fix errors in your files; ignore errors that come only from other agents' files.
- No fake data shown as real (no `Math.random()` metrics, invented telemetry, scripted thoughts, hardcoded fallback results).
