import { ChatMessage } from "@/types/chat";

type Props = {
  messages: ChatMessage[];
  loading: boolean;
};

function getImageSrc(message: ChatMessage) {
  if (!message.image) return "";

  const separator = message.image.includes("?") ? "&" : "?";
  return `${message.image}${separator}v=${message.createdAt}`;
}

export default function ChatWindow({ messages, loading }: Props) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#abc1d1] px-4 py-4">
      <div className="mx-auto flex max-w-md flex-col gap-3 pb-4">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const hasImage = !!msg.image;

          return (
            <div
              key={msg.id}
              className={`flex min-w-0 ${
                isUser ? "justify-end" : "justify-start"
              }`}
            >
              {hasImage ? (
                <img
                  src={getImageSrc(msg)}
                  alt="이모티콘"
                  className="h-24 w-24 object-contain sm:h-28 sm:w-28"
                />
              ) : (
                <div
                  className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-[15px] leading-relaxed shadow-sm [overflow-wrap:anywhere] ${
                    isUser ? "bg-[#FEE500] text-black" : "bg-white text-black"
                  }`}
                >
                  {msg.text}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white px-4 py-2 text-sm text-gray-500 shadow-sm">
              입력중...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
