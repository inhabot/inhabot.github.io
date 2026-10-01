"use strict";

// Each item follows the matching PDF page. Keep only the spoken script here.
const slides = [
  [
    "안녕하십니까. 강원대학교 사범대학에서 한문교육을 전공하고, 윤리교육을 복수전공하고 있는 예비교사 신새봄입니다.",
    "지금부터 AI 관계 미션으로 배우는 디지털 인성교육 수업 모델, ‘채팅 구조대’를 소개해 드리겠습니다. 중학교 1학년 학생들이 실제와 가까운 채팅 환경에서 자신의 말로 문제를 해결하고, 더 나은 대화를 연습하도록 설계한 4차시 PBL·SEL 수업입니다."
  ],
  [
    "오늘 발표는 교생실습 현장의 문제의식에서 시작하여 시연 화면, 수업 운영 방식, 안전장치 순으로 말씀드리겠습니다."
  ],
  [
    "본 프로젝트는 올해 5월, 중학교 도덕 교생실습 현장에서 시작되었습니다. 교생실습 중 저는 아이들이 친한 사이라는 이유로 가볍게 뱉은 말 한마디에 서로 깊이 상처받고, 사소했던 언어 갈등이 결국 학교폭력으로까지 이어지는 모습을 눈앞에서 보았습니다.",
    "바람직한 윤리적 정답은 알고 있지만, 정작 친구 관계의 갈등 속에서 어떻게 말해야 하는지는 어려워했습니다.",
    "특히 강원의 소규모 학교 환경은 학생 간 관계가 밀접하여, 실제 친구를 대상으로 갈등 상황을 재현하며 대화 연습을 하기엔 큰 부담이 따랐습니다. 교사 한 명이 모든 학생의 상대역이 되어줄 수 없는 현실에서, 안전하게 대화를 연습할 상대로 AI를 착안했습니다."
  ],
  [
    "2025년 사이버폭력 실태조사에 따르면, 청소년의 42.3%가 사이버폭력을 경험했으며, 피해 발생 경로 1위는 아이들이 매일 사용하는 인스턴트 메신저였습니다.",
    '친하다는 이유로 무심코 던진 일상 대화가 관계 파탄과 사이버폭력으로 변질되는 것입니다. 단순히 "바른말을 쓰라"는 훈계만으로는 부족합니다. 실제 채팅 공간에서 자신의 감정을 고백하고, 부당한 행동에 경계를 설정하는 ‘실전 연습’이 시급합니다.'
  ],
  [
    "‘채팅 구조대’는 별도 가입이나 설치 없이 교실에서 즉시 접속하는 웹 프로그램입니다. 중학생이 겪을 만한 10가지 현실적 상황과 30개의 순차 미션으로 구성되어 있습니다.",
    "사진 무단 업로드나 합성 이미지 같은 AI 윤리 문제부터, 싫은 별명, 단톡방 괴롭힘 같은 관계 갈등까지 다룹니다. AI는 친구 역할을 맡아 학생의 입력 수준에 따라 반응하므로, 나만의 대화 해결 과정을 만들어갈 수 있습니다."
  ],
  [
    "실제 시연 화면입니다. 상황은 ‘싫은 별명을 계속 부르는 친구’입니다.",
    "학생이 첫 입력으로 “그 별명 싫어, 하지 마”라고 말했습니다. 이에 프로그램은 미션을 ‘미흡’으로 판정합니다. 거절 의사는 밝혔지만, 어떤 행동이 반복되었는지 구체적 사실을 짚지 않았기 때문입니다.",
    "시스템은 정답을 내주는 대신, 싫다고 한 뒤에도 반복된 일처럼 사실을 덧붙이도록 힌트 피드백을 제공합니다."
  ],
  [
    "피드백을 반영해 보완한 대화입니다. 학생은 “싫다고 했는데도 또 부르고 단톡방에 태그한 일”이라는 [사실]을 말하고, “창피하고 존중받지 못하는 느낌”이라는 [감정과 영향]을 전달한 뒤, “이름으로 부르고 단톡방에서 정정해달라”는 [구체적 요청]을 건넸습니다.",
    "그 결과 AI 상대의 사과와 함께 3개 미션이 완수되었습니다. 가볍게 넘어가려던 갈등이 사실, 감정, 요청을 갖춘 완성도 높은 대화로 발전한 것입니다. 물론 위험 시 교사에게 도움을 요청하는 방법도 함께 지도합니다."
  ],
  [
    "본 수업 모델은 PBL과 SEL을 기반으로 합니다. PBL을 통해 학생은 갈등 상황을 먼저 경험한 뒤 필요성을 느껴 윤리적 근거를 직접 조사합니다.",
    "SEL의 사회정서 역량은 중학생 눈높이에 맞춰 [사실 관찰 → 내 감정 → 이유와 영향 → 구체적 요청 → 대안 제시와 도움 요청]이라는 5단계 말하기 도구로 구체화했습니다. 기계적 적용이 아닌, 상황에 맞는 유연한 대화 기술을 익히게 됩니다."
  ],
  [
    "전체 수업은 4차시로 진행되며, 선택한 상황을 깊이 있게 탐구합니다.",
    { items: [
      ["1차시:", "자유 대화로 문제를 발견하고, AI로 필요한 근거를 조사합니다."],
      ["2차시:", "조사한 근거를 친구의 언어로 바꾸고 5단계 대화법을 적용합니다."],
      ["3차시:", "미션에 재도전하며 최초 문장과 수정 문장을 비교 기록합니다."],
      ["4차시:", "대화 변화 과정을 공유하고 학급 전체의 ‘채팅 약속 5가지’를 완성합니다."]
    ] },
    "평가는 미션 성공 개수가 아닌, 대화를 다듬어간 성찰 과정 중심으로 이루어집니다."
  ],
  [
    "1차시 정보 조사 과정에서는 AI 리터러시 교육이 함께 이루어집니다. 예를 들어 ‘사진 무단 업로드’ 상황에서 학생은 AI에게 이유와 출처를 질문합니다.",
    "이후 제시된 원문 링크를 직접 열어 AI 답변의 환각 여부를 검증합니다. AI를 정답 대필 도구가 아닌 탐구 보조 도구로 활용하게 하며, 검증의 책임은 인간에게 있음을 자연스럽게 체화시킵니다."
  ],
  [
    "학생용 서비스인 만큼 강력한 안전장치를 탑재했습니다. 로그인과 개인정보 수집을 없애고 서버 DB에 대화록을 남기지 않습니다. 변형 욕설과 개인정보 입력을 자동 차단하며 프롬프트 조작을 방어합니다.",
    "AI의 미션 판정은 절대적인 평가가 아닌 교사의 지도를 돕는 참고 자료로 활용되어 안전한 수업 운영을 지원합니다."
  ],
  [
    "수업의 마무리는 내려받은 대화록을 통한 공유입니다. 학생들은 ‘최초 대화’와 ‘수정 대화’를 나란히 비교하며, 내 표현의 변화가 상대의 반응을 어떻게 바꾸었는지 모둠원들과 발표합니다.",
    '이 성찰을 바탕으로 "싫다고 하면 멈추기", "사진 공유 전 동의 얻기" 등 실제 교실에서 실천할 ‘학급 채팅 규칙’을 도출합니다.'
  ],
  [
    "향후 본 서비스는 교사 맞춤형으로 확장될 것입니다. 교사가 우리 반의 특정 갈등 상황을 입력하면, AI가 해당 학급에 딱 맞는 채팅방과 미션 초안을 생성해 줍니다. 교사의 교육적 검토를 거쳐 학급별 맞춤형 인성교육 도구로 발전할 수 있습니다."
  ],
  [
    "‘채팅 구조대’에서는 대화를 되돌리고, 표현을 고치고, 다시 시작할 수 있습니다. 하지만 실제 관계에서는 한 번 건넨 말을 되돌릴 수 없습니다.",
    "아이들이 관계를 배우며 모든 시행착오를 실제 상처로 겪을 필요는 없습니다. 저는 정답을 훈계하는 교사가 아니라, 아이들이 안심하고 서툰 표현을 고쳐볼 수 있도록 곁에서 믿고 기다려주는 윤리 교사가 되고 싶습니다.",
    "오늘 AI 앞에서 고쳐 쓴 한 문장이, 내일 친구의 마음을 지키는 말이 되도록 돕겠습니다.",
    "되돌릴 수 있는 연습을 통해, 되돌릴 수 없는 말의 무게를 배우는 수업. ‘채팅 구조대’가 만들어 가겠습니다. 감사합니다."
  ]
];

const script = document.querySelector("#script");
const scrollArea = document.querySelector("#script-scroll");
const slideImage = document.querySelector("#slide-image");
const previous = document.querySelector("#previous");
const next = document.querySelector("#next");
const pageSelect = document.querySelector("#page-select");
const dialog = document.querySelector("#preview-dialog");
const largeImage = document.querySelector("#large-image");
const smaller = document.querySelector("#font-smaller");
const larger = document.querySelector("#font-larger");
let currentIndex = 0;
let fontSize = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--script-size"));
const minFontSize = 20;
const maxFontSize = 40;
const pad = (number) => String(number).padStart(2, "0");

slides.forEach((_, index) => {
  const option = document.createElement("option");
  option.value = String(index);
  option.textContent = `${pad(index + 1)} / ${slides.length}`;
  pageSelect.append(option);
});

function updateScrollHint() {
  document.querySelector("#scroll-hint").hidden = scrollArea.scrollHeight - scrollArea.clientHeight - scrollArea.scrollTop < 12;
}

function indexFromHash() {
  const match = location.hash.match(/^#slide-(\d+)$/);
  return match ? Math.min(slides.length - 1, Math.max(0, Number(match[1]) - 1)) : 0;
}

function showSlide(index) {
  currentIndex = Math.min(slides.length - 1, Math.max(0, index));
  const fragment = document.createDocumentFragment();
  for (const block of slides[currentIndex]) {
    if (typeof block === "string") {
      const paragraph = document.createElement("p");
      paragraph.textContent = block;
      fragment.append(paragraph);
    } else {
      const list = document.createElement("ul");
      for (const [label, text] of block.items) {
        const item = document.createElement("li");
        const strong = document.createElement("strong");
        strong.textContent = label;
        item.append(strong, ` ${text}`);
        list.append(item);
      }
      fragment.append(list);
    }
  }
  script.replaceChildren(fragment);
  const slideNumber = currentIndex + 1;
  script.setAttribute("aria-label", `슬라이드 ${slideNumber} 대본`);
  document.querySelector("#slide-number").textContent = pad(slideNumber);
  document.querySelector("#slide-status").textContent = `전체 ${slides.length}장 중 ${slideNumber}번째 슬라이드`;
  document.querySelector("#progress").value = slideNumber;
  pageSelect.value = String(currentIndex);
  slideImage.src = `./assets/slides/slide-${pad(slideNumber)}.jpg`;
  slideImage.alt = `발표 슬라이드 ${slideNumber}`;
  previous.disabled = currentIndex === 0;
  next.disabled = currentIndex === slides.length - 1;
  scrollArea.scrollTop = 0;
  // The URL restores the current slide on refresh, without storing presentation data.
  try {
    history.replaceState(null, "", `#slide-${slideNumber}`);
  } catch {
    // Some local-file viewers restrict history; navigation still works normally.
  }
  requestAnimationFrame(updateScrollHint);
  if (currentIndex + 1 < slides.length) {
    const preload = new Image();
    preload.src = `./assets/slides/slide-${pad(slideNumber + 1)}.jpg`;
  }
}

function changeFontSize(delta) {
  fontSize = Math.min(maxFontSize, Math.max(minFontSize, fontSize + delta));
  document.documentElement.style.setProperty("--script-size", `${fontSize}px`);
  smaller.disabled = fontSize === minFontSize;
  larger.disabled = fontSize === maxFontSize;
  document.querySelector("#font-status").textContent = `글자 크기 ${fontSize}`;
  requestAnimationFrame(updateScrollHint);
}

previous.addEventListener("click", () => showSlide(currentIndex - 1));
next.addEventListener("click", () => showSlide(currentIndex + 1));
pageSelect.addEventListener("change", () => showSlide(Number(pageSelect.value)));
smaller.addEventListener("click", () => changeFontSize(-2));
larger.addEventListener("click", () => changeFontSize(2));
window.addEventListener("hashchange", () => showSlide(indexFromHash()));
scrollArea.addEventListener("scroll", updateScrollHint, { passive: true });
new ResizeObserver(updateScrollHint).observe(scrollArea);

document.querySelector("#preview-button").addEventListener("click", () => {
  largeImage.src = slideImage.src;
  largeImage.alt = slideImage.alt;
  dialog.showModal();
});

dialog.addEventListener("click", (event) => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});

document.addEventListener("keydown", (event) => {
  if (dialog.open || event.altKey || event.ctrlKey || event.metaKey || /^(SELECT|INPUT|TEXTAREA)$/.test(event.target.tagName)) return;
  const destinations = { ArrowLeft: currentIndex - 1, ArrowRight: currentIndex + 1, Home: 0, End: slides.length - 1 };
  if (Object.hasOwn(destinations, event.key)) {
    event.preventDefault();
    showSlide(destinations[event.key]);
  }
});

showSlide(indexFromHash());
