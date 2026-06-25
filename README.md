# Codex Learning Pet

Always-on-top desktop learning companion for Codex sessions.

It turns a long Codex debugging or issue-learning conversation into a small
floating panel: current route, current step, current goal, and saved knowledge.

This is an experimental local desktop client. It is not an official Codex
feature, plugin, or built-in pet.

## Features

- Always-on-top Electron panel for macOS.
- Connects to local `codex app-server`.
- Follows the latest Codex thread in a configured working directory.
- Shows route and status views.
- Highlights current route progress without jumping across many steps.
- Supports route locking so a new `ROUTE_UPDATE` does not overwrite the current route.
- Saves learning Q&A notes by date and thread.
- Provides a manual save button for the latest user question and final answer.
- Packages to a local macOS `.app`.

## Requirements

- macOS.
- Node.js and npm.
- Codex desktop app or CLI with `codex app-server` available locally.

The app-server surface is experimental. Expect breakage if Codex changes its
local thread APIs or event shapes.

## Install

```bash
npm install
```

## Run

```bash
npm start
```

By default the app listens to the project directory configured in
`package.json` under `codexLearningPet.defaultCodexCwd`, or the parent of this
repo when no value is configured.

Override the listened directory:

```bash
CODEX_LEARNING_PET_CWD=/path/to/project npm start
```

## Verify

```bash
npm test
npm run acceptance:issue-flow
npm run build:mac
npm run smoke:codex-bin
npm run smoke:app-server
npm run smoke:window
npm run smoke:packaged
npm run doctor
```

- `npm test`: reducer, state, and event-flow checks.
- `npm run acceptance:issue-flow`: replayed issue-learning flow.
- `npm run smoke:codex-bin`: Codex binary resolution.
- `npm run smoke:app-server`: local app-server connectivity.
- `npm run smoke:window`: Electron UI smoke test.
- `npm run smoke:packaged`: packaged app smoke test.
- `npm run doctor`: full automated gate.

## Mac App

```bash
npm run build:mac
open "dist/Codex Learning Pet.app"
```

The packaged app is unsigned, not notarized, not auto-updated, and not wrapped
in a DMG installer.

## Route Updates

Codex can update the route with a fenced block:

````markdown
```ROUTE_UPDATE
route:
1. Read issue｜Extract environment, actual behavior, expected behavior, repro steps
2. Reproduce｜Run the smallest failing case and capture output
3. Locate entry｜Search for the handler or call path
4. Patch｜Make the smallest behavior-preserving change
5. Verify｜Run targeted tests and review diff
```
````

Each route item can use `title｜action`. The UI displays the title and action
separately.

## Knowledge Notes

Knowledge capture is intentionally conservative:

- Automatic capture starts when the user asks a learning-style question, such as
  "what is", "why", "explain", "how should I understand", or "what is the
  difference".
- Execution-oriented requests such as "modify code", "run it", "package",
  "commit", or "delete" are ignored.
- Only the final answer is saved, not intermediate Codex commentary.
- The Save button stores the latest user question and final answer manually.
- Duplicate saves for the same answer are ignored.

Notes are written under:

```text
~/Library/Application Support/Codex Learning Pet/notes/YYYY-MM-DD/thread-name-shortid.md
```

## Privacy

This app runs locally. It reads local Codex thread data through `codex
app-server` and writes local state and notes under macOS Application Support.
It does not include analytics or a network service of its own.

Do not publish your generated `notes/`, `dist/`, or local state files.

## Limitations

- macOS-only local prototype.
- Depends on experimental Codex app-server behavior.
- No code signing, notarization, DMG installer, or auto-update.
- No multi-project dashboard.
- Route and knowledge detection use simple local heuristics.

## Project Status

Alpha. Useful for personal issue-learning workflows, not a stable public API.

## License

MIT.
