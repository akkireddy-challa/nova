# Nova

You ask a question, Nova searches the web, and the LLM you choose (Gemini, Claude, OpenAI-compatible, or local Ollama) writes a cited answer rendered as interactive visual cards.

![Nova screenshot](docs/screenshot.png)
<sub>Placeholder: `docs/screenshot.png` has not been added yet.</sub>

## Why Nova

- **Self-hosted.** It's a single Next.js app. You run it on your laptop or server, and your questions go only to the search provider and the LLM you configure.
- **Bring your own model.** Use your Gemini, Anthropic or OpenAI key, any OpenAI-compatible endpoint (OpenRouter, Groq, ...), or a local model through Ollama with no API key at all.
- **Answers as cited cards.** Instead of a plain wall of text, answers come back as cards: a research report with sources, a comparison matrix, a step-by-step plan, a chart, code, or a debate. Cards are built only from validated LLM output and the pages that were actually fetched.

Nova is early software. Expect rough edges, breaking changes, and features that are still being wired up.

## Quick start

Requires [Bun](https://bun.sh) 1.2+.

```bash
bun install
cp .env.example .env   # then set at least one provider (or run Ollama locally)
bun dev
```

Open http://localhost:3000. If no provider is configured, the UI shows setup instructions instead of answering.

### Docker

```bash
cp .env.example .env   # set at least one provider
docker compose up --build
```

To run a local model with no API key, use the bundled Ollama service:

```bash
# in .env: OLLAMA_BASE_URL=http://ollama:11434
docker compose --profile local up --build
docker compose exec ollama ollama pull llama3.2   # any model you like
```

## LLM providers

Configure one or more in `.env`. Only configured providers show up in the model picker and in `/api/v1/models`. Model ids use the form `provider:model`, for example `anthropic:claude-sonnet-5-5`.

| Provider | Required | Optional |
|---|---|---|
| Google Gemini | `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) | `GEMINI_MODEL` |
| Anthropic Claude | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`) |
| OpenAI / OpenAI-compatible | `OPENAI_API_KEY` | `OPENAI_BASE_URL` (for OpenRouter, Groq, etc.), `OPENAI_MODEL` |
| Ollama (local) | Ollama running at `OLLAMA_BASE_URL` (default `http://localhost:11434`) | `OLLAMA_MODEL` |

Ollama only counts as configured when the server is reachable.

## Search providers

| Provider | Setup |
|---|---|
| DuckDuckGo (HTML) | Default, no key needed. Often blocks automated requests; add a Tavily or Brave key for reliable search |
| Tavily | `TAVILY_API_KEY` |
| Brave Search | `BRAVE_API_KEY` |

## OpenAI-compatible API

Nova exposes a small OpenAI-style API, so you can point existing tools and SDKs at it.

- `GET /api/v1/models` lists the models of your configured providers (an empty `data` array when none are configured).
- `POST /api/v1/chat/completions` handles chat completions.

```bash
curl http://localhost:3000/api/v1/models

curl http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "ollama:llama3.2",
    "messages": [{"role": "user", "content": "What is retrieval-augmented generation?"}]
  }'
```

The app UI itself uses `POST /api/agent`. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Limitations

- No authentication. Don't expose an instance to the internet without putting it behind your own auth or proxy.
- Answer quality depends on the model you pick and on what the search provider returns. Small local models often fail schema validation more than hosted ones do.
- DuckDuckGo HTML search is unofficial and can be rate-limited or change without notice. Use Tavily or Brave if you need it to be reliable.
- Some pages block fetching or need JavaScript, so their content can't be used as a source.
- There's no persistent storage or memory across sessions yet.

## Roadmap

- Streaming answers in the UI
- Better source extraction and citation highlighting
- Saved and shareable research sessions
- More search providers
- Real screenshots and a hosted demo

Have an idea? Open an issue.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: see [SECURITY.md](SECURITY.md).

## License

MIT
