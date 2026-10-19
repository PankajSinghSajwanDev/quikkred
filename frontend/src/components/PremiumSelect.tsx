'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type SelectOption = {
  value: string;
  label: string;
  /** Extra text used for search (e.g. email) */
  searchText?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Show search box inside dropdown */
  searchable?: boolean;
  searchPlaceholder?: string;
  invalid?: boolean;
};

type MenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

export function PremiumSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  required,
  disabled,
  searchable = false,
  searchPlaceholder = 'Search…',
  invalid = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState<MenuPos | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = [o.label, o.searchText, o.value]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 6;
    const preferred = searchable ? 320 : 280;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      180,
      Math.min(preferred, openUp ? spaceAbove : spaceBelow),
    );

    setPos({
      top: openUp ? rect.top - gap : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      maxHeight,
      openUp,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    if (searchable) {
      window.setTimeout(() => searchRef.current?.focus(), 0);
    }

    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onReposition = () => updatePosition();

    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, searchable]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const menu =
    open && mounted && pos
      ? createPortal(
          <div
            ref={menuRef}
            id={listId}
            role="listbox"
            style={{
              position: 'fixed',
              top: pos.openUp ? undefined : pos.top,
              bottom: pos.openUp
                ? window.innerHeight - pos.top
                : undefined,
              left: pos.left,
              width: pos.width,
              maxHeight: pos.maxHeight,
              zIndex: 9999,
            }}
            className="flex flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]"
          >
            {searchable ? (
              <div className="shrink-0 border-b border-[#F3F4F6] p-2">
                <div className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-2 focus-within:border-[#3EB489] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#3EB489]/15">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="shrink-0 text-[#9CA3AF]"
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="6.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    />
                    <path
                      d="M16.2 16.2L20 20"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                  <input
                    ref={searchRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF]"
                  />
                </div>
              </div>
            ) : null}

            <ul className="min-h-0 flex-1 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-[#9CA3AF]">
                  No matches
                </li>
              ) : (
                filtered.map((option) => {
                  const active = option.value === value;
                  return (
                    <li key={option.value || '__empty'}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          onChange(option.value);
                          setOpen(false);
                        }}
                        className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${
                          active
                            ? 'bg-[#E8F8F1] font-medium text-[#2f9a74]'
                            : 'text-[#374151] hover:bg-[#F9FAFB]'
                        }`}
                      >
                        <span className="block truncate">{option.label}</span>
                        {option.searchText ? (
                          <span className="mt-0.5 block truncate text-xs font-normal text-[#9CA3AF]">
                            {option.searchText}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <select
        tabIndex={-1}
        aria-hidden
        required={required}
        value={value}
        onChange={() => undefined}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      >
        {placeholder && !required ? (
          <option value="">{placeholder}</option>
        ) : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        aria-invalid={invalid}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2.5 text-left text-sm transition ${
          open
            ? 'border-[#3EB489] ring-2 ring-[#3EB489]/15'
            : invalid
              ? 'border-rose-400 hover:border-rose-500'
              : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
        } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <span
          className={`truncate ${selected ? 'font-medium text-[#111827]' : 'text-[#9CA3AF]'}`}
        >
          {selected?.label ?? placeholder}
        </span>
        <span
          className={`shrink-0 text-[#9CA3AF] transition ${open ? 'rotate-180' : ''}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {menu}
    </div>
  );
}
