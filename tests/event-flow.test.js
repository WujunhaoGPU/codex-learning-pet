const assert = require("node:assert");
const { defaultState } = require("../src/state");
const { reduceLearningState, parseRouteUpdate } = require("../src/reducer");

const multilineRoute = parseRouteUpdate(`\`\`\`ROUTE_UPDATE
route:
1. 准备测试路线｜确认面板已启动，并切到“路线”视图
2. 读取结构化路线｜检查 UI 是否把标题和操作说明分开展示
\`\`\``);
assert.match(multilineRoute.route, /准备测试路线/);
assert.match(multilineRoute.route, /读取结构化路线/);

const events = [
  { method: "app/connected", params: {} },
  { method: "app/threadSelected", params: { threadId: "thread-1" } },
  { method: "turn/started", params: { threadId: "thread-1", turnId: "turn-1" } },
  {
    method: "turn/plan/updated",
    params: {
      plan: [{ step: "运行复现命令 npm test parser", status: "in_progress" }]
    }
  },
  {
    method: "item/started",
    params: { item: { type: "commandExecution", command: "npm test parser" } }
  },
  {
    method: "item/completed",
    params: { item: { type: "commandExecution", exitCode: 0 } }
  },
  {
    method: "item/agentMessage/delta",
    params: { delta: "现" }
  },
  {
    method: "item/completed",
    params: {
      turnId: "turn-learning",
      item: {
        type: "userMessage",
        content: [{ type: "text", text: "什么叫 parser 负责把输入转成 AST？" }]
      }
    }
  },
  {
    method: "item/completed",
    params: {
      turnId: "turn-learning",
      item: {
        type: "agentMessage",
        id: "agent-learning-answer",
        text: `现在查看 src/parser.ts 的入口。

\`\`\`PET_UPDATE
status: knowledge-updated
current_goal: 学会定位 parser issue
current_step: 查看 src/parser.ts 的入口
next_step: 打开 src/parser.ts 并找到 parse() 的调用方
latest_knowledge: parser 负责把输入转成 AST。
blocker:
\`\`\`

\`\`\`ROUTE_UPDATE
route: 复现问题 -> 定位 parser 入口 -> 修改调用方 -> 回归测试
\`\`\``
      }
    }
  },
  { method: "turn/completed", params: {} }
];

const finalState = events.reduce(reduceLearningState, { ...defaultState });

assert.equal(finalState.connected, true);
assert.equal(finalState.threadId, "thread-1");
assert.equal(finalState.status, "knowledge-updated");
assert.match(finalState.message, /打开 src\/parser/);
assert.match(finalState.currentStep, /查看 src\/parser/);
assert.match(finalState.nextStep, /打开 src\/parser/);
assert.match(finalState.latestKnowledge, /parser/);
assert.equal(finalState.blocker, "");
assert.match(finalState.route, /定位 parser 入口/);
assert.ok(finalState.timeline.length >= 6);

console.log("event flow ok");
