const fs = require("node:fs");
const path = require("node:path");
const { dataDir } = require("./paths");

function pad(number) {
  return String(number).padStart(2, "0");
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function safeName(text) {
  return String(text || "未命名会话")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 48) || "未命名会话";
}

function currentKnowledgePath(state, date = new Date()) {
  const shortId = String(state.threadId || "unknown").slice(0, 8);
  return path.join(dataDir(), "notes", dateKey(date), `${safeName(state.threadName)}-${shortId}.md`);
}

function appendKnowledge(state, date = new Date()) {
  const entry = state.knowledgeEntry;
  if (!entry?.question || !entry?.answer) return;
  const file = currentKnowledgePath(state, date);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, `# ${state.threadName || "未命名会话"}\n\n`);
  const marker = `<!-- knowledge-entry:${entry.id} -->`;
  if (fs.readFileSync(file, "utf8").includes(marker)) return;
  const markdown = [
    marker,
    `## ${pad(date.getHours())}:${pad(date.getMinutes())} ${entry.question}`,
    "",
    `- 目标：${state.currentGoal || ""}`,
    `- 当前一步：${state.currentStep || ""}`,
    "",
    "### 问题",
    entry.question,
    "",
    "### 回答",
    entry.answer,
    ""
  ].join("\n");
  fs.appendFileSync(file, markdown);
}

module.exports = { appendKnowledge, currentKnowledgePath };
