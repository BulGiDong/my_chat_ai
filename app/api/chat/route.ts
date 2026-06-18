import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { TONE_PROMPT } from "@/lib/prompts/tone";
import { ChatMessage } from "@/types/chat";

export const runtime = "nodejs";

const EMPTY_REPLY_FALLBACK = "웅웅";
const ERROR_REPLY_FALLBACK = "오류낫엉...";
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const STARTER_TAIL_PATTERN = /(?:\s*[?？]?\s*(?:머행|뭐행|모행)\s*[?？]?\s*)+$/g;

type ChatMode = "casual" | "emotion" | "info";

function classifyMessage(message: string): ChatMode {
  if (/뭐야|뭔데|설명|차이|뜻|왜|어떻게|알려줘|정리|비교|원리|방법/.test(message)) {
    return "info";
  }

  if (/힘들|우울|짜증|화나|보고싶|서운|슬퍼|피곤|죽겠|외로/.test(message)) {
    return "emotion";
  }

  return "casual";
}

function getMaxCompletionTokens(mode: ChatMode) {
  if (mode === "info") {
    return 400;
  }

  if (mode === "emotion") {
    return 120;
  }

  return 80;
}

function buildModePrompt(_mode: ChatMode) {
  return TONE_PROMPT;
}

function normalizeReply(raw: string, mode: ChatMode) {
  const maxLines = mode === "info" ? 4 : 2;

  const reply = raw
    .trim()
    .replace(/니가/g, "너가")
    .replace(/니는/g, "너는")
    .replace(/니꺼/g, "너꺼")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .join("\n");

  const withoutStarterTail = reply.replace(STARTER_TAIL_PATTERN, "").trim();

  return withoutStarterTail || reply;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = String(body.message ?? "").trim();
    const history = (body.history ?? []) as ChatMessage[];
    const mode = classifyMessage(message);

    const filteredHistory = history
      .slice(-6)
      .filter((msg) => !!msg.text)
      .map((msg) => ({
        role: msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: msg.text,
      }));

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      reasoning_effort: "minimal",
      verbosity: "low",
      messages: [
        {
          role: "system" as const,
          content: buildModePrompt(mode),
        },
        ...filteredHistory,
        {
          role: "user" as const,
          content: message,
        },
      ],
      max_completion_tokens: getMaxCompletionTokens(mode),
    });

    const content = completion.choices[0]?.message.content ?? "";
    const reply = normalizeReply(content, mode) || EMPTY_REPLY_FALLBACK;

    return NextResponse.json({ reply }, { headers: JSON_HEADERS });
  } catch (error) {
    console.error("CATCH_ERROR", error);
    return NextResponse.json(
      { reply: ERROR_REPLY_FALLBACK },
      {
        status: 200,
        headers: JSON_HEADERS,
      }
    );
  }
}
