'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PasswordField, TextField, useFormErrors } from '@/components/form';
import { QuikkredLogo } from '@/components/QuikkredLogo';
import { getUserToken, setUserToken, userApi } from '@/lib/userApi';
import {
  email as emailRule,
  required,
  userLoginErrors,
} from '@/lib/validation';

export default function UserLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { errors, clearField, run, applyApiError, setFieldError } = useFormErrors();

  useEffect(() => {
    const token = getUserToken();
    if (!token) return;
    setUserToken(token);
    void userApi('/user/me')
      .then(() => router.replace('/user'))
      .catch(() => setUserToken(null));
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    if (!run(userLoginErrors({ email, password }))) return;
    setSubmitting(true);
    try {
      const data = await userApi<{ token: string }>('/user/login', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      setUserToken(data.token);
      router.push('/user');
    } catch (err) {
      if (!applyApiError(err)) {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dot-bg flex min-h-screen items-center justify-center px-4 py-12">
      <div className="brand-card w-full max-w-md rounded-2xl p-8 text-left sm:p-10">
        <div className="flex justify-center">
          <QuikkredLogo size="lg" variant="badge" />
        </div>

        <h1 className="mt-6 text-center text-3xl font-semibold text-[#2D3748]">
          Member login
        </h1>
        <p className="mt-2 text-center text-sm text-[#718096]">
          Sign in with your member email to manage tasks.
        </p>

        {error ? (
          <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        <form
          noValidate
          onSubmit={(e) => void onSubmit(e)}
          className="mt-7 space-y-5"
        >
          <TextField
            label="Email"
            type="email"
            value={email}
            error={errors.email}
            placeholder="team1@gmail.com"
            autoComplete="username"
            maxLength={254}
            onChange={(value) => {
              setEmail(value);
              clearField('email');
            }}
            onBlur={(value) => setFieldError('email', emailRule(value))}
          />
          <PasswordField
            label="Password"
            value={password}
            error={errors.password}
            placeholder="Your password"
            autoComplete="current-password"
            onChange={(value) => {
              setPassword(value);
              clearField('password');
            }}
            onBlur={(value) => setFieldError('password', required(value, 'Password'))}
          />
          <button
            type="submit"
            disabled={submitting}
            className="brand-btn w-full"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-[#9CA3AF]">
          Demo: team1@gmail.com / team1
        </p>
        <p className="mt-3 text-center text-sm text-[#6B7280]">
          Admin?{' '}
          <Link href="/admin/login" className="font-semibold text-[#3EB489]">
            Admin login
          </Link>
        </p>
      </div>
    </div>
  );
}
