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
- The Docker image runs on a distroless Node base (no shell, no npm) as a non-root user. CI fails if the image has a fixable critical or high vulnerability (Trivy) or a dependency has a known advisory (`bun audit`). Remaining low/medium findings are in core Debian libraries with no upstream fix yet; rebuild the image to pick up fixes as Debian publishes them.

## Dependency Vulnerability Audits & Upstream Tracking

### GHSA-wrw7-89jp-8q8g (glib::VariantStrIter)

- **Advisory:** GHSA-wrw7-89jp-8q8g / RustSec-Unsoundness in `glib::VariantStrIter`
- **Component:** `src-tauri/Cargo.lock` (transitive via `tauri` -> `wry` -> `webkit2gtk` -> `glib 0.18.5`)
- **Impact Assessment:** Non-exploitable / False positive for Nova end users:
  1. **Platform Scope:** `webkit2gtk` and `glib` are compiled solely on Linux GTK environments. On macOS, Tauri relies on native WebKit/WKWebView (`objc2`), and on Windows it uses Edge WebView2 (`webview2-com`).
  2. **Uninvoked Path:** Nova's desktop layer does not use DBus/GVariant string iteration (`VariantStrIter`).
  3. **Upstream Resolution:** `glib 0.20.0` introduces breaking changes requiring an ecosystem-wide update across `gtk-rs`, `webkit2gtk`, and `wry`. Nova will bump the desktop lockfile once upstream Tauri releases an updated `tauri-runtime-wry` crate.
