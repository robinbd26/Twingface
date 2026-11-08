'use client';

import { useEffect, useMemo, useState } from 'react';
import { FEELING_ACTIVITY_OPTIONS } from '@/lib/feeling-activity';
import { CloseIcon, SearchIcon } from '../dashboard/icons';

type FeelingActivityPickerProps = {
  value: string | null;
  onSelect: (key: string) => void;
  onClear: () => void;
  onClose: () => void;
};

export default function FeelingActivityPicker({ value, onSelect, onClear, onClose }: FeelingActivityPickerProps) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const visibleOptions = useMemo(
    () => FEELING_ACTIVITY_OPTIONS.filter((option) => !normalizedQuery || `${option.label} ${option.phrase}`.toLowerCase().includes(normalizedQuery)),
    [normalizedQuery],
  );
  const feelings = visibleOptions.filter((option) => option.kind === 'feeling');
  const activities = visibleOptions.filter((option) => option.kind === 'activity');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className='feeling-activity-backdrop' role='presentation' onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className='feeling-activity-dialog surface' role='dialog' aria-modal='true' aria-labelledby='feeling-activity-title' data-testid='dialog-feeling-activity'>
        <header className='feeling-activity-heading'>
          <div>
            <h2 id='feeling-activity-title'>How are you feeling?</h2>
            <p>Choose a feeling or activity for your post.</p>
          </div>
          <button type='button' aria-label='Close feeling and activity picker' onClick={onClose}><CloseIcon size={18} /></button>
        </header>
        <label className='feeling-activity-search'>
          <SearchIcon size={17} />
          <span className='sr-only'>Search feelings and activities</span>
          <input data-testid='input-feeling-activity-search' value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search feelings and activities' autoFocus />
        </label>
        {value ? <button type='button' className='feeling-activity-clear' data-testid='button-clear-picker-feeling-activity' onClick={onClear}>Clear selection</button> : null}
        <div className='feeling-activity-options'>
          {feelings.length ? <OptionGroup heading='Feelings' options={feelings} value={value} onSelect={onSelect} /> : null}
          {activities.length ? <OptionGroup heading='Activities' options={activities} value={value} onSelect={onSelect} /> : null}
          {!visibleOptions.length ? <p className='feeling-activity-empty'>No feelings or activities found.</p> : null}
        </div>
      </section>
    </div>
  );
}

type OptionGroupProps = {
  heading: string;
  options: readonly (typeof FEELING_ACTIVITY_OPTIONS)[number][];
  value: string | null;
  onSelect: (key: string) => void;
};

function OptionGroup({ heading, options, value, onSelect }: OptionGroupProps) {
  return (
      <section className='feeling-activity-group' aria-label={heading}>
      <h4>{heading}</h4>
      <div className='feeling-activity-option-grid'>
        {options.map((option) => (
          <button className='feeling-activity-option' key={option.key} type='button' data-testid={`button-feeling-activity-option-${option.key}`} aria-pressed={option.key === value} onClick={() => onSelect(option.key)}>
            <span aria-hidden='true'>{option.emoji}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
