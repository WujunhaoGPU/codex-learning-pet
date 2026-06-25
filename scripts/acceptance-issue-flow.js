const assert = require("node:assert");
const fs = require("node:fs");
const { defaultState, saveState, loadState, statePath } = require("../src/state");
const { reduceLearningState } = require("../src/reducer");
const { assertCurrentState } = require("./acceptance-current-state");
const { withStateSnapshot } = require("./state-backup");

function agentMessage(text) {
  return {
    method: "item/completed",
    params: {
      item: {
        type: "agentMessage",
        text
      }
    }
  };
}

function userMessage(text) {
  return {
    method: "item/completed",
    params: {
      turnId: "learning-turn",
      item: {
        type: "userMessage",
        content: [{ type: "text", text }]
      }
    }
  };
}

const issueFlow = [
  { method: "app/connected", params: {} },
  { method: "app/threadSelected", params: { threadId: "issue-learning-acceptance" } },
  { method: "turn/started", params: {} },
  agentMessage(`先复现，不先猜实现。

\`\`\`PET_UPDATE
status: needs-user
current_goal: 学会定位 Markdown 列表高亮错位 issue
current_step: 运行最小复现测试
next_step: 运行 \`npm test -- list\`，把失败输出贴回来。
latest_knowledge: 先复现能区分真实缺陷和误读需求。
blocker:
\`\`\`

\`\`\`ROUTE_UPDATE
route: 复现问题 -> 分类失败 -> 定位入口 -> 记录判断修正
\`\`\``),
  { method: "turn/completed", params: {} },
  { method: "turn/started", params: {} },
  { method: "item/started", params: { item: { type: "commandExecution", command: "npm test -- list" } } },
  { method: "item/completed", params: { item: { type: "commandExecution", exitCode: 1 } } },
  agentMessage(`修正一下：不是 tokenizer 崩溃，是 list fixture 的 scope 预期过期。

\`\`\`PET_UPDATE
status: judgment-revised
current_goal: 学会定位 Markdown 列表高亮错位 issue
current_step: 对比 list fixture 和 grammar 输出
next_step: 打开 test/specs/flow/list.md 和对应 snapshot，确认预期差异。
latest_knowledge: 失败测试要先区分实现崩溃、fixture 过期和需求变化。
blocker:
\`\`\`

\`\`\`ROUTE_UPDATE
route: 复现问题 -> 分类失败 -> 对比 fixture/snapshot -> 确认预期差异
\`\`\``),
  { method: "turn/completed", params: {} },
  { method: "turn/started", params: {} },
  userMessage("我们认真研究一下，为什么 issue 学习要先复现再分类失败？"),
  agentMessage(`总结这一轮：入口、失败类型和下一步都已经明确。

\`\`\`PET_UPDATE
status: knowledge-updated
current_goal: 学会定位 Markdown 列表高亮错位 issue
current_step: 记录复现路径和判断修正
next_step: 只看这个面板：更新 fixture 前，先确认 grammar 输出是否符合 TextMate scope 规则。
latest_knowledge: issue 学习闭环是复现 -> 分类失败 -> 定位入口 -> 记录判断修正。
blocker:
\`\`\`

\`\`\`ROUTE_UPDATE
route: 复现问题 -> 分类失败 -> 定位入口 -> 沉淀复盘记录
\`\`\``),
  { method: "turn/completed", params: {} }
];

withStateSnapshot(() => {
  let state = { ...defaultState };
  for (const event of issueFlow) state = reduceLearningState(state, event);
  saveState(state);

  const restored = loadState();
  assert.equal(restored.connected, true);
  assert.equal(restored.threadId, "issue-learning-acceptance");
  assert.equal(restored.status, "knowledge-updated");
  assert.match(restored.route, /沉淀复盘记录/);
  assert.match(restored.currentGoal, /Markdown 列表/);
  assert.match(restored.currentStep, /记录复现路径/);
  assert.match(restored.nextStep, /只看这个面板/);
  assert.match(restored.latestKnowledge, /为什么 issue 学习要先复现/);
  assert.match(restored.knowledgeEntry.answer, /复现 -> 分类失败 -> 定位入口/);
  assert.equal(restored.blocker, "");
  assert.ok(restored.timeline.some((item) => item.text.includes("路线更新") && item.text.includes("沉淀复盘记录")));
  assert.ok(restored.timeline.some((item) => item.text.includes("判断修正") || item.text.includes("预期差异")));
  assertCurrentState(restored);

  fs.unlinkSync(statePath);
});

console.log("issue flow acceptance ok");
