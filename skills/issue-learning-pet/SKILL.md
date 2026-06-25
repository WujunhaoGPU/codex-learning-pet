---
name: issue-learning-pet
description: Use when the user learns from an issue, bug, failing test, traceback, or repo debugging session and wants Codex Learning Pet to show the current step.
---

# Issue Learning Pet

Use this skill when the user is learning through an issue, bug, failing test,
traceback, repository debugging session, or open-source contribution and wants
Codex Learning Pet to keep the route visible.

## Principles

- Treat the pet as the visible route/status surface.
- Keep chat replies focused on the current step.
- Do not give long multi-step checklists unless the user asks.
- Prefer one concrete next action plus how to read the result.
- Explain reusable concepts when the user asks learning questions.
- Use `ROUTE_UPDATE` only when the route changes.
- Use `PET_UPDATE` when the panel should update status, goal, step, next step,
  or latest knowledge.

## Route Updates

When a route should be created or replaced, include one fenced block:

```ROUTE_UPDATE
route:
1. Read issue｜Extract environment, actual behavior, expected behavior, and repro steps
2. Reproduce｜Run the smallest failing case and capture output
3. Locate entry｜Search for the handler, caller, or failing boundary
4. Patch｜Make the smallest behavior-preserving change
5. Verify｜Run targeted tests and review diff
```

Use `title｜action` so the UI can display a compact title and a concrete action.

## Status Updates

End assistant messages that should update the desktop panel with exactly one
fenced `PET_UPDATE` block.

Keep each value one line:

```PET_UPDATE
status: needs-user
current_goal: Learn the issue by reproducing, locating, explaining, and verifying it.
current_step: Run the reproduction command.
next_step: Run `npm test parser` and paste the full output.
latest_knowledge: Parser turns source text into an AST before rendering.
blocker:
```

Allowed `status` values:

- `waiting`
- `thinking`
- `running-command`
- `step-complete`
- `needs-user`
- `judgment-revised`
- `knowledge-updated`
- `blocked`

Use `judgment-revised` when a later observation changes the previous diagnosis.
Use `knowledge-updated` when the most important change is a concept worth
remembering.
Use `blocked` only when the next user action cannot proceed without missing
data, permission, or an unresolved failure.

## Knowledge Capture

The app captures knowledge notes when the user asks learning-style questions
such as:

- "What is this?"
- "Why does this work?"
- "Can you explain this concept?"
- "What is the difference?"
- "How should I understand this passage?"

When answering those questions:

- Give the explanation in the current issue/repo context first.
- Then generalize the concept.
- Include a boundary condition or common mistake when useful.
- The app saves the final answer, not commentary.

If the user asks for execution instead of learning, do not force a knowledge
note. They can use the pet's Save button for manual capture.

## Avoid

- Long command sequences that force the user to scroll back.
- Route updates for every small observation.
- Replacing a locked route unless the user explicitly wants a new route.
- Saving raw summaries as knowledge when there was no learning question.
