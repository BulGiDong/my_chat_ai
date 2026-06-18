"use client";

import { useEffect, useRef, useState } from "react";
import ChatWindow from "@/components/ChatWindow";
import MessageInput from "@/components/MessageInput";
import { loadMessages, saveMessages } from "@/lib/memory";
import { ChatApiResponse, ChatMessage } from "@/types/chat";

const IS_TEST_REPLY_DELAY = true;
const AI_EMOJI_CHANCE = 0.15;
const AI_EMOJI_DELAY_MIN_MS = 500;
const AI_EMOJI_DELAY_MAX_MS = 1_500;

function makeMessage(role: ChatMessage["role"], text: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    createdAt: Date.now(),
  };
}

function makeImageMessage(
  role: ChatMessage["role"],
  imagePath: string
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text: "",
    image: imagePath,
    createdAt: Date.now(),
  };
}

function getEmojiMessageText(imagePath: string) {
  if (imagePath.includes("/angry")) return "나 화났어";
  if (imagePath.includes("/hungry")) return "나 배고파";
  if (imagePath.includes("/love")) return "나 사랑해";
  if (imagePath.includes("/missyou")) return "나 보고싶어";
  if (imagePath.includes("/sad")) return "나 슬퍼";
  if (imagePath.includes("/wad")) return "뭐해";
  if (imagePath.includes("/happy")) return "나 기분 좋아";

  return "나 이모티콘 보냈어";
}

function getRandomProactiveDelay() {
  const options = [60, 70, 80, 90, 100, 110, 120];
  const randomMinutes = options[Math.floor(Math.random() * options.length)];
  return randomMinutes * 60 * 1000;
}

function getRandomReplyDisplayDelay() {
  const minMs = 1_000;
  const maxMs = IS_TEST_REPLY_DELAY ? 10_000 : 5 * 60 * 1_000;

  return minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
}

function getRandomAiEmojiDelay() {
  return (
    AI_EMOJI_DELAY_MIN_MS +
    Math.floor(Math.random() * (AI_EMOJI_DELAY_MAX_MS - AI_EMOJI_DELAY_MIN_MS + 1))
  );
}

function isInfoQuestion(message: string) {
  return [
    "뭐야",
    "뭔데",
    "설명",
    "차이",
    "뜻",
    "왜",
    "어떻게",
    "알려줘",
    "정리",
    "비교",
    "원리",
    "방법",
  ].some((keyword) => message.includes(keyword));
}

function isEmojiRequest(message: string) {
  const text = message.replace(/\s/g, "");

  return [
    "이모티콘보내",
    "이모티콘보내봐",
    "임티보내",
    "임티보내봐",
    "보내봐",
    "다시보내",
    "다시보내봐",
    "또보내",
    "또보내봐",
    "하나보내",
    "오빠보내봐",
    "이모티콘",
    "임티",
  ].some((keyword) => text.includes(keyword));
}

function isRepeatEmojiRequest(message: string) {
  const text = message.replace(/\s/g, "");

  return ["다시", "또", "한번더"].some((keyword) => text.includes(keyword));
}

function getLastAssistantEmoji(messages: ChatMessage[]) {
  const lastEmoji = [...messages]
    .reverse()
    .find((msg) => msg.role === "assistant" && msg.image);

  return lastEmoji?.image ?? null;
}

function getAiEmojiPath(message: string, reply: string) {
  const text = `${message} ${reply}`;

  if (text.includes("배고") || text.includes("밥") || text.includes("먹")) {
    return "/emojis/hungry.png";
  }

  if (text.includes("사랑") || text.includes("좋아") || text.includes("귀엽")) {
    return "/emojis/love.png";
  }

  if (text.includes("보고싶")) {
    return "/emojis/missyou.png";
  }

  if (
    text.includes("슬퍼") ||
    text.includes("우울") ||
    text.includes("힘들") ||
    text.includes("고생") ||
    text.includes("ㅠ")
  ) {
    return "/emojis/sad.png";
  }

  if (
    text.includes("화나") ||
    text.includes("짜증") ||
    text.includes("삐졌") ||
    text.includes("삐졋")
  ) {
    return "/emojis/angry.png";
  }

  if (
    text.includes("머행") ||
    text.includes("뭐행") ||
    text.includes("모행") ||
    text.includes("뭐해")
  ) {
    return "/emojis/wad.png";
  }

  if (text.includes("ㅋㅋ") || text.includes("행복") || text.includes("좋다") || text.includes("기분")) {
    return "/emojis/happy.png";
  }

  return null;
}

function shouldSendAiEmoji(message: string, reply: string) {
  if (isInfoQuestion(message)) return false;
  if (!getAiEmojiPath(message, reply)) return false;

  return Math.random() < AI_EMOJI_CHANCE;
}

function getForcedAiEmojiPath(message: string, reply: string, messages: ChatMessage[]) {
  if (isRepeatEmojiRequest(message)) {
    const lastEmoji = getLastAssistantEmoji(messages);
    if (lastEmoji) {
      return lastEmoji;
    }
  }

  return getAiEmojiPath(message, reply) ?? "/emojis/wad.png";
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const proactiveTimerRef = useRef<number | null>(null);
  const replyDelayTimersRef = useRef<number[]>([]);

  useEffect(() => {
    const saved = loadMessages();

    if (saved.length > 0) {
      setMessages(saved);
    } else {
      setMessages([makeMessage("assistant", "머행")]);
    }
  }, []);

  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  useEffect(() => {
    return () => {
      if (proactiveTimerRef.current) {
        window.clearTimeout(proactiveTimerRef.current);
      }

      replyDelayTimersRef.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      replyDelayTimersRef.current = [];
    };
  }, []);

  const scheduleReplyDelayTimer = (callback: () => void, delay: number) => {
    const timerId = window.setTimeout(() => {
      callback();
      replyDelayTimersRef.current = replyDelayTimersRef.current.filter(
        (id) => id !== timerId
      );
    }, delay);

    replyDelayTimersRef.current.push(timerId);
  };

  const showAssistantMessageAfterDelay = (
    sourceMessage: string,
    reply: string,
    emojiHistory: ChatMessage[]
  ) => {
    scheduleReplyDelayTimer(() => {
      setMessages((prev) => [...prev, makeMessage("assistant", reply)]);
      setLoading(false);

      const emojiPath = isEmojiRequest(sourceMessage)
        ? getForcedAiEmojiPath(sourceMessage, reply, emojiHistory)
        : shouldSendAiEmoji(sourceMessage, reply)
          ? getAiEmojiPath(sourceMessage, reply)
          : null;

      if (!emojiPath) {
        return;
      }

      scheduleReplyDelayTimer(() => {
        setMessages((prev) => [...prev, makeImageMessage("assistant", emojiPath)]);
      }, getRandomAiEmojiDelay());
    }, getRandomReplyDisplayDelay());
  };

  const resetProactiveTimer = (latestMessages: ChatMessage[]) => {
    if (proactiveTimerRef.current) {
      window.clearTimeout(proactiveTimerRef.current);
    }

    const lastMessage = latestMessages[latestMessages.length - 1];

    if (!lastMessage || lastMessage.role !== "user") {
      return;
    }

    const randomDelay = getRandomProactiveDelay();

    proactiveTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/proactive", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            history: latestMessages.slice(-8),
          }),
        });

        const data = await res.json();

        if (data.reply) {
          setMessages((prev) => [...prev, makeMessage("assistant", data.reply)]);
        }
      } catch (error) {
        console.error(error);
      }
    }, randomDelay);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = makeMessage("user", text);
    const nextMessages = [...messages, userMsg];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    resetProactiveTimer(nextMessages);

    try {
      const apiHistory = nextMessages.slice(0, -1).slice(-8);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          history: apiHistory,
        }),
      });

      const data = (await res.json()) as ChatApiResponse;

      showAssistantMessageAfterDelay(text, data.reply || "머행", messages);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        makeMessage("assistant", "오류낫엉..."),
      ]);
      setLoading(false);
    }
  };

  const sendEmoji = async (imagePath: string) => {
    if (loading) return;

    const userMsg = makeImageMessage("user", imagePath);
    const nextMessages = [...messages, userMsg];
    const emojiMessageText = getEmojiMessageText(imagePath);

    setMessages(nextMessages);
    setLoading(true);
    resetProactiveTimer(nextMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: emojiMessageText,
          history: messages.slice(-8),
        }),
      });

      const data = (await res.json()) as ChatApiResponse;

      showAssistantMessageAfterDelay(emojiMessageText, data.reply || "웅웅", messages);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        makeMessage("assistant", "오류낫엉..."),
      ]);
      setLoading(false);
    }
  };

  const clearChat = () => {
    const initial = [makeMessage("assistant", "머행")];
    setMessages(initial);

    if (proactiveTimerRef.current) {
      window.clearTimeout(proactiveTimerRef.current);
    }

    replyDelayTimersRef.current.forEach((timerId) => {
      window.clearTimeout(timerId);
    });
    replyDelayTimersRef.current = [];
    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col bg-[#9bbbd4]">
      <header className="border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
          <div>
            <div className="text-lg font-bold">윤호 AI</div>
            <div className="text-sm text-gray-500">카톡 느낌 테스트</div>
          </div>
          <button
            onClick={clearChat}
            className="rounded-full border px-3 py-1 text-sm"
          >
            초기화
          </button>
        </div>
      </header>

      <ChatWindow messages={messages} loading={loading} />

      <MessageInput
        value={input}
        onChange={setInput}
        onSend={sendMessage}
        onEmojiSend={sendEmoji}
        disabled={loading}
      />
    </main>
  );
}
