# Project Map

## One-Line Description

Desktop pet that keeps the current Codex learning step visible above other apps.

## Run Entry

```bash
npm start
```

## Main Modules

- `src/main.js`: starts Electron, loads state, connects to app-server.
- `src/appServerClient.js`: connects to `codex app-server`.
- `src/reducer.js`: converts Codex events into learning status.
- `src/state.js`: persists `learning-state.json`.
- `src/renderer/*`: floating pet UI.

## Known Risks

- App-server is experimental.
- Rejoining a currently running thread depends on `thread/resume` behavior.
- Reducer uses simple text heuristics for v1.

## Next Read

Read `README.md` and `ARCHITECTURE.md` before changing architecture.
