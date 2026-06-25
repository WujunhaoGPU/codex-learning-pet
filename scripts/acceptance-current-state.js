const assert = require("node:assert");
const fs = require("node:fs");
const { loadState, defaultState, statePath } = require("../src/state");

const usefulStatuses = new Set(["needs-user", "judgment-revised", "knowledge-updated", "blocked"]);

function assertSpecific(value, fallback, label) {
  assert.ok(value && value !== fallback, `${label} is still default or empty`);
}

function assertCurrentState(state) {
  assert.equal(state.connected, true, "pet is not connected to app-server");
  assert.ok(state.threadId, "threadId is missing");
  assert.ok(usefulStatuses.has(state.status), `status is not actionable: ${state.status}`);
  assertSpecific(state.currentGoal, defaultState.currentGoal, "currentGoal");
  assertSpecific(state.route, defaultState.route, "route");
  assertSpecific(state.currentStep, defaultState.currentStep, "currentStep");
  assertSpecific(state.nextStep, defaultState.nextStep, "nextStep");
  assert.ok(state.latestKnowledge, "latestKnowledge is missing");
  assert.ok(Array.isArray(state.timeline) && state.timeline.length >= 3, "timeline is too short");
  assert.ok(state.updatedAt, "updatedAt is missing");
  return state;
}

function readState(file = statePath) {
  if (file === statePath) return loadState();
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

if (require.main === module) {
  const file = process.argv[2] || statePath;
  assertCurrentState(readState(file));
  console.log("current state acceptance ok");
}

module.exports = { assertCurrentState, readState };
