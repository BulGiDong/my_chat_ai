export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  image?: string;
  createdAt: number;
};

export type ChatApiResponse = {
  reply?: string;
};

export type ConversationMood =
  | "normal"
  | "sad"
  | "angry"
  | "tired"
  | "hungry"
  | "playful"
  | "affectionate";

export type ConversationTopic =
  | "general"
  | "study"
  | "work"
  | "exercise"
  | "food"
  | "relationship"
  | "health";

export type ConversationState = {
  mood: ConversationMood;
  topic: ConversationTopic;
  situation: string;
  intensity: 0 | 1 | 2;
  remainingTurns: number;
  updatedAt: number;
};
