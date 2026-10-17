'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/client-api';
import { loginUrl } from '@/lib/redirect';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';
import ErrorMessage from '@/components/ErrorMessage';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Spinner, inputClass, labelClass, primaryButton } from '@/components/ui';

const card =
  'rounded-2xl border border-white/10 bg-surface shadow-surface p-5 sm:p-7';

function Notice({ children }) {
  return (
    <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] px-4 py-2.5 text-sm text-emerald-200">
      {children}
    </p>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [status, setStatus] = useState({ saving: false, error: '', ok: '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwStatus, setPwStatus] = useState({ saving: false, error: '', ok: '' });

  async function load() {
    setLoadError('');
    try {
      const { user } = await apiFetch('/api/users/me');
      setProfile({ _id: user._id, email: user.email, name: user.name, bio: user.bio, avatarUrl: user.avatarUrl });
    } catch (err) {
      if (err.status === 401) return router.replace(loginUrl('/settings'));
      setLoadError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (field) => (e) => setProfile((p) => ({ ...p, [field]: e.target.value }));

  async function saveProfile(e) {
    e.preventDefault();
    if (!profile.name.trim()) return setStatus({ saving: false, error: 'Name is required.', ok: '' });
    setStatus({ saving: true, error: '', ok: '' });
    try {
      const { user } = await apiFetch('/api/users/me', {
        method: 'PUT',
        body: { name: profile.name, bio: profile.bio, avatarUrl: profile.avatarUrl },
      });
      setUser(user);
      setProfile((p) => ({ ...p, name: user.name, bio: user.bio, avatarUrl: user.avatarUrl }));
      setStatus({ saving: false, error: '', ok: 'Profile updated.' });
      router.refresh();
    } catch (err) {
      if (err.status === 401) return router.replace(loginUrl('/settings'));
      setStatus({ saving: false, error: err.message, ok: '' });
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (pw.newPassword.length < 8) {
      return setPwStatus({ saving: false, error: 'New password must be at least 8 characters.', ok: '' });
    }
    setPwStatus({ saving: true, error: '', ok: '' });
    try {
      await apiFetch('/api/users/me', { method: 'PUT', body: pw });
      setPw({ currentPassword: '', newPassword: '' });
      setPwStatus({ saving: false, error: '', ok: 'Password changed.' });
    } catch (err) {
      setPwStatus({ saving: false, error: err.message, ok: '' });
    }
  }

  if (loadError) return <div className="mx-auto max-w-2xl"><ErrorMessage message={loadError} onRetry={load} /></div>;
  if (!profile) return <LoadingSpinner label="Loading settings…" />;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-5xl leading-none text-white sm:text-6xl">Settings</h1>
          <p className="mt-3 text-sm text-slate-400">{profile.email}</p>
        </div>
        <Link href={`/profile/${profile._id}`} className="text-[10px] font-medium uppercase tracking-[0.25em] text-indigo-400 hover:text-indigo-300">
          View public profile →
        </Link>
      </div>

      <form onSubmit={saveProfile} className={`${card} space-y-5`} noValidate>
        <h2 className="font-display text-3xl text-white">Profile</h2>
        {status.error && <ErrorMessage title="Couldn't save profile" message={status.error} />}
        {status.ok && <Notice>{status.ok}</Notice>}

        <div className="flex items-center gap-4">
          <Avatar name={profile.name} src={/^https?:\/\//.test(profile.avatarUrl) ? profile.avatarUrl : ''} size="lg" />
          <div className="min-w-0 flex-1">
            <label htmlFor="avatarUrl" className={labelClass}>Avatar URL</label>
            <input id="avatarUrl" type="url" inputMode="url" value={profile.avatarUrl} onChange={set('avatarUrl')} placeholder="https://…" className={inputClass} />
          </div>
        </div>
        <div>
          <label htmlFor="name" className={labelClass}>Name</label>
          <input id="name" value={profile.name} onChange={set('name')} maxLength={60} className={inputClass} />
        </div>
        <div>
          <label htmlFor="bio" className={labelClass}>Bio</label>
          <textarea id="bio" rows={3} value={profile.bio} onChange={set('bio')} maxLength={200} placeholder="A sentence or two about you." className={inputClass} />
          <p className="mt-1 text-right text-xs tabular-nums text-slate-500">{profile.bio.length}/200</p>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={status.saving} className={primaryButton}>
            {status.saving && <Spinner />} Save profile
          </button>
        </div>
      </form>

      <form onSubmit={changePassword} className={`${card} space-y-5`} noValidate>
        <h2 className="font-display text-3xl text-white">Change password</h2>
        {pwStatus.error && <ErrorMessage title="Couldn't change password" message={pwStatus.error} />}
        {pwStatus.ok && <Notice>{pwStatus.ok}</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="currentPassword" className={labelClass}>Current password</label>
            <input id="currentPassword" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label htmlFor="newPassword" className={labelClass}>New password</label>
            <input id="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={pwStatus.saving || !pw.currentPassword || !pw.newPassword} className={primaryButton}>
            {pwStatus.saving && <Spinner />} Change password
          </button>
        </div>
      </form>
    </div>
  );
}
