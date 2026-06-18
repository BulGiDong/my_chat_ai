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
    <div className="chat-scroll min-h-0 flex-1 overflow-y-auto bg-[#abc1d1] px-3 py-3 sm:px-4">
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-2.5 pb-3">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const hasImage = !!msg.image;

          return (
            <div
              key={msg.id}
              className={`flex min-w-0 items-end ${
                isUser ? "justify-end pl-10" : "justify-start pr-10"
              } ${hasImage ? "py-0.5" : ""}`}
            >
              {hasImage ? (
                <img
                  src={getImageSrc(msg)}
                  alt="이모티콘"
                  className="h-[88px] w-[88px] shrink-0 object-contain sm:h-24 sm:w-24"
                />
              ) : (
                <div
                  className={`max-w-[78%] whitespace-pre-wrap break-words px-3.5 py-2 text-[15px] leading-[1.42] text-[#242424] [overflow-wrap:anywhere] ${
                    isUser
                      ? "rounded-[16px] rounded-tr-[5px] bg-[#FEE500]"
                      : "rounded-[16px] rounded-tl-[5px] border border-black/[0.04] bg-white shadow-[0_1px_1px_rgba(0,0,0,0.04)]"
                  }`}
                >
                  {msg.text}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start pr-10">
            <div className="flex h-8 items-center gap-1 rounded-[16px] rounded-tl-[5px] border border-black/[0.04] bg-white px-3 shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8b98a3]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#a1abb4]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#b5bec5]" />
              <span className="sr-only">
                입력중
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
