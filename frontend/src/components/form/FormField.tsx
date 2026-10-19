'use client';

type Props = {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
};

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  className = '',
  children,
}: Props) {
  return (
    <div className={`block ${className}`}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className={`mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] ${
            error ? 'text-rose-600' : 'text-[#718096]'
          }`}
        >
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[#9CA3AF]">{hint}</p>
      ) : null}
    </div>
  );
}
