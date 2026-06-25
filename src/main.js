const path = require("node:path");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { AppServerClient } = require("./appServerClient");
const { loadState, saveState, patchState, statePath } = require("./state");
const { reduceLearningState } = require("./reducer");
const { codexCwd } = require("./paths");
const { appendKnowledge, currentKnowledgePath } = require("./knowledge");
const { codexCommand, codexEnv } = require("./codexBinary");

let win;
let client;
let state = loadState();
let pollTimer;
let attachedThreadId;
let latestCandidateId;
const seenTurns = new Set();
const seenItems = new Set();
const seenCompletedTurns = new Set();

function pushState() {
  if (win && !win.isDestroyed()) win.webContents.send("learning-state", state);
}

function applyEvent(event) {
  const previousKnowledgeEntryId = state.knowledgeEntry?.id;
  state = saveState(reduceLearningState(state, event));
  if (state.knowledgeEntry?.id && state.knowledgeEntry.id !== previousKnowledgeEntryId) appendKnowledge(state);
  pushState();
}

function createWindow() {
  const bounds = state.windowBounds || {};
  win = new BrowserWindow({
    title: "Codex Learning Pet",
    width: bounds.width || 420,
    height: bounds.height || 520,
    minWidth: 360,
    minHeight: 420,
    x: bounds.x ?? 40,
    y: bounds.y ?? 80,
    frame: true,
    transparent: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  win.setAlwaysOnTop(true, "floating");
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  win.webContents.once("did-finish-load", pushState);
  win.on("moved", saveWindowBounds);
  win.on("resized", saveWindowBounds);
}

async function connectCodex() {
  if (process.env.PET_SMOKE === "1") return;
  client = new AppServerClient({ cwd: codexCwd() });
  client.on("notification", applyEvent);
  client.start();
  try {
    await client.initialize();
    const thread = await client.attachLatestThread();
    attachedThreadId = thread?.id;
    startThreadPolling();
  } catch (error) {
    applyEvent({ method: "error", params: { message: error.message } });
  }
}

function itemToEvent(threadId, turnId, item) {
  if (item.type === "userMessage") return { method: "item/completed", params: { threadId, turnId, item } };
  if (item.type === "agentMessage") return { method: "item/completed", params: { threadId, turnId, item } };
  if (item.type === "commandExecution") return { method: "item/completed", params: { threadId, turnId, item } };
  return null;
}

async function pollThread() {
  if (!client || !attachedThreadId) return;
  if (!fs.existsSync(statePath)) {
    state = saveState(state);
    pushState();
  }
  await maybeFollowLatestThread();
  const response = await client.readThread(attachedThreadId);
  for (const turn of response?.thread?.turns || []) {
    if (!seenTurns.has(turn.id)) {
      seenTurns.add(turn.id);
      applyEvent({ method: "turn/started", params: { threadId: attachedThreadId, turn } });
    }
    for (const item of turn.items || []) {
      if (!item.id || seenItems.has(item.id)) continue;
      seenItems.add(item.id);
      const event = itemToEvent(attachedThreadId, turn.id, item);
      if (event) applyEvent(event);
    }
    if (turn.completedAt && !seenCompletedTurns.has(turn.id)) {
      seenCompletedTurns.add(turn.id);
      applyEvent({ method: "turn/completed", params: { threadId: attachedThreadId, turn } });
    }
  }
}

async function maybeFollowLatestThread() {
  if (!state.followLatest) {
    latestCandidateId = null;
    return;
  }
  const latest = await client.latestThread();
  if (!latest) return;
  if (latest.id === attachedThreadId) {
    latestCandidateId = null;
    const latestUpdatedAt = latest.updatedAt ?? latest.recencyAt ?? state.threadUpdatedAt;
    if (latest.name !== state.threadName || latestUpdatedAt !== state.threadUpdatedAt) {
      state = patchState({ threadName: latest.name || latest.preview || state.threadName, threadUpdatedAt: latestUpdatedAt });
      pushState();
    }
    return;
  }
  if (latestCandidateId !== latest.id) {
    latestCandidateId = latest.id;
    return;
  }
  clearSeenThreadItems();
  const thread = await client.resumeThread(latest);
  attachedThreadId = thread?.id;
  latestCandidateId = null;
}

function clearSeenThreadItems() {
  seenTurns.clear();
  seenItems.clear();
  seenCompletedTurns.clear();
}

function startThreadPolling() {
  if (pollTimer || !attachedThreadId) return;
  pollTimer = setInterval(() => {
    pollThread().catch((error) => {
      applyEvent({ method: "error", params: { message: error.message } });
    });
  }, 2000);
  pollThread().catch(() => {});
}

function saveWindowBounds() {
  if (!win || win.isDestroyed()) return;
  state = patchState({ windowBounds: win.getBounds() });
}

function cleanup() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (client) {
    client.stop();
    client = null;
  }
}

async function smokeAndQuit() {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const ui = await readUiForSmoke();
  const initialBounds = win.getBounds();
  const restoredMessage = state.message;
  if (process.env.PET_SMOKE_INTERACT === "1") {
    await win.webContents.executeJavaScript(`document.getElementById("status-tab").click()`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    ui.afterClick = { ...(await readUiForSmoke()), bounds: win.getBounds() };
  }
  const payload = {
    alwaysOnTop: win.isAlwaysOnTop(),
    resizable: win.isResizable(),
    visible: win.isVisible(),
    codexBinaryOk: codexBinaryOk(),
    codexCwd: codexCwd(),
    bounds: initialBounds,
    restoredMessage,
    ...ui
  };
  writeSmoke(payload);
  app.quit();
}

function writeSmoke(payload) {
  const out = process.env.PET_SMOKE_OUT;
  if (out) fs.writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`);
}

function codexBinaryOk() {
  const result = spawnSync(codexCommand(), ["--version"], {
    env: codexEnv(),
    encoding: "utf8"
  });
  return result.status === 0;
}

function readUiForSmoke() {
  return win.webContents.executeJavaScript(`({
    routeViewHidden: document.getElementById("route-view").hidden,
    statusViewHidden: document.getElementById("status-view").hidden,
    routeText: document.getElementById("route").textContent,
    routeNodeCount: document.querySelectorAll(".route-step").length,
    routeActiveText: document.querySelector(".route-step.current")?.textContent || "",
    routeProgress: document.getElementById("route-progress").textContent,
    panelBackground: getComputedStyle(document.getElementById("panel")).backgroundColor,
    panelBackdrop: getComputedStyle(document.getElementById("panel")).backdropFilter || getComputedStyle(document.getElementById("panel")).webkitBackdropFilter || "",
    hasBlockerRow: Boolean(document.getElementById("blocker-row")),
    statusCardCount: document.querySelectorAll("#status-view .status-card").length,
    statusLabels: Array.from(document.querySelectorAll("#status-view .status-card label")).map((label) => label.textContent),
    sessionName: document.getElementById("session-name")?.textContent || "",
    sessionTime: document.getElementById("session-time")?.textContent || "",
    hasTopbarTitle: Boolean(document.getElementById("topbar-title")),
    trafficLightCount: document.querySelectorAll(".traffic-light").length,
    hasSummaryMessage: Boolean(document.getElementById("message")),
    hasFollowLatestToggle: Boolean(document.getElementById("follow-latest")),
    followLatestChecked: document.getElementById("follow-latest")?.checked || false,
    hasRouteLockToggle: Boolean(document.getElementById("route-lock")),
    hasRouteLockSwitch: Boolean(document.querySelector(".switch-track")),
    hasKnowledgeButton: Boolean(document.getElementById("knowledge-file")),
    hasSaveRoundButton: Boolean(document.getElementById("save-round")),
    hasKnowledgeGroup: Boolean(document.querySelector(".knowledge-actions")),
    routeLockChecked: document.getElementById("route-lock")?.checked || false,
    nextHint: document.getElementById("next-hint")?.textContent || "",
    goal: document.getElementById("goal").textContent,
    step: document.getElementById("step").textContent,
    next: document.getElementById("next-hint").textContent,
    knowledge: document.getElementById("knowledge").textContent
  })`);
}

app.whenReady().then(() => {
  createWindow();
  if (process.env.PET_SMOKE === "1") {
    win.webContents.once("did-finish-load", smokeAndQuit);
  } else {
    connectCodex();
  }
});

ipcMain.on("set-view", (_event, currentView) => {
  state = patchState({ currentView });
});

ipcMain.on("set-route-locked", (_event, routeLocked) => {
  state = patchState({ routeLocked: Boolean(routeLocked) });
  pushState();
});

ipcMain.on("set-follow-latest", (_event, followLatest) => {
  state = patchState({ followLatest: Boolean(followLatest) });
  latestCandidateId = null;
  pushState();
});

ipcMain.on("open-knowledge-file", () => {
  const file = currentKnowledgePath(state);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, `# ${state.threadName || "未命名会话"}\n\n`);
  shell.openPath(file);
});

ipcMain.on("save-current-round", () => {
  state = saveState(reduceLearningState(state, { method: "knowledge/saveCurrentRound", params: {} }));
  if (state.knowledgeEntry?.id) appendKnowledge(state);
  pushState();
});

app.on("window-all-closed", () => {
  cleanup();
  app.quit();
});

app.on("before-quit", cleanup);
