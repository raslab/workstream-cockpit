import { useState } from 'react';

const PRESET_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#6B7280', // gray
  '#14B8A6', // teal
  '#F97316', // orange
  '#84CC16', // lime
  '#06B6D4', // cyan
  '#6366F1', // indigo
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value);

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  return (
    <div>
      <div className="mb-3 grid grid-cols-6 gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`h-10 w-10 rounded-md border-2 transition-all ${
              value.toUpperCase() === color.toUpperCase()
                ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2'
                : 'border-gray-200 hover:border-gray-400'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">Custom:</label>
        <input
          type="color"
          value={customColor}
          onChange={handleCustomColorChange}
          className="h-10 w-20 cursor-pointer rounded border border-gray-300"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="#000000"
          maxLength={7}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
    </div>
  );
}
