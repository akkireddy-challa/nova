# Security Policy

## Supported versions

Nova is pre-1.0. Only the latest commit on `main` receives fixes.

## Reporting a vulnerability

Please do **not** open a public issue. Instead, report it privately through [GitHub Security Advisories](https://github.com/akkireddy-challa/nova/security/advisories/new) and include:

- a description of the issue and its impact
- steps to reproduce or a proof of concept

This is a small volunteer project, so responses are best-effort. We'll acknowledge your report as soon as we can.

## Deployment notes

- Nova has no built-in authentication. Don't expose an instance publicly without your own auth layer or reverse proxy.
- API keys are read from server-side environment variables and never sent to the browser.
- Your prompts go to the search provider and the LLM provider you configure. If you use a local Ollama model, the LLM step stays on your machine, but web search still goes out to the internet.
