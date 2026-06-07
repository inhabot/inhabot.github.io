import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = __dirname;
const SOURCE_DIR = path.join(ROOT, "test_source");
const ORIGINAL_DATA_PATH = path.join(ROOT, "original-study-data.js");
const QUESTION_DATA_PATH = path.join(ROOT, "study-questions-data.js");

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

  if (cleaned === "불교윤리사상") {
    return true;
  }

  if (/^\d+$/u.test(cleaned)) {
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

function scoreBlock(text, heading, fileTitle) {
  let score = 0;

  if (/[“”"‘’]/u.test(text) || /子曰|曰[:：]/u.test(text) || /[一-龥]{6,}/u.test(text)) {
    score += 6;
  }

  if (/=>|☞|※|논어|맹자|노자|장자|도덕경|금강경|법화경|화엄경/u.test(text)) {
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

    candidates.push({
      heading: currentHeading,
      text,
      order: index,
      score: scoreBlock(text, currentHeading, fileTitle),
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

function pickCandidates(candidates, count) {
  const sorted = [...candidates].sort(
    (left, right) => right.score - left.score || left.order - right.order
  );
  const picked = [];
  const used = new Set();

  for (const perHeadingLimit of [1, 2, 3, Number.POSITIVE_INFINITY]) {
    const headingCounts = new Map(
      picked.map((item) => [item.heading, picked.filter((entry) => entry.heading === item.heading).length])
    );

    for (const candidate of sorted) {
      const key = `${candidate.order}:${candidate.heading}`;
      const currentCount = headingCounts.get(candidate.heading) || 0;
      if (used.has(key) || currentCount >= perHeadingLimit) {
        continue;
      }

      picked.push(candidate);
      used.add(key);
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

function buildQuestions(file) {
  const baseTitle = baseFileTitle(file.title);
  const outline = buildOutline(file.body, file.title);
  const candidates = buildCandidates(file.body, file.title);
  const selected = pickCandidates(candidates, 9);
  const questionTypes = ["원문 위치", "소제목 연결", "원문 복기"];

  const questions = selected.map((candidate, index) => {
    const heading = cleanTitle(
      candidate.heading && !isGenericHeading(candidate.heading, file.title)
        ? candidate.heading
        : baseTitle
    );
    const promptExcerpt = shortenText(candidate.text, 165);
    const quoteExcerpt = shortenText(candidate.text, 240);
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
      explanation: `${file.title}에서 “${heading}” 파트의 핵심 원문입니다. 소제목과 핵심 문장을 함께 묶어서 떠올리면 시험장에서 구조가 훨씬 빨리 복원됩니다.`,
      quote: `원문 포인트: ${quoteExcerpt}`,
    };
  });

  if (questions.length < 9) {
    questions.push(...buildOutlineFillers(outline, 9 - questions.length));
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
