type EmojiCategory = {
  key: string;
  label: string;
};

const CATEGORIES: EmojiCategory[] = [
  { key: "angry", label: "화남" },
  { key: "hungry", label: "배고파" },
  { key: "love", label: "사랑해" },
  { key: "missyou", label: "보고싶어" },
  { key: "sad", label: "슬픔" },
  { key: "wad", label: "뭐해" },
  { key: "happy", label: "행복" },
];

const EMOJI_NUMBERS = [1, 2, 3];

type Props = {
  onSelect: (imagePath: string) => void;
  cacheKey: number;
};

export default function EmojiPanel({ onSelect, cacheKey }: Props) {
  return (
    <div className="max-h-[34dvh] overflow-y-auto bg-white px-3 py-3">
      <div className="space-y-3">
        {CATEGORIES.map((category) => (
          <section key={category.key}>
            <div className="mb-1.5 text-[12px] font-semibold text-[#66727c]">
              {category.label}
            </div>
            <div className="grid grid-cols-4 gap-2 min-[390px]:grid-cols-5 sm:grid-cols-6">
              {EMOJI_NUMBERS.map((number) => {
                const imagePath = `/emojis/${category.key}/${number}.png`;

                return (
                  <button
                    key={imagePath}
                    type="button"
                    onClick={() => onSelect(imagePath)}
                    className="flex aspect-square min-h-[64px] items-center justify-center rounded-[12px] border border-[#edf0f2] bg-[#f8fafb] p-2 outline-none transition active:scale-[0.96] hover:bg-[#f1f4f6] focus-visible:ring-2 focus-visible:ring-[#7e9fb7]"
                    aria-label={`${category.label} ${number}`}
                  >
                    <img
                      src={`${imagePath}?v=${cacheKey}`}
                      alt={`${category.label} ${number}`}
                      className="h-full max-h-[72px] w-full object-contain"
                    />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
