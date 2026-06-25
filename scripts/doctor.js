const { spawnSync } = require("node:child_process");

const checks = [];

if (process.argv.includes("--current-state")) {
  checks.push(["real issue current state", "npm", ["run", "acceptance:current-state"]]);
}

checks.push(
  ["codex binary resolution", "npm", ["run", "smoke:codex-bin"]],
  ["unit reducer/state/event flow", "npm", ["test"]],
  ["three-turn issue replay", "npm", ["run", "acceptance:issue-flow"]],
  ["codex app-server connectivity", "npm", ["run", "smoke:app-server"]],
  ["always-on-top window", "npm", ["run", "smoke:window"]],
  ["packaged mac app", "npm", ["run", "smoke:packaged"]]
);

let failed = false;

for (const [label, command, args] of checks) {
  process.stdout.write(`\n[doctor] ${label}\n`);
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(`[doctor] failed: ${label}\n`);
    break;
  }
}

if (failed) process.exit(1);

if (!process.argv.includes("--current-state")) {
  console.log("\ndoctor ok: automated v1 checks passed");
  console.log("run `npm run doctor -- --current-state` after a real issue-learning session");
} else {
  console.log("\ndoctor ok: v1 checks plus real current-state acceptance passed");
}
