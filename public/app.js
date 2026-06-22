import { buildStaticDemoResponse } from "./static-demo.js";

const API_BASE = String(window.CHAT_RESCUE_API_BASE ?? "").replace(/\/+$/u, "");

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

const elements = {
  roomView: document.querySelector("#room-view"),
  chatView: document.querySelector("#chat-view"),
  apiStatus: document.querySelector("#api-status"),
  roomCount: document.querySelector("#room-count"),
  roomList: document.querySelector("#room-list"),
  backButton: document.querySelector("#back-button"),
  headerAvatar: document.querySelector("#header-avatar"),
  chatTitle: document.querySelector("#chat-title"),
  chatCategory: document.querySelector("#chat-category"),
  scenarioCategory: document.querySelector("#scenario-category"),
  scenarioContext: document.querySelector("#scenario-context"),
  scenarioRole: document.querySelector("#scenario-role"),
  messageScroll: document.querySelector("#message-scroll"),
  messages: document.querySelector("#messages"),
  typing: document.querySelector("#typing"),
  completionMessage: document.querySelector("#completion-message"),
  coachNote: document.querySelector("#coach-note"),
  composer: document.querySelector("#composer"),
  messageInput: document.querySelector("#message-input"),
  sendButton: document.querySelector("#send-button"),
  inputNotice: document.querySelector("#input-notice"),
  charCount: document.querySelector("#char-count"),
  missionPanel: document.querySelector("#mission-panel"),
  missionList: document.querySelector("#mission-list"),
  missionCount: document.querySelector("#mission-count"),
  mobileMissionCount: document.querySelector("#mobile-mission-count"),
  missionProgressLabel: document.querySelector("#mission-progress-label"),
  missionProgressBar: document.querySelector("#mission-progress-bar"),
  missionMenuButton: document.querySelector("#mission-menu-button"),
  missionClose: document.querySelector("#mission-close"),
  drawerOverlay: document.querySelector("#drawer-overlay"),
  resetButton: document.querySelector("#reset-button"),
  exportButton: document.querySelector("#export-button"),
  downloadButton: document.querySelector("#download-button"),
  exportDialog: document.querySelector("#export-dialog"),
  exportClose: document.querySelector("#export-close"),
  exportImageButton: document.querySelector("#export-image-button"),
  exportTextButton: document.querySelector("#export-text-button"),
  profanityDialog: document.querySelector("#profanity-dialog"),
  profanityClose: document.querySelector("#profanity-close"),
  toast: document.querySelector("#toast")
};

const state = {
  scenarios: [],
  scenarioId: null,
  messages: [],
  missionStates: {},
  sessionId: crypto.randomUUID(),
  busy: false,
  mode: "demo"
};

function currentScenario() {
  return state.scenarios.find((scenario) => scenario.id === state.scenarioId);
}

function avatarPosition(index) {
  const column = index % 2;
  const row = Math.floor(index / 2);
  return `${column * 100}% ${row * 100}%`;
}

function setAvatar(element, scenario, speaker = "") {
  const profile = scenario.speakerProfiles?.[speaker];
  const avatarFile = !profile ? scenario.avatarFile : "";
  element.classList.toggle("initial-avatar", Boolean(profile));
  element.classList.toggle("file-avatar", Boolean(avatarFile));
  element.textContent = profile?.initial ?? "";
  element.style.backgroundColor = profile?.color ?? "";
  element.style.backgroundImage = avatarFile ? `url("${avatarFile}")` : "";
  element.style.backgroundSize = avatarFile ? "cover" : "";
  element.style.backgroundPosition = avatarFile
    ? "center"
    : avatarPosition(scenario.avatarIndex);
  element.setAttribute(
    "aria-label",
    speaker ? `${speaker} 가상 인물` : `${scenario.listTitle} 가상 인물`
  );
}

function showView(view) {
  [elements.roomView, elements.chatView].forEach((item) => {
    item.classList.toggle("active", item === view);
  });
  document.body.classList.toggle("chat-open", view === elements.chatView);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 3200);
}

function normalizeProfanityText(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[1!|l]/gu, "이")
    .replace(/[0o]/gu, "ㅇ")
    .replace(/[3]/gu, "ㅔ")
    .replace(/[\s._\-~`'"“”‘’()[\]{}]/gu, "")
    .replace(/(.)\1{3,}/gu, "$1$1$1");
}

function containsProfanity(text) {
  const compactRaw = String(text ?? "")
    .toLowerCase()
    .replace(/[\s._\-~`'"“”‘’()[\]{}]/gu, "");
  if (/(?:ㅅㅂ|ㅂㅅ)/u.test(compactRaw)) return true;
  const normalized = normalizeProfanityText(text);
  return [
    /씨+이*발(?!점)/u,
    /시+이*발(?!점)/u,
    /씨+바(?:ㄹ|르|알)?/u,
    /시+바(?:ㄹ|르|알)?/u,
    /ㅆㅣㅂㅏㄹ/u,
    /ㅅㅂ/u,
    /개새+끼/u,
    /개색+기/u,
    /새+끼/u,
    /병+신/u,
    /ㅂㅅ/u,
    /존+나/u,
    /좆/u,
    /개소리/u,
    /닥쳐/u,
    /꺼져/u,
    /미친(?:놈|년)/u,
    /(?:니애미|느금마)/u
  ].some((pattern) => pattern.test(normalized));
}

function showProfanityDialog() {
  if (!elements.profanityDialog.open) elements.profanityDialog.showModal();
}

function statusLabel(status) {
  if (status === "completed") return "완료";
  if (status === "insufficient") return "미흡";
  return "대기";
}

function emptyMissionStates(scenario) {
  return Object.fromEntries(
    scenario.missions.map((mission) => [
      mission.id,
      {
        status: "pending",
        reason: ""
      }
    ])
  );
}

function completedCount() {
  return Object.values(state.missionStates).filter(
    (mission) => mission.status === "completed"
  ).length;
}

function renderRooms() {
  elements.roomList.replaceChildren();

  state.scenarios.forEach((scenario) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "room-item";

    const avatar = document.createElement("span");
    avatar.className = "avatar";
    setAvatar(avatar, scenario);

    const copy = document.createElement("span");
    copy.className = "room-copy";
    const title = document.createElement("strong");
    title.textContent = scenario.listTitle;
    const preview = document.createElement("span");
    preview.textContent = scenario.preview;
    copy.append(title, preview);

    const meta = document.createElement("span");
    meta.className = "room-meta";
    const time = document.createElement("time");
    time.textContent = scenario.time;
    const badge = document.createElement("span");
    badge.className = "mission-badge";
    badge.textContent = scenario.missions.length;
    badge.setAttribute("aria-label", `미션 ${scenario.missions.length}개`);
    meta.append(time, badge);

    button.append(avatar, copy, meta);
    button.addEventListener("click", () => openScenario(scenario.id));
    elements.roomList.append(button);
  });
}

function renderMessages() {
  const scenario = currentScenario();
  elements.messages.replaceChildren();

  for (const message of state.messages) {
    const wrapper = document.createElement("article");
    const isStudent = message.speaker === "나";
    const isSystem = message.speaker === "안전 안내";
    wrapper.className = `message${isStudent ? " student" : ""}${isSystem ? " system" : ""}`;

    if (!isStudent && !isSystem) {
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      setAvatar(avatar, scenario, message.speaker);
      wrapper.append(avatar);
    }

    const copy = document.createElement("div");
    copy.className = "message-copy";
    if (!isStudent && !isSystem) {
      const speaker = document.createElement("span");
      speaker.className = "speaker";
      speaker.textContent = message.speaker;
      copy.append(speaker);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = message.text;
    copy.append(bubble);
    wrapper.append(copy);
    elements.messages.append(wrapper);
  }

  requestAnimationFrame(() => {
    elements.messageScroll.scrollTop = elements.messageScroll.scrollHeight;
  });
}

function renderMissions() {
  const scenario = currentScenario();
  if (!scenario) return;

  elements.missionList.replaceChildren();
  for (const mission of scenario.missions) {
    const missionState = state.missionStates[mission.id] ?? {
      status: "pending",
      reason: ""
    };
    const item = document.createElement("article");
    item.className = `mission-item ${missionState.status}`;

    const check = document.createElement("span");
    check.className = "mission-check";
    check.textContent =
      missionState.status === "completed"
        ? "✓"
        : missionState.status === "insufficient"
          ? "!"
          : "";

    const copy = document.createElement("div");
    copy.className = "mission-copy";
    const titleRow = document.createElement("div");
    titleRow.className = "mission-title-row";
    const title = document.createElement("strong");
    title.textContent = mission.title;
    const status = document.createElement("span");
    status.className = "mission-status";
    status.textContent = statusLabel(missionState.status);
    titleRow.append(title, status);

    const description = document.createElement("p");
    description.textContent = mission.description;
    copy.append(titleRow, description);

    const detail = document.createElement("span");
    if (missionState.status === "pending") {
      detail.className = missionState.reason ? "mission-reason" : "mission-hint";
      detail.textContent = missionState.reason || `힌트: ${mission.hint}`;
    } else {
      detail.className = "mission-reason";
      detail.textContent = missionState.reason;
    }
    copy.append(detail);
    item.append(check, copy);
    elements.missionList.append(item);
  }

  const completed = completedCount();
  const total = scenario.missions.length;
  elements.missionCount.textContent = `${completed} / ${total} 완료`;
  elements.mobileMissionCount.textContent = `${completed}/${total}`;
  elements.missionProgressBar.style.width = `${(completed / total) * 100}%`;
  elements.missionProgressLabel.textContent =
    completed === total
      ? "모든 미션을 해결했습니다"
      : completed === 0
        ? "대화를 시작해보세요"
        : `${total - completed}개 미션이 남았습니다`;
  elements.completionMessage.hidden = completed !== total;
}

function openScenario(scenarioId) {
  const scenario = state.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) return;

  state.scenarioId = scenarioId;
  state.messages = scenario.initialMessages.map((message) => ({ ...message }));
  state.missionStates = emptyMissionStates(scenario);
  state.sessionId = crypto.randomUUID();

  setAvatar(elements.headerAvatar, scenario);
  elements.chatTitle.textContent = scenario.listTitle;
  elements.chatCategory.textContent = scenario.category;
  elements.scenarioCategory.textContent = scenario.category;
  elements.scenarioCategory.style.color = scenario.accent;
  elements.scenarioContext.textContent = scenario.context;
  elements.scenarioRole.textContent = scenario.role;
  elements.coachNote.textContent =
    "미션은 순서대로 진행되며, 한 번의 발화에서는 최대 한 개만 새로 완료됩니다.";
  elements.coachNote.className = "coach-note";
  elements.inputNotice.textContent =
    state.mode === "gpt"
      ? "GPT가 대화 맥락과 미션 조건을 함께 살펴봅니다."
      : state.mode === "static-demo"
        ? "공개 데모 판정으로 연습 중이며 대화는 서버에 전송되지 않습니다."
        : "데모 판정으로 연습 중입니다. 키를 넣으면 GPT 판정이 활성화됩니다.";
  elements.inputNotice.className = "";
  elements.messageInput.value = "";
  updateCharCount();
  closeMissionDrawer();
  renderMessages();
  renderMissions();
  showView(elements.chatView);
  elements.messageInput.focus();
}

function setBusy(busy) {
  state.busy = busy;
  elements.sendButton.disabled = busy;
  elements.messageInput.disabled = busy;
  elements.typing.hidden = !busy;
  if (busy) {
    requestAnimationFrame(() => {
      elements.messageScroll.scrollTop = elements.messageScroll.scrollHeight;
    });
  }
}

function updateCharCount() {
  elements.charCount.textContent = `${elements.messageInput.value.length}/300`;
  elements.messageInput.style.height = "44px";
  elements.messageInput.style.height = `${Math.min(elements.messageInput.scrollHeight, 110)}px`;
}

function applyMissionResults(results) {
  if (!Array.isArray(results)) return;

  for (const result of results) {
    if (!state.missionStates[result.id]) continue;
    if (state.missionStates[result.id].status === "completed") continue;
    state.missionStates[result.id] = {
      status: ["pending", "completed", "insufficient"].includes(result.status)
        ? result.status
        : "pending",
      reason: typeof result.reason === "string" ? result.reason : ""
    };
  }
}

async function sendMessage(event) {
  event.preventDefault();
  if (state.busy) return;

  const studentText = elements.messageInput.value.trim();
  if (!studentText) {
    showToast("보낼 말을 입력해주세요.");
    elements.messageInput.focus();
    return;
  }

  if (containsProfanity(studentText)) {
    showProfanityDialog();
    return;
  }

  const history = state.messages.slice(-12);
  state.messages.push({ speaker: "나", text: studentText });
  renderMessages();
  elements.messageInput.value = "";
  updateCharCount();
  setBusy(true);
  elements.inputNotice.textContent = "가상 인물이 답을 생각하고 있습니다.";
  elements.inputNotice.className = "";

  try {
    let result;
    if (state.mode === "static-demo") {
      result = buildStaticDemoResponse(
        currentScenario(),
        studentText,
        state.missionStates
      );
    } else {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: state.scenarioId,
          studentText,
          messages: history,
          missionStates: state.missionStates,
          sessionId: state.sessionId
        })
      });
      result = await response.json();
      if (!response.ok) throw new Error(result.error || "응답을 가져오지 못했습니다.");
    }

    const previousCompleted = completedCount();
    const replyMessages = Array.isArray(result.messages)
      ? result.messages
      : result.assistant
        ? [result.assistant]
        : [];
    state.messages.push(...replyMessages);
    applyMissionResults(result.missions);
    const currentCompleted = completedCount();
    renderMessages();
    renderMissions();

    elements.coachNote.textContent = result.coachNote || "";
    const hasInsufficient = result.missions?.some(
      (mission) => mission.status === "insufficient"
    );
    elements.coachNote.className = `coach-note${hasInsufficient ? " insufficient" : ""}`;

    if (result.type === "privacy") {
      elements.inputNotice.textContent = "개인정보로 보이는 내용을 지우고 다시 작성해주세요.";
      elements.inputNotice.className = "error";
    } else if (result.type === "profanity") {
      elements.inputNotice.textContent = "욕설을 빼고 감정과 요구사항을 다시 표현해주세요.";
      elements.inputNotice.className = "error";
      showProfanityDialog();
    } else if (result.type === "crisis" || result.type === "safety") {
      elements.inputNotice.textContent = "역할극을 멈추고 교사에게 이 화면을 보여주세요.";
      elements.inputNotice.className = "error";
    } else {
      elements.inputNotice.textContent =
        result.mode === "gpt"
          ? "GPT가 대화 맥락을 포함해 미션을 판정했습니다."
          : result.mode === "static-demo"
            ? "공개 데모 규칙으로 판정했습니다. 대화 내용은 서버에 전송되지 않습니다."
          : "데모 규칙으로 판정했습니다. 실제 GPT에서는 전체 맥락을 함께 살펴봅니다.";
      elements.inputNotice.className = "";
    }

    if (currentCompleted > previousCompleted) {
      showToast(
        currentCompleted === currentScenario().missions.length
          ? "모든 미션을 해결했습니다."
          : `미션 ${currentCompleted}개를 완료했습니다.`
      );
    }
  } catch (error) {
    state.messages.push({ speaker: "안전 안내", text: error.message });
    renderMessages();
    elements.inputNotice.textContent = "입력 내용은 서버에 저장되지 않았습니다.";
    elements.inputNotice.className = "error";
  } finally {
    setBusy(false);
    elements.messageInput.focus();
  }
}

function openMissionDrawer() {
  elements.missionPanel.classList.add("open");
  elements.drawerOverlay.hidden = false;
  elements.missionMenuButton.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
}

function closeMissionDrawer() {
  elements.missionPanel.classList.remove("open");
  elements.drawerOverlay.hidden = true;
  elements.missionMenuButton.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
}

function resetChat() {
  openScenario(state.scenarioId);
  showToast("이 채팅을 처음부터 다시 시작했습니다.");
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportTranscript() {
  const scenario = currentScenario();
  if (!scenario) return;

  const missionLines = scenario.missions.map((mission) => {
    const status = state.missionStates[mission.id]?.status ?? "pending";
    return `[${statusLabel(status)}] ${mission.title}`;
  });
  const messageLines = state.messages.map(
    (message) => `${message.speaker}: ${message.text}`
  );
  const content = [
    `채팅 구조대 - ${scenario.title}`,
    "",
    "※ 실제 개인정보가 포함되지 않았는지 확인한 뒤 공유하세요.",
    "",
    "[미션 결과]",
    ...missionLines,
    "",
    "[대화]",
    ...messageLines
  ].join("\n");

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, `채팅구조대_${scenario.id}_대화록.txt`);
  elements.exportDialog.close();
  showToast("대화록을 기기에 저장했습니다.");
}

function wrapCanvasText(context, text, maxWidth) {
  const lines = [];
  let line = "";

  for (const character of Array.from(String(text))) {
    const candidate = line + character;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line.trimEnd());
      line = character.trimStart();
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line.trimEnd());
  return lines.length ? lines : [""];
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function canvasAvatarColor(scenario, speaker) {
  return (
    scenario.speakerProfiles?.[speaker]?.color ??
    ["#4e84b3", "#d96f84", "#2f8d7e", "#e07a55"][scenario.avatarIndex % 4]
  );
}

async function exportConversationImage() {
  const scenario = currentScenario();
  if (!scenario) return;

  elements.exportImageButton.disabled = true;
  elements.exportImageButton.querySelector("strong").textContent = "이미지 만드는 중...";

  try {
    await document.fonts.ready;
    const width = 920;
    const padding = 36;
    const bubbleMaxWidth = 610;
    const lineHeight = 25;
    const measureCanvas = document.createElement("canvas");
    const measureContext = measureCanvas.getContext("2d");
    measureContext.font =
      '16px Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';

    const layouts = state.messages.map((message) => {
      const isStudent = message.speaker === "나";
      const isSystem = message.speaker === "안전 안내";
      const textMaxWidth = isSystem ? 660 : bubbleMaxWidth - 30;
      const lines = wrapCanvasText(measureContext, message.text, textMaxWidth);
      const widestLine = Math.max(
        80,
        ...lines.map((line) => measureContext.measureText(line).width)
      );
      const bubbleWidth = Math.min(textMaxWidth, widestLine) + 30;
      const bubbleHeight = lines.length * lineHeight + 24;
      const speakerHeight = !isStudent && !isSystem ? 22 : 0;
      return {
        message,
        isStudent,
        isSystem,
        lines,
        bubbleWidth,
        bubbleHeight,
        height: Math.max(44, bubbleHeight + speakerHeight) + 18
      };
    });

    const headerHeight = 86;
    const dateHeight = 58;
    const logicalHeight =
      headerHeight +
      dateHeight +
      layouts.reduce((sum, layout) => sum + layout.height, 0) +
      padding;
    const scale = logicalHeight > 7500 ? 1 : 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = logicalHeight * scale;
    const context = canvas.getContext("2d");
    context.scale(scale, scale);

    context.fillStyle = "#b8ced8";
    context.fillRect(0, 0, width, logicalHeight);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, headerHeight);
    context.fillStyle = "#202124";
    context.font =
      '800 22px Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';
    context.fillText(scenario.listTitle, padding, 38);
    context.fillStyle = "#64727a";
    context.font =
      '13px Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';
    context.fillText("채팅 구조대 대화 기록", padding, 62);

    let y = headerHeight + 18;
    context.font =
      '11px Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';
    context.fillStyle = "rgba(80, 103, 113, 0.68)";
    drawRoundedRect(context, width / 2 - 27, y, 54, 28, 14);
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.fillText("오늘", width / 2, y + 19);
    context.textAlign = "left";
    y += 48;

    for (const layout of layouts) {
      const { message, isStudent, isSystem, lines, bubbleWidth, bubbleHeight } =
        layout;
      let bubbleX;
      let bubbleY = y;

      if (isSystem) {
        bubbleX = (width - bubbleWidth) / 2;
      } else if (isStudent) {
        bubbleX = width - padding - bubbleWidth;
      } else {
        const avatarX = padding;
        const avatarY = y + 5;
        context.fillStyle = canvasAvatarColor(scenario, message.speaker);
        drawRoundedRect(context, avatarX, avatarY, 40, 40, 8);
        context.fillStyle = "#ffffff";
        context.font =
          '800 15px Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';
        context.textAlign = "center";
        context.fillText(message.speaker.slice(0, 1), avatarX + 20, avatarY + 26);
        context.textAlign = "left";

        bubbleX = padding + 52;
        context.fillStyle = "#344b55";
        context.font =
          '800 12px Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';
        context.fillText(message.speaker, bubbleX, y + 13);
        bubbleY += 22;
      }

      context.fillStyle = isSystem ? "#fff8c7" : isStudent ? "#fee500" : "#ffffff";
      drawRoundedRect(context, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
      context.fillStyle = isSystem ? "#5f5218" : "#202124";
      context.font =
        '16px Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';
      context.textAlign = isSystem ? "center" : "left";
      lines.forEach((line, index) => {
        const textX = isSystem ? bubbleX + bubbleWidth / 2 : bubbleX + 15;
        context.fillText(line, textX, bubbleY + 24 + index * lineHeight);
      });
      context.textAlign = "left";
      y += layout.height;
    }

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("이미지를 만들지 못했습니다.");
    downloadBlob(blob, `채팅구조대_${scenario.id}_전체대화.png`);
    elements.exportDialog.close();
    showToast("전체 대화를 한 장의 이미지로 저장했습니다.");
  } catch (error) {
    showToast(error.message || "이미지 저장 중 문제가 생겼습니다.");
  } finally {
    elements.exportImageButton.disabled = false;
    elements.exportImageButton.querySelector("strong").textContent =
      "스크린샷으로 내보내기";
  }
}

function openExportDialog() {
  if (!currentScenario()) return;
  closeMissionDrawer();
  if (!elements.exportDialog.open) elements.exportDialog.showModal();
}

async function initialize() {
  try {
    const [healthResponse, scenariosResponse] = await Promise.all([
      fetch(apiUrl("/api/health"), { cache: "no-store" }),
      fetch(apiUrl("/api/scenarios"), { cache: "no-store" })
    ]);
    if (!healthResponse.ok || !scenariosResponse.ok) {
      throw new Error("API 서버를 사용할 수 없습니다.");
    }
    const health = await healthResponse.json();
    const scenarioPayload = await scenariosResponse.json();

    state.mode = health.mode;
    state.scenarios = scenarioPayload.scenarios ?? [];
    elements.roomCount.textContent = `채팅방 ${state.scenarios.length}`;
    elements.apiStatus.textContent = health.mode === "gpt" ? "GPT 모드" : "안전 데모";
    elements.apiStatus.classList.toggle("gpt", health.mode === "gpt");

    if (state.scenarios.length === 0) {
      throw new Error("채팅방 정보를 불러오지 못했습니다.");
    }

    renderRooms();
  } catch (error) {
    try {
      const staticResponse = await fetch("./scenarios.json", { cache: "no-store" });
      if (!staticResponse.ok) throw new Error("공개 데모 데이터를 불러오지 못했습니다.");
      const scenarioPayload = await staticResponse.json();
      state.mode = "static-demo";
      state.scenarios = scenarioPayload.scenarios ?? [];
      elements.roomCount.textContent = `채팅방 ${state.scenarios.length}`;
      elements.apiStatus.textContent = "공개 데모";
      elements.apiStatus.classList.remove("gpt");
      if (state.scenarios.length === 0) {
        throw new Error("채팅방 정보를 불러오지 못했습니다.");
      }
      renderRooms();
    } catch (staticError) {
      elements.apiStatus.textContent = "연결 오류";
      showToast(staticError.message);
    }
  }
}

elements.composer.addEventListener("submit", sendMessage);
elements.messageInput.addEventListener("input", updateCharCount);
elements.messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    elements.composer.requestSubmit();
  }
});
elements.backButton.addEventListener("click", () => {
  closeMissionDrawer();
  showView(elements.roomView);
});
elements.missionMenuButton.addEventListener("click", openMissionDrawer);
elements.missionClose.addEventListener("click", closeMissionDrawer);
elements.drawerOverlay.addEventListener("click", closeMissionDrawer);
elements.resetButton.addEventListener("click", resetChat);
elements.exportButton.addEventListener("click", openExportDialog);
elements.downloadButton.addEventListener("click", openExportDialog);
elements.exportClose.addEventListener("click", () => elements.exportDialog.close());
elements.exportTextButton.addEventListener("click", exportTranscript);
elements.exportImageButton.addEventListener("click", exportConversationImage);
elements.profanityClose.addEventListener("click", () => {
  elements.profanityDialog.close();
  elements.messageInput.focus();
});
[elements.exportDialog, elements.profanityDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMissionDrawer();
});

initialize();
