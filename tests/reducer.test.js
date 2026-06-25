const assert = require("node:assert");
const { defaultState } = require("../src/state");
const { reduceLearningState, parsePetUpdate, userMessageText, isLearningQuestion } = require("../src/reducer");

let state = { ...defaultState };

state = reduceLearningState(state, { method: "app/connected", params: {} });
assert.equal(state.connected, true);
assert.equal(state.status, "waiting");

state = reduceLearningState(state, {
  method: "turn/started",
  params: { threadId: "t1", turnId: "u1" }
});
assert.equal(state.status, "thinking");

state = reduceLearningState(state, {
  method: "turn/plan/updated",
  params: {
    plan: [
      { step: "运行复现命令", status: "in_progress" },
      { step: "查看 parser 入口", status: "pending" }
    ]
  }
});
assert.equal(state.currentStep, "运行复现命令");

state = reduceLearningState(state, {
  method: "item/started",
  params: { item: { type: "commandExecution", command: "npm test" } }
});
assert.equal(state.status, "running-command");
assert.match(state.message, /npm test/);

state = reduceLearningState(state, {
  method: "item/completed",
  params: { item: { type: "commandExecution", command: "npm test", exitCode: null } }
});
assert.equal(state.status, "running-command");

state = reduceLearningState(state, {
  method: "item/completed",
  params: { item: { type: "commandExecution", exitCode: 1 } }
});
assert.equal(state.status, "blocked");
assert.equal(state.blocker, "命令退出码 1");

state = reduceLearningState(state, {
  method: "item/completed",
  params: { item: { type: "commandExecution", exitCode: 0 } }
});
assert.equal(state.status, "step-complete");

state = reduceLearningState(state, {
  method: "item/agentMessage/delta",
  params: { delta: "上" }
});
assert.equal(state.status, "thinking");
assert.notEqual(state.nextStep, "上");

state = reduceLearningState(state, {
  method: "item/completed",
  params: {
    item: {
      type: "agentMessage",
      text: "现在查看 src/parser.ts 的入口。\n知识点：parser 负责把输入转成 AST。"
    }
  }
});
assert.equal(state.status, "needs-user");
assert.match(state.currentStep, /现在查看/);
assert.match(state.nextStep, /现在查看/);
assert.equal(state.latestKnowledge, "");

state = reduceLearningState(state, {
  method: "item/completed",
  params: {
    item: {
      type: "agentMessage",
      text: "修正一下：之前判断错了。下一步看配置入口。"
    }
  }
});
assert.equal(state.status, "judgment-revised");

state = reduceLearningState(state, {
  method: "item/completed",
  params: {
    item: {
      type: "agentMessage",
      text: "把完整报错贴回来。"
    }
  }
});
assert.equal(state.status, "needs-user");

state = reduceLearningState(state, { method: "turn/completed", params: {} });
assert.equal(state.status, "needs-user");

const parsed = parsePetUpdate(`解释文本
\`\`\`PET_UPDATE
status: needs-user
current_goal: 学会定位 parser issue
current_step: 运行复现命令
next_step: 运行 \`npm test parser\` 并贴完整输出
latest_knowledge: parser 会先构造 AST
blocker:
\`\`\``);
assert.equal(parsed.status, "needs-user");
assert.equal(parsed.current_step, "运行复现命令");

state = reduceLearningState(state, {
  method: "item/completed",
  params: {
    item: {
      type: "agentMessage",
      text: `先做复现。

\`\`\`PET_UPDATE
status: needs-user
current_goal: 学会定位 parser issue
current_step: 运行复现命令
next_step: 运行 \`npm test parser\` 并贴完整输出
latest_knowledge: parser 会先构造 AST
blocker:
\`\`\``
    }
  }
});
assert.equal(state.currentGoal, "学会定位 parser issue");
assert.equal(state.currentStep, "运行复现命令");
assert.match(state.nextStep, /npm test parser/);
assert.equal(state.latestKnowledge, "");

state = reduceLearningState(state, {
  method: "item/completed",
  params: {
    turnId: "turn-learning",
    item: {
      type: "userMessage",
      content: [{ type: "text", text: "什么叫有些 import 只为了类型注解用？类型注解又是什么？" }]
    }
  }
});
assert.equal(state.knowledgeCapturePending, true);
assert.match(state.pendingKnowledgeQuestion, /类型注解/);

state = reduceLearningState(state, {
  method: "item/completed",
  params: {
    turnId: "turn-learning",
    item: {
      type: "agentMessage",
      id: "commentary-1",
      phase: "commentary",
      text: "我先查一下这个概念。"
    }
  }
});
assert.equal(state.knowledgeCapturePending, true);
assert.equal(state.knowledgeEntry, null);
assert.equal(state.lastAgentAnswer, "");

state = reduceLearningState(state, {
  method: "item/completed",
  params: {
    turnId: "turn-learning",
    item: {
      type: "agentMessage",
      id: "answer-1",
      phase: "final_answer",
      text: "类型注解是给类型检查器和读代码的人看的信息。TYPE_CHECKING 可以避免只为类型提示服务的 import 在运行时执行。"
    }
  }
});
assert.equal(state.knowledgeCapturePending, false);
assert.match(state.latestKnowledge, /什么叫有些 import/);
assert.match(state.knowledgeEntry.question, /类型注解/);
assert.match(state.knowledgeEntry.answer, /TYPE_CHECKING/);

assert.equal(userMessageText({ content: [{ type: "text", text: "你好" }] }), "你好");
assert.equal(isLearningQuestion("什么是类型注解？"), true);
assert.equal(isLearningQuestion("能不能解释一下 TYPE_CHECKING？"), true);
assert.equal(isLearningQuestion("为什么不直接改代码？"), false);
assert.equal(isLearningQuestion("按这个方案实施修改代码"), false);

state = reduceLearningState(state, {
  method: "item/completed",
  params: {
    item: {
      type: "userMessage",
      content: [{ type: "text", text: "帮我看看这段代码" }]
    }
  }
});
state = reduceLearningState(state, {
  method: "item/completed",
  params: {
    item: {
      type: "agentMessage",
      id: "manual-answer-1",
      phase: "final_answer",
      text: "这段代码的问题是类型注解在运行时被解析。"
    }
  }
});
state = reduceLearningState(state, { method: "knowledge/saveCurrentRound", params: {} });
assert.match(state.knowledgeEntry.question, /帮我看看/);
assert.match(state.knowledgeEntry.answer, /类型注解/);
assert.equal(state.latestKnowledge, "帮我看看这段代码");

state = {
  ...state,
  routeLocked: true,
  route: "旧路线"
};
state = reduceLearningState(state, {
  method: "item/completed",
  params: {
    item: {
      type: "agentMessage",
      text: `尝试换路线。

\`\`\`ROUTE_UPDATE
route: 新路线
\`\`\``
    }
  }
});
assert.equal(state.route, "旧路线");

state = {
  ...state,
  routeLocked: false,
  route: "确认仓库状态 -> 理解 issue -> 自检 diff -> 提交 PR",
  currentStep: "理解 issue",
  routeActiveIndex: 1
};
state = reduceLearningState(state, {
  method: "item/completed",
  params: {
    item: {
      type: "agentMessage",
      text: `下一步自检 diff。

\`\`\`PET_UPDATE
current_step: 自检 diff
next_step: 提交 PR
\`\`\``
    }
  }
});
assert.equal(state.routeActiveIndex, 2);
state = reduceLearningState(state, {
  method: "item/started",
  params: { item: { type: "commandExecution", command: "git status --short" } }
});
assert.equal(state.routeActiveIndex, 2);
state = {
  ...state,
  currentStep: "确认仓库状态",
  routeActiveIndex: 0
};
state = reduceLearningState(state, {
  method: "item/completed",
  params: {
    item: {
      type: "agentMessage",
      text: `提到创建 draft PR，但不应该从自检 diff 直接跳过去。

\`\`\`PET_UPDATE
current_step: 提交 PR
next_step: 等待 CI
\`\`\``
    }
  }
});
assert.equal(state.routeActiveIndex, 0);

state = reduceLearningState(state, {
  method: "app/threadSelected",
  params: { threadId: "thread-2", name: "新的学习会话", updatedAt: 1782353978 }
});
assert.equal(state.threadId, "thread-2");
assert.equal(state.threadName, "新的学习会话");
assert.equal(state.threadUpdatedAt, 1782353978);
assert.equal(state.routeLocked, false);

console.log("reducer ok");
