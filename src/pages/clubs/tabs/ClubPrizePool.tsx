import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Plus, Award, DollarSign, Calendar, Users, Star, CheckCircle2, Medal } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input, Textarea, Select } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';

interface Prize {
  id: string;
  title: string;
  description: string;
  prize_amount: number;
  prize_type: string;
  competition_date: string;
  organizer: string;
  position: string;
  participants: string[];
  image_url: string;
  is_verified: boolean;
  created_at: string;
}

interface Props {
  clubId: string;
  isMember: boolean;
  memberRole: string;
}

const prizeTypeColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  cash: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', icon: <DollarSign size={16} /> },
  trophy: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', icon: <Trophy size={16} /> },
  certificate: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', icon: <Award size={16} /> },
  scholarship: { bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', icon: <Star size={16} /> },
  other: { bg: 'bg-zinc-50 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400', icon: <Medal size={16} /> },
};

const positionBadge: Record<string, string> = {
  '1st': 'bg-amber-400 text-white',
  '2nd': 'bg-zinc-400 text-white',
  '3rd': 'bg-orange-500 text-white',
  'Winner': 'bg-emerald-500 text-white',
  'Finalist': 'bg-blue-500 text-white',
  'Runner-up': 'bg-cyan-500 text-white',
  'Participant': 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300',
};

export const ClubPrizePool: React.FC<Props> = ({ clubId, isMember, memberRole }) => {
  const { profile } = useAuth();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totalWon, setTotalWon] = useState(0);
  const [form, setForm] = useState({
    title: '', description: '', prize_amount: '0', prize_type: 'trophy',
    competition_date: new Date().toISOString().split('T')[0], organizer: '',
    position: 'Winner', participants: '',
  });

  const canAdd = profile?.role === 'admin' || profile?.role === 'faculty'
    || (isMember && (memberRole === 'president' || memberRole === 'officer'));

  useEffect(() => { loadPrizes(); }, [clubId]);

  const loadPrizes = async () => {
    const { data } = await supabase.from('club_prize_pool')
      .select('*').eq('club_id', clubId).order('competition_date', { ascending: false });
    if (data) {
      setPrizes(data);
      setTotalWon(data.reduce((s, p) => s + (p.prize_amount || 0), 0));
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('club_prize_pool').insert({
      club_id: clubId,
      title: form.title,
      description: form.description,
      prize_amount: parseFloat(form.prize_amount) || 0,
      prize_type: form.prize_type,
      competition_date: form.competition_date,
      organizer: form.organizer,
      position: form.position,
      participants: form.participants ? form.participants.split(',').map(s => s.trim()).filter(Boolean) : [],
      created_by: profile.id,
    });
    setSaving(false);
    if (error) { toast.error('Failed to add prize'); return; }
    toast.success('Prize added!');
    setShowAdd(false);
    setForm({ title: '', description: '', prize_amount: '0', prize_type: 'trophy',
      competition_date: new Date().toISOString().split('T')[0], organizer: '', position: 'Winner', participants: '' });
    loadPrizes();
  };

  if (loading) return (
    <div className="p-6 space-y-3">
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Stats header */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Awards', value: prizes.length, icon: <Trophy size={18} className="text-amber-500" /> },
          { label: 'Prize Money Won', value: totalWon > 0 ? `RM ${totalWon.toLocaleString()}` : '—', icon: <DollarSign size={18} className="text-emerald-500" /> },
          { label: 'Competitions', value: new Set(prizes.map(p => p.organizer)).size, icon: <Award size={18} className="text-blue-500" /> },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                {stat.icon}
              </div>
              <div>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-zinc-500">{stat.label}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" /> Awards & Achievements
        </h3>
        {canAdd && (
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>Add Award</Button>
        )}
      </div>

      {prizes.length === 0 ? (
        <EmptyState icon={<Trophy size={28} />} title="No awards yet"
          description="Club achievements and competition wins will appear here."
          action={canAdd ? <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowAdd(true)}>Add First Award</Button> : undefined}
        />
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {prizes.map((prize, i) => {
              const typeStyle = prizeTypeColors[prize.prize_type] || prizeTypeColors.other;
              const posStyle = positionBadge[prize.position] || positionBadge.Participant;
              return (
                <motion.div key={prize.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl ${typeStyle.bg} flex items-center justify-center flex-shrink-0 ${typeStyle.text}`}>
                        {typeStyle.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div>
                            <h4 className="font-bold text-zinc-900 dark:text-white">{prize.title}</h4>
                            {prize.organizer && <p className="text-xs text-zinc-500 mt-0.5">by {prize.organizer}</p>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${posStyle}`}>{prize.position}</span>
                            {prize.is_verified && (
                              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={12} /> Verified
                              </span>
                            )}
                          </div>
                        </div>
                        {prize.description && <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{prize.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                          <span className="flex items-center gap-1"><Calendar size={11} /> {prize.competition_date}</span>
                          {prize.prize_amount > 0 && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <DollarSign size={11} /> RM {prize.prize_amount.toLocaleString()}
                            </span>
                          )}
                          <Badge variant="default" size="sm" className="capitalize">{prize.prize_type}</Badge>
                        </div>
                        {prize.participants && prize.participants.length > 0 && (
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <Users size={12} className="text-zinc-400" />
                            {prize.participants.map(p => (
                              <span key={p} className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">{p}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Award or Achievement">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Award / Competition Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g. National Hackathon 2025" />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Brief description of the achievement..." />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Prize Type" value={form.prize_type} onChange={e => setForm(f => ({ ...f, prize_type: e.target.value }))}
              options={['cash', 'trophy', 'certificate', 'scholarship', 'other'].map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} />
            <Select label="Position / Result" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
              options={['1st', '2nd', '3rd', 'Winner', 'Runner-up', 'Finalist', 'Participant'].map(v => ({ value: v, label: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prize Amount (RM)" type="number" value={form.prize_amount} onChange={e => setForm(f => ({ ...f, prize_amount: e.target.value }))} placeholder="0" />
            <Input label="Competition Date" type="date" value={form.competition_date} onChange={e => setForm(f => ({ ...f, competition_date: e.target.value }))} />
          </div>
          <Input label="Organizer" value={form.organizer} onChange={e => setForm(f => ({ ...f, organizer: e.target.value }))} placeholder="e.g. Ministry of Education" />
          <Input label="Participants (comma separated)" value={form.participants} onChange={e => setForm(f => ({ ...f, participants: e.target.value }))} placeholder="Alice, Bob, Charlie" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Add Award</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
