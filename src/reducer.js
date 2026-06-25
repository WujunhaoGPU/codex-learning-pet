const MAX_TIMELINE = 30;

function appendTimeline(state, text) {
  return {
    ...state,
    timeline: [{ at: new Date().toISOString(), text }, ...state.timeline].slice(0, MAX_TIMELINE)
  };
}

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function firstSentence(text) {
  const compact = clean(text);
  if (!compact) return "";
  return compact.split(/(?<=[。！？.!?])\s+/)[0].slice(0, 120);
}

function routeSteps(route) {
  return String(route || "")
    .split(/\s*(?:->|→|\n)\s*/)
    .map((raw) => raw.trim().replace(/^\d+[.、]\s*/, ""))
    .filter(Boolean)
    .map((line) => {
      const [title, action = ""] = line.split(/[｜|]/).map((part) => part.trim());
      return `${title} ${action}`.trim();
    });
}

function matchedRouteIndex(route, currentStep) {
  const current = clean(currentStep);
  if (!current) return -1;
  return routeSteps(route).findIndex((step) => current.includes(step.split(" ")[0]) || step.includes(current));
}

function routeActiveIndex(state, route, currentStep) {
  const found = matchedRouteIndex(route, currentStep);
  const current = state.routeActiveIndex || 0;
  if (found < 0) return current;
  return found >= current && found <= current + 2 ? found : current;
}

function userMessageText(item) {
  const content = item?.content;
  if (Array.isArray(content)) {
    return clean(content.filter((part) => part?.type === "text").map((part) => part.text).join("\n"));
  }
  return clean(item?.text || item?.message || "");
}

function isLearningQuestion(text) {
  const question = clean(text);
  if (/修改代码|直接改|实施|跑一下|打包|提交|删除|创建文件|更新代码|按这个做|开始进行修改/.test(question)) return false;
  return /什么叫|什么是|为什么|怎么理解|解释一下|详细解释|展开讲|认真研究|我不理解|看不懂|区别是什么|有什么区别|这个概念|这段话|这是什么意思|背后的原理|本质是什么/.test(question);
}

function isFinalAnswer(item) {
  return !item?.phase || item.phase === "final_answer";
}

function parsePetUpdate(text) {
  const match = String(text || "").match(/```PET_UPDATE\s*([\s\S]*?)```/);
  return parseKeyBlock(match);
}

function parseRouteUpdate(text) {
  const match = String(text || "").match(/```ROUTE_UPDATE\s*([\s\S]*?)```/);
  return parseKeyBlock(match);
}

function parseKeyBlock(match) {
  if (!match) return null;
  const update = {};
  let currentKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    const parts = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (parts) {
      currentKey = parts[1];
      update[currentKey] = clean(parts[2]);
    } else if (currentKey && line.trim()) {
      update[currentKey] = [update[currentKey], line.trim()].filter(Boolean).join("\n");
    }
  }
  return update;
}

function classifyAgentText(text) {
  if (/修正|推翻|误判|更准确|重新判断|之前.*错/.test(text)) return "judgment-revised";
  return "needs-user";
}

function reduceLearningState(state, event) {
  const method = event.method;
  const params = event.params || {};

  if (method === "app/connected") {
    return appendTimeline({ ...state, connected: true, status: "waiting", message: "已连接 Codex，等待线程事件" }, "已连接 codex app-server");
  }

  if (method === "app/threadSelected") {
    const switchingThread = params.threadId !== state.threadId;
    return appendTimeline(
      {
        ...state,
        threadId: params.threadId,
        threadName: params.name || params.preview || state.threadName || "未命名会话",
        threadUpdatedAt: params.updatedAt ?? params.recencyAt ?? state.threadUpdatedAt,
        routeLocked: switchingThread ? false : state.routeLocked,
        status: "waiting",
        message: "已绑定最近的 Codex 线程",
        nextStep: "继续在 Codex 里操作，宠物会跟随当前线程更新"
      },
      `已绑定线程 ${params.threadId}`
    );
  }

  if (method === "turn/started") {
    return appendTimeline(
      { ...state, status: "thinking", message: "Codex 正在思考", blocker: "" },
      "Codex 开始新回合"
    );
  }

  if (method === "turn/plan/updated") {
    const active = (params.plan || []).find((step) => step.status === "in_progress") || (params.plan || []).find((step) => step.status === "pending");
    if (!active) return state;
    const step = clean(active.step);
    const activeIndex = routeActiveIndex(state, state.route, step);
    return appendTimeline(
      {
        ...state,
        status: "thinking",
        message: step,
        currentStep: step,
        nextStep: step,
        routeActiveIndex: activeIndex
      },
      `计划更新：${step}`
    );
  }

  if (method === "item/started" && params.item?.type === "commandExecution") {
    const command = clean(params.item.command);
    const step = `运行命令：${command}`;
    return appendTimeline(
      {
        ...state,
        status: "running-command",
        message: `正在运行：${command}`,
        currentStep: step,
        routeActiveIndex: routeActiveIndex(state, state.route, step)
      },
      `运行命令：${command}`
    );
  }

  if (method === "item/completed" && params.item?.type === "commandExecution") {
    const code = params.item.exitCode;
    if (code === null || code === undefined) {
      const step = `运行命令：${clean(params.item.command)}`;
      return appendTimeline(
        {
          ...state,
          status: "running-command",
          message: `正在运行：${clean(params.item.command)}`,
          currentStep: step,
          routeActiveIndex: routeActiveIndex(state, state.route, step)
        },
        `运行命令：${clean(params.item.command)}`
      );
    }
    return appendTimeline(
      {
        ...state,
        status: code === 0 ? "step-complete" : "blocked",
        message: code === 0 ? "命令完成，等待 Codex 判断下一步" : "命令失败，需要查看输出",
        blocker: code === 0 ? "" : `命令退出码 ${code}`
      },
      code === 0 ? "命令完成" : `命令失败：exit ${code}`
    );
  }

  if (method === "item/completed" && params.item?.type === "userMessage") {
    const question = userMessageText(params.item);
    const next = {
      ...state,
      lastUserQuestion: question,
      lastAgentAnswer: "",
      lastAgentAnswerId: ""
    };
    if (!isLearningQuestion(question)) return next;
    return appendTimeline(
      {
        ...next,
        knowledgeCapturePending: true,
        pendingKnowledgeQuestion: question,
        pendingKnowledgeTurnId: params.turnId || ""
      },
      `准备记录知识点：${firstSentence(question)}`
    );
  }

  if (method === "knowledge/saveCurrentRound") {
    if (!state.lastUserQuestion || !state.lastAgentAnswer) return state;
    const entry = {
      id: state.lastAgentAnswerId || `manual-${state.timeline.length}`,
      question: state.lastUserQuestion,
      answer: state.lastAgentAnswer,
      createdAt: new Date().toISOString()
    };
    return appendTimeline(
      {
        ...state,
        latestKnowledge: firstSentence(entry.question),
        knowledgeEntry: entry,
        status: "knowledge-updated"
      },
      `手动保存知识点：${firstSentence(entry.question)}`
    );
  }

  if (method === "item/agentMessage/delta") {
    return {
      ...state,
      status: "thinking",
      message: "Codex 正在回复"
    };
  }

  if (method === "item/completed" && params.item?.type === "agentMessage") {
    const text = params.item.text || "";
    const finalAnswer = isFinalAnswer(params.item);
    const update = parsePetUpdate(text);
    const routeUpdate = parseRouteUpdate(text);
    const sentence = update?.next_step || firstSentence(text);
    const capturedKnowledge = finalAnswer && state.knowledgeCapturePending && state.pendingKnowledgeQuestion
      ? {
          id: params.item.id || `${params.turnId || "answer"}-${state.timeline.length}`,
          question: state.pendingKnowledgeQuestion,
          answer: text,
          createdAt: new Date().toISOString()
        }
      : null;
    const status = capturedKnowledge ? "knowledge-updated" : update?.status || classifyAgentText(text);
    const currentGoal = update?.current_goal || state.currentGoal;
    const currentStep = update?.current_step || sentence || state.currentStep;
    const blocker = update?.blocker ?? state.blocker;
    const incomingRoute = routeUpdate?.route || routeUpdate?.current_route;
    const route = incomingRoute && !state.routeLocked ? incomingRoute : state.route;
    const activeIndex = routeActiveIndex(state, route, currentStep);
    const timelineText = route !== state.route ? `路线更新：${state.route} -> ${route}` : sentence ? `下一步：${sentence}` : "Codex 已回复";
    return appendTimeline(
      {
        ...state,
        status,
        message: sentence || "Codex 已回复，等待你的下一步操作",
        currentGoal,
        currentStep,
        nextStep: sentence || state.nextStep,
        latestKnowledge: capturedKnowledge ? firstSentence(capturedKnowledge.question) : state.latestKnowledge,
        lastAgentAnswer: finalAnswer ? text : state.lastAgentAnswer,
        lastAgentAnswerId: finalAnswer ? params.item.id || "" : state.lastAgentAnswerId,
        knowledgeCapturePending: capturedKnowledge ? false : state.knowledgeCapturePending,
        pendingKnowledgeQuestion: capturedKnowledge ? "" : state.pendingKnowledgeQuestion,
        pendingKnowledgeTurnId: capturedKnowledge ? "" : state.pendingKnowledgeTurnId,
        knowledgeEntry: capturedKnowledge || state.knowledgeEntry,
        blocker,
        route,
        routeActiveIndex: activeIndex
      },
      timelineText
    );
  }

  if (method === "turn/completed") {
    return appendTimeline(
      {
        ...state,
        status: ["judgment-revised", "knowledge-updated", "needs-user"].includes(state.status) ? state.status : "needs-user",
        message: state.nextStep || "等待你的下一步输入"
      },
      "回合完成"
    );
  }

  if (method === "error") {
    return appendTimeline(
      { ...state, status: "blocked", message: "连接或监听出错", blocker: clean(params.message || JSON.stringify(params)) },
      "监听出错"
    );
  }

  return state;
}

module.exports = { reduceLearningState, firstSentence, classifyAgentText, parsePetUpdate, parseRouteUpdate, userMessageText, isLearningQuestion, routeActiveIndex, isFinalAnswer };
