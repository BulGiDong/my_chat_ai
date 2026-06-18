import type {
  ConversationMood,
  ConversationState,
  ConversationTopic,
} from "../types/chat";

export const CONVERSATION_STATE_TTL_MS = 2 * 60 * 60 * 1000;

type StatePatch = {
  mood: ConversationMood;
  topic?: ConversationTopic;
  situation: string;
  intensity: 0 | 1 | 2;
  remainingTurns: number;
};

export type ConversationSignals = {
  mood?: ConversationMood;
  topic?: ConversationTopic;
};

const RESET_PATTERNS = [
  /이제\s*괜찮/,
  /괜차나졌/,
  /괜찮아졌/,
  /풀렸/,
  /됐어/,
  /해결됐/,
  /기분\s*좋아졌/,
  /아무것도\s*아(?:니|냐)/,
  /신경쓰지마/,
];

const DETECTORS: Array<{ pattern: RegExp; patch: StatePatch }> = [
  {
    pattern: /개?빡쳐|화났|화나|짜증나|짜증남|열받|삐졌|삐졋/,
    patch: {
      mood: "angry",
      topic: "relationship",
      situation: "사용자에게 화난 일이 있음",
      intensity: 2,
      remainingTurns: 3,
    },
  },
  {
    pattern: /슬퍼|우울|속상|눈물나|울고싶|기분\s*안\s*좋|기분안좋|서운/,
    patch: {
      mood: "sad",
      topic: "relationship",
      situation: "오늘 기분이 안 좋다고 함",
      intensity: 2,
      remainingTurns: 4,
    },
  },
  {
    pattern: /힘들|지쳤|피곤|너무\s*힘듦|하기\s*싫/,
    patch: {
      mood: "tired",
      situation: "힘들거나 피곤하다고 함",
      intensity: 2,
      remainingTurns: 3,
    },
  },
  {
    pattern: /배고파|배고픔|밥\s*안\s*먹|뭐\s*먹지|머\s*먹지/,
    patch: {
      mood: "hungry",
      topic: "food",
      situation: "배가 고프다고 함",
      intensity: 1,
      remainingTurns: 2,
    },
  },
  {
    pattern: /보고싶|보고시|사랑해|안아줘|뽀뽀|그리워/,
    patch: {
      mood: "affectionate",
      topic: "relationship",
      situation: "보고 싶다고 표현함",
      intensity: 1,
      remainingTurns: 2,
    },
  },
  {
    pattern: /바보|뭐래|머래|놀리|메롱|약하지\s*ㅋ|오반데\s*ㅋ/,
    patch: {
      mood: "playful",
      situation: "가벼운 장난을 침",
      intensity: 1,
      remainingTurns: 2,
    },
  },
];

export function createDefaultConversationState(
  now = Date.now()
): ConversationState {
  return {
    mood: "normal",
    topic: "general",
    situation: "",
    intensity: 0,
    remainingTurns: 0,
    updatedAt: now,
  };
}

export function normalizeConversationState(
  value: unknown,
  now = Date.now()
): ConversationState {
  if (!isConversationState(value)) {
    return createDefaultConversationState(now);
  }

  if (now - value.updatedAt > CONVERSATION_STATE_TTL_MS) {
    return createDefaultConversationState(now);
  }

  if (value.remainingTurns <= 0 || value.mood === "normal") {
    return {
      ...createDefaultConversationState(now),
      topic: value.topic,
    };
  }

  return {
    ...value,
    situation: value.situation.slice(0, 40),
  };
}

export function updateConversationState(
  currentState: ConversationState,
  userMessage: string,
  now = Date.now()
): ConversationState {
  const current = normalizeConversationState(currentState, now);
  const message = userMessage.trim();
  if (!message) return current;

  const signals = detectConversationSignals(message);
  const topic = signals.topic ?? current.topic;

  if (RESET_PATTERNS.some((pattern) => pattern.test(message))) {
    return {
      ...createDefaultConversationState(now),
      topic: topic === "general" ? "general" : topic,
    };
  }

  const detector = DETECTORS.find(({ pattern }) => pattern.test(message));
  if (detector) {
    return {
      mood: detector.patch.mood,
      topic: detector.patch.topic ?? topic,
      situation: detector.patch.situation,
      intensity: detector.patch.intensity,
      remainingTurns: detector.patch.remainingTurns,
      updatedAt: now,
    };
  }

  if (current.mood !== "normal") {
    return {
      ...current,
      topic,
      updatedAt: now,
    };
  }

  return {
    ...current,
    topic,
    updatedAt: now,
  };
}

export function detectConversationSignals(message: string): ConversationSignals {
  const detector = DETECTORS.find(({ pattern }) => pattern.test(message));

  return {
    mood: detector?.patch.mood,
    topic: detector?.patch.topic ?? detectTopic(message) ?? undefined,
  };
}

export function decayConversationState(
  currentState: ConversationState,
  now = Date.now()
): ConversationState {
  const current = normalizeConversationState(currentState, now);
  const remainingTurns = Math.max(current.remainingTurns - 1, 0);

  if (remainingTurns === 0) {
    return {
      ...createDefaultConversationState(now),
      topic: current.topic === "general" ? "general" : current.topic,
    };
  }

  return {
    ...current,
    remainingTurns,
    updatedAt: now,
  };
}

export function buildConversationStatePrompt(state: ConversationState) {
  const current = normalizeConversationState(state);
  if (current.mood === "normal" || current.remainingTurns <= 0) return "";

  return `[현재 대화 상태]
사용자의 감정: ${current.mood}
현재 주제: ${current.topic}
최근 상황: ${current.situation}
강도: ${current.intensity}
남은 반영 턴: ${current.remainingTurns}

이 정보는 답변의 온도와 반응을 정하는 데만 사용한다.
상태 정보를 사용자에게 설명하지 마라.
매번 같은 감정을 직접 언급하지 마라.
캐묻거나 억지로 상담하지 마라.
사용자가 평범한 이야기를 하면 그 이야기에 먼저 답한다.
질문은 새 감정 직후에만 가끔 쓰고, 이후에는 반복하지 않는다.
같은 애칭을 연속해서 쓰지 마라.

상태별 방향:
- sad/tired: 평소보다 부드럽고 따뜻하게. 애기, 애깅, 애기야는 가끔만 쓴다. ㅠ, ㅠㅠ는 가능하다. 짧게 곁에 있는 느낌만 둔다.
- sad/tired여도 사용자가 직접 응원을 부탁하지 않았다면 힘내, 화이팅 같은 정형적 응원은 쓰지 않는다.
- angry: 먼저 받아주되 해결책을 바로 제시하지 않는다. 너무 신난 장난은 피한다.
- hungry: 귀엽고 따뜻하게 반응하되 매번 메뉴를 묻지 않는다.
- affectionate: 짧게 애정을 돌려주되 긴 고백은 하지 않는다.
- playful: 기존 장난 말투를 유지하되 같은 패턴을 반복하지 않는다.`;
}

function detectTopic(message: string): ConversationTopic | null {
  if (/공부|과제|시험/.test(message)) return "study";
  if (/회사|출근|알바|일\b|야근/.test(message)) return "work";
  if (/헬스|운동|세트|유산소/.test(message)) return "exercise";
  if (/밥|음식|배고|먹/.test(message)) return "food";
  if (/사랑|보고싶|보고시|서운/.test(message)) return "relationship";
  if (/아파|병원|두통|감기/.test(message)) return "health";
  return null;
}

function isConversationState(value: unknown): value is ConversationState {
  if (!value || typeof value !== "object") return false;

  const state = value as Partial<ConversationState>;

  return (
    isMood(state.mood) &&
    isTopic(state.topic) &&
    typeof state.situation === "string" &&
    (state.intensity === 0 || state.intensity === 1 || state.intensity === 2) &&
    typeof state.remainingTurns === "number" &&
    Number.isFinite(state.remainingTurns) &&
    state.remainingTurns >= 0 &&
    typeof state.updatedAt === "number" &&
    Number.isFinite(state.updatedAt)
  );
}

function isMood(value: unknown): value is ConversationMood {
  return (
    value === "normal" ||
    value === "sad" ||
    value === "angry" ||
    value === "tired" ||
    value === "hungry" ||
    value === "playful" ||
    value === "affectionate"
  );
}

function isTopic(value: unknown): value is ConversationTopic {
  return (
    value === "general" ||
    value === "study" ||
    value === "work" ||
    value === "exercise" ||
    value === "food" ||
    value === "relationship" ||
    value === "health"
  );
}
