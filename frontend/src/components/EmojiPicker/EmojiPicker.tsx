interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

const EMOJI_PRESETS = [
  '📊', '🎯', '🚀', '💡', '⚡', '🔥',
  '✨', '🎨', '🏆', '📈', '💼', '🛠️',
  '📱', '💻', '🌟', '🎓', '📚', '🔔',
  '⏰', '🎉', '👥', '🌐', '📝', '✅',
];

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  return (
    <div>
      <div className="mb-2 grid grid-cols-6 gap-2">
        {EMOJI_PRESETS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={`flex h-10 w-10 items-center justify-center rounded border text-xl transition-colors ${
              value === emoji
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
      
      <div className="mt-3">
        <label htmlFor="custom-emoji" className="mb-1 block text-xs font-medium text-gray-700">
          Or enter custom emoji:
        </label>
        <input
          type="text"
          id="custom-emoji"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 p-2 text-center text-xl focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="🎯"
          maxLength={10}
        />
      </div>
      
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Clear emoji
        </button>
      )}
    </div>
  );
}
