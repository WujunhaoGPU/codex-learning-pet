# Architecture

## System

Codex Learning Pet is a local desktop client that watches a Codex thread and
keeps one always-on-top learning panel visible.

## Data Flow

```text
codex app-server
  -> AppServerClient
  -> reducer
  -> local state / notes
  -> Electron BrowserWindow
```

## Module Boundaries

- `appServerClient` owns process spawning, JSON-RPC ids, and notifications.
- `reducer` owns status, route progress, current step, next step, and knowledge-capture state.
- `state` owns local JSON state reads and writes.
- `knowledge` owns local markdown note file paths and writes.
- `renderer` owns display only.

## Non-Goals

- No account system.
- No plugin marketplace distribution.
- No custom Codex built-in pets API integration.
- No 3D pet or asset pipeline.
- No hosted backend.

## Verification Entry

Run `npm run doctor`.
