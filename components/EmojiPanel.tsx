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
    <div className="max-h-72 overflow-y-auto rounded-xl bg-white p-3 shadow-lg">
      <div className="space-y-4">
        {CATEGORIES.map((category) => (
          <section key={category.key}>
            <div className="mb-2 text-sm font-semibold text-gray-600">
              {category.label}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {EMOJI_NUMBERS.map((number) => {
                const imagePath = `/emojis/${category.key}/${number}.png`;

                return (
                  <button
                    key={imagePath}
                    type="button"
                    onClick={() => onSelect(imagePath)}
                    className="flex aspect-square items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-2 transition active:scale-95 hover:bg-gray-100"
                    aria-label={`${category.label} ${number}`}
                  >
                    <img
                      src={`${imagePath}?v=${cacheKey}`}
                      alt={`${category.label} ${number}`}
                      className="h-full max-h-20 w-full object-contain"
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
