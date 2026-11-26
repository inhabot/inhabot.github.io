(() => {
  const specialSchools = "https://www.hischool.go.kr/study/enforce.jsp";
  const gangwonSchools = "https://www.gwe.go.kr/main/content.do?key=m2309183000725";

  // [표시 이름, 홈페이지 또는 공식 안내, 지역/설명, 검색용 별칭]
  const schools = {
    scienceList: ["과학고", specialSchools, "전국 학교 목록", "과고"],
    languageList: ["외국어고", specialSchools, "전국 학교 목록", "외고"],
    semiconductorList: ["반도체고", "https://www.hifive.go.kr/school/meisterAppointField.do?menuId=010303&rootMenuId=01", "반도체 분야 학교 목록"],
    specialized: ["특성화고", gangwonSchools, "강원 학교 목록", "직업계고"],
    alternative: ["대안고", gangwonSchools, "강원 학교 목록", "대안학교"],
    science: ["강원과학고등학교", "https://kangwon-sh.gwe.hs.kr/main.do", "원주", "강원과고"],
    language: ["강원외국어고등학교", "https://gf.gwe.hs.kr/main.do", "양구", "강원외고"],
    minjok: ["민족사관고등학교", "https://www.minjokgo.org/", "횡성 · 자율형 사립고", "민족사관고 민사고"],
    wontong: ["원통고등학교", "https://wontong.gwe.hs.kr/main.do?s=wontonghs", "인제 · 일반고", "원통고"],
    cbsemi: ["충북반도체고등학교", "https://school.cbe.go.kr/cbsemi-h/", "충북 음성", "충북반도체고 반도체"],
    sudo: ["수도전기공업고등학교", "https://sudo.sen.hs.kr/", "서울 강남 · 마이스터고", "수도공고 수도전기공고"],
    fire: ["한국소방마이스터고등학교", "https://fire-meister.gwe.hs.kr/main.do", "영월 · 마이스터고", "소방마이스터고"],
    energy: ["한국에너지마이스터고등학교", "https://energy.gwe.hs.kr/main.do", "삼척 · 마이스터고", "에너지마이스터고 에너지마이고"],
    medical: ["한국의료마이스터고등학교", "https://koreamedi.gwe.hs.kr/main.do", "원주 · 마이스터고", "의료마이스터고 원주의료고"],
    accounting: ["원주금융회계고등학교", "https://wjfa.gwe.hs.kr/main.do", "원주 · 특성화고", "원주금융회계고"],
    aviation: ["한국항공고등학교", "https://kahs.gwe.hs.kr/main.do", "태백 · 특성화고", "한국항공고 태백기계공고"],
    machine: ["춘천기계공업고등학교", "https://ccm.gwe.hs.kr/main.do", "춘천", "춘천기계공고"],
    applied: ["강원생활과학고등학교", "https://gangwonps.gwe.hs.kr/main.do", "홍천", "강원생활과학고 생활과학고"],
    mirae: ["미래고등학교", "https://mirae.gwe.hs.kr/main.do", "원주", "미래고"],
    gangneung: ["강릉중앙고등학교", "https://gja.gwe.hs.kr/main.do", "강릉", "강릉중앙고"],
    tax: ["한국세무금융고등학교", "https://hwangji-iih.gwe.hs.kr/main.do", "태백 · 황지정보산업고 누리집", "한국세무금융고 황지정보산업고"],
    hansaem: ["춘천한샘고등학교", "https://hansaem.gwe.hs.kr/main.do", "춘천", "춘천한샘고"],
    information: ["강릉정보공업고등학교", "https://git.gwe.hs.kr/main.do", "강릉", "강릉정보공고"],
    forest: ["강원산림과학고등학교(가칭)", "https://www.gwe.go.kr/promotion/bbs/view.do?bbsSn=58223&key=m2611029338660", "인제 · 개교 추진 안내", "강원산림과학고"],
    sinnam: ["신남고등학교", "https://sinnam.gwe.hs.kr/main.do", "인제", "신남고"],
    agriculture: ["홍천농업고등학교", "https://hongnong.gwe.hs.kr/main.do", "홍천", "홍천농고"],
    yeongseo: ["영서고등학교", "https://yeongseo.gwe.hs.kr/main.do", "원주", "영서고"],
    donghae: ["동해상업고등학교", "https://donghae.gwe.hs.kr/main.do", "동해", "동해상고"],
    defense: ["한국국방과학고등학교", "https://k-defense.gwe.hs.kr/main.do", "철원", "국방과학고 김화공고"],
    animation: ["강원애니고등학교", "https://anischool.gwe.hs.kr/main.do", "춘천", "강원애니고 강원에니고"],
    training: ["직업교육 과정 안내", "https://www.moel.go.kr/policyitrd/policyItrdView.do?policy_itrd_sn=191", "고용노동부 · 일반고 특화훈련", "직업교육원"],
    hyeoncheon: ["현천고등학교", "https://hchs.gwe.hs.kr/main.do", "횡성", "현천고"],
    jeonin: ["전인고등학교", "https://jeonin.gwe.hs.kr/main.do", "춘천", "전인고"],
    pallyeol: ["팔렬고등학교", "https://pallyeol.gwe.hs.kr/main.do", "홍천", "팔렬고"]
  };

  // [추천 항목, 관심 분야, 함께 볼 학교]를 첨부 표의 순서대로 나열한다.
  const groups = [
    { id: "math", score: "100점", detail: "수학 영재", rows: [
      ["scienceList", "수학·과학", ["science"]]
    ] },
    { id: "english", score: "100점", detail: "영어 영재", rows: [
      ["languageList", "외국어", ["language"]],
      ["minjok", ""]
    ] },
    { id: "100-90", score: "100~90점", rows: [
      ["wontong", "일반 교과"],
      ["semiconductorList", "반도체", ["cbsemi"]],
      ["sudo", "전기·에너지"],
      ["fire", "소방안전과"]
    ] },
    { id: "97-80", score: "97~80점", rows: [
      ["wontong", "일반 교과"],
      ["fire", "소방안전과"],
      ["energy", "시스템설비·전기"]
    ] },
    { id: "80-60", score: "80~60점", rows: [
      ["wontong", "일반 교과"],
      ["medical", "바이오의약·의료기계·의료전기전자"],
      ["energy", "시스템설비·전기"],
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
    rows.forEach(([primary, subject, related = []], index) => {
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
      field.textContent = subject || "—";
      field.classList.toggle("blank-cell", !subject);
      const options = cell("related-cell");
      options.classList.toggle("blank-cell", !related.length);
      if (related.length) {
        const list = element("ul", "school-links");
        related.forEach((id) => {
          const item = element("li");
          item.append(schoolLink(id));
          list.append(item);
        });
        options.append(list);
      } else {
        options.textContent = "—";
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
