import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelectMenu } from '../../components/UI/SelectMenu';

describe('SelectMenu', () => {
  const options = [
    { value: 'all', label: 'All streams' },
    { value: 'top-level', label: 'Top-level only' },
  ];

  it('renders a button/listbox custom select with inline chevron and dark-safe menu classes', () => {
    const onChange = vi.fn();

    render(
      <SelectMenu
        label="Hierarchy scope"
        value="all"
        options={options}
        onChange={onChange}
      />
    );

    const button = screen.getByRole('button', { name: /Hierarchy scope.*All streams/ });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    expect(button).not.toHaveClass('justify-between');
    expect(button.querySelector('[data-testid="select-menu-chevron"]')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(button);

    const listbox = screen.getByRole('listbox', { name: 'Hierarchy scope' });
    expect(listbox).toHaveClass('dark:bg-gray-800');
    expect(listbox).toHaveClass('dark:text-gray-100');
    expect(listbox).toHaveClass('dark:border-gray-700');

    fireEvent.click(screen.getByRole('option', { name: 'Top-level only' }));
    expect(onChange).toHaveBeenCalledWith('top-level');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(
      <SelectMenu
        label="Activity type"
        value="all"
        options={options}
        onChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Activity type.*All streams/ }));
    expect(screen.getByRole('listbox', { name: 'Activity type' })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports native-like keyboard movement and selection', () => {
    const onChange = vi.fn();

    render(
      <SelectMenu
        label="Hierarchy scope"
        value="all"
        options={[
          { value: 'all', label: 'All streams' },
          { value: 'top-level', label: 'Top-level only' },
          { value: 'sub-streams', label: 'Sub-streams only' },
        ]}
        onChange={onChange}
      />
    );

    fireEvent.keyDown(screen.getByRole('button', { name: /Hierarchy scope.*All streams/ }), { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: 'All streams' })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('option', { name: 'All streams' }), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('option', { name: 'Top-level only' }), { key: 'ArrowDown' });
    fireEvent.keyDown(screen.getByRole('option', { name: 'Sub-streams only' }), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('sub-streams');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
