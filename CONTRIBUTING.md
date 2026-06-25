# Contributing

This project is early and intentionally small.

## Setup

```bash
npm install
npm start
```

## Checks

Run the full local gate before opening a PR:

```bash
npm run doctor
```

## Guidelines

- Keep learning state changes in `src/reducer.js`.
- Keep UI-only changes in `src/renderer/`.
- Keep local note writing in `src/knowledge.js`.
- Avoid new dependencies unless the existing code cannot reasonably do the job.
- Do not commit generated local data, packaged apps, notes, or mockups.
