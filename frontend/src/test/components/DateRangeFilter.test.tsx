import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangeFilter } from '../../components/Timeline/DateRangeFilter';
import '@testing-library/jest-dom';

describe('DateRangeFilter', () => {
  it('should render date range button', () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const onClear = vi.fn();

    render(
      <DateRangeFilter
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onClear={onClear}
      />
    );

    expect(screen.getByText('Date Range')).toBeInTheDocument();
  });

  it('should display selected date range in button label', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const onClear = vi.fn();

    render(
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onClear={onClear}
      />
    );

    expect(screen.getByText(/Jan 1 - Jan 31, 2024/)).toBeInTheDocument();
  });

  it('should show checkmark when dates are selected', () => {
    const startDate = new Date('2024-01-01');
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const onClear = vi.fn();

    render(
      <DateRangeFilter
        startDate={startDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onClear={onClear}
      />
    );

    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('should open dropdown on button click', () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const onClear = vi.fn();

    render(
      <DateRangeFilter
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onClear={onClear}
      />
    );

    const button = screen.getByText('Date Range');
    fireEvent.click(button);

    expect(screen.getByText('Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
  });

  it('should call onStartDateChange when start date is selected', () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const onClear = vi.fn();

    render(
      <DateRangeFilter
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onClear={onClear}
      />
    );

    const button = screen.getByText('Date Range');
    fireEvent.click(button);

    const startInput = screen.getByLabelText('Start Date') as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: '2024-01-01' } });

    expect(onStartDateChange).toHaveBeenCalled();
  });

  it('should call onEndDateChange when end date is selected', () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const onClear = vi.fn();

    render(
      <DateRangeFilter
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onClear={onClear}
      />
    );

    const button = screen.getByText('Date Range');
    fireEvent.click(button);

    const endInput = screen.getByLabelText('End Date') as HTMLInputElement;
    fireEvent.change(endInput, { target: { value: '2024-01-31' } });

    expect(onEndDateChange).toHaveBeenCalled();
  });

  it('should display quick select buttons', () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const onClear = vi.fn();

    render(
      <DateRangeFilter
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onClear={onClear}
      />
    );

    const button = screen.getByText('Date Range');
    fireEvent.click(button);

    expect(screen.getByRole('button', { name: 'Last 7 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 14 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toBeInTheDocument();
  });

  it('should call onQuickDaysChange when a quick filter is clicked', () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const onQuickDaysChange = vi.fn();
    const onClear = vi.fn();

    render(
      <DateRangeFilter
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onQuickDaysChange={onQuickDaysChange}
        onClear={onClear}
      />
    );

    const button = screen.getByText('Date Range');
    fireEvent.click(button);

    fireEvent.click(screen.getByRole('button', { name: 'Last 14 days' }));

    expect(onQuickDaysChange).toHaveBeenCalledWith(14);
    expect(onStartDateChange).not.toHaveBeenCalled();
    expect(onEndDateChange).not.toHaveBeenCalled();
  });

  it('should show clear button when dates are selected', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const onClear = vi.fn();

    render(
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onClear={onClear}
      />
    );

    const button = screen.getByText(/Jan 1 - Jan 31, 2024/);
    fireEvent.click(button);

    const clearButton = screen.getByText('Clear');
    expect(clearButton).toBeInTheDocument();
  });

  it('should call onClear when clear button is clicked', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const onClear = vi.fn();

    render(
      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onClear={onClear}
      />
    );

    const button = screen.getByText(/Jan 1 - Jan 31, 2024/);
    fireEvent.click(button);

    const clearButton = screen.getByText('Clear');
    fireEvent.click(clearButton);

    expect(onClear).toHaveBeenCalled();
  });

  it('should close dropdown when Apply is clicked', () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();
    const onClear = vi.fn();

    render(
      <DateRangeFilter
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        onClear={onClear}
      />
    );

    const button = screen.getByText('Date Range');
    fireEvent.click(button);

    expect(screen.getByText('Start Date')).toBeInTheDocument();

    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);

    expect(screen.queryByText('Start Date')).not.toBeInTheDocument();
  });
});
