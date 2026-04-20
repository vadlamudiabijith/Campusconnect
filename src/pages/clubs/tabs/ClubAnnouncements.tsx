import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pin, Megaphone, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Input, Textarea } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Card } from '../../../components/ui/Card';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDistanceToNow } from '../../../lib/utils';

interface Props {
  clubId: string;
  isMember: boolean;
  memberRole: string | null;
}

export const ClubAnnouncements: React.FC<Props> = ({ clubId, isMember, memberRole }) => {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', pinned: false });

  const load = async () => {
    const { data } = await supabase.from('club_announcements')
      .select('*, author:author_id(name, avatar_url, role)')
      .eq('club_id', clubId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setAnnouncements(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clubId]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { data, error } = await supabase.from('club_announcements').insert({
      club_id: clubId, author_id: profile.id, ...form,
    }).select('*, author:author_id(name, avatar_url, role)').single();
    setSaving(false);
    if (error) { toast.error('Failed to post'); return; }
    setAnnouncements(a => [data, ...a]);
    setShowForm(false);
    setForm({ title: '', content: '', pinned: false });
    toast.success('Announcement posted!');
  };

  const canPost = profile?.role === 'admin' || profile?.role === 'faculty' ||
    (isMember && (memberRole === 'president' || memberRole === 'officer'));

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-zinc-500">{announcements.length} announcement{announcements.length !== 1 ? 's' : ''}</p>
        {canPost ? (
          <Button icon={<Plus size={16} />} size="sm" onClick={() => setShowForm(true)}>Post Announcement</Button>
        ) : !isMember ? (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Lock size={12} /> Join club to interact
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-4">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : announcements.length === 0 ? (
        <EmptyState icon={<Megaphone size={24} />} title="No club announcements yet"
          description={canPost ? 'Post the first announcement for your club' : 'Officers will post announcements here'} />
      ) : (
        <div className="space-y-4">
          {announcements.map((ann, idx) => (
            <motion.div key={ann.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card className={`p-5 ${ann.pinned ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/5' : ''}`}>
                {ann.pinned && (
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs font-medium mb-3">
                    <Pin size={12} /> Pinned Announcement
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Avatar name={ann.author?.name} src={ann.author?.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-zinc-900 dark:text-white text-sm">{ann.author?.name}</span>
                      <Badge variant={ann.author?.role === 'faculty' || ann.author?.role === 'admin' ? 'info' : 'warning'} size="sm">
                        {ann.author?.role}
                      </Badge>
                      <span className="text-xs text-zinc-400 ml-auto">{formatDistanceToNow(ann.created_at)}</span>
                    </div>
                    <h4 className="font-bold text-zinc-900 dark:text-white mb-2 text-base">{ann.title}</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-line">{ann.content}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Post Club Announcement">
        <form onSubmit={handlePost} className="space-y-4">
          <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Announcement title" required />
          <Textarea label="Message" value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={5}
            placeholder="Write your announcement to club members..." required />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
              className="w-4 h-4 rounded border-zinc-300 text-blue-600" />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Pin this announcement</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Post</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
