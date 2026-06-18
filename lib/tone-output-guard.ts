export type ToneGuardResult = {
  valid: boolean;
  reasons: string[];
};

const QUOTED_TEXT_PATTERN = /`[^`]*`|"[^"]*"|'[^']*'|“[^”]*”|‘[^’]*’/gu;
const DOUBLE_IEUNG_PATTERN = /ㅇㅇ(?=$|[\s,./!?~()[\]{}:;ㅋㅎㅠㅜ])/u;
const GO_GO_PATTERN = /(?:^|[^ㄱ-ㅎㅏ-ㅣ가-힣a-z0-9])ㄱㄱ(?=$|[^ㄱ-ㅎㅏ-ㅣ가-힣a-z0-9])/iu;
const DISALLOWED_PRONOUN_PATTERN = /니가|니는|니꺼/u;
const TERMINAL_IM_PATTERN = /([가-힣]*임)(?=$|\s*(?:[.!?~,/]|\n|ㅋ+|ㅎ+|ㅠ+|ㅜ+))/gu;
const ALLOWED_IM_NOUNS = new Set(["게임", "책임", "이름", "모임"]);

const GPT_STYLE_PATTERNS: Array<[string, RegExp]> = [
  ["counselor-language", /마음을 이해|많이 힘들었겠|이야기해 ?줄래|말해 ?줄래|천천히 이야기|감정을 (?:느끼는|정리하는)|도움을 받아|전문가/u],
  ["support-language", /도움이 되었으면 좋겠어|궁금한 거 있으면|무엇을 도와드릴까요/u],
  ["explanatory-language", /자세히 설명하자면|정리하면|왜냐하면|라고 할 수 있|의미합니다/u],
];

export function validateToneOutput(reply: string): ToneGuardResult {
  const inspectable = String(reply ?? "").replace(QUOTED_TEXT_PATTERN, "");
  const reasons: string[] = [];

  if (DOUBLE_IEUNG_PATTERN.test(inspectable)) reasons.push("independent-ㅇㅇ");
  if (hasDisallowedTerminalIm(inspectable)) reasons.push("terminal-임");
  if (GO_GO_PATTERN.test(inspectable)) reasons.push("independent-ㄱㄱ");
  if (DISALLOWED_PRONOUN_PATTERN.test(inspectable)) reasons.push("disallowed-pronoun");

  for (const [reason, pattern] of GPT_STYLE_PATTERNS) {
    if (pattern.test(inspectable)) reasons.push(reason);
  }

  return { valid: reasons.length === 0, reasons };
}

function hasDisallowedTerminalIm(reply: string) {
  for (const match of reply.matchAll(TERMINAL_IM_PATTERN)) {
    if (!ALLOWED_IM_NOUNS.has(match[1])) return true;
  }
  return false;
}
