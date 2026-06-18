import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const buildDir = join(root, ".tone-retrieval-test-build");

function compileForTest(relativePath) {
  const sourcePath = join(root, relativePath);
  const outputPath = join(buildDir, relativePath.replace(/\.ts$/, ".js"));
  const result = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: sourcePath,
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, result.outputText, "utf8");
}

rmSync(buildDir, { recursive: true, force: true });
compileForTest("lib/conversation-state.ts");
compileForTest("lib/tone-example-retriever.ts");
compileForTest("lib/tone-output-guard.ts");

const { retrieveToneExamples } = require(
  join(buildDir, "lib", "tone-example-retriever.js")
);
const { validateToneOutput } = require(
  join(buildDir, "lib", "tone-output-guard.js")
);

const cases = [
  ["평범한 일상", "나 집왔어", "casual"],
  ["평범한 일상", "오늘 쉬는중", "casual"],
  ["뭐 하는지", "오빠 머해", "what_doing"],
  ["뭐 하는지", "지금 모해", "what_doing"],
  ["뭐 하는지", "머하구있어", "what_doing"],
  ["공부", "나 공부중", "study"],
  ["공부", "과제하는중이야", "study"],
  ["공부", "시험 공부했어", "study"],
  ["운동", "오늘 운동했어", "exercise"],
  ["운동", "헬스 가는중", "exercise"],
  ["운동", "유산소 끝", "exercise"],
  ["음식", "배고파", "food"],
  ["음식", "밥 먹었어", "food"],
  ["음식", "뭐 먹지", "food"],
  ["피곤함", "나 너무 피곤해", "emotion"],
  ["피곤함", "오늘 진짜 지쳤어", "emotion"],
  ["슬픔", "나 오늘 슬퍼", "emotion"],
  ["슬픔", "너무 속상해", "emotion"],
  ["화남", "아 진짜 화나", "emotion"],
  ["화남", "개빡쳐", "emotion"],
  ["보고 싶음", "보고싶어", "affection"],
  ["사랑 표현", "사랑해", "affection"],
  ["사랑 표현", "안아줘", "affection"],
  ["장난", "바보 ㅋㅋ", "play"],
  ["장난", "메롱", "play"],
  ["장난", "뭐래 ㅋㅋ", "play"],
  ["약속", "내일 데이트하자", "planning"],
  ["약속", "주말에 만나자", "planning"],
  ["수면", "나 이제 잘거야", "sleep"],
  ["수면", "졸려 죽겠어", "sleep"],
];

const details = [];
let passed = 0;

try {
  for (const [category, message, expectedTag] of cases) {
    const selected = retrieveToneExamples({ userMessage: message });
    assert.ok(selected.length <= 5, `${message}: 최대 개수 초과`);
    assert.equal(
      new Set(selected.map((item) => item.reply)).size,
      selected.length,
      `${message}: 중복 reply 선택`
    );
    assert.ok(
      selected.some((item) => item.tags.includes(expectedTag)),
      `${message}: ${expectedTag} 태그 예시 없음 (${selected.map((item) => item.id)})`
    );
    passed += 1;
    details.push({ category, message, expectedTag, selected });
  }

  const irrelevant = retrieveToneExamples({ userMessage: "양자색역학 초전도 위상수학" });
  assert.equal(irrelevant.length, 0, "무관 입력은 0개여야 함");
  passed += 1;

  const maximum = retrieveToneExamples({ userMessage: "배고파", limit: 99 });
  assert.ok(maximum.length <= 5, "limit은 최대 5여야 함");
  passed += 1;

  const zero = retrieveToneExamples({ userMessage: "배고파", limit: 0 });
  assert.equal(zero.length, 0, "limit 0은 빈 결과여야 함");
  passed += 1;

  for (const question of ["진보당이 뭐야?", "상대성이론 뜻 알려줘", "운동 방법이 뭐야?"]) {
    const selected = retrieveToneExamples({ userMessage: question, limit: 5 });
    assert.ok(selected.length <= 2, `${question}: 정보 질문 예시가 2개 초과`);
    passed += 1;
  }

  const baseline = retrieveToneExamples({ userMessage: "나 공부중", limit: 5 });
  assert.ok(baseline.length >= 2, "중복 방지 테스트용 예시 부족");
  const repeated = retrieveToneExamples({
    userMessage: "나 공부중",
    limit: 5,
    history: [
      {
        id: "recent-assistant",
        role: "assistant",
        text: baseline[0].reply,
        createdAt: Date.now(),
      },
    ],
  });
  assert.notEqual(repeated[0]?.id, baseline[0].id, "최근 답변 예시가 계속 1순위임");
  passed += 1;

  const routeSource = readFileSync(join(root, "app/api/chat/route.ts"), "utf8");
  assert.ok(routeSource.includes("openai.chat.completions.create"));
  assert.ok(!/reply\s*:\s*toneExamples/.test(routeSource), "검색 예시를 API 답변으로 반환함");
  passed += 1;

  const allToneExamples = JSON.parse(
    readFileSync(join(root, "data/tone_examples_gold_core.json"), "utf8")
  ).examples;
  const invalidData = allToneExamples.filter(
    (example) =>
      !validateToneOutput(example.input).valid || !validateToneOutput(example.reply).valid
  );
  assert.deepEqual(
    invalidData.map((example) => example.id),
    [],
    "골드 코어에 금지 말투가 남아 있음"
  );
  passed += 1;

  const manualMessages = [
    "나 공부중",
    "오빠 머해",
    "배고파",
    "나 오늘 너무 힘들어",
    "보고싶어",
    "바보",
    "오늘 운동했어",
    "내일 데이트하자",
    "나 이제 잘거야",
    "진보당이 뭐야?",
  ];
  const manualSelections = manualMessages.map((message) => ({
    message,
    selected: retrieveToneExamples({ userMessage: message }),
  }));
  const guardDebugMessages = [
    "오빤 머행",
    "나 그냥 있어",
    "글쿠만",
    "뭘 힘내 ㅋㅋㅋㅋ",
    "바보",
    "개병신아",
  ];
  const guardDebugSelections = guardDebugMessages.map((message) => ({
    message,
    selected: retrieveToneExamples({ userMessage: message }),
  }));
  for (const { message, selected } of guardDebugSelections) {
    assert.ok(
      selected.every((example) => validateToneOutput(example.reply).valid),
      `${message}: 선택 예시에 금지 표현 포함`
    );
  }
  passed += 1;

  const reportLines = [
    "# Tone example retrieval test report",
    "",
    `- 실행 테스트: ${passed}개`,
    `- 결과: ${passed}개 통과`,
    "- 검증: 관련 태그, 무관 입력 0개, 최대 5개, 중복 reply, 최근 답변 감점, 정보 질문 최대 2개, API 직접 반환 금지",
    "",
    "## 검색 결과",
    "",
    "| 분류 | 입력 | 기대 태그 | 선택 ID |",
    "|---|---|---|---|",
    ...details.map(
      ({ category, message, expectedTag, selected }) =>
        `| ${category} | ${message} | ${expectedTag} | ${selected.map((item) => item.id).join(", ")} |`
    ),
    "",
    "## 지정 수동 비교 입력의 검색 결과",
    "",
    "| 입력 | 선택 ID와 태그 |",
    "|---|---|",
    ...manualSelections.map(
      ({ message, selected }) =>
        `| ${message} | ${selected.map((item) => `${item.id} (${item.tags.join("/")})`).join(", ") || "없음"} |`
    ),
    "",
    "## 금지 말투 디버그 입력의 검색 결과",
    "",
    "| 입력 | 선택 ID |",
    "|---|---|",
    ...guardDebugSelections.map(
      ({ message, selected }) =>
        `| ${message} | ${selected.map((item) => item.id).join(", ") || "없음"} |`
    ),
    "",
  ];
  mkdirSync(join(root, "docs", "test-reports"), { recursive: true });
  writeFileSync(
    join(root, "docs", "test-reports", "tone-retrieval-latest.md"),
    reportLines.join("\n"),
    "utf8"
  );
  console.log(`[tone-example-retrieval] ${passed} tests passed`);
} finally {
  rmSync(buildDir, { recursive: true, force: true });
}
