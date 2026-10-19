'use client';

import { useCallback, useState } from 'react';
import { fieldErrorsFrom } from '@/lib/apiError';
import type { FieldErrors } from '@/lib/validation';

export function useFormErrors() {
  const [errors, setErrors] = useState<FieldErrors>({});

  const setFieldError = useCallback((key: string, message: string | null) => {
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[key] = message;
      else delete next[key];
      return next;
    });
  }, []);

  const clearField = useCallback((key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => setErrors({}), []);

  const run = useCallback((next: Record<string, string | null | undefined>) => {
    // Drop null/empty messages so a passing field never blocks submit.
    const compact: FieldErrors = {};
    for (const [key, value] of Object.entries(next || {})) {
      if (value) compact[key] = value;
    }
    setErrors(compact);
    return Object.keys(compact).length === 0;
  }, []);

  const applyApiError = useCallback((err: unknown) => {
    const fields = fieldErrorsFrom(err);
    if (fields) setErrors(fields);
    return fields;
  }, []);

  return { errors, setFieldError, clearField, clearAll, run, applyApiError };
}
