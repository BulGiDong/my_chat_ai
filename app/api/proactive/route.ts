import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { PROACTIVE_PROMPT } from "@/lib/prompts/proactive";
import { ChatMessage } from "@/types/chat";

const SYSTEM_PROMPT = `${PROACTIVE_PROMPT}

항상 반말로 선톡 문장만 보내.
답변은 한 문장만 보내고, 설명하지 마.
`;

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

const PROACTIVE_FALLBACKS = [
  "머행",
  "모하고잇엉",
  "밥 먹엇엉?",
  "왜 조용행",
  "안자?",
  "보고싶은뎅",
];

function getRecentAssistantReplies(history: ChatMessage[]) {
  return history
    .filter((msg) => msg.role === "assistant" && msg.text)
    .slice(-6)
    .map((msg) => msg.text.trim());
}

function getRandomFallback(recentReplies: string[]) {
  const recent = new Set(recentReplies.map(normalizeForCompare));
  const available = PROACTIVE_FALLBACKS.filter((reply) => !recent.has(normalizeForCompare(reply)));
  const pool = available.length > 0 ? available : PROACTIVE_FALLBACKS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function normalizeForCompare(reply: string) {
  return reply.replace(/\s+/g, "").replace(/[.!?。！？~…ㅠㅋ]/g, "").trim();
}

function normalizeReply(raw: string, history: ChatMessage[]) {
  const recentReplies = getRecentAssistantReplies(history);
  let reply = raw.trim();

  if (!reply) {
    return getRandomFallback(recentReplies);
  }

  reply = reply.replace(/^["']|["']$/g, "");
  reply = reply.replace(/\n{3,}/g, "\n\n");

  const lines = reply
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2);

  reply = lines.join("\n");

  const recentSet = new Set(recentReplies.map(normalizeForCompare));

  if (!reply) {
    return getRandomFallback(recentReplies);
  }

  if (recentSet.has(normalizeForCompare(reply))) {
    return getRandomFallback(recentReplies);
  }

  if (reply.length > 30) {
    const firstSentence = reply.split(/[.!?。！？]\s*|\n/)[0]?.trim();
    if (firstSentence && firstSentence.length >= 3) {
      reply = firstSentence;
    } else {
      reply = reply.slice(0, 30).trim();
    }
  }

  return reply;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const history = (body.history ?? []) as ChatMessage[];

    const filteredHistory = history
      .slice(-5)
      .filter((msg) => !!msg.text)
      .map((msg) => ({
        role: msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: msg.text,
      }));

    const input = [
      {
        role: "system" as const,
        content: SYSTEM_PROMPT,
      },
      ...filteredHistory,
      {
        role: "user" as const,
        content: "지금 자연스럽게 선톡 하나만 보내. 짧고 카톡처럼.",
      },
    ];

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input,
      max_output_tokens: 40,
    });

    const rawReply = response.output_text ?? "";
    const reply = normalizeReply(rawReply, history);

    return NextResponse.json({ reply }, { headers: JSON_HEADERS });
  } catch (error) {
    console.error("PROACTIVE API ERROR:", error);
    return NextResponse.json(
      { reply: "머행" },
      { status: 200, headers: JSON_HEADERS }
    );
  }
}
