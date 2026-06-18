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
    <div className="border-t bg-white p-3">
      <div className="mx-auto max-w-md">
        {emojiOpen && (
          <div className="mb-3">
            <EmojiPanel
              onSelect={handleEmojiSelect}
              cacheKey={emojiCacheKey}
            />
          </div>
        )}

        <div className="flex gap-2">
          <input
            className="flex-1 rounded-full border border-gray-300 px-4 py-3 outline-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="메시지 입력"
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSend();
              }
            }}
          />
          <button
            type="button"
            onClick={toggleEmojiPanel}
            disabled={disabled}
            className="rounded-full border border-gray-300 px-4 py-3 text-lg disabled:opacity-50"
            aria-label="이모티콘"
          >
            😊
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={disabled}
            className="rounded-full bg-[#FEE500] px-5 py-3 font-semibold text-black disabled:opacity-50"
          >
            전송
          </button>
        </div>
      </div>
    </div>
  );
}
