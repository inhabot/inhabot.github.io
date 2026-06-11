import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = __dirname;
const SOURCE_DIR = path.join(ROOT, "test_source");
const ORIGINAL_DATA_PATH = path.join(ROOT, "original-study-data.js");
const QUESTION_DATA_PATH = path.join(ROOT, "study-questions-data.js");
const GENERIC_HEADING_WORDS = new Set([
  "CONTENTS",
  "불교윤리사상",
  "이후",
  "이전",
  "계속",
  "정리",
  "요약",
  "마무리",
  "예시",
  "설명",
  "본문",
  "참고",
  "추가",
]);

function cleanTitle(text) {
  return String(text)
    .replace(/^#+\s*/, "")
    .replace(/^>\s?/, "")
    .replace(/^=>\s*/, "")
    .replace(/^[*-]\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function baseFileTitle(title) {
  return title.replace(/\.md$/i, "").trim();
}

function normalizeHeadingValue(text) {
  return cleanTitle(text).replace(/\(\d+\)$/u, "").trim();
}

function splitBlocks(raw) {
  return raw
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function isGenericHeading(text, fileTitle) {
  const cleaned = cleanTitle(text);
  const normalized = normalizeHeadingValue(cleaned);
  const normalizedFile = normalizeHeadingValue(baseFileTitle(fileTitle));

  if (!cleaned) {
    return true;
  }

  if (/^슬라이드\s*\d+$/u.test(cleaned)) {
    return true;
  }

  if (/^(CONTENTS|강의 개요|학습 목표|핵심 개념)$/u.test(cleaned)) {
    return true;
  }

  if (GENERIC_HEADING_WORDS.has(cleaned)) {
    return true;
  }

  if (cleaned === "불교윤리사상") {
    return true;
  }

  if (/^\d+$/u.test(cleaned)) {
    return true;
  }

  if (/^[①-⑳]$/u.test(cleaned)) {
    return true;
  }

  if (normalized === normalizedFile) {
    return true;
  }

  return false;
}

function isMetaBlock(block, fileTitle) {
  const trimmed = block.trim();
  const compact = cleanTitle(trimmed).replace(/\s+/g, "");

  if (!trimmed || trimmed === "---") {
    return true;
  }

  if (/^>?\s*원본\s*PPTX/u.test(trimmed)) {
    return true;
  }

  if (/^==>picture/i.test(compact)) {
    return true;
  }

  if (compact === "CONTENTS" || compact === "불교윤리사상") {
    return true;
  }

  if (/^\d+$/u.test(compact)) {
    return true;
  }

  if (isGenericHeading(trimmed, fileTitle) && splitBlocks(trimmed).length === 1) {
    return true;
  }

  return false;
}

function maybeHeadingFromBlock(block, fileTitle) {
  const lines = block
    .split("\n")
    .map((line) => cleanTitle(line))
    .filter(Boolean)
    .filter((line) => !/^>\s*원본/u.test(line));

  const meaningful = lines.filter((line) => !/^\d+$/u.test(line));

  if (!meaningful.length) {
    return null;
  }

  const joined = meaningful.join(" ");
  const last = meaningful[meaningful.length - 1];

  if (isGenericHeading(last, fileTitle)) {
    return null;
  }

  if (
    meaningful.length <= 3 &&
    joined.length <= 46 &&
    !/[“”"‘’]/u.test(joined) &&
    !/[.?!:]\s*$/u.test(joined)
  ) {
    return last;
  }

  return null;
}

function sanitizeBlockText(block) {
  return block
    .split("\n")
    .map((line) =>
      line
        .replace(/^#+\s*/, "")
        .replace(/^>\s?/, "")
        .replace(/^=>\s*/, "")
        .replace(/^[*-]\s+/, "")
        .replace(/^\d+\)\s*/, "")
        .replace(/^\d+\.\s+/, "")
        .trimEnd()
    )
    .filter((line) => line.trim() && !/^\d+$/u.test(line.trim()))
    .join("\n")
    .trim();
}

function analyzeTextSignals(text) {
  const flat = text.replace(/\s+/g, " ").trim();
  const hasDirectQuote = /[“”"‘’]/u.test(text);
  const hasDialogPattern =
    /子曰|曰[:：]|問曰|答曰|佛言|비구들이여|부처님께서|공자께서 말씀하셨다|맹자/u.test(text);
  const hasClassicCitation =
    /<(?!br\s*\/?)[^>\n]{1,40}>|《[^》\n]{1,40}》|『[^』\n]{1,40}』|「[^」\n]{1,40}」/iu.test(text);
  const hasTextReference =
    /논어|맹자|노자|장자|중용|대학|시경|예기|서경|주역|도덕경|금강경|법화경|화엄경|반야경|기신론|유식론|단경|중송|니카야|아함경|경전|게송|논서|소부경전|잡아함경|상응부경전/u.test(
      text
    );
  const hasLongHanText = /[\u3400-\u9fff]{4,}/u.test(flat);
  const isTableBlock = /^\|/m.test(text);

  return {
    hasDirectQuote,
    hasDialogPattern,
    hasClassicCitation,
    hasTextReference,
    hasLongHanText,
    isTableBlock,
  };
}

function buildOutline(body, fileTitle) {
  const outline = [];

  for (const block of splitBlocks(body)) {
    if (isMetaBlock(block, fileTitle)) {
      continue;
    }

    const heading = maybeHeadingFromBlock(block, fileTitle);
    if (heading && !outline.includes(heading)) {
      outline.push(heading);
    }
  }

  return outline.slice(0, 6);
}

function scoreBlock(text, heading, fileTitle, signals = analyzeTextSignals(text)) {
  let score = 0;

  if (
    signals.hasDirectQuote ||
    signals.hasDialogPattern ||
    signals.hasClassicCitation ||
    signals.hasLongHanText
  ) {
    score += 6;
  }

  if (/=>|☞|※/u.test(text) || signals.hasTextReference) {
    score += 3;
  }

  if (text.includes("\n")) {
    score += 2;
  }

  if (text.length >= 50 && text.length <= 420) {
    score += 4;
  } else if (text.length <= 760) {
    score += 2;
  } else {
    score -= 1;
  }

  if (heading && !isGenericHeading(heading, fileTitle)) {
    score += 2;
  }

  if (signals.isTableBlock && !signals.hasDirectQuote && !signals.hasLongHanText) {
    score -= 2;
  }

  return score;
}

function scoreOriginalPassage(text, signals = analyzeTextSignals(text)) {
  let score = 0;

  if (signals.hasDirectQuote) {
    score += 7;
  }

  if (signals.hasDialogPattern) {
    score += 5;
  }

  if (signals.hasClassicCitation) {
    score += 4;
  }

  if (signals.hasTextReference) {
    score += 3;
  }

  if (signals.hasLongHanText) {
    score += 5;
  }

  if (text.length >= 40 && text.length <= 360) {
    score += 3;
  } else if (text.length <= 560) {
    score += 1;
  } else {
    score -= 1;
  }

  if (signals.isTableBlock && !signals.hasDirectQuote && !signals.hasLongHanText) {
    score -= 4;
  }

  return score;
}

function buildCandidates(body, fileTitle) {
  const blocks = splitBlocks(body);
  let currentHeading = baseFileTitle(fileTitle);
  const candidates = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (isMetaBlock(block, fileTitle)) {
      continue;
    }

    const heading = maybeHeadingFromBlock(block, fileTitle);
    if (heading) {
      currentHeading = heading;
      continue;
    }

    const text = sanitizeBlockText(block);
    if (!text || text.length < 24) {
      continue;
    }

    const signals = analyzeTextSignals(text);
    candidates.push({
      heading: currentHeading,
      text,
      order: index,
      signals,
      score: scoreBlock(text, currentHeading, fileTitle, signals),
      quoteScore: scoreOriginalPassage(text, signals),
    });
  }

  return candidates;
}

function shortenText(text, maxLength) {
  const flat = text.replace(/\s*\n+\s*/g, " ").replace(/\s+/g, " ").trim();
  if (flat.length <= maxLength) {
    return flat;
  }

  const clipped = flat.slice(0, maxLength);
  const cutPoints = [
    clipped.lastIndexOf("다. "),
    clipped.lastIndexOf(". "),
    clipped.lastIndexOf("” "),
    clipped.lastIndexOf(" "),
  ].filter((value) => value >= 0);

  const cut = cutPoints.length ? Math.max(...cutPoints) : maxLength;
  const safeCut = cut > maxLength * 0.6 ? cut : maxLength;
  return `${clipped.slice(0, safeCut).trim()}...`;
}

function resolveAnswerHeading(candidate, fileTitle, baseTitle) {
  const heading = cleanTitle(
    candidate.heading && !isGenericHeading(candidate.heading, fileTitle)
      ? candidate.heading
      : baseTitle
  );
  return heading || baseTitle;
}

function pickCandidates(candidates, count, options = {}) {
  const {
    scoreKey = "score",
    excludeOrders = new Set(),
    headingLimits = [1, 2, 3, Number.POSITIVE_INFINITY],
  } = options;
  const sorted = [...candidates]
    .filter((candidate) => !excludeOrders.has(candidate.order))
    .sort(
      (left, right) =>
        (right[scoreKey] || 0) - (left[scoreKey] || 0) ||
        right.score - left.score ||
        left.order - right.order
    );
  const picked = [];
  const usedOrders = new Set();

  for (const perHeadingLimit of headingLimits) {
    const headingCounts = new Map();

    for (const existing of picked) {
      headingCounts.set(existing.heading, (headingCounts.get(existing.heading) || 0) + 1);
    }

    for (const candidate of sorted) {
      if (usedOrders.has(candidate.order)) {
        continue;
      }

      const currentCount = headingCounts.get(candidate.heading) || 0;
      if (currentCount >= perHeadingLimit) {
        continue;
      }

      picked.push(candidate);
      usedOrders.add(candidate.order);
      headingCounts.set(candidate.heading, currentCount + 1);

      if (picked.length === count) {
        return picked.sort((left, right) => left.order - right.order);
      }
    }
  }

  return picked.sort((left, right) => left.order - right.order);
}

function buildOutlineFillers(outline, countNeeded) {
  const fillers = [];
  if (!outline.length) {
    return fillers;
  }

  for (let index = 0; index < countNeeded; index += 1) {
    const current = outline[index % outline.length];
    const next = outline[(index + 1) % outline.length];

    fillers.push({
      type: "흐름 확인",
      prompt:
        outline.length > 1
          ? `이 파일의 원문 흐름에서 “${current}” 다음에 이어지는 파트를 쓰시오.`
          : `이 파일에서 반복해서 확인해야 할 핵심 파트를 쓰시오.`,
      answer: outline.length > 1 ? next : current,
      explanation:
        "전체 원문 구조를 빠르게 복기하기 위한 흐름 문제입니다. 소제목 순서를 같이 묶어서 외워 두면 회독 속도가 빨라집니다.",
      quote: `원문 포인트: ${outline.join(" -> ")}`,
    });
  }

  return fillers;
}

function detectPromptLead(text) {
  if (/논어|맹자|노자|장자|중용|대학|시경|예기|서경|주역|도덕경/u.test(text)) {
    return "다음은 동양 고전의 내용이다.";
  }

  if (
    /불교|부처님|비구들이여|경전|니카야|아함경|반야경|금강경|법화경|화엄경|기신론|유식론|중송|단경|게송/u.test(
      text
    )
  ) {
    return "다음은 불교 경전 또는 논서의 내용이다.";
  }

  return "다음은 동양 윤리 사상가의 주장이다.";
}

function buildQuoteQuestion(candidate, index, fileTitle, baseTitle) {
  const answer = resolveAnswerHeading(candidate, fileTitle, baseTitle);
  const promptLead = detectPromptLead(candidate.text);
  const excerpt = shortenText(candidate.text, 175);
  const quoteExcerpt = shortenText(candidate.text, 260);
  const styles = [
    {
      type: "원문 제시문",
      prompt: `${promptLead} 제시문과 직접 연결되는 핵심 파트를 자료 표현에 맞춰 쓰시오. “${excerpt}”`,
    },
    {
      type: "고전 원문형",
      prompt: `${promptLead} 이 원문이 설명하는 중심 내용을 자료 표현에 맞춰 쓰시오. “${excerpt}”`,
    },
    {
      type: "원문 연결형",
      prompt: `${promptLead} 시험장에서 이 원문을 보면 바로 떠올려야 할 핵심 파트 이름을 쓰시오. “${excerpt}”`,
    },
    {
      type: "원문 확인형",
      prompt: `${promptLead} 제시문의 취지를 가장 잘 드러내는 소제목 또는 핵심 개념을 자료 표현에 맞춰 쓰시오. “${excerpt}”`,
    },
    {
      type: "자료 대응형",
      prompt: `${promptLead} 이 원문이 놓이는 중심 단원을 자료 표현에 맞춰 쓰시오. “${excerpt}”`,
    },
  ];
  const selected = styles[index % styles.length];

  return {
    type: selected.type,
    prompt: selected.prompt,
    answer,
    explanation: `${fileTitle}에서 실제 원전 인용문 성격이 강한 대목입니다. “${answer}” 파트와 원문 자체를 함께 묶어 두면 교수님식 서술형 변형에도 대응하기 좋습니다.`,
    quote: `원문 포인트: ${quoteExcerpt}`,
  };
}

function buildRegularQuestion(candidate, index, fileTitle, baseTitle) {
  const heading = resolveAnswerHeading(candidate, fileTitle, baseTitle);
  const promptExcerpt = shortenText(candidate.text, 165);
  const quoteExcerpt = shortenText(candidate.text, 240);
  const questionTypes = ["원문 위치", "소제목 연결", "원문 복기"];
  const type = questionTypes[index % questionTypes.length];
  const promptMap = {
    "원문 위치": `다음 원문이 실린 파트 이름을 자료 표현에 맞춰 쓰시오. “${promptExcerpt}”`,
    "소제목 연결": `다음 설명과 대응하는 소제목을 쓰시오. “${promptExcerpt}”`,
    "원문 복기": `이 파일의 원문을 복기할 때, 아래 문장과 연결되는 파트를 쓰시오. “${promptExcerpt}”`,
  };

  return {
    type,
    prompt: promptMap[type],
    answer: heading,
    explanation: `${fileTitle}에서 “${heading}” 파트의 핵심 원문입니다. 소제목과 핵심 문장을 함께 묶어서 떠올리면 시험장에서 구조가 훨씬 빨리 복원됩니다.`,
    quote: `원문 포인트: ${quoteExcerpt}`,
  };
}

function buildQuestions(file) {
  const baseTitle = baseFileTitle(file.title);
  const outline = buildOutline(file.body, file.title);
  const candidates = buildCandidates(file.body, file.title);
  const passageSeed = candidates.filter(
    (candidate) =>
      candidate.quoteScore >= 4 ||
      candidate.signals.hasDirectQuote ||
      candidate.signals.hasDialogPattern ||
      candidate.signals.hasClassicCitation ||
      candidate.signals.hasTextReference ||
      candidate.signals.hasLongHanText
  );
  const quoteCandidates = pickCandidates(
    passageSeed.length ? passageSeed : candidates,
    5,
    { scoreKey: "quoteScore" }
  );
  const rankedPassages = [...(passageSeed.length ? passageSeed : candidates)].sort(
    (left, right) => right.quoteScore - left.quoteScore || right.score - left.score || left.order - right.order
  );
  const expandedQuoteCandidates = [...quoteCandidates];

  if (expandedQuoteCandidates.length && expandedQuoteCandidates.length < 5) {
    let pointer = 0;
    while (expandedQuoteCandidates.length < 5) {
      expandedQuoteCandidates.push(rankedPassages[pointer % rankedPassages.length]);
      pointer += 1;
    }
  }

  const usedOrders = new Set(quoteCandidates.map((candidate) => candidate.order));
  const regularCandidates = pickCandidates(candidates, 9, {
    scoreKey: "score",
    excludeOrders: usedOrders,
  });

  const questions = [
    ...expandedQuoteCandidates.map((candidate, index) =>
      buildQuoteQuestion(candidate, index, file.title, baseTitle)
    ),
    ...regularCandidates.map((candidate, index) =>
      buildRegularQuestion(candidate, index, file.title, baseTitle)
    ),
  ];

  if (regularCandidates.length < 9) {
    questions.push(...buildOutlineFillers(outline, 9 - regularCandidates.length));
  }

  return {
    focus: outline.slice(0, 4).join(", ") || "현재 test_source 원문 기준 재구성",
    extras: outline.slice(0, 4),
    outline,
    preview: outline.slice(0, 2).join(" · ") || baseTitle,
    questions,
  };
}

function sortTitles(names) {
  return [...names].sort((left, right) =>
    left.localeCompare(right, "ko", { numeric: true, sensitivity: "base" })
  );
}

function escapeForScript(text) {
  return text
    .replace(/</g, "\\u003C")
    .replace(/>/g, "\\u003E")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function writeScriptAssignment(filePath, variableName, payload) {
  const serialized = escapeForScript(JSON.stringify(payload));
  const content = `window.${variableName} = ${serialized};\n`;
  fs.writeFileSync(filePath, content, "utf8");
}

function main() {
  const files = sortTitles(
    fs.readdirSync(SOURCE_DIR).filter((name) => name.endsWith(".md")).map((name) => name.normalize("NFC"))
  ).map((title, index) => {
    const body = fs.readFileSync(path.join(SOURCE_DIR, title), "utf8").normalize("NFC").trim();
    const generated = buildQuestions({ title, body });

    return {
      id: `source-${String(index + 1).padStart(2, "0")}`,
      title,
      body,
      outline: generated.outline,
      preview: generated.preview,
      focus: generated.focus,
      extras: generated.extras,
      questions: generated.questions,
    };
  });

  const originalStudyPayload = files.map(({ id, title, body, outline, preview }) => ({
    id,
    title,
    body,
    outline,
    preview,
  }));

  const questionDeckPayload = files.map(({ id, title, focus, extras, questions, outline, preview }) => ({
    id,
    title,
    focus,
    extras,
    outline,
    preview,
    questions,
  }));

  writeScriptAssignment(ORIGINAL_DATA_PATH, "originalSourceFiles", originalStudyPayload);
  writeScriptAssignment(QUESTION_DATA_PATH, "studyQuestionDeck", questionDeckPayload);

  const questionCount = questionDeckPayload.reduce((sum, section) => sum + section.questions.length, 0);
  console.log(`Updated ${files.length} files.`);
  console.log(`Generated ${questionCount} questions.`);
  console.log(`- ${path.relative(ROOT, ORIGINAL_DATA_PATH)}`);
  console.log(`- ${path.relative(ROOT, QUESTION_DATA_PATH)}`);
}

main();
