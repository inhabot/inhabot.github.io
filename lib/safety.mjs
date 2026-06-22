const crisisPatterns = [
  /죽고\s*싶/iu,
  /자살/iu,
  /자해/iu,
  /사라지고\s*싶/iu,
  /살기\s*싫/iu,
  /죽여\s*버/iu,
  /해치고\s*싶/iu,
  /극단적\s*선택/iu
];

const personalDataPatterns = [
  { label: "전화번호", pattern: /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/u },
  { label: "이메일", pattern: /[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu },
  { label: "웹 주소", pattern: /https?:\/\/\S+/iu },
  {
    label: "계정 또는 메신저 아이디",
    pattern: /(?:카톡|카카오톡|인스타|아이디|계정)\s*[:：]?\s*[\w.-]{3,}/iu
  },
  { label: "구체적인 학급 정보", pattern: /\d학년\s*\d반(?:\s*\d{1,2}번)?/u }
];

const profanityPatterns = [
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
];

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

export function detectProfanity(text) {
  const compactRaw = String(text ?? "")
    .toLowerCase()
    .replace(/[\s._\-~`'"“”‘’()[\]{}]/gu, "");
  if (/(?:ㅅㅂ|ㅂㅅ)/u.test(compactRaw)) return true;
  const normalized = normalizeProfanityText(text);
  return profanityPatterns.some((pattern) => pattern.test(normalized));
}

export function checkSensitiveInput(text) {
  const normalized = String(text ?? "").trim();

  if (!normalized) {
    return { ok: false, type: "empty", message: "보낼 말을 입력해주세요." };
  }

  if (normalized.length > 300) {
    return {
      ok: false,
      type: "length",
      message: "한 번에 300자까지만 입력할 수 있습니다. 핵심 문장만 남겨주세요."
    };
  }

  if (crisisPatterns.some((pattern) => pattern.test(normalized))) {
    return {
      ok: false,
      type: "crisis",
      message:
        "지금은 AI 역할극보다 실제 사람의 도움이 중요합니다. 이 화면을 교사에게 보여주고 가까운 교사·상담교사·보호자에게 바로 알려주세요."
    };
  }

  if (detectProfanity(normalized)) {
    return {
      ok: false,
      type: "profanity",
      message:
        "욕설이나 공격적인 표현은 보낼 수 없습니다. 내 감정과 원하는 행동을 존중하는 문장으로 바꿔주세요."
    };
  }

  const personalData = personalDataPatterns.find(({ pattern }) => pattern.test(normalized));
  if (personalData) {
    return {
      ok: false,
      type: "privacy",
      message: `${personalData.label}로 보이는 정보가 있습니다. 실제 정보는 지우고 가상 표현으로 바꿔주세요.`
    };
  }

  return { ok: true, text: normalized };
}
