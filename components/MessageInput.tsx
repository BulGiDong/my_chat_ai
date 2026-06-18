"use client";

import { useState } from "react";
import EmojiPanel from "@/components/EmojiPanel";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onEmojiSend: (imagePath: string) => void;
  disabled?: boolean;
};

export default function MessageInput({
  value,
  onChange,
  onSend,
  onEmojiSend,
  disabled = false,
}: Props) {
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [emojiCacheKey, setEmojiCacheKey] = useState(0);

  const handleEmojiSelect = (imagePath: string) => {
    onEmojiSend(imagePath);
    setEmojiOpen(false);
  };

  const toggleEmojiPanel = () => {
    setEmojiOpen((open) => {
      if (!open) {
        setEmojiCacheKey(Date.now());
      }

      return !open;
    });
  };

  return (
    <div className="chat-composer border-t border-[#d7dde2] bg-white">
      <div className="mx-auto w-full max-w-[430px]">
        {emojiOpen && (
          <div className="border-b border-[#edf0f2]">
            <EmojiPanel
              onSelect={handleEmojiSelect}
              cacheKey={emojiCacheKey}
            />
          </div>
        )}

        <div
          className="grid items-end gap-2 px-3 py-2.5"
          style={{ gridTemplateColumns: "42px minmax(0, 1fr) 54px" }}
        >
          <button
            type="button"
            onClick={toggleEmojiPanel}
            disabled={disabled}
            className="flex min-h-[42px] min-w-[42px] shrink-0 items-center justify-center rounded-full border border-[#d8dee3] bg-white text-lg outline-none transition active:scale-[0.96] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#7e9fb7]"
            aria-label="이모티콘"
          >
            😊
          </button>
          <textarea
            className="h-[42px] max-h-[84px] min-w-0 flex-1 basis-0 resize-none overflow-y-auto rounded-[18px] border border-[#d8dee3] bg-[#f9fafb] px-3.5 py-2.5 text-[16px] leading-5 text-[#222] outline-none placeholder:text-[#8b98a3] focus:border-[#aab6bf] focus:bg-white focus:ring-2 focus:ring-[#dce7ef]"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="메시지 입력"
            disabled={disabled}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={disabled}
            className={`min-h-[42px] w-[54px] shrink-0 rounded-[18px] text-[14px] font-semibold text-[#222] outline-none transition active:scale-[0.97] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#7e9fb7] ${
              value.trim()
                ? "bg-[#FEE500]"
                : "bg-[#f4e891] text-[#7f7628]"
            }`}
            aria-label="메시지 전송"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
