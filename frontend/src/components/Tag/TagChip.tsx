import { useLocation, useNavigate } from 'react-router-dom';
import { useTags } from '../../api/tags';

interface TagChipProps {
  tagName: string;
  onClick?: () => void;
}

function addTagToSearch(search: string, tagName: string): string {
  const params = new URLSearchParams(search);
  const tags = new Set(
    (params.get('tags') ?? '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  );
  tags.add(tagName);
  params.set('tags', [...tags].sort((a, b) => a.localeCompare(b)).join(','));
  return params.toString();
}

export function TagChip({ tagName, onClick }: TagChipProps) {
  const { data: tags } = useTags();
  const navigate = useNavigate();
  const location = useLocation();
  // tagName is the tag ID (e.g., "alan_awake"), find the tag to get displayName
  const tag = tags?.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
  const color = tag?.color || '#1DA1F2';
  const displayName = tag?.displayName || tagName;  // Fallback to ID if tag not found

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      const search = addTagToSearch(location.search, tagName);
      navigate({ pathname: location.pathname === '/timeline' ? '/timeline' : '/', search: `?${search}` });
    }
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex min-w-0 max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium text-white transition-opacity hover:opacity-80"
      style={{ backgroundColor: color }}
      title={`Tag ID: #${tagName}`}
    >
      #{displayName}
    </button>
  );
}
