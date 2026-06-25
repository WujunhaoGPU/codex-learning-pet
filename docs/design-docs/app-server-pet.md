# App-Server Pet Design

Status: current alpha architecture

## Decision

Use Electron plus `codex app-server` over stdio.

## Why

Electron gives a small always-on-top desktop window with direct Node access to
spawn `codex app-server`. Tauri is a good later option, but it adds Rust and
IPC work before the app-server event chain is proven.

## Architecture

```text
main process
  spawn codex app-server
  initialize JSON-RPC
  thread/list cwd
  thread/resume latest thread
  receive notifications
  reduce state
  persist local state and notes
  push state to renderer

renderer
  show always-on-top navigation panel
  switch route/status views
```

## Reducer Contract

Reducer input is any app-server notification or selected app event.

Reducer output is the full learning state:

- `status`
- `message`
- `route`
- `routeActiveIndex`
- `currentView`
- `threadId`
- `threadName`
- `followLatest`
- `routeLocked`
- `currentGoal`
- `currentStep`
- `nextStep`
- `latestKnowledge`
- `knowledgeEntry`
- `blocker`
- `timeline`

Agent messages may include fenced `PET_UPDATE` and `ROUTE_UPDATE` blocks. The
reducer treats them as authoritative and falls back to plain-text heuristics
when they are absent.

Knowledge notes are captured from learning-style user questions plus final
answers. Intermediate commentary is ignored.

v1 statuses:

- `waiting`
- `thinking`
- `running-command`
- `step-complete`
- `needs-user`
- `judgment-revised`
- `knowledge-updated`
- `blocked`

## Dissent

Native Tauri would be smaller and more production-polished. It becomes the right
choice if the Electron app proves the event chain but memory footprint or app
packaging becomes the main problem.
