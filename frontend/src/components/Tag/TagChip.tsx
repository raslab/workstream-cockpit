import { useTags } from '../../api/tags';

interface TagChipProps {
  tagName: string;
}

export function TagChip({ tagName }: TagChipProps) {
  const { data: tags } = useTags();
  const tag = tags?.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
  const color = tag?.color || '#1DA1F2';

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      #{tagName}
    </span>
  );
}
