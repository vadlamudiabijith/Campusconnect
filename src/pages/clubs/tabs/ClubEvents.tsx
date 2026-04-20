import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, MapPin, Clock, Users, Lock, CheckCircle2, Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Input, Textarea, Select } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDate, formatTime } from '../../../lib/utils';
import type { Event } from '../../../types';

interface Props {
  clubId: string;
  clubName: string;
  isMember: boolean;
}

const EVENT_CATEGORIES = ['Workshop', 'Competition', 'Social', 'Fundraiser', 'Seminar', 'Trip', 'Sports', 'Cultural', 'Other'];

export const ClubEvents: React.FC<Props> = ({ clubId, clubName, isMember }) => {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Workshop',
    location: '', start_date: '', end_date: '',
    is_paid: false, fee: '0', banner_url: '', max_capacity: '',
  });

  const load = async () => {
    const [eventsRes, regRes] = await Promise.all([
      supabase.from('events').select('*').eq('club_id', clubId).order('start_date'),
      profile ? supabase.from('event_registrations').select('event_id').eq('user_id', profile.id) : Promise.resolve({ data: [] }),
    ]);
    if (eventsRes.data) setEvents(eventsRes.data);
    if (regRes.data) setRegistrations(new Set((regRes.data as any[]).map(r => r.event_id)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [clubId, profile]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('events').insert({
      club_id: clubId,
      organizer_id: profile.id,
      title: form.title,
      description: form.description,
      category: form.category,
      location: form.location,
      start_date: form.start_date,
      end_date: form.end_date || form.start_date,
      is_paid: form.is_paid,
      fee: parseFloat(form.fee) || 0,
      currency: 'MYR',
      banner_url: form.banner_url,
      max_capacity: form.max_capacity ? parseInt(form.max_capacity) : null,
      created_by_student: profile.role === 'student',
      approval_status: profile.role === 'student' ? 'pending' : 'approved',
    });
    setSaving(false);
    if (error) { toast.error('Failed to create event'); return; }
    toast.success(profile.role === 'student' ? 'Event submitted for approval!' : 'Event created!');
    setShowCreate(false);
    setForm({ title: '', description: '', category: 'Workshop', location: '', start_date: '', end_date: '', is_paid: false, fee: '0', banner_url: '', max_capacity: '' });
    load();
  };

  const handleRegister = async (event: Event) => {
    if (!profile) return;
    const isReg = registrations.has(event.id);
    setRegistering(event.id);
    if (isReg) {
      await supabase.from('event_registrations').delete().eq('event_id', event.id).eq('user_id', profile.id);
      setRegistrations(s => { const n = new Set(s); n.delete(event.id); return n; });
      toast.success('Unregistered');
    } else {
      if (event.is_paid) {
        const { error: payErr } = await supabase.from('payments').insert({
          user_id: profile.id, reference_id: event.id, reference_type: 'event',
          amount: event.fee, description: `Entry fee: ${event.title}`, status: 'completed',
          transaction_id: 'TXN' + Date.now().toString(36).toUpperCase(), payment_method: 'card', currency: 'MYR',
        });
        if (payErr) { toast.error('Payment failed'); setRegistering(null); return; }
      }
      await supabase.from('event_registrations').insert({ event_id: event.id, user_id: profile.id, payment_status: event.is_paid ? 'paid' : 'pending' });
      await supabase.from('events').update({ registered_count: (event.registered_count || 0) + 1 }).eq('id', event.id);
      setRegistrations(s => new Set([...s, event.id]));
      toast.success(event.is_paid ? `Registered & paid RM ${event.fee}!` : 'Registered!');
    }
    setRegistering(null);
    load();
  };

  const canCreate = isMember || profile?.role === 'admin' || profile?.role === 'faculty';

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-zinc-500">{events.length} event{events.length !== 1 ? 's' : ''} by {clubName}</p>
        {canCreate ? (
          <Button icon={<Plus size={16} />} size="sm" onClick={() => setShowCreate(true)}>Create Event</Button>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400"><Lock size={12} /> Join club to create events</div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
      ) : events.length === 0 ? (
        <EmptyState icon={<Calendar size={24} />} title="No club events yet"
          description={canCreate ? 'Create the first event for this club' : 'No events planned yet'}
          action={canCreate ? <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Create Event</Button> : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event, idx) => {
            const isReg = registrations.has(event.id);
            return (
              <motion.div key={event.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className="overflow-hidden">
                  {event.banner_url ? (
                    <img src={event.banner_url} alt={event.title} className="w-full h-36 object-cover" />
                  ) : (
                    <div className="h-28 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 flex items-center justify-center">
                      <Calendar size={32} className="text-blue-400/40" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-zinc-900 dark:text-white line-clamp-1 flex-1">{event.title}</h3>
                      {isReg && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />}
                    </div>
                    <div className="flex gap-1.5 mb-3 flex-wrap">
                      <Badge variant="info" size="sm">{event.category}</Badge>
                      {event.is_paid ? (
                        <Badge variant="warning" size="sm">RM {event.fee}</Badge>
                      ) : (
                        <Badge variant="success" size="sm">Free</Badge>
                      )}
                      {(event as any).approval_status === 'pending' && (
                        <Badge variant="warning" size="sm">Pending Approval</Badge>
                      )}
                    </div>
                    {event.description && <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{event.description}</p>}
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Clock size={11} /> {formatDate(event.start_date)} at {formatTime(event.start_date)}
                      </div>
                      {event.location && <div className="flex items-center gap-2 text-xs text-zinc-500"><MapPin size={11} /> {event.location}</div>}
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Users size={11} /> {event.registered_count} registered
                        {event.max_capacity && <span className="text-zinc-400">/ {event.max_capacity} seats</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setShowDetail(event)}>Details</Button>
                      {(event as any).approval_status !== 'pending' && (
                        <Button size="sm" variant={isReg ? 'outline' : 'primary'} className="flex-1"
                          loading={registering === event.id} onClick={() => handleRegister(event)}>
                          {isReg ? 'Unregister' : event.is_paid ? `Register · RM ${event.fee}` : 'Register Free'}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={`Create Event for ${clubName}`} size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Event Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              options={EVENT_CATEGORIES.map(c => ({ value: c, label: c }))} />
            <Input label="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Venue/Room" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date & Time" type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
            <Input label="End Date & Time" type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Max Capacity (optional)" type="number" value={form.max_capacity} onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))} placeholder="Leave empty for unlimited" />
            <Input label="Banner URL (optional)" value={form.banner_url} onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_paid} onChange={e => setForm(f => ({ ...f, is_paid: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Charge Entry Fee</span>
            </label>
            {form.is_paid && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-white">RM</span>
                <Input value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} type="number" min="0" step="0.50" placeholder="0.00" className="w-36" />
              </div>
            )}
          </div>
          {profile?.role === 'student' && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 rounded-lg">
              Student-created events require admin approval before appearing publicly.
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">
              {profile?.role === 'student' ? 'Submit for Approval' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Modal>

      {showDetail && (
        <Modal isOpen={true} onClose={() => setShowDetail(null)} title={showDetail.title} size="md">
          <div className="space-y-4">
            {showDetail.banner_url && <img src={showDetail.banner_url} className="w-full h-44 object-cover rounded-xl" alt="" />}
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{showDetail.description || 'No description provided.'}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-zinc-400 text-xs">Date</span><p className="font-medium text-zinc-900 dark:text-white">{formatDate(showDetail.start_date)}</p></div>
              <div><span className="text-zinc-400 text-xs">Time</span><p className="font-medium text-zinc-900 dark:text-white">{formatTime(showDetail.start_date)}</p></div>
              <div><span className="text-zinc-400 text-xs">Location</span><p className="font-medium text-zinc-900 dark:text-white">{showDetail.location || 'TBD'}</p></div>
              <div><span className="text-zinc-400 text-xs">Entry</span><p className="font-medium text-zinc-900 dark:text-white">{showDetail.is_paid ? `RM ${showDetail.fee}` : 'Free'}</p></div>
            </div>
            {(showDetail as any).approval_status !== 'pending' && (
              <Button className="w-full" variant={registrations.has(showDetail.id) ? 'outline' : 'primary'}
                onClick={() => { handleRegister(showDetail); setShowDetail(null); }}
                loading={registering === showDetail.id}>
                {registrations.has(showDetail.id) ? 'Unregister' : showDetail.is_paid ? `Register · RM ${showDetail.fee}` : 'Register Free'}
              </Button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
