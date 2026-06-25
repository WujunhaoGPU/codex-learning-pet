# Privacy

Codex Learning Pet is a local desktop app.

## Local Data

The app reads Codex thread data through the local `codex app-server` process.
It writes local state and knowledge notes under:

```text
~/Library/Application Support/Codex Learning Pet/
```

## Network

The app does not run its own backend, telemetry, analytics, or cloud sync.
Network behavior comes from Codex itself and any commands you run in Codex.

## Do Not Publish

Do not commit or publish:

- `notes/`
- `learning-state.json`
- `dist/`
- local screenshots containing private work
- Codex session files
