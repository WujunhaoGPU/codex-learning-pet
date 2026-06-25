const assert = require("node:assert");
const fs = require("node:fs");
const { loadState, saveState, statePath } = require("../src/state");
const { appendKnowledge, currentKnowledgePath } = require("../src/knowledge");
const { withStateSnapshot } = require("../scripts/state-backup");

withStateSnapshot(() => {
  try {
    fs.unlinkSync(statePath);
  } catch {}

  const saved = saveState({
    ...loadState(),
    connected: true,
    status: "needs-user",
    message: "现在运行复现命令，把完整报错贴回来。"
  });

  const loaded = loadState();
  assert.equal(loaded.connected, true);
  assert.equal(loaded.status, "needs-user");
  assert.equal(loaded.message, saved.message);
  assert.ok(loaded.updatedAt);

  const knowledgeState = {
    threadId: "019ef96b-4af7-77e3-81d4-e482e83a036c",
    threadName: "设计悬浮操作步骤面板",
    currentGoal: "验证知识点记录",
    currentStep: "写入知识点",
    knowledgeEntry: {
      id: "answer-1",
      question: "什么叫类型注解？",
      answer: "类型注解是给类型检查器和读代码的人看的信息。",
      createdAt: "2026-06-25T02:42:00.000Z"
    }
  };
  const path = currentKnowledgePath(knowledgeState, new Date("2026-06-25T02:42:00.000Z"));
  try {
    fs.unlinkSync(path);
  } catch {}
  appendKnowledge(knowledgeState, new Date("2026-06-25T02:42:00.000Z"));
  assert.match(path, /notes\/2026-06-25\/设计悬浮操作步骤面板-019ef96b\.md$/);
  const content = fs.readFileSync(path, "utf8");
  assert.match(content, /什么叫类型注解/);
  assert.match(content, /类型检查器/);
  appendKnowledge(knowledgeState, new Date("2026-06-25T02:42:00.000Z"));
  const deduped = fs.readFileSync(path, "utf8");
  assert.equal(deduped.match(/knowledge-entry:answer-1/g).length, 1);
  fs.unlinkSync(path);

  fs.unlinkSync(statePath);
});

console.log("state ok");
