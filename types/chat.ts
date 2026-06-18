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
