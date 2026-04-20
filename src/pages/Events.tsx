import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Plus, Search, Clock, Tag, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate, formatTime } from '../lib/utils';
import type { Event } from '../types';

const categories = ['Academic', 'Cultural', 'Sports', 'Tech', 'Workshop', 'Social', 'Career', 'Other'];

export const Events: React.FC = () => {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Academic', location: '',
    start_date: '', end_date: '', is_paid: false, fee: '0', banner_url: '',
  });

  const load = async () => {
    const [eventsRes, regRes] = await Promise.all([
      supabase.from('events').select('*, club:club_id(name)').order('start_date'),
      profile ? supabase.from('event_registrations').select('event_id').eq('user_id', profile.id) : Promise.resolve({ data: [] }),
    ]);
    if (eventsRes.data) setEvents(eventsRes.data);
    if (regRes.data) setRegistrations(new Set((regRes.data as any[]).map(r => r.event_id)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('events').insert({
      ...form, fee: parseFloat(form.fee), organizer_id: profile.id,
    });
    setSaving(false);
    if (error) { toast.error('Failed to create event'); return; }
    toast.success('Event created!');
    setShowCreate(false);
    load();
  };

  const register = async (event: Event) => {
    if (!profile) return;
    const isReg = registrations.has(event.id);
    setRegistering(true);
    if (isReg) {
      await supabase.from('event_registrations').delete().eq('event_id', event.id).eq('user_id', profile.id);
      setRegistrations(s => { const n = new Set(s); n.delete(event.id); return n; });
      toast.success('Unregistered from event');
    } else {
      await supabase.from('event_registrations').insert({ event_id: event.id, user_id: profile.id });
      setRegistrations(s => new Set([...s, event.id]));
      toast.success('Registered for event!');
    }
    setRegistering(false);
    load();
  };

  const filtered = events.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || e.category === filter ||
      (filter === 'upcoming' && e.status === 'upcoming') ||
      (filter === 'registered' && registrations.has(e.id)) ||
      (filter === 'free' && !e.is_paid);
    return matchSearch && matchFilter;
  });

  const canCreate = profile?.role === 'admin' || profile?.role === 'faculty';
  const categoryColors: Record<string, string> = {
    Academic: 'blue', Cultural: 'purple', Sports: 'emerald', Tech: 'cyan',
    Workshop: 'amber', Social: 'pink', Career: 'orange', Other: 'zinc',
  };
  const badgeColors: Record<string, any> = {
    Academic: 'info', Cultural: 'purple', Sports: 'success', Tech: 'info',
    Workshop: 'warning', Social: 'info', Career: 'warning', Other: 'default',
  };

  const bgGradients: Record<string, string> = {
    Academic: 'from-blue-500/20 to-cyan-500/10',
    Cultural: 'from-violet-500/20 to-pink-500/10',
    Sports: 'from-emerald-500/20 to-green-500/10',
    Tech: 'from-cyan-500/20 to-blue-500/10',
    Workshop: 'from-amber-500/20 to-orange-500/10',
    Social: 'from-pink-500/20 to-rose-500/10',
    Career: 'from-orange-500/20 to-amber-500/10',
    Other: 'from-zinc-500/20 to-zinc-500/10',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Campus Events</h2>
          <p className="text-sm text-zinc-500">{events.length} events · {registrations.size} registered</p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)}
            icon={<Search size={16} />} className="w-48" />
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-40"
            options={[{value:'all',label:'All Events'},{value:'upcoming',label:'Upcoming'},{value:'registered',label:'Registered'},{value:'free',label:'Free'},...categories.map(c=>({value:c,label:c}))]} />
          {canCreate && <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Create Event</Button>}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><CardSkeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Calendar size={28} />} title="No events found"
          action={canCreate ? <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Create Event</Button> : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((event, idx) => {
            const isReg = registrations.has(event.id);
            const grad = bgGradients[event.category] || bgGradients.Other;
            return (
              <motion.div key={event.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card className="overflow-hidden">
                  {event.banner_url ? (
                    <img src={event.banner_url} alt={event.title} className="w-full h-36 object-cover" />
                  ) : (
                    <div className={`h-28 bg-gradient-to-br ${grad} flex items-center justify-center`}>
                      <Calendar size={36} className="text-white/40" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-zinc-900 dark:text-white line-clamp-2 flex-1">{event.title}</h3>
                      {isReg && <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />}
                    </div>
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <Badge variant={badgeColors[event.category]} size="sm">{event.category}</Badge>
                      {event.is_paid ? <Badge variant="warning" size="sm">RM{event.fee}</Badge> : <Badge variant="success" size="sm">Free</Badge>}
                      {(event as any).club && <Badge variant="default" size="sm">{(event as any).club.name}</Badge>}
                    </div>
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Clock size={12} /> {formatDate(event.start_date)} at {formatTime(event.start_date)}
                      </div>
                      {event.location && <div className="flex items-center gap-2 text-xs text-zinc-500"><MapPin size={12} /> {event.location}</div>}
                      <div className="flex items-center gap-2 text-xs text-zinc-500"><Users size={12} /> {event.registered_count} registered</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(event)}>Details</Button>
                      <Button size="sm" variant={isReg ? 'outline' : 'primary'} className="flex-1"
                        loading={registering} onClick={() => register(event)}>
                        {isReg ? 'Unregister' : 'Register'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Event" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Event Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              options={categories.map(c => ({ value: c, label: c }))} />
            <Input label="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Venue" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Date & Time" type="datetime-local" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} required />
            <Input label="End Date & Time" type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} required />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_paid} onChange={e => setForm(f => ({ ...f, is_paid: e.target.checked }))} className="w-4 h-4 rounded" />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">Paid Event</span>
            </label>
            {form.is_paid && <Input placeholder="Fee amount" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} type="number" className="w-40" />}
          </div>
          <Input label="Banner Image URL" value={form.banner_url} onChange={e => setForm(f => ({ ...f, banner_url: e.target.value }))} placeholder="https://..." />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Create Event</Button>
          </div>
        </form>
      </Modal>

      {selected && (
        <Modal isOpen={true} onClose={() => setSelected(null)} title={selected.title} size="lg">
          <div className="space-y-4">
            {selected.banner_url && <img src={selected.banner_url} className="w-full h-48 object-cover rounded-xl" alt="" />}
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{selected.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-zinc-400">Date:</span><br /><strong className="text-zinc-900 dark:text-white">{formatDate(selected.start_date)}</strong></div>
              <div><span className="text-zinc-400">Time:</span><br /><strong className="text-zinc-900 dark:text-white">{formatTime(selected.start_date)}</strong></div>
              <div><span className="text-zinc-400">Location:</span><br /><strong className="text-zinc-900 dark:text-white">{selected.location || 'TBD'}</strong></div>
              <div><span className="text-zinc-400">Entry:</span><br /><strong className="text-zinc-900 dark:text-white">{selected.is_paid ? `RM${selected.fee}` : 'Free'}</strong></div>
            </div>
            <Button className="w-full" variant={registrations.has(selected.id) ? 'outline' : 'primary'}
              onClick={() => register(selected)} loading={registering}>
              {registrations.has(selected.id) ? 'Unregister' : 'Register Now'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
