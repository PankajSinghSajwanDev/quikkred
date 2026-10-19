'use client';

import { useState } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  placeholder?: string;
  name?: string;
  id?: string;
  invalid?: boolean;
};

function EyeOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2.5 12.2S6.2 6.5 12 6.5s9.5 5.7 9.5 5.7-3.7 5.7-9.5 5.7S2.5 12.2 2.5 12.2z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.2" r="2.8" fill="currentColor" />
      <circle cx="12" cy="12.2" r="1.15" fill="white" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.2 3.2l17.6 17.6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M9.4 9.55A3.1 3.1 0 0012 15.3c.7 0 1.35-.23 1.88-.62"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6.55 6.8C4.55 8.05 3.15 9.75 2.5 11.1a1.6 1.6 0 000 1.55C3.7 15.4 7.35 18.5 12 18.5c1.55 0 3-.35 4.3-.9M10.1 6.7c.6-.12 1.25-.2 1.9-.2 4.65 0 8.3 3.1 9.5 5.85a1.6 1.6 0 010 1.55c-.35.75-1 1.7-1.9 2.65"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PasswordInput({
  value,
  onChange,
  onBlur,
  required,
  minLength,
  autoComplete = 'current-password',
  placeholder,
  name = 'password',
  id,
  invalid,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative w-full">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={Boolean(invalid)}
        className={`brand-input relative z-0 w-full pr-14 ${invalid ? 'is-invalid' : ''}`}
        spellCheck={false}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        className={`absolute top-1/2 right-2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border transition duration-200 active:scale-95 ${
          visible
            ? 'border-[#3EB489]/35 bg-[#E8F8F1] text-[#2f9a74]'
            : 'border-[#E2E8F0] bg-white text-[#718096] hover:border-[#3EB489]/40 hover:bg-[#F0FDF7] hover:text-[#3EB489]'
        }`}
      >
        {visible ? <EyeOpenIcon /> : <EyeClosedIcon />}
      </button>
    </div>
  );
}
