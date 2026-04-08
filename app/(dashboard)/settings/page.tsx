export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SettingsClient } from '@/components/settings/settings-client';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, preferences')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div>
      <SettingsClient
        userId={user.id}
        initialName={profile?.full_name ?? ''}
        email={user.email ?? ''}
        initialPreferences={(profile?.preferences ?? {}) as Record<string, unknown>}
      />
    </div>
  );
}
