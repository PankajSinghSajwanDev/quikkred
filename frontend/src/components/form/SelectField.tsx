'use client';

import { PremiumSelect, type SelectOption } from '@/components/PremiumSelect';
import { FormField } from './FormField';

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  error?: string;
  hint?: string;
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  className?: string;
};

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  hint,
  placeholder,
  searchable,
  searchPlaceholder,
  className,
}: Props) {
  return (
    <FormField label={label} error={error} hint={hint} className={className}>
      <PremiumSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        searchable={searchable}
        searchPlaceholder={searchPlaceholder}
        invalid={Boolean(error)}
      />
    </FormField>
  );
}
