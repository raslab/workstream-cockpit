import { useTags } from '../../api/tags';

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
  const { data: tags, isLoading } = useTags();

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const clearAllTags = () => {
    onTagsChange([]);
  };

  if (isLoading || !tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Filter by tags:</span>
      
      {tags.map((tag) => {
        const isSelected = selectedTags.includes(tag.name);
        return (
          <button
            key={tag.id}
            onClick={() => toggleTag(tag.name)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition-all ${
              isSelected
                ? 'ring-2 ring-offset-1'
                : 'opacity-60 hover:opacity-100'
            }`}
            style={{
              backgroundColor: tag.color,
              color: '#fff',
            }}
          >
            #{tag.name}
            {isSelected && <span className="text-xs">✕</span>}
          </button>
        );
      })}

      {selectedTags.length > 0 && (
        <button
          onClick={clearAllTags}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
