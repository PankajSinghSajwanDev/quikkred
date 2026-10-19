'use client';

import { useId } from 'react';
import { FormField } from './FormField';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  className?: string;
};

export function TextField({
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  type = 'text',
  placeholder,
  autoComplete,
  maxLength,
  inputMode,
  className,
}: Props) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`brand-input ${error ? 'is-invalid' : ''}`}
      />
    </FormField>
  );
}
