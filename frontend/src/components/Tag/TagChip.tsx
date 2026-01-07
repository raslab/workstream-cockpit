import { useNavigate } from 'react-router-dom';
import { useTags } from '../../api/tags';

interface TagChipProps {
  tagName: string;
  onClick?: () => void;
}

export function TagChip({ tagName, onClick }: TagChipProps) {
  const { data: tags } = useTags();
  const navigate = useNavigate();
  // tagName is the tag ID (e.g., "alan_awake"), find the tag to get displayName
  const tag = tags?.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
  const color = tag?.color || '#1DA1F2';
  const displayName = tag?.displayName || tagName;  // Fallback to ID if tag not found

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Navigate to cockpit with this tag filter active (using tag ID)
      navigate('/', { state: { filterTags: [tagName] } });
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white hover:opacity-80 transition-opacity"
      style={{ backgroundColor: color }}
      title={`Tag ID: #${tagName}`}
    >
      #{displayName}
    </button>
  );
}
