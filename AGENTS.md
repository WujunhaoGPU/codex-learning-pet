# Codex Learning Pet AGENTS.md

## Project Map

This repo builds a desktop learning companion for Codex issue-learning sessions.

Core files:

- `src/main.js`: Electron process, always-on-top window, app-server lifecycle.
- `src/appServerClient.js`: JSON-RPC stdio client for `codex app-server`.
- `src/reducer.js`: converts app-server events into learning state.
- `src/state.js`: local JSON persistence.
- `src/knowledge.js`: local markdown knowledge note persistence.
- `src/renderer/`: pet UI.
- `tests/reducer.test.js`: reducer behavior check.
- `scripts/smoke-app-server.js`: local app-server connectivity check.

## Rules

- Keep the pet as a display surface. Put learning logic in `src/reducer.js`.
- Persist state after every meaningful event.
- Do not add backend services until local app-server stdio is proven insufficient.
- Keep v1 focused on one current Codex thread; multi-thread dashboards are not v1.
- Do not commit `dist/`, `notes/`, `mockups/`, or local state.

## Verification

Run:

```bash
npm test
npm run doctor
```
