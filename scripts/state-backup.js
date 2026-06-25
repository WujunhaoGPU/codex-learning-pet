const fs = require("node:fs");
const { statePath } = require("../src/state");

function readExistingState() {
  try {
    return fs.readFileSync(statePath, "utf8");
  } catch {
    return null;
  }
}

function restoreState(snapshot) {
  if (snapshot === null) {
    try {
      fs.unlinkSync(statePath);
    } catch {}
    return;
  }
  fs.writeFileSync(statePath, snapshot);
}

function withStateSnapshot(fn) {
  const snapshot = readExistingState();
  try {
    return fn();
  } finally {
    restoreState(snapshot);
  }
}

module.exports = { readExistingState, restoreState, withStateSnapshot };
