import { NextResponse } from "next/server";
import {
  buildConversationStatePrompt,
  normalizeConversationState,
} from "@/lib/conversation-state";
import { openai } from "@/lib/openai";
import { TONE_PROMPT } from "@/lib/prompts/tone";
import { validateToneOutput } from "@/lib/tone-output-guard";
import {
  retrieveToneExamples,
  type ToneExample,
} from "@/lib/tone-example-retriever";
import { ChatMessage } from "@/types/chat";

export const runtime = "nodejs";

const EMPTY_REPLY_FALLBACK = "웅웅";
const ERROR_REPLY_FALLBACK = "오류낫엉...";
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const STARTER_TAIL_PATTERN = /(?:\s*[?？]?\s*(?:머행|뭐행|모행)\s*[?？]?\s*)+$/g;
const TONE_RETRY_PROMPT = `방금 답변은 하윤호 말투와 맞지 않는 표현을 포함했다.
독립 반응 ㅇㅇ, 문장 끝 ~임/~거임, ㄱㄱ, 니가/니는/니꺼를 쓰지 말고 같은 의미를 짧고 따뜻한 카톡 말투로 다시 답해라.
설명하지 말고 최종 답장만 출력해라.`;

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

function buildModePrompt(
  _mode: ChatMode,
  conversationState: unknown,
  examples: ToneExample[]
) {
  const statePrompt = buildConversationStatePrompt(
    normalizeConversationState(conversationState)
  );

  const examplesPrompt = buildToneExamplesPrompt(examples);

  return [TONE_PROMPT, statePrompt, examplesPrompt].filter(Boolean).join("\n\n");
}

function buildToneExamplesPrompt(examples: ToneExample[]) {
  if (examples.length === 0) return "";

  const examplesText = examples
    .map((example) => `상대: ${example.input}\n하윤호: ${example.reply}`)
    .join("\n\n");

  return `[실제 하윤호 카카오톡 말투 참고 예시]

${examplesText}

위 예시는 정답 문장이 아니라 말투 참고 자료다.
문장을 그대로 복사하거나 특정 입력에 고정 답변하지 마라.
예시의 사실, 이름, 장소, 상황을 현재 답변으로 옮기지 마라.
현재 대화 문맥에 맞게 길이, 온도, 오타, 말끝, 장난 방식만 참고해 새로운 답장 하나를 만들어라.`;
}

function normalizeReply(raw: string, mode: ChatMode) {
  const maxLines = mode === "info" ? 4 : 2;

  const reply = raw
    .trim()
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .join("\n");

  const limitedQuestions = limitQuestions(reply);
  const withoutStarterTail = limitedQuestions.replace(STARTER_TAIL_PATTERN, "").trim();

  return withoutStarterTail || limitedQuestions;
}

function sanitizeFailedRetry(reply: string) {
  return reply
    .replace(/니가/g, "너가")
    .replace(/니는/g, "너는")
    .replace(/니꺼/g, "너꺼")
    .replace(/ㅇㅇ(?=$|[\s,./!?~()[\]{}:;ㅋㅎㅠㅜ])/gu, "웅")
    .replace(/(?:^|\s)ㄱㄱ(?=$|[\s,./!?~])/gu, "")
    .replace(/한거임(?=$|\s*[.!?~,/ㅋㅎㅠㅜ])/gu, "한건데")
    .replace(/거임(?=$|\s*[.!?~,/ㅋㅎㅠㅜ])/gu, "건데")
    .replace(/중임(?=$|\s*[.!?~,/ㅋㅎㅠㅜ])/gu, "중이야")
    .trim();
}

function getToneGuardFallback(mode: ChatMode) {
  if (mode === "info") return "잘 모르겠엉";
  if (mode === "emotion") return "아이구 ㅠ";
  return EMPTY_REPLY_FALLBACK;
}

function limitQuestions(reply: string) {
  const matches = [...reply.matchAll(/[?？]/g)];
  if (matches.length < 2) return reply;

  const firstQuestionIndex = matches[0].index;
  if (firstQuestionIndex === undefined) return reply;

  return reply.slice(0, firstQuestionIndex + 1).trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = String(body.message ?? "").trim();
    const history = (Array.isArray(body.history) ? body.history : []) as ChatMessage[];
    const conversationState = body.conversationState;
    const mode = classifyMessage(message);
    const toneExamples = retrieveToneExamples({
      userMessage: message,
      history,
      conversationState: normalizeConversationState(conversationState),
    });

    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[tone-examples] selected: ${toneExamples.map((example) => example.id).join(", ") || "none"}`
      );
    }

    const filteredHistory = history
      .slice(-6)
      .filter((msg) => !!msg.text)
      .map((msg) => ({
        role: msg.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: msg.text,
      }));

    const completionMessages = [
      {
        role: "system" as const,
        content: buildModePrompt(mode, conversationState, toneExamples),
      },
      ...filteredHistory,
      {
        role: "user" as const,
        content: message,
      },
    ];
    const completionOptions = {
      model: "gpt-5-mini",
      reasoning_effort: "minimal",
      verbosity: "low",
      max_completion_tokens: getMaxCompletionTokens(mode),
    } as const;

    const completion = await openai.chat.completions.create({
      ...completionOptions,
      messages: completionMessages,
    });

    const content = completion.choices[0]?.message.content ?? "";
    let reply = normalizeReply(content, mode) || EMPTY_REPLY_FALLBACK;
    const firstGuardResult = validateToneOutput(reply);
    let regenerated = false;

    if (!firstGuardResult.valid) {
      regenerated = true;
      if (process.env.NODE_ENV !== "production") {
        console.info(`[tone-guard] retry: ${firstGuardResult.reasons.join(", ")}`);
      }

      const retryCompletion = await openai.chat.completions.create({
        ...completionOptions,
        messages: [
          ...completionMessages,
          { role: "assistant" as const, content },
          { role: "system" as const, content: TONE_RETRY_PROMPT },
        ],
      });
      const retryContent = retryCompletion.choices[0]?.message.content ?? "";
      const retryReply = normalizeReply(retryContent, mode) || EMPTY_REPLY_FALLBACK;
      const retryGuardResult = validateToneOutput(retryReply);
      if (retryGuardResult.valid) {
        reply = retryReply;
      } else {
        const sanitizedReply = sanitizeFailedRetry(retryReply);
        reply =
          sanitizedReply && validateToneOutput(sanitizedReply).valid
            ? sanitizedReply
            : getToneGuardFallback(mode);
      }
    }

    const responseHeaders = new Headers(JSON_HEADERS);
    if (process.env.NODE_ENV !== "production") {
      responseHeaders.set("X-Tone-Guard-Regenerated", regenerated ? "1" : "0");
    }
    return NextResponse.json({ reply }, { headers: responseHeaders });
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
