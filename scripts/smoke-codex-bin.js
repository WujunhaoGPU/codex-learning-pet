const assert = require("node:assert");
const { spawnSync } = require("node:child_process");
const { codexCommand, codexEnv } = require("../src/codexBinary");

const command = codexCommand();
const result = spawnSync(command, ["--version"], {
  env: codexEnv(),
  encoding: "utf8"
});

assert.equal(result.status, 0, result.stderr || result.stdout || `failed to run ${command}`);
assert.match(result.stdout, /codex/i);
console.log(`codex binary ok: ${command}`);
