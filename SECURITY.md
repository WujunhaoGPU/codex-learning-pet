# Security

## Supported Versions

This project is an alpha local prototype. There are no supported release
branches yet.

## Reporting

Open a GitHub issue for security-relevant bugs that do not expose private data.
If a report includes private thread content, logs, or screenshots, do not post
them publicly.

## Scope

The app:

- spawns local `codex app-server`
- reads local Codex thread data
- writes local markdown notes
- opens local files through Electron

It does not provide authentication, authorization, a hosted backend, or remote
sync.
