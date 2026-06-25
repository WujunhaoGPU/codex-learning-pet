const fs = require("node:fs");

const FALLBACK_CODEX_PATHS = [
  "/Applications/Codex.app/Contents/Resources/codex"
];

function fileExists(file) {
  try {
    return fs.existsSync(file);
  } catch {
    return false;
  }
}

function codexCommand() {
  if (process.env.CODEX_BIN) return process.env.CODEX_BIN;
  return FALLBACK_CODEX_PATHS.find(fileExists) || "codex";
}

function codexEnv() {
  const extraPath = FALLBACK_CODEX_PATHS.map((file) => file.replace(/\/codex$/, "")).join(":");
  return {
    ...process.env,
    PATH: `${process.env.PATH || ""}:${extraPath}`
  };
}

module.exports = { codexCommand, codexEnv, FALLBACK_CODEX_PATHS };
