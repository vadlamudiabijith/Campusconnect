import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Search, UserPlus, UserCheck, Star, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import type { Club } from '../types';


const clubCategories = ['Technology', 'Arts', 'Academic', 'Sports', 'Environment', 'Cultural', 'Social', 'General'];

export const Clubs: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [myMemberships, setMyMemberships] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'General', logo_url: '', banner_url: '' });

  const load = async () => {
    const [clubsRes, membersRes] = await Promise.all([
      supabase.from('clubs').select('*').eq('is_active', true).order('member_count', { ascending: false }),
      profile ? supabase.from('club_members').select('club_id').eq('user_id', profile.id) : Promise.resolve({ data: [] }),
    ]);
    if (clubsRes.data) setClubs(clubsRes.data);
    if (membersRes.data) setMyMemberships(new Set(membersRes.data.map((m: any) => m.club_id)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile]);

  const joinLeave = async (clubId: string, isMember: boolean) => {
    if (!profile) return;
    if (isMember) {
      await supabase.from('club_members').delete().eq('club_id', clubId).eq('user_id', profile.id);
      await supabase.from('clubs').update({ member_count: (clubs.find(c => c.id === clubId)?.member_count || 1) - 1 }).eq('id', clubId);
      setMyMemberships(s => { const n = new Set(s); n.delete(clubId); return n; });
      toast.success('Left club');
    } else {
      await supabase.from('club_members').insert({ club_id: clubId, user_id: profile.id });
      await supabase.from('clubs').update({ member_count: (clubs.find(c => c.id === clubId)?.member_count || 0) + 1 }).eq('id', clubId);
      setMyMemberships(s => new Set([...s, clubId]));
      toast.success('Joined club!');
    }
    load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('clubs').insert({ ...form, president_id: profile.id });
    setSaving(false);
    if (error) { toast.error('Failed to create club'); return; }
    toast.success('Club created!');
    setShowCreate(false);
    setForm({ name: '', description: '', category: 'General', logo_url: '', banner_url: '' });
    load();
  };

  const filtered = clubs.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'joined' && myMemberships.has(c.id)) || c.category === filter;
    return matchSearch && matchFilter;
  });

  const canCreate = profile?.role === 'admin' || profile?.role === 'faculty';
  const categoryColors: Record<string, string> = {
    Technology: 'bg-blue-500', Arts: 'bg-pink-500', Academic: 'bg-violet-500',
    Sports: 'bg-emerald-500', Environment: 'bg-green-600', Cultural: 'bg-orange-500', Social: 'bg-cyan-500', General: 'bg-zinc-500',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Clubs & Communities</h2>
          <p className="text-sm text-zinc-500">{clubs.length} active clubs · {myMemberships.size} joined</p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Search clubs..." value={search} onChange={e => setSearch(e.target.value)}
            icon={<Search size={16} />} className="w-48" />
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-36"
            options={[{value:'all',label:'All Clubs'},{value:'joined',label:'My Clubs'},...clubCategories.map(c => ({value:c,label:c}))]} />
          {canCreate && <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Create Club</Button>}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><CardSkeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title="No clubs found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((club, idx) => {
            const isMember = myMemberships.has(club.id);
            const color = categoryColors[club.category] || 'bg-zinc-500';
            return (
              <motion.div key={club.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className="overflow-hidden">
                  <div className={`h-20 ${color} relative`} style={{ background: club.banner_url ? `url(${club.banner_url}) center/cover` : undefined }}>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-2">
                      <Badge variant="default" size="sm" className="bg-white/20 text-white border-0">{club.category}</Badge>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-zinc-900 dark:text-white">{club.name}</h3>
                      {isMember && <Star size={14} className="text-amber-400 fill-current flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-zinc-500 mb-4 line-clamp-2">{club.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                        <Users size={14} />
                        <span>{club.member_count} members</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" icon={<ArrowRight size={14} />} onClick={() => navigate(`/clubs/${club.id}`)}>View</Button>
                        <Button size="sm" variant={isMember ? 'outline' : 'primary'}
                          icon={isMember ? <UserCheck size={14} /> : <UserPlus size={14} />}
                          onClick={() => joinLeave(club.id, isMember)}>
                          {isMember ? 'Joined' : 'Join'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Club">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Club Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            options={clubCategories.map(c => ({ value: c, label: c }))} />
          <Input label="Banner Image URL" value={form.banner_url} onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))} placeholder="https://..." />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Create Club</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
