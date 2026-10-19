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
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
};

export function TextAreaField({
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  placeholder,
  rows = 4,
  maxLength,
  className,
}: Props) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        className={`brand-input min-h-[8rem] resize-y ${error ? 'is-invalid' : ''}`}
      />
    </FormField>
  );
}
