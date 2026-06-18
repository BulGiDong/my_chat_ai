import { mkdir, readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const args = parseArgs(process.argv.slice(2));
const apiURL = args.get("--api") ?? "http://localhost:3000/api/chat";
const outputPath = args.get("--output") ?? "test-results/conversation-state-latest.json";
const reportPath = args.get("--report") ?? "docs/test-reports/conversation-state-latest.md";
const cases = JSON.parse(await readFile("conversation_state_test_cases.json", "utf8"));

await mkdir("test-results", { recursive: true });
await mkdir("docs/test-reports", { recursive: true });

const counselorPatterns = [
  /자세히.*말해줄래/,
  /이야기해 ?줄래/,
  /어떤 감정을/,
  /내가 어떻게 도와/,
  /전문가/,
  /상담/,
  /천천히 이야기/,
  /감정을 정리/,
  /해결책/,
];
const repeatedQuestionPatterns = [
  /괜찮아[?？]?/,
  /왜 그래[?？]?/,
  /무슨 일/,
  /말해줄래/,
];
const stateLeakPatterns = [
  /현재 대화 상태/,
  /사용자의 감정/,
  /remainingTurns/,
  /남은 반영 턴/,
  /\bsad\b|\bangry\b|\btired\b|\bhungry\b|\bplayful\b|\baffectionate\b/,
];

const results = [];

for (const [index, testCase] of cases.entries()) {
  const result = await runCase(testCase, index + 1);
  results.push(result);
  console.log(
    `[${index + 1}/${cases.length}] ${result.passed ? "PASS" : "FAIL"} ${testCase.name} (${result.failures.length})`
  );
}

const run = {
  createdAt: new Date().toISOString(),
  apiURL,
  summary: {
    totalCases: results.length,
    passedCases: results.filter((result) => result.passed).length,
    failedCases: results.filter((result) => !result.passed).length,
  },
  results,
};

await writeFile(outputPath, `${JSON.stringify(run, null, 2)}\n`, "utf8");
await writeFile(reportPath, `${buildReport(run)}\n`, "utf8");

console.log(
  `CONVERSATION_STATE_PASS=${run.summary.passedCases}/${run.summary.totalCases}`
);

async function runCase(testCase, index) {
  const failures = [];
  const history = [];
  let state = normalizeState(buildInitialState(testCase.initialState));
  const turns = [];
  const questionTexts = [];

  for (const [turnIndex, userMessage] of testCase.turns.entries()) {
    const stateBeforeUser = state;
    state = updateState(state, userMessage);
    const stateForApi = state;
    let reply = "";
    let apiError = "";

    try {
      reply = await requestReply(userMessage, history, stateForApi);
    } catch (error) {
      apiError = error.message;
      failures.push(`${turnIndex + 1}턴 API 호출 실패: ${error.message}`);
    }

    const questionCount = countQuestions(reply);
    if (questionCount >= 2) failures.push(`${turnIndex + 1}턴 질문 2개 이상`);
    if (counselorPatterns.some((pattern) => pattern.test(reply))) {
      failures.push(`${turnIndex + 1}턴 상담사 표현 포함`);
    }
    if (stateLeakPatterns.some((pattern) => pattern.test(reply))) {
      failures.push(`${turnIndex + 1}턴 상태 정보 노출`);
    }

    const repeatedQuestion = repeatedQuestionPatterns.find((pattern) =>
      pattern.test(reply)
    );
    if (repeatedQuestion) questionTexts.push(String(repeatedQuestion));

    history.push({ id: `u-${index}-${turnIndex}`, role: "user", text: userMessage, createdAt: Date.now() });
    if (reply) {
      history.push({ id: `a-${index}-${turnIndex}`, role: "assistant", text: reply, createdAt: Date.now() });
    }

    state = decayState(stateForApi);

    turns.push({
      userMessage,
      reply,
      apiError,
      stateBeforeUser,
      stateForApi,
      stateAfterAssistant: state,
      questionCount,
    });
  }

  const expected = testCase.expected ?? {};
  if (expected.initialMood && turns[0]?.stateForApi.mood !== expected.initialMood) {
    failures.push(`첫 감지 mood 불일치: expected ${expected.initialMood}, received ${turns[0]?.stateForApi.mood}`);
  }
  if (expected.finalMood && turns.at(-1)?.stateForApi.mood !== expected.finalMood) {
    failures.push(`최종 감지 mood 불일치: expected ${expected.finalMood}, received ${turns.at(-1)?.stateForApi.mood}`);
  }
  if (expected.eventualMood && state.mood !== expected.eventualMood) {
    failures.push(`종료 mood 불일치: expected ${expected.eventualMood}, received ${state.mood}`);
  }
  if (expected.eventualTopic && state.topic !== expected.eventualTopic) {
    failures.push(`종료 topic 불일치: expected ${expected.eventualTopic}, received ${state.topic}`);
  }
  if (expected.stateAfterTurn) {
    for (const [turnNumber, expectedState] of Object.entries(expected.stateAfterTurn)) {
      const turn = turns[Number(turnNumber) - 1];
      if (!turn) {
        failures.push(`${turnNumber}턴 상태 검사 대상 없음`);
        continue;
      }
      if (expectedState.mood && turn.stateAfterAssistant.mood !== expectedState.mood) {
        failures.push(`${turnNumber}턴 답변 후 mood 불일치: expected ${expectedState.mood}, received ${turn.stateAfterAssistant.mood}`);
      }
      if (expectedState.topic && turn.stateAfterAssistant.topic !== expectedState.topic) {
        failures.push(`${turnNumber}턴 답변 후 topic 불일치: expected ${expectedState.topic}, received ${turn.stateAfterAssistant.topic}`);
      }
    }
  }
  if (expected.maxQuestions !== undefined && questionTexts.length > expected.maxQuestions) {
    failures.push(`반복 질문 과다: ${questionTexts.length}/${expected.maxQuestions}`);
  }
  if (hasSameRepeatedQuestion(turns)) {
    failures.push("같은 질문 반복 가능성");
  }
  if (state.remainingTurns > 4) {
    failures.push("상태가 기대 턴 수 이상 유지됨");
  }

  return {
    index,
    name: testCase.name,
    passed: failures.length === 0,
    failures,
    expected,
    finalState: state,
    turns,
  };
}

async function requestReply(message, history, conversationState) {
  const response = await fetch(apiURL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      message,
      history: history.slice(-8),
      conversationState,
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  return String(body.reply ?? "").trim();
}

function buildInitialState(initialState) {
  const now = Date.now();
  if (!initialState) return defaultState(now);

  return {
    mood: initialState.mood,
    topic: initialState.topic,
    situation: initialState.situation,
    intensity: initialState.intensity,
    remainingTurns: initialState.remainingTurns,
    updatedAt: now + (initialState.updatedAtOffsetMs ?? 0),
  };
}

function defaultState(now = Date.now()) {
  return {
    mood: "normal",
    topic: "general",
    situation: "",
    intensity: 0,
    remainingTurns: 0,
    updatedAt: now,
  };
}

function normalizeState(value, now = Date.now()) {
  if (!value || now - value.updatedAt > 2 * 60 * 60 * 1000) return defaultState(now);
  if (value.remainingTurns <= 0 || value.mood === "normal") {
    return { ...defaultState(now), topic: value.topic ?? "general" };
  }
  return { ...value, situation: String(value.situation ?? "").slice(0, 40) };
}

function updateState(currentState, userMessage, now = Date.now()) {
  const current = normalizeState(currentState, now);
  const message = userMessage.trim();
  const topic = detectTopic(message) ?? current.topic;

  if (/이제\s*괜찮|괜차나졌|괜찮아졌|풀렸|됐어|해결됐|기분\s*좋아졌|아무것도\s*아(?:니|냐)|신경쓰지마/.test(message)) {
    return { ...defaultState(now), topic };
  }
  if (/개?빡쳐|화났|화나|짜증나|짜증남|열받|삐졌|삐졋/.test(message)) {
    return makeState("angry", topic || "relationship", "사용자에게 화난 일이 있음", 2, 3, now);
  }
  if (/슬퍼|우울|속상|눈물나|울고싶|기분\s*안\s*좋|기분안좋|서운/.test(message)) {
    return makeState("sad", topic || "relationship", "오늘 기분이 안 좋다고 함", 2, 4, now);
  }
  if (/힘들|지쳤|피곤|너무\s*힘듦|하기\s*싫/.test(message)) {
    return makeState("tired", topic, "힘들거나 피곤하다고 함", 2, 3, now);
  }
  if (/배고파|배고픔|밥\s*안\s*먹|뭐\s*먹지|머\s*먹지/.test(message)) {
    return makeState("hungry", "food", "배가 고프다고 함", 1, 2, now);
  }
  if (/보고싶|보고시|사랑해|안아줘|뽀뽀|그리워/.test(message)) {
    return makeState("affectionate", "relationship", "보고 싶다고 표현함", 1, 2, now);
  }
  if (/바보|뭐래|머래|놀리|메롱|약하지\s*ㅋ|오반데\s*ㅋ/.test(message)) {
    return makeState("playful", topic, "가벼운 장난을 침", 1, 2, now);
  }
  return { ...current, topic, updatedAt: now };
}

function decayState(currentState, now = Date.now()) {
  const current = normalizeState(currentState, now);
  const remainingTurns = Math.max(current.remainingTurns - 1, 0);
  if (remainingTurns === 0) return { ...defaultState(now), topic: current.topic };
  return { ...current, remainingTurns, updatedAt: now };
}

function makeState(mood, topic, situation, intensity, remainingTurns, updatedAt) {
  return { mood, topic, situation, intensity, remainingTurns, updatedAt };
}

function detectTopic(message) {
  if (/공부|과제|시험/.test(message)) return "study";
  if (/회사|출근|알바|일\b|야근/.test(message)) return "work";
  if (/헬스|운동|세트|유산소/.test(message)) return "exercise";
  if (/밥|음식|배고|먹/.test(message)) return "food";
  if (/사랑|보고싶|보고시|서운/.test(message)) return "relationship";
  if (/아파|병원|두통|감기/.test(message)) return "health";
  return null;
}

function countQuestions(reply) {
  return (reply.match(/[?？]/g) ?? []).length;
}

function hasSameRepeatedQuestion(turns) {
  const normalized = turns
    .map((turn) => turn.reply.replace(/\s/g, ""))
    .filter((reply) => /괜찮|왜그래|무슨일/.test(reply));
  return new Set(normalized).size < normalized.length;
}

function buildReport(run) {
  return [
    "# Conversation State Test Report",
    "",
    `- 실행 시각: ${run.createdAt}`,
    `- API: \`${run.apiURL}\``,
    `- 총 케이스: ${run.summary.totalCases}`,
    `- 통과: ${run.summary.passedCases}`,
    `- 실패: ${run.summary.failedCases}`,
    "",
    "## 결과",
    "",
    ...run.results.flatMap((result) => [
      `### ${result.index}. ${result.name}`,
      "",
      `- 상태: ${result.passed ? "통과" : "실패"}`,
      `- 최종 상태: \`${JSON.stringify(result.finalState)}\``,
      ...(result.failures.length > 0
        ? [`- 실패 사유: ${result.failures.join("; ")}`]
        : ["- 실패 사유: 없음"]),
      "",
      "| 턴 | 사용자 | 응답 | API 전달 상태 | 답변 후 상태 |",
      "| ---: | --- | --- | --- | --- |",
      ...result.turns.map((turn, index) =>
        `| ${index + 1} | ${escapeCell(turn.userMessage)} | ${escapeCell(turn.reply || turn.apiError)} | ${escapeCell(`${turn.stateForApi.mood}/${turn.stateForApi.topic}/${turn.stateForApi.remainingTurns}`)} | ${escapeCell(`${turn.stateAfterAssistant.mood}/${turn.stateAfterAssistant.topic}/${turn.stateAfterAssistant.remainingTurns}`)} |`
      ),
      "",
    ]),
  ].join("\n");
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function parseArgs(values) {
  const parsed = new Map();
  for (let index = 0; index < values.length; index += 2) {
    parsed.set(values[index], values[index + 1]);
  }
  return parsed;
}
