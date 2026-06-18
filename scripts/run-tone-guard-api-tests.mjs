import { readFile, writeFile } from "node:fs/promises";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const apiURL = process.argv[2] ?? "http://localhost:3000/api/chat";
const buildDir = join(root, ".tone-guard-api-test-build");
const sourcePath = join(root, "lib", "tone-output-guard.ts");
const outputPath = join(buildDir, "lib", "tone-output-guard.js");

rmSync(buildDir, { recursive: true, force: true });
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText,
  "utf8"
);

const { validateToneOutput } = require(outputPath);
const toneData = JSON.parse(
  await readFile(join(root, "data", "tone_examples_gold_core.json"), "utf8")
);
const exampleReplies = new Set(toneData.examples.map((example) => example.reply.trim()));
const messages = [
  "오빤 머행",
  "나 그냥 있어",
  "글쿠만",
  "뭘 힘내 ㅋㅋㅋㅋ",
  "나 쉬는중",
  "알겠어",
  "바보",
  "나 게임중",
  "책임져",
  "모임 가는중",
];
const results = [];

try {
  for (let run = 1; run <= 3; run += 1) {
    for (const message of messages) {
      const response = await fetch(apiURL, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ message, history: [], conversationState: null }),
      });
      const body = await response.json();
      const reply = String(body.reply ?? "");
      const guard = validateToneOutput(reply);
      const regenerated = response.headers.get("x-tone-guard-regenerated") === "1";
      results.push({
        run,
        message,
        reply,
        valid: guard.valid,
        reasons: guard.reasons,
        exactExampleCopy: exampleReplies.has(reply.trim()),
        regenerated,
      });
      console.log(
        `[${results.length}/30] ${guard.valid ? "PASS" : "FAIL"} ${message}: ${reply}`
      );
    }
  }

  const violations = results.filter((result) => !result.valid);
  const exactCopies = results.filter((result) => result.exactExampleCopy);
  const regenerationCount = results.filter((result) => result.regenerated).length;
  const report = [
    "# Tone output guard API test report",
    "",
    `- API: ${apiURL}`,
    `- 실행: ${results.length}회`,
    `- 금지 표현 검출: ${violations.length}건`,
    `- 골드 코어 reply 완전 복사: ${exactCopies.length}건`,
    `- 1회 재생성 실행: ${regenerationCount}건`,
    `- 평균 답변 길이: ${(results.reduce((sum, result) => sum + result.reply.length, 0) / results.length).toFixed(1)}자`,
    "",
    "| 회차 | 입력 | 답변 | 검사 | 재생성 | 예시 완전 복사 |",
    "|---:|---|---|---|---|---|",
    ...results.map(
      (result) =>
        `| ${result.run} | ${result.message} | ${result.reply.replace(/\|/g, "\\|")} | ${result.valid ? "통과" : result.reasons.join(", ")} | ${result.regenerated ? "예" : "아니오"} | ${result.exactExampleCopy ? "예" : "아니오"} |`
    ),
    "",
  ].join("\n");
  mkdirSync(join(root, "docs", "test-reports"), { recursive: true });
  mkdirSync(join(root, "test-results"), { recursive: true });
  await writeFile(join(root, "docs", "test-reports", "tone-guard-latest.md"), report, "utf8");
  await writeFile(
    join(root, "test-results", "tone-guard-latest.json"),
    `${JSON.stringify({ apiURL, results }, null, 2)}\n`,
    "utf8"
  );

  if (violations.length > 0 || exactCopies.length > 0) process.exitCode = 1;
} finally {
  rmSync(buildDir, { recursive: true, force: true });
}
