import { ChatMessage } from "@/types/chat";

const STORAGE_KEY = "yoon-ai-chat-history";
const MAX_SAVED_MESSAGES = 80;

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Partial<ChatMessage>;
  const hasText = typeof message.text === "string";
  const hasImage = typeof message.image === "string";

  return (
    (message.role === "user" || message.role === "assistant") &&
    (hasText || hasImage) &&
    typeof message.id === "string" &&
    typeof message.createdAt === "number"
  );
}

export function saveMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(messages.slice(-MAX_SAVED_MESSAGES))
  );
}

export function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isChatMessage);
  } catch {
    return [];
  }
}
