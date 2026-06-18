import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const root = process.cwd();
const buildDir = join(root, ".tone-guard-test-build");
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
const cases = [
  ["그냥ㅇㅇ", false, "independent-ㅇㅇ"],
  ["ㅇㅇ", false, "independent-ㅇㅇ"],
  ["웅 ㅇㅇ", false, "independent-ㅇㅇ"],
  ["쉬는중임", false, "terminal-임"],
  ["그런거임 ㅋㅋ", false, "terminal-임"],
  ["응원해준거임", false, "terminal-임"],
  ["학생임.", false, "terminal-임"],
  ["ㄱㄱ", false, "independent-ㄱㄱ"],
  ["집으로 ㄱㄱ ㅋㅋ", false, "independent-ㄱㄱ"],
  ["니가 더 바보야", false, "disallowed-pronoun"],
  ["니는 머해", false, "disallowed-pronoun"],
  ["니꺼 맞아", false, "disallowed-pronoun"],
  ["마음을 이해해", false, "counselor-language"],
  ["이야기해줄래", false, "counselor-language"],
  ["도움이 되었으면 좋겠어", false, "support-language"],
  ["궁금한 거 있으면 물어봐", false, "support-language"],
  ["자세히 설명하자면 이래", false, "explanatory-language"],
  ["게임", true],
  ["나 게임중", true],
  ["책임", true],
  ["내가 책임", true],
  ["이름", true],
  ["이름 귀엽당", true],
  ["모임", true],
  ["모임 가는중", true],
  ["웅 그냥 쉬고있엉", true],
  ["그랭 ㅎ", true],
  ["아닝 ㅋㅋㅋㅋ", true],
  ["고생했엉 ㅠㅠ", true],
  ["`니가`라는 표현이래", true],
  ["“쉬는중임”이라고 보냈어", true],
  ["너가 더 바보야 ㅋㅋ", true],
];

try {
  for (const [reply, expectedValid, expectedReason] of cases) {
    const result = validateToneOutput(reply);
    assert.equal(result.valid, expectedValid, `${reply}: ${result.reasons.join(", ")}`);
    if (expectedReason) assert.ok(result.reasons.includes(expectedReason), reply);
  }
  console.log(`[tone-output-guard] ${cases.length}/${cases.length} passed`);
} finally {
  rmSync(buildDir, { recursive: true, force: true });
}
