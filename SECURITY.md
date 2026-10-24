# Security Policy

## Supported Versions

Nova is actively maintained. Security patches are prioritized and released promptly.

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in Nova, please do **NOT** open a public issue. Instead, follow these steps:

1. **Email Vulnerability Report**: Send details to `security@nova-agents.org` or open a Private Security Advisory on GitHub.
2. **Include Details**:
   - Description of the vulnerability.
   - Steps to reproduce or proof-of-concept payload.
   - Potential impact on local memory or model context.
3. **Response Timeline**:
   - We will acknowledge receipt of your report within 48 hours.
   - We will provide an assessment and timeline for remediation within 5 business days.

## Local-First Security Guarantees

Nova is designed with local-first security principles:
- **Zero Involuntary Telemetry**: User prompts, memory items, and attachments never leave the user's device unless dispatched to configured model providers.
- **Client-Side Sanitization**: All inputs undergo HTML/script stripping to prevent DOM XSS.
- **Bounded Tool Access**: Model Context Protocol (MCP) tool execution requires user authorization before modifying local files.
