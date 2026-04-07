'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type Skill = {
  id: string;
  name: string;
  years_experience: number;
  level: 'expert' | 'strong' | 'familiar' | 'learning';
  category: string;
  is_primary: boolean;
  is_hidden: boolean;
  source: 'cv_extracted' | 'manual';
};

async function authed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return { supabase, userId: user.id };
}

export async function getSkills(): Promise<Skill[]> {
  const { supabase, userId } = await authed();
  const { data } = await supabase
    .from('skills')
    .select('*')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('years_experience', { ascending: false });
  return (data ?? []) as Skill[];
}

export async function addSkill(input: {
  name: string;
  yearsExperience: number;
  level: string;
  category: string;
  isPrimary: boolean;
}): Promise<Skill> {
  const { supabase, userId } = await authed();
  const { data, error } = await supabase
    .from('skills')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      years_experience: input.yearsExperience,
      level: input.level,
      category: input.category,
      is_primary: input.isPrimary,
      is_hidden: false,
      source: 'manual',
    })
    .select()
    .single();
  if (error) throw error;
  revalidatePath('/skills');
  return data as Skill;
}

export async function updateSkill(
  id: string,
  updates: Partial<Pick<Skill, 'name' | 'years_experience' | 'level' | 'category' | 'is_primary'>>
): Promise<void> {
  const { supabase, userId } = await authed();
  await supabase.from('skills').update(updates).eq('id', id).eq('user_id', userId);
  revalidatePath('/skills');
}

export async function deleteSkill(id: string): Promise<void> {
  const { supabase, userId } = await authed();
  await supabase.from('skills').delete().eq('id', id).eq('user_id', userId);
  revalidatePath('/skills');
}

export async function togglePrimary(id: string, isPrimary: boolean): Promise<void> {
  const { supabase, userId } = await authed();
  await supabase.from('skills').update({ is_primary: isPrimary }).eq('id', id).eq('user_id', userId);
  revalidatePath('/skills');
}

export async function toggleHidden(id: string, isHidden: boolean): Promise<void> {
  const { supabase, userId } = await authed();
  await supabase.from('skills').update({ is_hidden: isHidden }).eq('id', id).eq('user_id', userId);
  revalidatePath('/skills');
}
