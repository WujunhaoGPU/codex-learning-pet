const path = require("node:path");
const os = require("node:os");

const appRoot = path.resolve(__dirname, "..");
const packageConfig = require(path.join(appRoot, "package.json")).codexLearningPet || {};
const defaultCodexCwd = packageConfig.defaultCodexCwd || path.resolve(appRoot, "..");
const defaultDataDir = path.join(os.homedir(), "Library", "Application Support", "Codex Learning Pet");

function codexCwd() {
  return process.env.CODEX_LEARNING_PET_CWD || defaultCodexCwd;
}

function dataDir() {
  return process.env.PET_DATA_DIR || defaultDataDir;
}

module.exports = { appRoot, codexCwd, dataDir };
