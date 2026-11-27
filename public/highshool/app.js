(() => {
  const specialSchools = "https://www.hischool.go.kr/study/enforce.jsp";
  const gangwonSchools = "https://www.gwe.go.kr/main/content.do?key=m2309183000725";
  const careerGuide = "https://www.gvhs.kr/";

  // [표시 이름, 홈페이지 또는 공식 안내, 지역/설명, 검색용 별칭]
  const schools = {
    scienceList: ["과학고", specialSchools, "전국 학교 목록", "과고"],
    languageList: ["외국어고", specialSchools, "전국 학교 목록", "외고"],
    semiconductorList: ["반도체고", "https://www.hifive.go.kr/school/meisterAppointField.do?menuId=010303&rootMenuId=01", "반도체 분야 학교 목록"],
    specialized: ["특성화고", careerGuide + "71eeb259-2151-4560-83e2-e0d66e82339b", "강원 학교 목록", "직업계고"],
    alternative: ["대안고", gangwonSchools, "강원 학교 목록", "대안학교"],
    science: ["강원과학고등학교", "https://kangwon-sh.gwe.hs.kr/main.do", "원주", "강원과고"],
    language: ["강원외국어고등학교", "https://gf.gwe.hs.kr/main.do", "양구 · 일반고", "강원외고"],
    minjok: ["민족사관고등학교", "https://www.minjokgo.org/", "횡성 · 자율형 사립고", "민족사관고 민사고"],
    wontong: ["원통고등학교", "https://wontong.gwe.hs.kr/main.do?s=wontonghs", "인제 · 일반고", "원통고"],
    cbsemi: ["충북반도체고등학교", "https://www.hischool.go.kr/school/view.do?idx=2353", "충북 음성 · 고입정보포털", "충북반도체고 반도체"],
    sudo: ["수도전기공업고등학교", "https://www.hischool.go.kr/school/view.do?idx=1533", "서울 강남 · 고입정보포털", "수도공고 수도전기공고"],
    fire: ["한국소방마이스터고등학교", careerGuide + "c830299e-7dc9-4c7f-8121-fc743b18b423", "영월 · 마이스터고", "소방마이스터고 한국소방고 소방안전과"],
    energy: ["한국에너지마이스터고등학교", careerGuide + "b4b1ec90-ccb9-41d7-8718-4546de3f864c", "삼척 · 마이스터고", "에너지마이스터고 에너지마이고 에너지고"],
    medical: ["한국의료마이스터고등학교", careerGuide + "67e9e1e6-abbb-4a05-b88d-27990086b14e", "원주 · 마이스터고", "의료마이스터고 원주의료고"],
    accounting: ["원주금융회계고등학교", careerGuide + "32ca3f05-ef05-4098-8cb4-3f591f8af8cf", "원주 · 특성화고", "원주금융회계고"],
    aviation: ["한국항공고등학교", careerGuide + "1cad4163-5e50-41d5-ba20-5fe0631310a8", "태백 · 특성화고", "한국항공고 태백기계공고"],
    machine: ["춘천기계공업고등학교", careerGuide + "fee33cfb-30a8-4311-bdc1-8031e08cf81a", "춘천", "춘천기계공고"],
    applied: ["강원생활과학고등학교", careerGuide + "d2492aae-3629-4db5-a5c8-8a987ca2a9ec", "홍천", "강원생활과학고 생활과학고"],
    mirae: ["미래고등학교", careerGuide + "edb0a5b6-9178-4f86-9f75-82c191feda12", "원주", "미래고"],
    gangneung: ["강릉중앙고등학교", careerGuide + "1f824a12-3d22-430e-885b-e20f995ce2f4", "강릉", "강릉중앙고"],
    tax: ["한국세무금융고등학교", careerGuide + "bc728a30-5373-4f1e-ac18-6b7d72f688c4", "태백 · 황지정보산업고", "한국세무금융고 황지정보산업고"],
    hansaem: ["춘천한샘고등학교", careerGuide + "212fd726-7718-4d34-903a-2b6a8a406aa8", "춘천", "춘천한샘고"],
    information: ["강릉정보공업고등학교", careerGuide + "e8c5719a-1f98-4609-b31b-1943101169e4", "강릉", "강릉정보공고"],
    forest: ["강원산림과학고등학교(가칭)", careerGuide + "1e4e2d28-525f-4aba-aec2-80a9911d6b15", "인제 · 개교 추진 안내", "강원산림과학고"],
    sinnam: ["신남고등학교", "https://sinnam.gwe.hs.kr/main.do", "인제", "신남고"],
    agriculture: ["홍천농업고등학교", careerGuide + "8c68f630-fa61-4b90-aeea-a1931a68f1f9", "홍천", "홍천농고"],
    yeongseo: ["영서고등학교", careerGuide + "cdff251f-50a7-45d4-9ee2-8e8eac672a25", "원주", "영서고"],
    donghae: ["동해상업고등학교", careerGuide + "fad0ebad-5ff6-4b65-916a-b77ab40b2e8f", "동해", "동해상고"],
    defense: ["한국국방과학고등학교", careerGuide + "587581bc-5d5a-40e8-bd04-992bedadb96a", "철원", "국방과학고 김화공고"],
    animation: ["강원애니고등학교", careerGuide + "d2a5d3b4-664f-4af2-8a0c-9114a2adf932", "춘천", "강원애니고 강원에니고"],
    training: ["직업교육 과정 안내", "https://www.moel.go.kr/policyitrd/policyItrdView.do?policy_itrd_sn=191", "고용노동부 · 일반고 특화훈련", "직업교육원"],
    hyeoncheon: ["현천고등학교", "https://hchs.gwe.hs.kr/main.do", "횡성", "현천고"],
    jeonin: ["전인고등학교", "https://jeonin.gwe.hs.kr/main.do", "춘천", "전인고"],
    pallyeol: ["팔렬고등학교", "https://pallyeol.gwe.hs.kr/main.do", "홍천", "팔렬고"]
  };

  const wontongPreparation = "예비고1 국,영,수 내신 1등급 준비할것!";
  const meisterQuote = "기숙학교라 규칙강함. 국영수보다는 이공계 과목을 배움. 문학소년,소녀는 오지말것,";
  const fireNote = {
    quote: [
      meisterQuote,
      "한국소방고: 중학교 과학 2.3학년 과정 철저하게 복습할것. 핸드폰,태블릿 사용 제한됨.",
      "소방고는 에너지고에 비해 성적이 훨 높고 규율이 강하거든..."
    ].join("\n"),
    context: "학교별 선발 기준과 생활 규정은 해당 학년도 안내에서 확인하세요.",
    link: ["소방고 기숙사 운영 규정", "https://fire-meister.gwe.hs.kr/boardCnts/list.do?boardID=57111&m=120602&s=youngwol_th"]
  };
  const energyNote = {
    quote: meisterQuote,
    link: ["에너지고 기숙사 안내", "https://energy.gwe.hs.kr/boardCnts/list.do?boardID=26116&m=0307&s=seths"]
  };

  // [추천 항목, 관심 분야, 함께 볼 학교, 주의할 점]
  const groups = [
    { id: "math", score: "100점", detail: "수학 영재", rows: [
      ["scienceList", "수학이 재미있어 미,적분정도 풀어보는 수준만 지원.,", ["science"], {
        fieldQuote: true,
        link: ["강원과학고 입학전형 안내", "https://kangwon-sh.gwe.hs.kr/boardCnts/list.do?boardID=23257&m=0201&s=kangwonsh"]
      }]
    ] },
    { id: "english", score: "100점", detail: "영어 영재", rows: [
      ["languageList", "외국어", ["language"]],
      ["minjok", "(연 수업료 등 1억 필요할 수 있음!)", [], {
        fieldQuote: true,
        context: "인용문의 금액은 작성자의 추정입니다. 실제 수업료와 기타 비용은 학교 자료에서 확인하세요.",
        link: ["민사고 예결산·수익자부담 자료", "https://www.minjok.hs.kr/board/bbs562?page=1"]
      }]
    ] },
    { id: "100-90", score: "100~90점", rows: [
      ["wontong", wontongPreparation, [], { fieldQuote: true }],
      ["semiconductorList", "반도체", ["cbsemi"]],
      ["sudo", "전기·에너지"],
      ["fire", "소방안전관리과", [], fireNote]
    ] },
    { id: "97-80", score: "97~80점", rows: [
      ["wontong", wontongPreparation, [], {
        fieldQuote: true,
        quote: "원통고: 예비고일 국영수 내신 1등급준비 완료할 것, 수학,영어과목 급격한 학습지체 주의!!"
      }],
      ["fire", "소방안전관리과", [], fireNote],
      ["energy", "시스템설비과·전기과", [], energyNote]
    ] },
    { id: "80-60", score: "80~60점", rows: [
      ["wontong", wontongPreparation, [], {
        fieldQuote: true,
        quote: "원통고: 현 성적으로 입학 할 경우 수,영,물리,화학 순으로 수업시간 잠 자게 될수 있음.  3년 학습지체 주의! 상위 34% 까지만 지방 국립대 경영학과정도 도전 가능함.",
        context: "인용문의 34%는 작성자 의견입니다. 대학별 전형 기준과 전년도 결과는 대입정보포털에서 확인하세요.",
        link: ["대학별 전형 평가기준·입시 결과", "https://www.adiga.kr/uct/acd/ade/criteriaAndResultView.do?menuId=PCUCTACD2000"]
      }],
      ["medical", "바이오의약·의료기계·의료전기전자"],
      ["energy", "시스템설비과·전기과", [], energyNote],
      ["accounting", "금융회계과"],
      ["aviation", "항공"],
      ["specialized", "자동차", ["machine", "applied", "mirae"]],
      ["specialized", "반도체", ["mirae", "gangneung"]],
      ["specialized", "세무금융·정보", ["tax"]],
      ["specialized", "뷰티·미용", ["applied", "mirae", "hansaem", "information"]],
      ["specialized", "보건·간호", ["machine", "applied", "mirae", "information"]],
      ["specialized", "전기", ["machine", "applied", "mirae"]],
      ["specialized", "산림과학", ["forest", "sinnam"]]
    ] },
    { id: "60-40", score: "60~40점", rows: [
      ["specialized", "동물생명·케어", ["agriculture", "applied", "yeongseo"]],
      ["specialized", "세무금융", ["donghae"]],
      ["specialized", "부사관·국방", ["defense", "donghae"]],
      ["specialized", "만화·애니메이션", ["animation"]],
      ["specialized", "식품산업·요리", ["hansaem", "yeongseo", "applied"]],
      ["specialized", "SNS 마케팅", ["hansaem", "yeongseo"]]
    ] },
    { id: "under-40", score: "40점 이하", rows: [
      ["alternative", "대안교육·직업교육", ["training", "hyeoncheon", "jeonin", "pallyeol"]]
    ] }
  ];

  const table = document.querySelector("#school-table");
  const frame = document.querySelector(".table-frame");
  const tableInfo = document.querySelector(".table-info");
  const filters = document.querySelector("#score-filters");
  const search = document.querySelector("#school-search");
  const count = document.querySelector("#result-count");
  const empty = document.querySelector("#empty");
  const reset = document.querySelector("#reset-search");
  let score = "";

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content) node.textContent = content;
    return node;
  }

  function schoolLink(id) {
    const [name, url, detail] = schools[id];
    const link = element("a", "school-link");
    const title = element("span", "link-name", name);
    const arrow = element("span", "link-arrow", "↗");
    arrow.setAttribute("aria-hidden", "true");
    title.append(arrow);
    link.href = url;
    link.append(title, element("small", "link-detail", detail));
    return link;
  }

  function cell(className) {
    const node = element("td", className);
    node.setAttribute("role", "cell");
    return node;
  }

  function authorQuote(text) {
    const quote = element("blockquote", "author-quote", text);
    quote.setAttribute("aria-label", "작성자 의견");
    return quote;
  }

  function createGroup(group, rows) {
    const body = element("tbody");
    body.setAttribute("role", "rowgroup");
    const heading = element("th", "score-cell");
    heading.scope = "rowgroup";
    heading.rowSpan = rows.length;
    heading.setAttribute("role", "rowheader");
    heading.append(element("strong", "score-value", group.score));
    if (group.detail) heading.append(element("span", "score-detail", group.detail));

    let recommendation;
    rows.forEach(([primary, subject, related = [], note], index) => {
      const row = element("tr");
      row.setAttribute("role", "row");
      if (index === 0) row.append(heading);

      const sameAsPrevious = primary === rows[index - 1]?.[0];
      const sameAsNext = primary === rows[index + 1]?.[0];
      if (sameAsPrevious || sameAsNext) row.classList.add("shared-primary");
      if (sameAsPrevious) {
        recommendation.rowSpan += 1;
      } else {
        recommendation = cell("primary-cell");
        recommendation.append(schoolLink(primary));
        row.append(recommendation);
      }

      const field = cell("field-cell");
      if (note?.fieldQuote) field.append(authorQuote(subject));
      else field.textContent = subject || "—";
      field.classList.toggle("blank-cell", !subject);
      const options = cell("related-cell");
      const hasGuidance = Boolean(note?.quote || note?.context || note?.link);
      options.classList.toggle("blank-cell", !related.length && !hasGuidance);
      if (related.length) {
        const list = element("ul", "school-links");
        related.forEach((id) => {
          const item = element("li");
          item.append(schoolLink(id));
          list.append(item);
        });
        options.append(list);
      } else if (!hasGuidance) {
        options.textContent = "—";
      }
      if (hasGuidance) {
        const guidance = element("div", "row-guidance");
        if (note.quote) guidance.append(authorQuote(note.quote));
        if (note.context) guidance.append(element("p", "", note.context));
        if (note.link) {
          const [label, url] = note.link;
          const link = element("a", "guidance-link", label);
          link.href = url;
          guidance.append(link);
        }
        options.append(guidance);
      }
      row.append(field, options);
      body.append(row);
    });
    return body;
  }

  function normalize(value) {
    return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  }

  function render() {
    const terms = search.value.trim().split(/\s+/u).map(normalize).filter(Boolean);
    const bodies = [];
    let shownRows = 0;
    for (const group of groups) {
      if (score && group.id !== score) continue;
      const matches = group.rows.filter(([primary, subject, related = []]) => {
        const schoolNames = [primary, ...related].flatMap((id) => {
          const [name, , detail, aliases = ""] = schools[id];
          return [name, detail, aliases];
        });
        const text = normalize([group.score, group.detail, subject, ...schoolNames].join(" "));
        return terms.every((term) => text.includes(term));
      });
      if (!matches.length) continue;
      bodies.push(createGroup(group, matches));
      shownRows += matches.length;
    }

    for (const body of Array.from(table.tBodies)) body.remove();
    table.append(...bodies);
    frame.hidden = shownRows === 0;
    empty.hidden = shownRows > 0;
    count.textContent = `추천 항목 ${shownRows}개`;
    for (const button of filters.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", String(button.dataset.score === score));
    }
  }

  function saveFilters() {
    if (location.protocol === "file:") {
      history.replaceState({ score, query: search.value }, "");
      return;
    }
    const url = new URL(location.href);
    if (score) url.searchParams.set("score", score);
    else url.searchParams.delete("score");
    if (search.value.trim()) url.searchParams.set("q", search.value.trim());
    else url.searchParams.delete("q");
    history.replaceState(history.state, "", url);
  }

  function restoreFilters() {
    const params = new URLSearchParams(location.search);
    const fileState = location.protocol === "file:" ? history.state : null;
    const savedScore = fileState?.score ?? params.get("score");
    score = groups.some((group) => group.id === savedScore) ? savedScore : "";
    search.value = fileState?.query ?? params.get("q") ?? "";
    render();
  }

  for (const group of groups) {
    const label = group.detail ? `${group.detail} ${group.score}` : group.score;
    const button = element("button", "", label);
    button.type = "button";
    button.dataset.score = group.id;
    filters.append(button);
  }

  filters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-score]");
    if (!button) return;
    score = button.dataset.score;
    saveFilters();
    render();
  });
  search.addEventListener("input", () => {
    saveFilters();
    render();
  });
  reset.addEventListener("click", () => {
    score = "";
    search.value = "";
    saveFilters();
    render();
    search.focus();
  });
  window.addEventListener("popstate", () => {
    if (location.protocol === "file:") return;
    const params = new URLSearchParams(location.search);
    if ((params.get("score") || "") !== score || (params.get("q") || "") !== search.value.trim()) {
      restoreFilters();
    }
  });
  if (location.protocol === "file:") {
    document.addEventListener("click", (event) => {
      if (event.target.closest('a[href^="https:"]')) saveFilters();
    });
  }

  filters.hidden = false;
  search.closest("label").hidden = false;
  tableInfo.hidden = false;
  restoreFilters();
})();
