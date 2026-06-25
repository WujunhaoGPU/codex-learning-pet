const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const appPath = path.join(__dirname, "..", "dist", "Codex Learning Pet.app");
const executable = path.join(appPath, "Contents", "MacOS", "Electron");
const expectedCodexCwd = path.resolve(__dirname, "..", "..");
const dataDir = path.join(os.tmpdir(), `codex-learning-pet-packaged-data-${process.pid}`);

assert.ok(fs.existsSync(appPath), "dist/Codex Learning Pet.app is missing");
assert.ok(fs.existsSync(executable), "packaged app executable is missing");

const out = path.join(os.tmpdir(), `codex-learning-pet-packaged-${process.pid}.json`);
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(
  path.join(dataDir, "learning-state.json"),
  `${JSON.stringify(
    {
      currentView: "status",
      threadName: "packaged session",
      threadUpdatedAt: "刚刚",
      followLatest: true,
      routeLocked: true,
      currentGoal: "packaged restore goal",
      currentStep: "packaged restore step",
      nextStep: "packaged restore next",
      latestKnowledge: "packaged restore knowledge",
      windowBounds: { width: 430, height: 530, x: 40, y: 80 }
    },
    null,
    2
  )}\n`
);
const result = spawnSync(executable, [], {
  env: {
    ...process.env,
    PET_SMOKE: "1",
    PET_SMOKE_OUT: out,
    PET_DATA_DIR: dataDir
  },
  encoding: "utf8",
  timeout: 20000
});

if (result.error) throw result.error;
assert.equal(result.status, 0, result.stderr || result.stdout);

const payload = JSON.parse(fs.readFileSync(out, "utf8"));
assert.equal(payload.alwaysOnTop, true);
assert.equal(payload.resizable, true);
assert.equal(payload.visible, true);
assert.equal(payload.codexBinaryOk, true);
assert.equal(payload.codexCwd, expectedCodexCwd);
assert.equal(payload.sessionName, "packaged session");
assert.match(payload.sessionTime, /刚刚/);
assert.equal(payload.hasTopbarTitle, false);
assert.equal(payload.hasFollowLatestToggle, true);
assert.equal(payload.followLatestChecked, true);
assert.equal(payload.hasRouteLockToggle, true);
assert.equal(payload.routeLockChecked, true);
assert.equal(payload.hasKnowledgeButton, true);
assert.equal(payload.statusViewHidden, false);
assert.match(payload.goal, /packaged restore goal/);
assert.match(payload.step, /packaged restore step/);
assert.match(payload.knowledge, /packaged restore knowledge/);

fs.unlinkSync(out);
fs.rmSync(dataDir, { recursive: true, force: true });
console.log("packaged app ok");
