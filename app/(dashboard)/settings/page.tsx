import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from '@/components/settings/settings-client';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, preferences')
    .eq('id', user!.id)
    .single();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Settings
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Manage your account and job discovery preferences.
        </p>
      </div>
      <SettingsClient
        userId={user!.id}
        initialName={profile?.full_name ?? ''}
        email={user!.email ?? ''}
        initialPreferences={(profile?.preferences ?? {}) as Record<string, unknown>}
      />
    </div>
  );
}
