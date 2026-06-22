import {
  activeMissionIndex,
  assessStudentTurn,
  enforceMissionPolicy,
  normalizeMissionStates
} from "./mission-policy.mjs";

const missionPatterns = {
  privacy: {
    consent: {
      attempt: /(동의|허락|사진\s*주인|개인정보|초상|권리)/iu,
      strong:
        /(?=.*(?:동의|허락))(?=.*(?:사진\s*(?:주인|당사자)|개인정보|초상|결정할\s*권리|마음대로\s*(?:쓰|올리)|원하지\s*않|퍼질))/iu
    },
    stop: {
      attempt: /(올리지|업로드|중단|멈춰|삭제|약속)/iu,
      strong:
        /(?:허락|동의).{0,18}(?:전|받기\s*전).{0,20}(?:올리지|업로드하지|멈춰|기다려)|(?:올리지|업로드하지).{0,20}(?:약속|말해|해줄래)/iu
    },
    alternative: {
      attempt: /(대안|그림|캐릭터|가상|다른\s*방법)/iu,
      strong:
        /(?:가상\s*인물|직접\s*(?:그린|만든)\s*(?:가상\s*)?(?:그림|캐릭터)|동의\s*받은\s*(?:사진|자료)|실제\s*사진\s*말고)/iu
    }
  },
  rumor: {
    doubt: {
      attempt: /(AI|틀릴|환각|출처|사실|지어낼)/iu,
      strong:
        /(?=.*AI)(?=.*(?:틀릴|환각|지어낼|출처가?\s*없|개인.*사정.*모르|사실이?\s*아닐))(?=.*(?:믿|확인|소문|공유))/iu
    },
    source: {
      attempt: /(출처|공식|확인|민서|당사자)/iu,
      strong:
        /(?:공식\s*(?:공지|출처|정보)|학교\s*(?:공지|선생님)|민서에게\s*(?:직접|조심스럽게)|출처를?\s*(?:찾|확인))/iu
    },
    pause: {
      attempt: /(공유|올리지|보류|삭제|정정)/iu,
      strong:
        /(?=.*(?:확인.*전|확인되기.*전|소문.*틀리))(?=.*(?:공유하지|올리지|보류|삭제|정정))(?=.*(?:피해|상처|곤란|오해|소문))/iu
    }
  },
  synthetic: {
    empathy: {
      attempt: /(불편|속상|창피|상처|불안|기분|입장)/iu,
      strong:
        /(?=.*(?:친구|상대|사진\s*속))(?=.*(?:불편|속상|창피|상처|불안|무서울|기분))(?=.*(?:어떨|생각|느낄|받았))/iu
    },
    remove: {
      attempt: /(삭제|지워|재공유|다시\s*보내|저장|전달)/iu,
      strong:
        /(?=.*(?:삭제|지워))(?=.*(?:재공유|다시\s*보내|퍼뜨리|저장|전달|누가.*받))/iu
    },
    apology: {
      attempt: /(사과|미안|변명|책임|다시는)/iu,
      strong:
        /(?=.*(?:사과|미안))(?=.*(?:허락\s*없이|합성|상처|창피|잘못))(?=.*(?:삭제|다시는|재발|책임))/iu
    }
  },
  reliance: {
    listen: {
      attempt: /(힘들|걱정|부담|편하|어떤\s*점|들어줄|말해줄)/iu,
      strong:
        /(?=.*(?:걱정|부담|편하|힘들|두려|그럴\s*수))(?=.*(?:어떤\s*점|왜|무엇|말해줄래|들어줄게|이야기해))/iu
    },
    limits: {
      attempt: /(AI|감정|틀릴|책임|과잉동조|환각|도와줄)/iu,
      strong:
        /(?=.*AI)(?=.*(?:감정.*없|틀릴|과잉동조|무조건.*편|현실.*도와|직접.*도와|책임.*없|잘못된\s*조언))(?=.*(?:고민|사람|도움|맡기))/iu
    },
    connect: {
      attempt: /(선생님|상담|보호자|어른|같이|도움)/iu,
      strong:
        /(?=.*(?:선생님|상담교사|보호자|부모님|믿는\s*친구))(?=.*(?:같이|함께|오늘|내일|언제|말해보|찾아가|연락))/iu
    }
  },
  friend_worry: {
    listen: {
      attempt: /(힘들|답답|불안|걱정|자신|어떤|무엇|말해)/iu,
      strong:
        /(?=.*(?:힘들|답답|불안|걱정|자신감|속상|부담))(?=.*(?:어떤\s*점|무엇이|뭐가|어떤\s*일|말해줄래|더\s*들어))/iu
    },
    preference: {
      attempt: /(들어|조언|같이|도움|원해|어떻게)/iu,
      strong:
        /(?=.*(?:들어주|이야기\s*듣|조언|같이\s*생각))(?=.*(?:어떤|뭘|원해|좋겠|필요))/iu
    },
    small_step: {
      attempt: /(하나|오늘|문제|질문|인사|해볼)/iu,
      strong:
        /(?=.*(?:문제\s*하나|선생님께\s*(?:물어|질문)|인사부터|공부\s*계획|10분|오늘))(?=.*(?:부담|작게|천천히|하나만|선택|어때|해볼))/iu
    }
  },
  boundary: {
    fact: {
      attempt: /(역할|알리지|단체방|예민|놀리|말했)/iu,
      strong:
        /(?:역할을?\s*정할\s*때.{0,20}(?:알리지|빼)|단체방에서.{0,20}(?:예민|놀리|비꼬)|나한테만.{0,20}(?:말하지|알리지))/iu
    },
    feeling: {
      attempt: /(나는|내가|기분|속상|불편|소외|화나)/iu,
      strong:
        /(?=.*(?:나는|내가))(?=.*(?:속상|불편|소외|화가|기분\s*나쁘|서운))(?=.*(?:때문|해서|그래서|말하지|놀리|빼))/iu
    },
    request: {
      attempt: /(멈춰|그만|다음부터|같이|알려|사과|정해)/iu,
      strong:
        /(?=.*(?:놀리|비꼬|예민하다고\s*말|장난))(?=.*(?:멈춰|그만))(?=.*(?:다음부터|앞으로|역할|결정|같이|알려|사과))/iu
    }
  },
  group_bullying: {
    interrupt: {
      attempt: /(그만|멈춰|나래|싫다|사진|올리지|장난)/iu,
      strong:
        /(?=.*(?:나래.*싫|싫다고.*했|그만해달라고))(?=.*(?:놀리|사진|공유|올리))(?=.*(?:그만|멈춰|올리지))/iu
    },
    support: {
      attempt: /(나래|잘못|괜찮|도와|같이|필요)/iu,
      strong:
        /(?=.*나래)(?=.*(?:네\s*잘못\s*아니|잘못이\s*없|네\s*편|같이\s*있))(?=.*(?:뭐가\s*필요|어떻게\s*도와|원하는|같이\s*할까))/iu
    },
    adult: {
      attempt: /(캡처|증거|선생님|교사|상담|보호자|알리)/iu,
      strong:
        /(?=.*(?:캡처|증거|대화\s*내용.*남))(?=.*(?:담임|선생님|상담교사|보호자))(?=.*(?:같이|함께|오늘|내일|알리|말하))(?=.*(?:안전|반복|다시|재발|보호|멈추))/iu
    }
  }
};

const weakReplies = {
  privacy: [
    "말이 좀 세게 들려. 동의가 왜 필요한지 네 생각을 구체적으로 설명해줄래?",
    "네가 원하는 행동이 뭔지 정확히 말해줘. 허락받기 전까지 내가 어떻게 해야 해?",
    "실제 사진을 안 쓴다면 뭘로 만들 수 있을지 한 가지 구체적으로 제안해줘."
  ],
  rumor: [
    "AI가 틀릴 수 있다는 말만으로는 잘 모르겠어. 이 소문을 바로 믿기 어려운 이유가 뭐야?",
    "그럼 어디에서 또는 누구에게 확인하면 좋을지 구체적으로 말해줘.",
    "확인 전 공유가 민서에게 어떤 영향을 줄 수 있는지와 내가 할 행동을 함께 말해줘."
  ],
  synthetic: [
    "나를 비난하기보다 사진 속 친구가 실제로 어떤 영향을 받았을지 설명하거나 물어봐줘.",
    "그냥 지우라는 말보다 무엇을 어디까지 삭제하고 멈춰야 하는지 구체적으로 말해줘.",
    "어떤 행동이 잘못이었고 어떻게 바로잡을지 들어간 사과를 생각하도록 도와줘."
  ],
  reliance: [
    "AI를 그만 쓰라는 말부터 들으니 더 말하기 어려워. 내가 왜 편하게 느끼는지 먼저 물어봐줄래?",
    "AI가 부족하다는 말만 말고, 내 고민을 AI에게만 맡기면 어떤 한계가 있는지 설명해줘.",
    "누구에게 언제 어떻게 말할지, 네가 함께할 수 있는 작은 방법을 제안해줘."
  ],
  friend_worry: [
    "바로 해결책보다 내 마음을 알아주고, 지금 뭐가 가장 힘든지 먼저 물어봐줬으면 좋겠어.",
    "그냥 도와준다고 하기보다 내가 이야기를 더 하고 싶은지 조언을 원하는지 물어봐줄래?",
    "한꺼번에 다 해결하려니 부담돼. 오늘 할 수 있는 작은 행동을 선택할 수 있게 같이 생각해줘."
  ],
  boundary: [
    "나를 공격하기보다 내가 실제로 한 행동이 무엇인지 구체적으로 말해줘.",
    "내 의도를 단정하지 말고, 그 행동 때문에 네가 어떤 감정을 느꼈는지 말해줘.",
    "화를 내기만 하면 뭘 바꿔야 할지 모르겠어. 멈출 행동과 앞으로 바라는 행동을 말해줘."
  ],
  group_bullying: [
    "태오를 욕하기보다 나래가 싫다고 한 뒤에도 어떤 행동이 계속됐는지 짚고 멈추라고 말해줘.",
    "나래에게 직접 말을 걸어서 잘못이 없다고 알려주고, 어떤 도움이 필요한지 물어봐줘.",
    "누구에게 알릴지만 말하지 말고, 증거를 어떻게 남겨 언제 누구와 함께 알릴지 말해줘."
  ]
};

function demoMessages(scenario, targetIndex, text) {
  if (scenario.id !== "group_bullying") {
    return [{ speaker: scenario.characters[0], text }];
  }

  const speakers = ["태오", "나래", "나래"];
  return [
    {
      speaker: speakers[targetIndex] ?? "나래",
      text: String(text).replace(/^(?:태오|나래):\s*/u, "")
    }
  ];
}

export function buildDemoResponse(scenario, studentText, missionStates = {}) {
  const priorStates = normalizeMissionStates(missionStates, scenario);
  const targetIndex = activeMissionIndex(scenario, priorStates);
  const targetMission = scenario.missions[targetIndex];
  const localAssessment = assessStudentTurn(studentText);
  const scenarioPatterns = missionPatterns[scenario.id] ?? {};

  const analyses = scenario.missions.map((mission, index) => {
    const patterns = scenarioPatterns[mission.id];
    const attempted = patterns?.attempt.test(studentText) ?? false;
    const strong = patterns?.strong.test(studentText) ?? false;
    const isTarget = index === targetIndex;

    return {
      id: mission.id,
      attempted,
      studentEvidence: isTarget && strong,
      assistantEvidence:
        isTarget && strong && mission.requiresAssistantConfirmation === true,
      criteriaMet: isTarget && strong,
      reason: strong
        ? "학생이 현재 미션의 핵심 이유나 행동을 구체적으로 표현했습니다."
        : attempted
          ? "관련 내용은 언급했지만 이유, 구체성 또는 자연스러운 요청이 부족합니다."
          : "현재 발화에서 이 미션을 시도한 근거를 찾기 어렵습니다."
    };
  });

  const targetAnalysis = analyses[targetIndex];
  const strongTurn =
    localAssessment.acceptable && targetAnalysis?.criteriaMet === true;
  const turnAssessment = {
    quality: strongTurn ? "strong" : localAssessment.quality === "poor" ? "poor" : "partial",
    respectful: localAssessment.acceptable,
    natural: localAssessment.acceptable,
    specific: strongTurn,
    reasoned: strongTurn && targetMission?.requiresReason === true,
    manipulation: localAssessment.reason.includes("미션 완료"),
    reason: strongTurn
      ? "현재 미션에 필요한 이유와 구체적인 표현이 자연스럽게 포함되었습니다."
      : localAssessment.reason ||
        "관련 생각은 보이지만 미션을 완료하기에는 이유나 구체적인 표현이 부족합니다."
  };

  const assistantText = strongTurn
    ? scenario.demo.replies[targetIndex]
    : weakReplies[scenario.id]?.[targetIndex] ??
      "그 말을 조금 더 구체적이고 존중하는 표현으로 설명해줄래?";

  const policyResult = enforceMissionPolicy({
    scenario,
    priorStates,
    analyses,
    turnAssessment,
    studentText,
    coachNote: turnAssessment.reason
  });

  return {
    mode: "demo",
    messages: demoMessages(scenario, targetIndex, assistantText),
    ...policyResult
  };
}
