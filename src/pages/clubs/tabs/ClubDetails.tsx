import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Info, Calendar, Mail, Globe, Hash, Users, Clock, CreditCard as Edit2, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Textarea } from '../../../components/ui/Input';
import { Skeleton } from '../../../components/ui/Skeleton';

interface ClubInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  founded_year: number;
  contact_email: string;
  website: string;
  meeting_schedule: string;
  member_count: number;
  tags: string[];
  achievements: string;
  social_links: Record<string, string>;
  president: { name: string; email: string } | null;
}

interface Props {
  clubId: string;
  memberRole: string;
}

export const ClubDetails: React.FC<Props> = ({ clubId, memberRole }) => {
  const { profile } = useAuth();
  const [club, setClub] = useState<ClubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    description: '', founded_year: '', contact_email: '', website: '',
    meeting_schedule: '', achievements: '',
    instagram: '', facebook: '', linkedin: '',
  });

  const canEdit = profile?.role === 'admin' || profile?.role === 'faculty'
    || memberRole === 'president' || memberRole === 'officer';

  useEffect(() => { loadDetails(); }, [clubId]);

  const loadDetails = async () => {
    const { data } = await supabase.from('clubs')
      .select('*, president:president_id(name, email)')
      .eq('id', clubId).maybeSingle();
    if (data) {
      setClub(data);
      const social = (data.social_links as any) || {};
      setForm({
        description: data.description || '',
        founded_year: data.founded_year?.toString() || '',
        contact_email: data.contact_email || '',
        website: data.website || '',
        meeting_schedule: data.meeting_schedule || '',
        achievements: data.achievements || '',
        instagram: social.instagram || '',
        facebook: social.facebook || '',
        linkedin: social.linkedin || '',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!club) return;
    setSaving(true);
    const { error } = await supabase.from('clubs').update({
      description: form.description,
      founded_year: parseInt(form.founded_year) || club.founded_year,
      contact_email: form.contact_email,
      website: form.website,
      meeting_schedule: form.meeting_schedule,
      achievements: form.achievements,
      social_links: {
        instagram: form.instagram,
        facebook: form.facebook,
        linkedin: form.linkedin,
      },
    }).eq('id', clubId);
    setSaving(false);
    if (error) { toast.error('Failed to save'); return; }
    toast.success('Club details updated');
    setEditing(false);
    loadDetails();
  };

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );

  if (!club) return null;

  const social = (club.social_links as any) || {};

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          <Info size={16} className="text-blue-500" /> Club Information
        </h3>
        {canEdit && !editing && (
          <Button size="sm" variant="outline" icon={<Edit2 size={13} />} onClick={() => setEditing(true)}>Edit</Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" icon={<X size={13} />} onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" icon={<Save size={13} />} loading={saving} onClick={handleSave}>Save</Button>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Users size={16} className="text-blue-500" />, label: 'Members', value: club.member_count },
          { icon: <Calendar size={16} className="text-amber-500" />, label: 'Founded', value: club.founded_year || '—' },
          { icon: <Hash size={16} className="text-emerald-500" />, label: 'Category', value: club.category },
          { icon: <Clock size={16} className="text-orange-500" />, label: 'Meeting', value: club.meeting_schedule || 'TBA' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-zinc-500">{s.label}</p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{s.value}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* About */}
      <Card className="p-5">
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">About</h4>
        {editing ? (
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Club description..." />
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
            {club.description || 'No description added yet.'}
          </p>
        )}
      </Card>

      {/* President / Contact */}
      <Card className="p-5">
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Leadership & Contact</h4>
        <div className="space-y-3">
          {club.president && (
            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {club.president.name[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{club.president.name}</p>
                <p className="text-xs text-zinc-400">President</p>
              </div>
            </div>
          )}
          {editing ? (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Contact Email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} placeholder="club@university.edu" type="email" />
              <Input label="Founded Year" value={form.founded_year} onChange={e => setForm(f => ({ ...f, founded_year: e.target.value }))} type="number" placeholder="2020" />
              <Input label="Website" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://..." />
              <Input label="Meeting Schedule" value={form.meeting_schedule} onChange={e => setForm(f => ({ ...f, meeting_schedule: e.target.value }))} placeholder="Every Wednesday 3pm" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {club.contact_email && (
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <Mail size={13} /> <a href={`mailto:${club.contact_email}`} className="hover:text-blue-500 transition-colors">{club.contact_email}</a>
                </div>
              )}
              {club.website && (
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <Globe size={13} /> <a href={club.website} target="_blank" rel="noreferrer" className="hover:text-blue-500 transition-colors truncate">{club.website}</a>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Achievements */}
      <Card className="p-5">
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Achievements</h4>
        {editing ? (
          <Textarea value={form.achievements} onChange={e => setForm(f => ({ ...f, achievements: e.target.value }))} rows={3} placeholder="List notable achievements..." />
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
            {club.achievements || 'No achievements listed yet.'}
          </p>
        )}
      </Card>

      {/* Social Links */}
      <Card className="p-5">
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Social Media</h4>
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Instagram" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@clubhandle" />
            <Input label="Facebook" value={form.facebook} onChange={e => setForm(f => ({ ...f, facebook: e.target.value }))} placeholder="facebook.com/club" />
            <Input label="LinkedIn" value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))} placeholder="linkedin.com/company/club" />
          </div>
        ) : (
          <div className="flex gap-3 flex-wrap">
            {social.instagram && <a href={`https://instagram.com/${social.instagram.replace('@','')}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 text-xs font-medium hover:bg-pink-100 dark:hover:bg-pink-500/20 transition-colors">Instagram</a>}
            {social.facebook && <a href={social.facebook} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium hover:bg-blue-100 transition-colors">Facebook</a>}
            {social.linkedin && <a href={social.linkedin} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-medium hover:bg-sky-100 transition-colors">LinkedIn</a>}
            {!social.instagram && !social.facebook && !social.linkedin && (
              <p className="text-sm text-zinc-400">No social links added yet.</p>
            )}
          </div>
        )}
      </Card>

      {/* Tags */}
      {club.tags && club.tags.length > 0 && (
        <Card className="p-5">
          <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">Tags</h4>
          <div className="flex gap-2 flex-wrap">
            {club.tags.map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">#{tag}</span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
