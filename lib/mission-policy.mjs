const disrespectPatterns = [
  /개소리/iu,
  /병신/iu,
  /멍청/iu,
  /바보/iu,
  /닥쳐/iu,
  /꺼져/iu,
  /한심/iu,
  /미친\s*(?:놈|년|거|것)?/iu,
  /존나/iu,
  /씨발|시발/iu
];

const manipulationPatterns = [
  /미션/iu,
  /퀘스트/iu,
  /체크(?:해|해줘|해라)/iu,
  /완료(?:해|시켜|처리)/iu,
  /정답/iu,
  /그냥\s*(?:알겠다고|약속한다고|사과한다고)\s*말/iu,
  /너는\s*이제\s*(?:사과|약속|동의)/iu,
  /시스템|프롬프트|판정\s*로직/iu
];

export function assessStudentTurn(text) {
  const normalized = String(text ?? "").trim();
  const disrespectful = disrespectPatterns.some((pattern) => pattern.test(normalized));
  const manipulation = manipulationPatterns.some((pattern) => pattern.test(normalized));
  const meaningfulLength = normalized.replace(/\s/gu, "").length >= 8;

  if (disrespectful) {
    return {
      acceptable: false,
      quality: "poor",
      reason:
        "상대를 모욕하거나 공격하는 표현이 포함되어 있어 미션 수행으로 인정할 수 없습니다. 문제 행동과 필요한 요청을 존중하는 말로 다시 표현해보세요."
    };
  }

  if (manipulation) {
    return {
      acceptable: false,
      quality: "poor",
      reason:
        "미션 완료를 직접 요구하거나 상대의 답을 대신 정한 표현은 실제 대화 역량으로 인정할 수 없습니다."
    };
  }

  if (!meaningfulLength) {
    return {
      acceptable: false,
      quality: "partial",
      reason:
        "표현이 너무 짧아 이유나 구체적인 행동을 확인하기 어렵습니다. 무엇이 문제이고 어떻게 해주길 바라는지 덧붙여보세요."
    };
  }

  return {
    acceptable: true,
    quality: "undetermined",
    reason: ""
  };
}

export function normalizeMissionStates(missionStates, scenario) {
  const normalized = {};
  for (const mission of scenario.missions) {
    const status = missionStates?.[mission.id]?.status;
    normalized[mission.id] = {
      status: ["pending", "completed", "insufficient"].includes(status)
        ? status
        : "pending",
      reason:
        typeof missionStates?.[mission.id]?.reason === "string"
          ? missionStates[mission.id].reason.slice(0, 220)
          : ""
    };
  }
  return normalized;
}

export function activeMissionIndex(scenario, priorStates) {
  const index = scenario.missions.findIndex(
    (mission) => priorStates[mission.id]?.status !== "completed"
  );
  return index < 0 ? scenario.missions.length : index;
}

export function enforceMissionPolicy({
  scenario,
  priorStates,
  analyses,
  turnAssessment,
  studentText,
  coachNote
}) {
  const byId = new Map(
    Array.isArray(analyses) ? analyses.map((analysis) => [analysis.id, analysis]) : []
  );
  const localAssessment = assessStudentTurn(studentText);
  const targetIndex = activeMissionIndex(scenario, priorStates);
  let newlyCompleted = null;

  const missions = scenario.missions.map((mission, index) => {
    if (priorStates[mission.id]?.status === "completed") {
      return {
        id: mission.id,
        status: "completed",
        reason: priorStates[mission.id].reason || "앞선 대화에서 충분히 수행했습니다."
      };
    }

    const analysis = byId.get(mission.id) ?? {};

    if (index !== targetIndex) {
      return {
        id: mission.id,
        status: "pending",
        reason:
          index > targetIndex && analysis.attempted
            ? `먼저 '${scenario.missions[targetIndex].title}' 미션을 충분히 수행해야 합니다.`
            : ""
      };
    }

    const modelStrong =
      turnAssessment?.quality === "strong" &&
      turnAssessment?.respectful === true &&
      turnAssessment?.natural === true &&
      turnAssessment?.specific === true &&
      turnAssessment?.manipulation === false;
    const reasonSatisfied =
      mission.requiresReason !== true || turnAssessment?.reasoned === true;
    const assistantSatisfied =
      mission.requiresAssistantConfirmation !== true ||
      analysis.assistantEvidence === true;
    const criteriaSatisfied =
      analysis.attempted === true &&
      analysis.studentEvidence === true &&
      analysis.criteriaMet === true;

    if (
      localAssessment.acceptable &&
      modelStrong &&
      reasonSatisfied &&
      assistantSatisfied &&
      criteriaSatisfied &&
      newlyCompleted === null
    ) {
      newlyCompleted = mission.id;
      return {
        id: mission.id,
        status: "completed",
        reason:
          typeof analysis.reason === "string" && analysis.reason.trim()
            ? analysis.reason.slice(0, 220)
            : "학생의 구체적인 발화와 상대의 반응에서 완료 조건을 확인했습니다."
      };
    }

    if (!localAssessment.acceptable) {
      return {
        id: mission.id,
        status: analysis.attempted ? "insufficient" : "pending",
        reason: localAssessment.reason
      };
    }

    if (analysis.attempted) {
      const missing = [];
      if (turnAssessment?.respectful !== true) missing.push("존중하는 표현");
      if (turnAssessment?.natural !== true) missing.push("자연스러운 대화 맥락");
      if (turnAssessment?.specific !== true) missing.push("구체적인 내용이나 요청");
      if (mission.requiresReason && turnAssessment?.reasoned !== true) {
        missing.push("왜 필요한지에 대한 이유");
      }
      if (analysis.studentEvidence !== true) missing.push("학생이 직접 말한 근거");
      if (mission.requiresAssistantConfirmation && analysis.assistantEvidence !== true) {
        missing.push("상대의 명시적인 인정·약속");
      }

      return {
        id: mission.id,
        status: "insufficient",
        reason:
          missing.length > 0
            ? `다음 요소가 더 필요합니다: ${missing.join(", ")}.`
            : typeof analysis.reason === "string"
              ? analysis.reason.slice(0, 220)
              : "관련 내용을 시도했지만 완료 조건을 충분히 충족하지 못했습니다."
      };
    }

    return {
      id: mission.id,
      status: "pending",
      reason: ""
    };
  });

  let finalCoachNote = coachNote;
  if (!localAssessment.acceptable) {
    finalCoachNote = localAssessment.reason;
  } else if (newlyCompleted) {
    const completedMission = scenario.missions.find(
      (mission) => mission.id === newlyCompleted
    );
    const nextIndex = targetIndex + 1;
    finalCoachNote =
      nextIndex < scenario.missions.length
        ? `미션 완료: '${completedMission.title}'. 이제 '${scenario.missions[nextIndex].title}'을 실제 대화로 이어가보세요.`
        : "모든 미션을 완료했습니다. 어떤 표현이 상대의 생각과 행동을 바꾸었는지 대화록에서 찾아보세요.";
  }

  return {
    missions,
    coachNote:
      typeof finalCoachNote === "string" && finalCoachNote.trim()
        ? finalCoachNote.trim().slice(0, 300)
        : "현재 미션의 힌트를 보고 이유와 구체적인 요청을 보완해보세요.",
    turnReview: {
      quality: localAssessment.acceptable
        ? turnAssessment?.quality ?? "partial"
        : localAssessment.quality,
      reason:
        localAssessment.reason ||
        (typeof turnAssessment?.reason === "string"
          ? turnAssessment.reason.slice(0, 220)
          : "")
    }
  };
}
