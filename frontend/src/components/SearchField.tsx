'use client';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  showClear?: boolean;
};

export function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  onClear,
  showClear,
}: Props) {
  const clearable = showClear ?? Boolean(value);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 focus-within:border-[#3EB489] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(62,180,137,0.12)]">
      <span className="text-[#9CA3AF]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.9" />
          <path
            d="M16.2 16.2L20 20"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="min-w-0 flex-1 border-0 bg-transparent py-1.5 text-sm text-[#1F2937] outline-none placeholder:text-[#9CA3AF]"
      />
      {clearable && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 text-xs font-semibold text-[#3EB489] hover:underline"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
