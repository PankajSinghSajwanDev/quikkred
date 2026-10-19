'use client';

import { TextAreaField, useFormErrors } from '@/components/form';
import { updateMessage } from '@/lib/validation';
import { useState } from 'react';

type Props = {
  title?: string;
  hint?: string;
  submitLabel?: string;
  disabled?: boolean;
  onSubmit: (payload: { message: string }) => Promise<void>;
};

export function TaskUpdateForm({
  title = 'Task update',
  hint = 'Write what you are facing on this task, progress, or blockers. Admin can see every message.',
  submitLabel = 'Task Update',
  disabled = false,
  onSubmit,
}: Props) {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { errors, clearField, run, applyApiError, setFieldError } = useFormErrors();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = message.trim();
    if (!run({ message: updateMessage(trimmed) })) return;
    setSaving(true);
    try {
      await onSubmit({ message: trimmed });
      setMessage('');
      clearField('message');
    } catch (err) {
      if (!applyApiError(err)) {
        setError(err instanceof Error ? err.message : 'Could not post update');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] lg:p-6">
      <h3 className="text-base font-semibold text-[#111827]">{title}</h3>
      <p className="mt-1 text-sm text-[#6B7280]">{hint}</p>
      {error ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      <form noValidate onSubmit={(e) => void submit(e)} className="mt-4 space-y-4">
        <TextAreaField
          label="What’s happening"
          value={message}
          error={errors.message}
          rows={4}
          maxLength={2000}
          placeholder="Progress, blockers, or what you need from admin…"
          onChange={(value) => {
            setMessage(value);
            clearField('message');
          }}
          onBlur={(value) => setFieldError('message', updateMessage(value))}
        />
        <button
          type="submit"
          disabled={saving || disabled}
          className="brand-btn w-auto min-w-[160px] px-7 disabled:opacity-60"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
      </form>
    </section>
  );
}
