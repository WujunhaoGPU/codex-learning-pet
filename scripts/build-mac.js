const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const electronApp = path.join(root, "node_modules", "electron", "dist", "Electron.app");
const outApp = path.join(root, "dist", "Codex Learning Pet.app");
const resourcesApp = path.join(outApp, "Contents", "Resources", "app");
const plist = path.join(outApp, "Contents", "Info.plist");

function copy(src, dest) {
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function ditto(src, dest) {
  const result = spawnSync("ditto", [src, dest], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `failed to copy ${src}`);
}

function plistSet(key, value) {
  const result = spawnSync("/usr/libexec/PlistBuddy", ["-c", `Set :${key} ${value}`, plist], {
    encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `failed to set ${key}`);
}

fs.rmSync(outApp, { recursive: true, force: true });
fs.mkdirSync(path.dirname(outApp), { recursive: true });
ditto(electronApp, outApp);

fs.rmSync(resourcesApp, { recursive: true, force: true });
fs.mkdirSync(resourcesApp, { recursive: true });

copy(path.join(root, "src"), path.join(resourcesApp, "src"));
const appPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
appPackage.codexLearningPet = {
  defaultCodexCwd: path.resolve(root, "..")
};
fs.writeFileSync(path.join(resourcesApp, "package.json"), `${JSON.stringify(appPackage, null, 2)}\n`);

plistSet("CFBundleName", "Codex Learning Pet");
plistSet("CFBundleDisplayName", "Codex Learning Pet");
plistSet("CFBundleIdentifier", "local.codex-learning-pet");

console.log(outApp);
