'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PasswordField, TextField, useFormErrors } from '@/components/form';
import { QuikkredLogo } from '@/components/QuikkredLogo';
import { adminApi, getAdminToken, setAdminToken } from '@/lib/adminApi';
import {
  adminLoginErrors,
  password as passwordRule,
  required,
  username as usernameRule,
} from '@/lib/validation';

type Status = { exists: boolean };

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { errors, clearField, run, applyApiError, setFieldError } = useFormErrors();

  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      setAdminToken(token);
      void adminApi('/admin/me')
        .then(() => router.replace('/admin'))
        .catch(() => setAdminToken(null));
    }
  }, [router]);

  useEffect(() => {
    void adminApi<Status>('/admin/status')
      .then((data) => setExists(data.exists))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    if (!run(adminLoginErrors({ username, password }, !exists))) return;
    setSubmitting(true);
    try {
      const path = exists ? '/admin/login' : '/admin/setup';
      const data = await adminApi<{ token: string }>(path, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setAdminToken(data.token);
      router.push('/admin');
    } catch (err) {
      if (!applyApiError(err)) {
        setError(err instanceof Error ? err.message : 'Request failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="dot-bg flex min-h-screen items-center justify-center text-[#718096]">
        Checking admin status…
      </div>
    );
  }

  return (
    <div className="dot-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="brand-card w-full max-w-md rounded-2xl p-8 sm:p-10">
        <div className="flex justify-center">
          <QuikkredLogo size="lg" variant="badge" />
        </div>

        <h1 className="mt-6 text-center text-3xl font-semibold text-[#2D3748]">
          {exists ? 'Admin login' : 'Create admin'}
        </h1>
        <p className="mt-2 text-center text-sm text-[#718096]">
          {exists
            ? 'Sign in as admin, or a member with permissions (use their email).'
            : 'Create the one admin account to continue.'}
        </p>

        {error ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <form
          noValidate
          onSubmit={(e) => void onSubmit(e)}
          className="mt-7 space-y-5"
        >
          <TextField
            label="Username / ID"
            value={username}
            error={errors.username}
            autoComplete="username"
            placeholder={exists ? 'admin or member email' : 'admin'}
            maxLength={exists ? 254 : 32}
            onChange={(value) => {
              setUsername(value);
              clearField('username');
            }}
            onBlur={(value) =>
              setFieldError(
                'username',
                exists ? required(value, 'Username') : usernameRule(value),
              )
            }
          />
          <PasswordField
            label="Password"
            value={password}
            error={errors.password}
            autoComplete={exists ? 'current-password' : 'new-password'}
            placeholder={exists ? 'Your password' : 'Min 8 characters'}
            onChange={(value) => {
              setPassword(value);
              clearField('password');
            }}
            onBlur={(value) =>
              setFieldError(
                'password',
                exists
                  ? required(value, 'Password')
                  : passwordRule(value, { min: 8 }),
              )
            }
          />
          <button type="submit" disabled={submitting} className="brand-btn mt-1">
            {submitting
              ? 'Please wait…'
              : exists
                ? 'Login'
                : 'Create Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
