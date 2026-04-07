'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Check, LogOut, X } from 'lucide-react';

type Props = {
  userId: string;
  initialName: string;
  email: string;
  initialPreferences: Record<string, unknown>;
};

const MARKETS = [
  { value: 'in', label: '🇮🇳 India' },
  { value: 'gb', label: '🇬🇧 UK' },
  { value: 'us', label: '🇺🇸 USA' },
  { value: 'au', label: '🇦🇺 Australia' },
  { value: 'ca', label: '🇨🇦 Canada' },
  { value: 'sg', label: '🇸🇬 Singapore' },
];

export function SettingsClient({ userId, initialName, email, initialPreferences }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const pref = initialPreferences;
  const [name, setName] = useState(initialName);
  const [jobMarket, setJobMarket] = useState((pref.jobMarket as string) ?? 'in');
  const [minScore, setMinScore] = useState((pref.minScore as number) ?? 3.5);
  const [watchedCompanies, setWatchedCompanies] = useState<string[]>((pref.watchedCompanies as string[]) ?? []);
  const [watchedInput, setWatchedInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: name.trim() || null,
          preferences: {
            ...pref,
            jobMarket,
            minScore,
            watchedCompanies,
          },
        })
        .eq('id', userId);
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  function addCompany() {
    const val = watchedInput.trim();
    if (val && !watchedCompanies.includes(val)) {
      setWatchedCompanies([...watchedCompanies, val]);
    }
    setWatchedInput('');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '560px' }}>

      {/* Account */}
      <Section title="Account">
        <Field label="Display name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            style={inputStyle}
          />
        </Field>
        <Field label="Email">
          <input value={email} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Email is managed by your auth provider and cannot be changed here.
          </p>
        </Field>
      </Section>

      {/* Job discovery */}
      <Section title="Nightly Job Discovery">
        <Field label="Job market">
          <select
            value={jobMarket}
            onChange={(e) => setJobMarket(e.target.value)}
            style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}
          >
            {MARKETS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Used for Adzuna keyword search. Requires ADZUNA_APP_ID + ADZUNA_APP_KEY in .env.local.
          </p>
        </Field>

        <Field label="Minimum rule score to surface">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range" min={1} max={5} step={0.1}
              value={minScore}
              onChange={(e) => setMinScore(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', minWidth: '36px' }}>
              {minScore.toFixed(1)}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Only jobs above this threshold appear in "New Matches" on the dashboard.
          </p>
        </Field>

        <Field label="Watched company portals (Greenhouse + Lever)">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            {watchedCompanies.map((c) => (
              <span key={c} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '2px 8px', borderRadius: '100px',
                background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)',
                fontSize: '12px', color: 'var(--accent)', fontWeight: 500,
              }}>
                {c}
                <button
                  onClick={() => setWatchedCompanies(watchedCompanies.filter((x) => x !== c))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, display: 'flex' }}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={watchedInput}
              onChange={(e) => setWatchedInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCompany(); } }}
              placeholder="Stripe, Figma, Notion… press Enter"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={addCompany} style={secondaryBtnStyle}>Add</button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            The cron runs at 1 AM UTC and saves matching jobs to your dashboard.
          </p>
        </Field>
      </Section>

      {/* Save */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '9px 20px', borderRadius: 'var(--radius-md)',
            background: saving ? 'var(--text-muted)' : 'var(--accent)',
            color: '#fff', fontSize: '13px', fontWeight: 600,
            border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && (
          <span style={{ fontSize: '13px', color: '#15803D', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Check size={13} /> Saved
          </span>
        )}
        {saveError && <span style={{ fontSize: '13px', color: '#EF4444' }}>{saveError}</span>}
      </div>

      {/* Danger zone */}
      <Section title="Account Actions">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Sign out</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sign out of your account on this device</div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', borderRadius: 'var(--radius-md)',
              border: '1px solid #FECACA', background: '#FEF2F2',
              color: '#EF4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <LogOut size={12} />{signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-xl)', padding: '20px',
      boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: '16px',
    }}>
      <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  fontSize: '13px', color: 'var(--text-primary)',
  background: '#fff', outline: 'none',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)', background: '#fff',
  fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)',
  cursor: 'pointer', whiteSpace: 'nowrap',
};
