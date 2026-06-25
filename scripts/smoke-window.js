const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { patchState, statePath } = require("../src/state");
const { withStateSnapshot } = require("./state-backup");

function runWindowSmoke(interact = false) {
  const out = path.join(os.tmpdir(), `codex-learning-pet-window-${process.pid}-${Date.now()}.json`);
  const result = spawnSync(path.join(__dirname, "..", "node_modules", ".bin", "electron"), ["."], {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, PET_SMOKE: "1", PET_SMOKE_OUT: out, PET_SMOKE_INTERACT: interact ? "1" : "" },
    encoding: "utf8",
    timeout: 20000
  });

  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const payload = JSON.parse(fs.readFileSync(out, "utf8"));
  fs.unlinkSync(out);
  return payload;
}

withStateSnapshot(() => {
  patchState({
    currentView: "route",
    route: [
      "1. 读 issue｜提取环境、实际行为、期望行为、复现条件",
      "2. 复现问题｜启动插件环境，编辑 caption，按 Enter，确认未保存",
      "3. 定位保存入口｜搜索 caption、keydown、Enter、save handler",
      "4. 复用保存函数｜让 Enter 复用确认按钮保存函数",
      "5. 回归验证｜验证 Enter、点击确认、Esc、失焦行为"
    ].join("\n"),
    currentStep: "定位保存入口",
    blocker: "",
    windowBounds: { width: 500, height: 560, x: 40, y: 80 }
  });

  const collapsed = runWindowSmoke(true);
  assert.equal(collapsed.alwaysOnTop, true);
  assert.equal(collapsed.resizable, true);
  assert.equal(collapsed.visible, true);
  assert.equal(collapsed.bounds.width, 500);
  assert.equal(collapsed.bounds.height, 560);
  assert.match(collapsed.panelBackground, /0\.98|rgb\(255, 255, 255\)/);
  assert.equal(collapsed.routeViewHidden, false);
  assert.equal(collapsed.statusViewHidden, true);
  assert.equal(collapsed.routeNodeCount, 5);
  assert.match(collapsed.routeActiveText, /定位保存入口/);
  assert.match(collapsed.routeActiveText, /keydown/);
  assert.match(collapsed.routeProgress, /3 \/ 5/);
  assert.equal(collapsed.afterClick.routeViewHidden, true);
  assert.equal(collapsed.afterClick.statusViewHidden, false);

  patchState({
    currentView: "route",
    route: "确认仓库状态 -> 理解 issue -> 自检 diff -> 提交 PR",
    routeActiveIndex: 2,
    currentStep: "运行命令：git status --short",
    blocker: "",
    windowBounds: { width: 500, height: 560, x: 40, y: 80 }
  });

  const unmatched = runWindowSmoke();
  assert.match(unmatched.routeProgress, /3 \/ 4/);
  assert.match(unmatched.routeActiveText, /自检 diff/);

  patchState({
    currentView: "status",
    threadName: "设计悬浮操作步骤面板",
    threadUpdatedAt: "8 分钟前",
    followLatest: true,
    routeLocked: true,
    route: "复现问题 -> 定位保存入口 -> 验证回归",
    message: "现在运行复现命令，把完整报错贴回来。",
    currentGoal: "学会定位 caption Enter 不保存 issue",
    currentStep: "定位 caption 输入框事件",
    nextStep: "找到确认按钮保存逻辑并复用",
    latestKnowledge: "键盘确认和按钮确认应该走同一条保存路径。",
    blocker: "",
    windowBounds: { width: 380, height: 420, x: 40, y: 80 }
  });

  const payload = runWindowSmoke();
  assert.equal(payload.alwaysOnTop, true);
  assert.equal(payload.visible, true);
  assert.equal(payload.restoredMessage, "现在运行复现命令，把完整报错贴回来。");
  assert.equal(payload.bounds.width, 380);
  assert.equal(payload.bounds.height, 420);
  assert.equal(payload.routeViewHidden, true);
  assert.equal(payload.statusViewHidden, false);
  assert.equal(payload.sessionName, "设计悬浮操作步骤面板");
  assert.match(payload.sessionTime, /8 分钟前/);
  assert.equal(payload.hasTopbarTitle, false);
  assert.equal(payload.hasFollowLatestToggle, true);
  assert.equal(payload.followLatestChecked, true);
  assert.equal(payload.trafficLightCount, 0);
  assert.equal(payload.hasSummaryMessage, false);
  assert.equal(payload.hasRouteLockToggle, true);
  assert.equal(payload.hasRouteLockSwitch, true);
  assert.equal(payload.routeLockChecked, true);
  assert.equal(payload.hasKnowledgeButton, true);
  assert.equal(payload.hasSaveRoundButton, true);
  assert.equal(payload.hasKnowledgeGroup, true);
  assert.equal(payload.statusCardCount, 3);
  assert.deepEqual(payload.statusLabels, ["当前一步", "最新知识点", "当前目标"]);
  assert.equal(payload.hasBlockerRow, false);
  assert.match(payload.nextHint, /下一步/);
  assert.match(payload.goal, /caption Enter/);
  assert.match(payload.step, /输入框事件/);
  assert.match(payload.next, /确认按钮/);
  assert.match(payload.knowledge, /同一条保存路径/);

  fs.unlinkSync(statePath);
});

console.log("window ok");
