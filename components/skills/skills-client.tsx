'use client';

import { useState } from 'react';
import { SkillBubbles } from './skill-bubbles';
import { SkillList } from './skill-list';
import { AddSkillSheet, type SavePayload } from './add-skill-sheet';
import type { Skill } from '@/lib/actions/skills';
import {
  addSkill as serverAdd,
  updateSkill as serverUpdate,
  deleteSkill as serverDelete,
  togglePrimary as serverTogglePrimary,
  toggleHidden as serverToggleHidden,
} from '@/lib/actions/skills';

type Props = { initialSkills: Skill[] };

export function SkillsClient({ initialSkills }: Props) {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);

  function openAdd() { setEditingSkill(null); setSheetOpen(true); }
  function openEdit(skill: Skill) { setEditingSkill(skill); setSheetOpen(true); }
  function closeSheet() { setSheetOpen(false); }

  async function handleSave(data: SavePayload) {
    if (editingSkill) {
      // Optimistic update
      const updated: Skill = {
        ...editingSkill,
        name: data.name,
        years_experience: data.yearsExperience,
        level: data.level as Skill['level'],
        category: data.category,
        is_primary: data.isPrimary,
      };
      setSkills((prev) => prev.map((s) => s.id === editingSkill.id ? updated : s));
      setSheetOpen(false);
      await serverUpdate(editingSkill.id, {
        name: data.name,
        years_experience: data.yearsExperience,
        level: data.level as Skill['level'],
        category: data.category,
        is_primary: data.isPrimary,
      });
    } else {
      // Optimistically close sheet, then insert
      setSheetOpen(false);
      const newSkill = await serverAdd(data);
      setSkills((prev) => [...prev, newSkill]);
    }
  }

  async function handleDelete(id: string) {
    setSkills((prev) => prev.filter((s) => s.id !== id));
    setSheetOpen(false);
    await serverDelete(id);
  }

  async function handleTogglePrimary(id: string, val: boolean) {
    setSkills((prev) => prev.map((s) => s.id === id ? { ...s, is_primary: val } : s));
    await serverTogglePrimary(id, val);
  }

  async function handleToggleHidden(id: string, val: boolean) {
    setSkills((prev) => prev.map((s) => s.id === id ? { ...s, is_hidden: val } : s));
    await serverToggleHidden(id, val);
  }

  return (
    <>
      <div className="skills-grid">
        {/* Left: bubbles */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)', padding: '24px',
          boxShadow: 'var(--shadow-card)',
        }}>
          <SkillBubbles skills={skills} onEdit={openEdit} />
        </div>

        {/* Right: list */}
        <div>
          <SkillList
            skills={skills}
            onEdit={openEdit}
            onAdd={openAdd}
            onTogglePrimary={handleTogglePrimary}
            onToggleHidden={handleToggleHidden}
            onDelete={handleDelete}
          />
        </div>
      </div>

      <AddSkillSheet
        open={sheetOpen}
        skill={editingSkill}
        onClose={closeSheet}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </>
  );
}
