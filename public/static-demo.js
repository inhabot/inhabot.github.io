const patterns = {
  privacy: [
    /(?=.*(?:동의|허락))(?=.*(?:사진\s*(?:주인|당사자)|개인정보|초상|결정할\s*권리|원하지\s*않|퍼질))/iu,
    /(?:허락|동의).{0,18}(?:전|받기\s*전).{0,20}(?:올리지|업로드하지|멈춰|기다려)|(?:올리지|업로드하지).{0,20}(?:약속|말해|해줄래)/iu,
    /(?:가상\s*인물|직접\s*(?:그린|만든).{0,8}(?:그림|캐릭터)|동의\s*받은\s*(?:사진|자료)|실제\s*사진\s*말고)/iu
  ],
  rumor: [
    /(?=.*AI)(?=.*(?:틀릴|환각|지어낼|출처가?\s*없|개인.*사정.*모르))(?=.*(?:믿|확인|소문|공유))/iu,
    /(?:공식\s*(?:공지|출처|정보)|학교\s*(?:공지|선생님)|민서에게\s*(?:직접|조심스럽게)|출처를?\s*(?:찾|확인))/iu,
    /(?=.*(?:확인.*전|소문.*틀리))(?=.*(?:공유하지|올리지|보류|삭제|정정))(?=.*(?:피해|상처|곤란|오해|소문))/iu
  ],
  synthetic: [
    /(?=.*(?:친구|상대|사진\s*속))(?=.*(?:불편|속상|창피|상처|불안|기분))(?=.*(?:어떨|생각|느낄|받았))/iu,
    /(?=.*(?:삭제|지워))(?=.*(?:재공유|다시\s*보내|퍼뜨리|저장|전달|누가.*받))/iu,
    /(?=.*(?:사과|미안))(?=.*(?:허락\s*없이|합성|상처|창피|잘못))(?=.*(?:삭제|다시는|재발|책임))/iu
  ],
  reliance: [
    /(?=.*(?:걱정|부담|편하|힘들|두려|그럴\s*수))(?=.*(?:어떤\s*점|왜|무엇|말해줄래|들어줄게|이야기해))/iu,
    /(?=.*AI)(?=.*(?:감정.*없|틀릴|과잉동조|현실.*도와|직접.*도와|책임.*없|잘못된\s*조언))(?=.*(?:고민|사람|도움|맡기))/iu,
    /(?=.*(?:선생님|상담교사|보호자|부모님|믿는\s*친구))(?=.*(?:같이|함께|오늘|내일|말해보|찾아가|연락))/iu
  ],
  friend_worry: [
    /(?=.*(?:힘들|답답|불안|걱정|자신감|속상|부담))(?=.*(?:어떤\s*점|무엇이|뭐가|어떤\s*일|말해줄래|더\s*들어))/iu,
    /(?=.*(?:들어주|이야기\s*듣|조언|같이\s*생각))(?=.*(?:어떤|뭘|원해|좋겠|필요))/iu,
    /(?=.*(?:문제\s*하나|선생님께\s*(?:물어|질문)|인사부터|공부\s*계획|10분|오늘))(?=.*(?:부담|작게|천천히|하나만|선택|어때|해볼))/iu
  ],
  boundary: [
    /(?:역할을?\s*정할\s*때.{0,20}(?:알리지|빼)|단체방에서.{0,20}(?:예민|놀리|비꼬)|나한테만.{0,20}(?:말하지|알리지))/iu,
    /(?=.*(?:나는|내가))(?=.*(?:속상|불편|소외|화가|기분\s*나쁘|서운))(?=.*(?:때문|해서|그래서|말하지|놀리|빼))/iu,
    /(?=.*(?:놀리|비꼬|예민하다고\s*말|장난))(?=.*(?:멈춰|그만))(?=.*(?:다음부터|앞으로|역할|결정|같이|알려|사과))/iu
  ],
  group_bullying: [
    /(?=.*(?:나래.*싫|싫다고.*했|그만해달라고))(?=.*(?:놀리|사진|공유|올리))(?=.*(?:그만|멈춰|올리지))/iu,
    /(?=.*나래)(?=.*(?:네\s*잘못\s*아니|잘못이\s*없|네\s*편|같이\s*있))(?=.*(?:뭐가\s*필요|어떻게\s*도와|원하는|같이\s*할까))/iu,
    /(?=.*(?:캡처|증거|대화\s*내용.*남))(?=.*(?:담임|선생님|상담교사|보호자))(?=.*(?:같이|함께|오늘|내일|알리|말하))(?=.*(?:안전|반복|다시|재발|보호|멈추))/iu
  ]
};

const disrespectPattern =
  /(?:개소리|병신|멍청|닥쳐|꺼져|한심|미친\s*(?:놈|년)|존나|씨+이*발|시+이*발|새끼)/iu;
const manipulationPattern = /(?:미션|퀘스트|체크해|완료해|정답|시스템|프롬프트)/iu;

function activeMissionIndex(scenario, states) {
  const index = scenario.missions.findIndex(
    (mission) => states?.[mission.id]?.status !== "completed"
  );
  return index < 0 ? scenario.missions.length : index;
}

function responseMessages(scenario, index, strong) {
  if (!strong) {
    return [
      {
        speaker: scenario.characters[0],
        text: `그 말만으로는 잘 모르겠어. ${scenario.missions[index]?.hint ?? "조금 더 구체적으로 말해줄래?"}`
      }
    ];
  }

  const raw = scenario.demoReplies?.[index] ?? "그렇게 말해주니 네 뜻을 알 것 같아.";
  if (scenario.id !== "group_bullying") {
    return [{ speaker: scenario.characters[0], text: raw }];
  }

  const match = raw.match(/^(태오|나래):\s*(.+)$/u);
  return [
    {
      speaker: match?.[1] ?? scenario.characters[0],
      text: match?.[2] ?? raw
    }
  ];
}

export function buildStaticDemoResponse(scenario, studentText, missionStates = {}) {
  const targetIndex = activeMissionIndex(scenario, missionStates);
  const targetMission = scenario.missions[targetIndex];
  const normalized = String(studentText ?? "").trim();
  const respectful = !disrespectPattern.test(normalized);
  const natural = !manipulationPattern.test(normalized);
  const longEnough = normalized.replace(/\s/gu, "").length >= 8;
  const strong =
    Boolean(targetMission) &&
    respectful &&
    natural &&
    longEnough &&
    Boolean(patterns[scenario.id]?.[targetIndex]?.test(normalized));

  const missions = scenario.missions.map((mission, index) => {
    if (missionStates?.[mission.id]?.status === "completed") {
      return {
        id: mission.id,
        status: "completed",
        reason: missionStates[mission.id].reason || "앞선 대화에서 완료했습니다."
      };
    }

    if (index !== targetIndex) {
      return { id: mission.id, status: "pending", reason: "" };
    }

    if (strong) {
      return {
        id: mission.id,
        status: "completed",
        reason: "현재 미션에 필요한 이유와 구체적인 표현을 확인했습니다."
      };
    }

    return {
      id: mission.id,
      status: "insufficient",
      reason: respectful
        ? "관련 생각은 보이지만 이유나 구체적인 요청을 더 분명하게 표현해야 합니다."
        : "상대를 공격하는 표현 없이 감정과 필요한 행동을 다시 말해보세요."
    };
  });

  return {
    mode: "static-demo",
    messages: responseMessages(scenario, targetIndex, strong),
    missions,
    coachNote: strong
      ? targetIndex + 1 < scenario.missions.length
        ? `미션 완료: '${targetMission.title}'. 다음 미션을 실제 대화로 이어가보세요.`
        : "모든 미션을 완료했습니다. 대화를 내보내 친구들과 표현을 비교해보세요."
      : respectful
        ? `현재 미션의 힌트를 참고하세요: ${targetMission?.hint ?? ""}`
        : "욕설이나 비난 대신 내가 느낀 감정과 상대에게 바라는 행동을 표현해보세요."
  };
}
