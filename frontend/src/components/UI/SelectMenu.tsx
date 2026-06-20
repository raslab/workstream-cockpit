import { ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export interface SelectMenuOption<T extends string> {
  value: T;
  label: string;
  leading?: ReactNode;
  disabled?: boolean;
}

interface SelectMenuProps<T extends string> {
  label: string;
  value: T;
  options: SelectMenuOption<T>[];
  onChange: (value: T) => void;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
}

export function SelectMenu<T extends string>({
  label,
  value,
  options,
  onChange,
  className = '',
  buttonClassName = '',
  menuClassName = '',
}: SelectMenuProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const labelId = useId();
  const listboxId = useId();
  const selectedValueId = useId();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selectedOption = options[selectedIndex] ?? options[0];

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(selectedIndex);
    }
  }, [isOpen, selectedIndex]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const enabledOptionIndexes = options
    .map((option, index) => (option.disabled ? -1 : index))
    .filter((index) => index >= 0);

  const moveActiveOption = (direction: 1 | -1) => {
    if (enabledOptionIndexes.length === 0) return;

    const currentEnabledIndex = enabledOptionIndexes.indexOf(activeIndex);
    const nextEnabledIndex =
      currentEnabledIndex === -1
        ? 0
        : (currentEnabledIndex + direction + enabledOptionIndexes.length) % enabledOptionIndexes.length;
    setActiveIndex(enabledOptionIndexes[nextEnabledIndex]);
  };

  const selectOption = (optionValue: T) => {
    onChange(optionValue);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(selectedIndex);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex(enabledOptionIndexes.at(-1) ?? selectedIndex);
    }
  };

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, optionValue: T) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(optionValue);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      buttonRef.current?.focus();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveActiveOption(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveOption(-1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(enabledOptionIndexes[0] ?? 0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(enabledOptionIndexes.at(-1) ?? 0);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <span id={labelId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-labelledby={`${labelId} ${selectedValueId}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={handleButtonKeyDown}
        className={`inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm hover:bg-gray-50 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 ${buttonClassName}`.trim()}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          {selectedOption?.leading}
          <span id={selectedValueId} className="truncate">{selectedOption?.label ?? ''}</span>
        </span>
        <svg
          data-testid="select-menu-chevron"
          aria-hidden="true"
          className={`h-4 w-4 flex-none text-gray-500 transition-transform dark:text-gray-400 ${isOpen ? 'rotate-180' : ''}`.trim()}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={label}
          className={`absolute left-0 z-30 mt-1 max-h-64 min-w-full overflow-y-auto rounded-md border border-gray-200 bg-white py-1 text-sm text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 ${menuClassName}`.trim()}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                tabIndex={index === activeIndex ? 0 : -1}
                onClick={() => {
                  selectOption(option.value);
                }}
                onKeyDown={(event) => handleOptionKeyDown(event, option.value)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-gray-700 dark:focus:bg-gray-700 ${isSelected ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-100' : ''}`.trim()}
              >
                {option.leading}
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {isSelected && <span aria-hidden="true" className="text-primary-600 dark:text-primary-300">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
