'use client';

import { useId } from 'react';
import { PasswordInput } from '@/components/PasswordInput';
import { FormField } from './FormField';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
};

export function PasswordField({
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  placeholder,
  autoComplete,
  className,
}: Props) {
  const id = useId();
  return (
    <FormField label={label} htmlFor={id} error={error} hint={hint} className={className}>
      <PasswordInput
        id={id}
        value={value}
        onChange={onChange}
        onBlur={() => onBlur?.(value)}
        invalid={Boolean(error)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
    </FormField>
  );
}
