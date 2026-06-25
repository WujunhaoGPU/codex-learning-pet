const fs = require("node:fs");
const path = require("node:path");
const { appRoot, dataDir } = require("./paths");

const statePath = path.join(dataDir(), "learning-state.json");
const legacyStatePath = path.join(appRoot, "learning-state.json");

const defaultState = {
  connected: false,
  threadId: null,
  threadName: "未绑定会话",
  threadUpdatedAt: null,
  followLatest: false,
  currentView: "route",
  routeLocked: false,
  windowBounds: { width: 420, height: 520, x: 40, y: 80 },
  status: "waiting",
  message: "等待 Codex 学习线程",
  route: "连接 Codex -> 读取当前线程 -> 等待 PET_UPDATE / ROUTE_UPDATE",
  routeActiveIndex: 0,
  currentGoal: "通过 Codex issue 学习时保持下一步可见",
  currentStep: "启动宠物并连接 Codex app-server",
  nextStep: "继续在 Codex 里工作，宠物会更新提示",
  latestKnowledge: "",
  lastUserQuestion: "",
  lastAgentAnswer: "",
  lastAgentAnswerId: "",
  knowledgeCapturePending: false,
  pendingKnowledgeQuestion: "",
  pendingKnowledgeTurnId: "",
  knowledgeEntry: null,
  blocker: "",
  timeline: [],
  updatedAt: null
};

function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(fs.readFileSync(statePath, "utf8")) };
  } catch {
    try {
      return { ...defaultState, ...JSON.parse(fs.readFileSync(legacyStatePath, "utf8")) };
    } catch {}
    return { ...defaultState };
  }
}

function saveState(state) {
  const next = { ...state, updatedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

function patchState(patch) {
  return saveState({ ...loadState(), ...patch });
}

module.exports = { defaultState, loadState, saveState, patchState, statePath, legacyStatePath };
