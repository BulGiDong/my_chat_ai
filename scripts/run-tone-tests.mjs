import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import process from "node:process";

const args = parseArgs(process.argv.slice(2));
const apiURL = args.get("--api") ?? "http://localhost:3000/api/chat";
const outputPath = args.get("--output") ?? "test-results/tone-latest.json";
const reportPath = args.get("--report") ?? "docs/test-reports/tone-latest.md";
const comparePath = args.get("--compare");
const comparisonPath = args.get("--comparison");
const sourcePath = args.get("--source");
const label = args.get("--label") ?? "current";
const sourceRun = sourcePath ? JSON.parse(await readFile(sourcePath, "utf8")) : null;
const runsPerCase = sourceRun?.runsPerCase ?? parsePositiveInteger(process.env.TONE_TEST_RUNS ?? "3", "TONE_TEST_RUNS");
const cases = JSON.parse(await readFile("tone_test_cases.json", "utf8"));

await mkdir(dirname(outputPath), { recursive: true });
if (reportPath) await mkdir(dirname(reportPath), { recursive: true });
if (comparisonPath) await mkdir(dirname(comparisonPath), { recursive: true });

const expectedDistribution = {
  casual: 12,
  question: 10,
  study: 8,
  exercise: 8,
  food: 8,
  emotion: 10,
  affection: 8,
  joke: 10,
  info: 6,
};

validateCases(cases);

const globalForbiddenPatterns = [
  "조심해",
  "몇시에 끝나",
  "오늘 하루는 어땠어",
  "왜 그렇게 생각해",
  "도움이 되었으면 좋겠어",
  "궁금한 거 있으면",
  "무엇을 도와드릴까요",
];
const explanatoryPatterns = [
  /자세히 설명하자면/,
  /정리하면/,
  /즉[, ]/,
  /왜냐하면/,
  /때문입니다/,
  /라고 할 수 있/,
  /의미합니다/,
  /방법은/,
  /첫째|둘째|마지막으로/,
];
const counselorPatterns = [
  /마음을 이해/,
  /많이 힘들었겠/,
  /이야기해 ?줄래/,
  /말해 ?줄래/,
  /천천히 이야기/,
  /감정을 (?:느끼는|정리하는)/,
  /도움을 받아/,
  /전문가/,
  /충분히 쉬/,
  /푹 쉬/,
  /쉬어야/,
  /몸조리/,
  /휴식을 취/,
];
const encouragementPatterns = [
  /화이팅/i,
  /힘내/,
  /응원할게/,
  /잘할 수 있어/,
  /넌 할 수 있어/,
];
const extensionPatterns = [
  /뭐 도와줄까/,
  /더 이야기해볼래/,
  /궁금한 거 있으면/,
  /뭐 물어볼래/,
];
const disallowedPronouns = [/니가/, /니는/, /니꺼/];
const coldReplyPattern = /^(오|헐|웅|엥)[.!?~ㅋㅎㅠㅜ\s]*$/u;
const encouragementCategories = new Set(["study", "exercise", "emotion"]);

const results = [];
let completedCalls = 0;
const totalCalls = cases.length * runsPerCase;

for (const [caseIndex, testCase] of cases.entries()) {
  const responses = await Promise.all(
    Array.from({ length: runsPerCase }, async (_, runIndex) => {
      try {
        const reply = sourceRun
          ? String(sourceRun.results[caseIndex]?.responses[runIndex]?.reply ?? "")
          : await requestReply(testCase.input);
        return {
          run: runIndex + 1,
          reply,
          ...evaluate(testCase, reply),
        };
      } catch (error) {
        return {
          run: runIndex + 1,
          reply: "",
          passed: false,
          failures: [`API 호출 실패: ${error.message}`],
          reviewFlags: [],
          metrics: { sentenceCount: 0, characterCount: 0, questionCount: 0 },
        };
      } finally {
        completedCalls += 1;
      }
    })
  );

  applyCaseLevelChecks(testCase, responses);

  const passCount = responses.filter((response) => response.passed).length;
  const status = passCount === runsPerCase
    ? "complete"
    : passCount === 0
      ? "repeated_failure"
      : "unstable";
  const identicalResponses = new Set(responses.map((response) => response.reply)).size === 1;
  const manualReview = [
    ...(identicalResponses ? ["3개 응답이 모두 동일함"] : []),
    ...responses.flatMap((response) => response.reviewFlags.map((flag) => `${response.run}회차: ${flag}`)),
  ];

  results.push({
    index: caseIndex + 1,
    ...testCase,
    status,
    passCount,
    failCount: runsPerCase - passCount,
    identicalResponses,
    manualReview: [...new Set(manualReview)],
    responses,
  });

  console.log(
    `[${caseIndex + 1}/${cases.length}] ${status.toUpperCase()} ${testCase.input} (${passCount}/${runsPerCase}) [${completedCalls}/${totalCalls}]`
  );
}

const run = buildRunSummary({ label, apiURL, runsPerCase, results });
await writeFile(outputPath, `${JSON.stringify(run, null, 2)}\n`, "utf8");

if (reportPath) {
  await writeFile(reportPath, `${buildReport(run)}\n`, "utf8");
}

if (comparePath && comparisonPath) {
  const before = JSON.parse(await readFile(comparePath, "utf8"));
  await writeFile(comparisonPath, `${buildComparison(before, run)}\n`, "utf8");
}

console.log(
  `COMPLETE_PASS_RATE=${run.summary.completePassRate}% RESPONSE_PASS_RATE=${run.summary.responsePassRate}% ` +
  `UNSTABLE=${run.summary.unstableCases} REPEATED_FAILURE=${run.summary.repeatedFailureCases}`
);

function evaluate(testCase, reply) {
  const failures = [];
  const reviewFlags = [];
  const sentenceCount = countSentences(reply);
  const characterCount = [...reply.replace(/\s/g, "")].length;
  const questionCount = (reply.match(/[?？]/g) ?? []).length;

  if (sentenceCount >= 3) failures.push(`세 문장 이상 (${sentenceCount}문장)`);
  if (testCase.category !== "info" && characterCount > 30) {
    failures.push(`일반 대화 30자 초과 (${characterCount}자)`);
  }
  if (questionCount >= 2) failures.push(`질문 두 개 이상 (${questionCount}개)`);
  if (explanatoryPatterns.some((pattern) => pattern.test(reply))) failures.push("설명형 말투 포함");
  if (counselorPatterns.some((pattern) => pattern.test(reply))) failures.push("상담사 표현 포함");
  if (extensionPatterns.some((pattern) => pattern.test(reply))) failures.push("GPT식 대화 연장 표현 포함");
  if (disallowedPronouns.some((pattern) => pattern.test(reply))) failures.push("금지 대명사 포함: 니가/니는/니꺼");

  const asksAboutEncouragement = /화이팅|힘내|응원할게|잘할 수 있어|넌 할 수 있어/.test(testCase.input);
  const encouragement = encouragementCategories.has(testCase.category) &&
    !asksAboutEncouragement &&
    encouragementPatterns.some((pattern) => pattern.test(reply));

  const forbidden = [...globalForbiddenPatterns, ...testCase.forbiddenPatterns];
  const compactReply = reply.replace(/\s/g, "");
  const matchedForbidden = [
    ...new Set(forbidden.filter((pattern) => compactReply.includes(pattern.replace(/\s/g, "")))),
  ];
  if (matchedForbidden.length > 0) failures.push(`금지 표현 포함: ${matchedForbidden.join(", ")}`);
  if (coldReplyPattern.test(reply.trim())) reviewFlags.push("지나치게 차가운 단답 가능성");

  return {
    passed: failures.length === 0,
    failures,
    reviewFlags,
    signals: { encouragement },
    metrics: { sentenceCount, characterCount, questionCount },
  };
}

function applyCaseLevelChecks(testCase, responses) {
  const encouragementResponses = responses.filter((response) => response.signals?.encouragement);
  if (encouragementResponses.length < 2) return;

  for (const response of encouragementResponses) {
    response.failures.push(
      `정형적 응원 표현 남발 (${testCase.input} 응답 ${encouragementResponses.length}/${responses.length}회)`
    );
    response.passed = false;
  }
}

async function requestReply(input) {
  const response = await fetch(apiURL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ message: input, history: [] }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  return String(body.reply ?? "").trim();
}

function buildRunSummary({ label: runLabel, apiURL: runApiURL, runsPerCase: repeatCount, results: runResults }) {
  const totalResponses = runResults.length * repeatCount;
  const passedResponses = runResults.reduce((sum, result) => sum + result.passCount, 0);
  const completeCases = runResults.filter((result) => result.status === "complete").length;
  const unstableCases = runResults.filter((result) => result.status === "unstable").length;
  const repeatedFailureCases = runResults.filter((result) => result.status === "repeated_failure").length;
  const manualReviewCases = runResults.filter((result) => result.manualReview.length > 0).length;

  return {
    label: runLabel,
    createdAt: new Date().toISOString(),
    apiURL: runApiURL,
    runsPerCase: repeatCount,
    distribution: countBy(runResults, (result) => result.category),
    summary: {
      totalCases: runResults.length,
      totalApiCalls: totalResponses,
      completeCases,
      completePassRate: percentage(completeCases, runResults.length),
      passedResponses,
      failedResponses: totalResponses - passedResponses,
      responsePassRate: percentage(passedResponses, totalResponses),
      unstableCases,
      repeatedFailureCases,
      manualReviewCases,
    },
    results: runResults,
  };
}

function buildReport(run) {
  const lines = [
    `# Tone Test Report: ${run.label}`,
    "",
    `- 실행 시각: ${run.createdAt}`,
    `- API: \`${run.apiURL}\``,
    `- 테스트 케이스: ${run.summary.totalCases}`,
    `- 케이스당 반복: ${run.runsPerCase}회`,
    `- 총 API 호출: ${run.summary.totalApiCalls}`,
    `- 케이스 기준 완전 통과율: **${run.summary.completePassRate}%** (${run.summary.completeCases}/${run.summary.totalCases})`,
    `- 응답 기준 전체 통과율: **${run.summary.responsePassRate}%** (${run.summary.passedResponses}/${run.summary.totalApiCalls})`,
    `- 불안정 통과: ${run.summary.unstableCases}`,
    `- 반복 실패: ${run.summary.repeatedFailureCases}`,
    `- 수동 검토 표시 케이스: ${run.summary.manualReviewCases}`,
    "",
    "## 카테고리 분포",
    "",
    "| 카테고리 | 개수 |",
    "| --- | ---: |",
    ...Object.entries(run.distribution).map(([category, count]) => `| ${category} | ${count} |`),
    "",
    "## 완전 통과",
    "",
    ...formatCaseList(run.results.filter((result) => result.status === "complete")),
    "",
    "## 불안정 통과",
    "",
    ...formatDetailedCases(run.results.filter((result) => result.status === "unstable")),
    "",
    "## 반복 실패",
    "",
    ...formatDetailedCases(run.results.filter((result) => result.status === "repeated_failure")),
    "",
    "## 수동 검토",
    "",
    ...formatManualReviews(run.results.filter((result) => result.manualReview.length > 0)),
    "",
    "## 검사 기준",
    "",
    "- 3문장 이상",
    "- 정보 질문을 제외한 일반 대화 30자 초과",
    "- 질문 2개 이상",
    "- 설명형 또는 상담사 표현",
    "- 테스트별 금지 표현 및 `니가/니는/니꺼`",
    "- 공부/운동/감정 문맥의 정형적 응원 표현",
    "- GPT식 대화 연장 표현",
    "- 동일 응답 3회 및 차가운 단답은 실패가 아닌 수동 검토 표시",
  ];
  return lines.join("\n");
}

function buildComparison(before, after) {
  const changed = after.results.map((current, index) => ({ before: before.results[index], after: current }));
  const improved = changed.filter(({ before: previous, after: current }) => current.passCount > previous.passCount);
  const degraded = changed.filter(({ before: previous, after: current }) => current.passCount < previous.passCount);
  const remaining = changed.filter(({ after: current }) => current.status !== "complete");
  const review = changed.filter(({ after: current }) => current.manualReview.length > 0);

  return [
    "# Tone Test Comparison v2",
    "",
    "## 요약",
    "",
    "| 지표 | 수정 전 | 수정 후 | 변화 |",
    "| --- | ---: | ---: | ---: |",
    metricRow("완전 통과율", before.summary.completePassRate, after.summary.completePassRate, "%p"),
    metricRow("응답 통과율", before.summary.responsePassRate, after.summary.responsePassRate, "%p"),
    countRow("불안정 케이스", before.summary.unstableCases, after.summary.unstableCases),
    countRow("반복 실패 케이스", before.summary.repeatedFailureCases, after.summary.repeatedFailureCases),
    "",
    `- 총 테스트 케이스: ${after.summary.totalCases}`,
    `- 총 API 호출: 수정 전 ${before.summary.totalApiCalls}, 수정 후 ${after.summary.totalApiCalls}`,
    "",
    "## 개선된 유형",
    "",
    ...formatComparisonCases(improved, "개선된 케이스 없음"),
    "",
    "## 새로 악화된 유형",
    "",
    ...formatComparisonCases(degraded, "새로 악화된 케이스 없음"),
    "",
    "## 사람이 검토해야 하는 답변",
    "",
    ...formatReviewComparison(review),
    "",
    "## 대표 개선 사례 5개",
    "",
    ...formatRepresentative(improved, 5, "대표 개선 사례가 5개 미만임", false),
    "",
    "## 대표 실패 사례 5개",
    "",
    ...formatRepresentative(remaining, 5, "남은 실패 사례가 5개 미만임", true),
  ].join("\n");
}

function formatCaseList(results) {
  if (results.length === 0) return ["없음"];
  return results.map((result) => `- ${result.index}. [${result.category}] ${result.input} (${result.passCount}/${result.responses.length})`);
}

function formatDetailedCases(results) {
  if (results.length === 0) return ["없음"];
  return results.flatMap((result) => [
    `### ${result.index}. [${result.category}] ${result.input}`,
    "",
    `- 상태: ${statusLabel(result.status)} (${result.passCount}/${result.responses.length})`,
    `- 기대 스타일: ${result.expectedStyle}`,
    ...result.responses.map((response) =>
      `- ${response.run}회차: ${response.reply || "(없음)"} | ${response.passed ? "통과" : `실패: ${response.failures.join("; ")}`}`
    ),
    "",
  ]);
}

function formatManualReviews(results) {
  if (results.length === 0) return ["없음"];
  return results.map((result) =>
    `- ${result.index}. ${result.input}: ${result.manualReview.join("; ")} | 응답: ${result.responses.map((response) => response.reply).join(" / ")}`
  );
}

function formatComparisonCases(items, emptyMessage) {
  if (items.length === 0) return [emptyMessage];
  return items.map(({ before, after }) =>
    `- [${after.category}] ${after.input}: ${before.passCount}/${before.responses.length} -> ${after.passCount}/${after.responses.length}`
  );
}

function formatReviewComparison(items) {
  if (items.length === 0) return ["없음"];
  return items.map(({ after }) =>
    `- ${after.input}: ${after.manualReview.join("; ")} | ${after.responses.map((response) => response.reply).join(" / ")}`
  );
}

function formatRepresentative(items, limit, emptyMessage, preferFailedAfter) {
  if (items.length === 0) return [emptyMessage];
  const lines = items.slice(0, limit).map(({ before, after }) => {
    const beforeReply = before.responses.find((response) => !response.passed)?.reply ?? before.responses[0]?.reply ?? "";
    const afterReply = after.responses.find((response) =>
      preferFailedAfter ? !response.passed : response.passed
    )?.reply ?? after.responses[0]?.reply ?? "";
    return `- 입력: ${after.input} | 수정 전: ${beforeReply} | 수정 후: ${afterReply} | 수정 후 ${after.passCount}/${after.responses.length}`;
  });
  if (items.length < limit) lines.push(emptyMessage);
  return lines;
}

function metricRow(label, beforeValue, afterValue, suffix) {
  const delta = Number((afterValue - beforeValue).toFixed(1));
  return `| ${label} | ${beforeValue}% | ${afterValue}% | ${delta >= 0 ? "+" : ""}${delta}${suffix} |`;
}

function countRow(label, beforeValue, afterValue) {
  const delta = afterValue - beforeValue;
  return `| ${label} | ${beforeValue} | ${afterValue} | ${delta >= 0 ? "+" : ""}${delta} |`;
}

function countSentences(text) {
  return text.split(/(?<=[.!?。！？])\s+|\n+/u).map((part) => part.trim()).filter(Boolean).length;
}

function countBy(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function percentage(value, total) {
  return Number(((value / total) * 100).toFixed(1));
}

function statusLabel(status) {
  if (status === "complete") return "완전 통과";
  if (status === "unstable") return "불안정 통과";
  return "반복 실패";
}

function validateCases(testCases) {
  if (testCases.length < 80) throw new Error(`테스트 케이스가 80개 미만입니다: ${testCases.length}`);
  const distribution = countBy(testCases, (testCase) => testCase.category);
  for (const [category, expected] of Object.entries(expectedDistribution)) {
    if (distribution[category] !== expected) {
      throw new Error(`${category} 분포 오류: expected ${expected}, received ${distribution[category] ?? 0}`);
    }
  }
  for (const [index, testCase] of testCases.entries()) {
    if (!testCase.input || !testCase.expectedStyle || !Array.isArray(testCase.forbiddenPatterns)) {
      throw new Error(`${index + 1}번 테스트 케이스 형식이 잘못되었습니다.`);
    }
  }
}

function parseArgs(values) {
  const parsed = new Map();
  for (let index = 0; index < values.length; index += 2) parsed.set(values[index], values[index + 1]);
  return parsed;
}

function parsePositiveInteger(value, name) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
  return parsed;
}
