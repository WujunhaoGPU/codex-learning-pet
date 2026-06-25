let currentView = "route";

const $ = (id) => document.getElementById(id);
const fields = {
  route: $("route"),
  routeProgress: $("route-progress"),
  goal: $("goal"),
  step: $("step"),
  knowledge: $("knowledge"),
  nextHint: $("next-hint"),
  sessionName: $("session-name"),
  sessionTime: $("session-time")
};

function showView(view, persist = true) {
  currentView = view === "status" ? "status" : "route";
  $("route-view").hidden = currentView !== "route";
  $("status-view").hidden = currentView !== "status";
  $("route-tab").classList.toggle("active", currentView === "route");
  $("status-tab").classList.toggle("active", currentView === "status");
  if (persist) window.learningPet.setView(currentView);
}

function routeSteps(route) {
  return String(route || "")
    .split(/\s*(?:->|→|\n)\s*/)
    .map((raw) => {
      const line = raw.trim().replace(/^\d+[.、]\s*/, "");
      const [title, action = ""] = line.split(/[｜|]/).map((part) => part.trim());
      return { title, action };
    })
    .filter((step) => step.title);
}

function routeText(step) {
  return `${step.title} ${step.action}`.trim();
}

function currentRouteIndex(steps, currentStep, fallback = 0) {
  const current = String(currentStep || "");
  const found = steps.findIndex((step) => {
    const text = routeText(step);
    return current.includes(step.title) || text.includes(current);
  });
  return found >= 0 ? found : Math.min(Math.max(fallback, 0), Math.max(steps.length - 1, 0));
}

function legacyRouteSteps(route) {
  return String(route || "")
    .split(/\s*(?:->|→|\n)\s*/)
    .map((title) => title.trim())
    .filter(Boolean);
}

function renderRoute(state) {
  let steps = routeSteps(state.route);
  if (!steps.length) steps = legacyRouteSteps(state.route).map((title) => ({ title, action: "" }));
  const active = currentRouteIndex(steps, state.currentStep, state.routeActiveIndex || 0);
  fields.route.innerHTML = "";
  fields.routeProgress.textContent = steps.length ? `${active + 1} / ${steps.length}` : "";
  for (const [index, step] of steps.entries()) {
    const item = document.createElement("div");
    item.className = `route-step ${index < active ? "done" : index === active ? "current" : "pending"}`;
    item.innerHTML = `<span class="route-dot"></span><div><strong></strong><p></p></div>`;
    item.querySelector("strong").textContent = step.title;
    item.querySelector("p").textContent = step.action || (index < active ? "已完成" : index === active ? "当前进行中" : "待执行");
    fields.route.appendChild(item);
  }
  if (!steps.length) fields.route.textContent = "暂无路线";
}

function formatThreadTime(value) {
  if (!value) return "更新时间未知";
  if (typeof value === "string" && Number.isNaN(Date.parse(value))) return `更新：${value}`;
  const time = typeof value === "number" ? value * 1000 : Date.parse(value);
  if (!Number.isFinite(time)) return "更新时间未知";
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "更新：刚刚";
  if (minutes < 60) return `更新：${minutes} 分钟前`;
  if (minutes < 24 * 60) return `更新：${Math.floor(minutes / 60)} 小时前`;
  return `更新：${Math.floor(minutes / 1440)} 天前`;
}

function flashButton(button, text) {
  const original = button.textContent;
  button.textContent = text;
  button.classList.remove("clicked");
  void button.offsetWidth;
  button.classList.add("clicked");
  setTimeout(() => {
    button.textContent = original;
    button.classList.remove("clicked");
  }, 900);
}

$("route-tab").addEventListener("click", () => showView("route"));
$("status-tab").addEventListener("click", () => showView("status"));
$("follow-latest").addEventListener("change", (event) => {
  window.learningPet.setFollowLatest(event.target.checked);
});
$("route-lock").addEventListener("change", (event) => {
  window.learningPet.setRouteLocked(event.target.checked);
});
$("knowledge-file").addEventListener("click", (event) => {
  flashButton(event.currentTarget, "打开中");
  window.learningPet.openKnowledgeFile();
});
$("save-round").addEventListener("click", (event) => {
  flashButton(event.currentTarget, "已保存");
  window.learningPet.saveCurrentRound();
});

window.learningPet.onState((state) => {
  showView(state.currentView || currentView, false);
  $("panel").dataset.status = state.status || "waiting";
  $("follow-latest").checked = Boolean(state.followLatest);
  $("route-lock").checked = Boolean(state.routeLocked);
  fields.sessionName.textContent = state.threadName || "未绑定会话";
  fields.sessionTime.textContent = formatThreadTime(state.threadUpdatedAt);
  renderRoute(state);
  fields.goal.textContent = state.currentGoal || "暂无";
  fields.step.textContent = state.currentStep || "暂无";
  fields.knowledge.textContent = state.latestKnowledge || "暂无";
  fields.nextHint.textContent = state.nextStep ? `下一步：${state.nextStep}` : "";
});
