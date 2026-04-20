import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard as Edit2, Save, X, Mail, Hash, Building, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';

export const Profile: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: profile?.name || '',
    department: profile?.department || '',
    bio: profile?.bio || '',
    avatar_url: profile?.avatar_url || '',
  });

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ ...form, updated_at: new Date().toISOString() }).eq('id', profile.id);
    setSaving(false);
    if (error) { toast.error('Failed to save profile'); return; }
    await refreshProfile();
    toast.success('Profile updated!');
    setEditing(false);
  };

  const handleCancel = () => {
    setForm({ name: profile?.name || '', department: profile?.department || '', bio: profile?.bio || '', avatar_url: profile?.avatar_url || '' });
    setEditing(false);
  };

  const roleColors: Record<string, any> = {
    student: 'info', faculty: 'success', admin: 'danger', security: 'warning', visitor: 'default',
  };

  if (!profile) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-6">My Profile</h2>

      <Card className="overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-zinc-900 overflow-hidden">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <Avatar name={profile.name} size="xl" className="w-full h-full rounded-none" />
              )}
            </div>
            {!editing ? (
              <Button variant="outline" size="sm" icon={<Edit2 size={14} />} onClick={() => setEditing(true)}>Edit Profile</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={handleCancel}>Cancel</Button>
                <Button size="sm" icon={<Save size={14} />} loading={saving} onClick={handleSave}>Save</Button>
              </div>
            )}
          </div>

          {editing ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Input label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} icon={<User size={16} />} />
              <Input label="Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} icon={<Building size={16} />} />
              <Input label="Avatar URL" value={form.avatar_url} onChange={e => setForm(f => ({ ...f, avatar_url: e.target.value }))} placeholder="https://..." />
              <Textarea label="Bio" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} placeholder="Tell us about yourself..." />
            </motion.div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{profile.name}</h2>
                <Badge variant={roleColors[profile.role]}>{profile.role}</Badge>
              </div>
              {profile.bio && <p className="text-zinc-500 text-sm mb-4">{profile.bio}</p>}
              <div className="grid grid-cols-2 gap-4 mt-4">
                {[
                  { icon: <Mail size={14} />, label: 'Email', value: profile.email },
                  { icon: <Building size={14} />, label: 'Department', value: profile.department || 'Not set' },
                  profile.student_id ? { icon: <Hash size={14} />, label: 'Student ID', value: profile.student_id } : null,
                  profile.faculty_id ? { icon: <Hash size={14} />, label: 'Faculty ID', value: profile.faculty_id } : null,
                ].filter(Boolean).map((item, i) => item && (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-400">{item.icon}</span>
                    <div>
                      <p className="text-xs text-zinc-400">{item.label}</p>
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
