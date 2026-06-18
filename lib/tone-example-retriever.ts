import { readFileSync } from "node:fs";
import { join } from "node:path";
import { detectConversationSignals } from "./conversation-state";
import type { ChatMessage, ConversationState } from "../types/chat";

export type ToneExample = {
  id: string;
  input: string;
  reply: string;
  tags: string[];
  qualityTier: string;
};

export type RetrieveToneExamplesOptions = {
  userMessage: string;
  history?: ChatMessage[];
  conversationState?: ConversationState;
  limit?: number;
};

type ScoredExample = {
  example: ToneExample;
  score: number;
  matchedTags: string[];
};

const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 5;
const MIN_RELEVANCE_SCORE = 4;
const DATA_PATH = join(process.cwd(), "data", "tone_examples_gold_core.json");

const MOOD_TAGS: Partial<Record<ConversationState["mood"], string[]>> = {
  sad: ["emotion", "warm"],
  tired: ["emotion", "warm"],
  angry: ["emotion"],
  hungry: ["food"],
  affectionate: ["affection", "warm"],
  playful: ["play", "playful"],
};

const TOPIC_TAGS: Partial<Record<ConversationState["topic"], string[]>> = {
  study: ["study"],
  exercise: ["exercise"],
  food: ["food"],
  relationship: ["affection", "emotion"],
};

const MESSAGE_TAG_RULES: Array<[RegExp, string[]]> = [
  [/집\s*(?:왔|왓|가는|가는중)|쉬는\s*중|도착/, ["casual"]],
  [/머\s*해|뭐\s*해|모\s*해|머하|뭐하|모하/, ["what_doing"]],
  [/자러|잘\s*거|졸려|잠|잤|일어났/, ["sleep"]],
  [/약속|데이트|만나|내일|주말/, ["planning"]],
  [/ㅋㅋ|ㅎㅎ|바보|메롱|놀리/, ["play", "playful"]],
];

const INFORMATION_PATTERN =
  /뭐야|뭔데|설명|차이|뜻|왜|어떻게|알려줘|정리|비교|원리|방법|누구|언제|어디|얼마|몇\s*(?:개|명|시|살)|[?？]\s*$/;

const toneExamples = loadToneExamples();

export function retrieveToneExamples(
  options: RetrieveToneExamplesOptions
): ToneExample[] {
  const normalizedMessage = normalizeText(options.userMessage);
  if (!normalizedMessage) return [];

  const requestedLimit = clampLimit(options.limit);
  if (requestedLimit === 0) return [];

  const informationQuestion = INFORMATION_PATTERN.test(options.userMessage);
  const limit = informationQuestion ? Math.min(requestedLimit, 2) : requestedLimit;
  const desiredTags = inferDesiredTags(options);
  const recentReplies = getRecentAssistantReplies(options.history);

  const scored = toneExamples
    .map((example) => scoreExample(example, normalizedMessage, desiredTags, recentReplies))
    .filter((item) => item.score >= MIN_RELEVANCE_SCORE)
    .sort((a, b) => b.score - a.score || a.example.id.localeCompare(b.example.id));

  const selected: ScoredExample[] = [];
  const seenReplies = new Set<string>();
  const tagCounts = new Map<string, number>();

  for (const candidate of scored) {
    const normalizedReply = normalizeText(candidate.example.reply);
    if (seenReplies.has(normalizedReply)) continue;

    const crowded = candidate.matchedTags.some((tag) => (tagCounts.get(tag) ?? 0) >= 2);
    const diverseAlternative = scored.some(
      (other) =>
        other.score >= candidate.score - 2 &&
        !seenReplies.has(normalizeText(other.example.reply)) &&
        other.matchedTags.some((tag) => (tagCounts.get(tag) ?? 0) < 2)
    );
    if (crowded && diverseAlternative) continue;

    selected.push(candidate);
    seenReplies.add(normalizedReply);
    for (const tag of candidate.matchedTags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
    if (selected.length >= limit) break;
  }

  return selected
    .sort((a, b) => b.score - a.score || a.example.id.localeCompare(b.example.id))
    .map(({ example }) => example);
}

export function isInformationQuestion(message: string) {
  return INFORMATION_PATTERN.test(message.trim());
}

function loadToneExamples(): ToneExample[] {
  try {
    const parsed: unknown = JSON.parse(readFileSync(DATA_PATH, "utf8"));
    if (!parsed || typeof parsed !== "object" || !("examples" in parsed)) return [];
    const examples = (parsed as { examples?: unknown }).examples;
    if (!Array.isArray(examples)) return [];
    return examples.filter(isToneExample);
  } catch (error) {
    console.error("[tone-examples] failed to load data", error);
    return [];
  }
}

function isToneExample(value: unknown): value is ToneExample {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ToneExample>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.input === "string" &&
    item.input.length > 0 &&
    typeof item.reply === "string" &&
    item.reply.length > 0 &&
    Array.isArray(item.tags) &&
    item.tags.every((tag) => typeof tag === "string") &&
    typeof item.qualityTier === "string"
  );
}

function scoreExample(
  example: ToneExample,
  normalizedMessage: string,
  desiredTags: Set<string>,
  recentReplies: string[]
): ScoredExample {
  const normalizedInput = normalizeText(example.input);
  const inputTokens = tokenize(normalizedInput);
  const messageTokens = tokenize(normalizedMessage);
  const commonTokens = messageTokens.filter((token) => inputTokens.includes(token));
  const matchedTags = example.tags.filter((tag) => desiredTags.has(tag));

  let score = 0;
  if (normalizedInput === normalizedMessage) score += 14;
  if (
    normalizedInput.length >= 2 &&
    (normalizedInput.includes(normalizedMessage) || normalizedMessage.includes(normalizedInput))
  ) {
    score += 5;
  }
  score += Math.min(commonTokens.length, 3) * 2;
  score += diceSimilarity(normalizedMessage, normalizedInput) * 8;
  score += matchedTags.length * 4;

  const normalizedReply = normalizeText(example.reply);
  for (const recentReply of recentReplies) {
    if (normalizedReply === recentReply) score -= 20;
    else if (diceSimilarity(normalizedReply, recentReply) >= 0.72) score -= 12;
  }

  return { example, score, matchedTags };
}

function inferDesiredTags(options: RetrieveToneExamplesOptions) {
  const tags = new Set<string>();
  const signals = detectConversationSignals(options.userMessage);
  const mood = signals.mood ?? options.conversationState?.mood;
  const topic = signals.topic ?? options.conversationState?.topic;

  for (const tag of mood ? MOOD_TAGS[mood] ?? [] : []) tags.add(tag);
  for (const tag of topic ? TOPIC_TAGS[topic] ?? [] : []) tags.add(tag);
  for (const [pattern, inferredTags] of MESSAGE_TAG_RULES) {
    if (pattern.test(options.userMessage)) {
      for (const tag of inferredTags) tags.add(tag);
    }
  }
  return tags;
}

function getRecentAssistantReplies(history: ChatMessage[] | undefined) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((message) => message?.role === "assistant" && typeof message.text === "string")
    .slice(-6)
    .map((message) => normalizeText(message.text))
    .filter(Boolean);
}

function clampLimit(limit: number | undefined) {
  if (limit === undefined || !Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.max(0, Math.min(MAX_LIMIT, Math.floor(limit)));
}

function tokenize(value: string): string[] {
  return value.match(/[가-힣a-z0-9]+/g) ?? [];
}

function diceSimilarity(left: string, right: string) {
  const leftBigrams = bigrams(left);
  const rightBigrams = bigrams(right);
  if (leftBigrams.length === 0 || rightBigrams.length === 0) {
    return left === right ? 1 : 0;
  }

  const counts = new Map<string, number>();
  for (const value of leftBigrams) counts.set(value, (counts.get(value) ?? 0) + 1);
  let overlap = 0;
  for (const value of rightBigrams) {
    const count = counts.get(value) ?? 0;
    if (count > 0) {
      overlap += 1;
      counts.set(value, count - 1);
    }
  }
  return (2 * overlap) / (leftBigrams.length + rightBigrams.length);
}

function bigrams(value: string) {
  const compact = value.replace(/\s/g, "");
  if (compact.length < 2) return compact ? [compact] : [];
  return Array.from({ length: compact.length - 1 }, (_, index) =>
    compact.slice(index, index + 2)
  );
}

function normalizeText(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/([!?.,~ㅋㅎㅠㅜ])\1{2,}/g, "$1$1")
    .replace(/\s+/g, " ");
}
