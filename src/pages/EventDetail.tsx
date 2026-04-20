import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Tag, CheckCircle2, Share2, CreditCard, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { Avatar } from '../components/ui/Avatar';
import { formatDate, formatTime } from '../lib/utils';
import type { Event } from '../types';

const bgGradients: Record<string, string> = {
  Academic: 'from-blue-600 to-cyan-500',
  Cultural: 'from-violet-600 to-pink-500',
  Sports: 'from-emerald-600 to-green-500',
  Tech: 'from-cyan-600 to-blue-500',
  Workshop: 'from-amber-600 to-orange-500',
  Social: 'from-pink-600 to-rose-500',
  Career: 'from-orange-600 to-amber-500',
  Other: 'from-zinc-600 to-zinc-500',
};

const badgeColors: Record<string, any> = {
  Academic: 'info', Cultural: 'default', Sports: 'success', Tech: 'info',
  Workshop: 'warning', Social: 'info', Career: 'warning', Other: 'default',
};

export const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const canManage = profile?.role === 'admin' || profile?.role === 'faculty';

  useEffect(() => {
    if (!id) return;
    load();
  }, [id, profile]);

  const load = async () => {
    const [eventRes, regRes, myRegRes] = await Promise.all([
      supabase.from('events').select('*, club:club_id(name), organizer:organizer_id(name, avatar_url, department)').eq('id', id).maybeSingle(),
      canManage
        ? supabase.from('event_registrations').select('*, user:user_id(name, avatar_url, student_id, department)').eq('event_id', id)
        : Promise.resolve({ data: [] }),
      profile
        ? supabase.from('event_registrations').select('id').eq('event_id', id).eq('user_id', profile.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (eventRes.data) setEvent(eventRes.data);
    if (regRes.data) setRegistrations(regRes.data);
    setIsRegistered(!!myRegRes.data);
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!profile || !event) return;
    setRegistering(true);
    if (isRegistered) {
      await supabase.from('event_registrations').delete().eq('event_id', event.id).eq('user_id', profile.id);
      setIsRegistered(false);
      toast.success('Unregistered from event');
    } else {
      const { error } = await supabase.from('event_registrations').insert({ event_id: event.id, user_id: profile.id });
      if (error) { toast.error('Failed to register'); setRegistering(false); return; }
      setIsRegistered(true);
      toast.success('Registered for event!');
    }
    setRegistering(false);
    load();
  };

  if (loading) return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );

  if (!event) return (
    <div className="p-6 text-center text-zinc-500">Event not found</div>
  );

  const grad = bgGradients[event.category] || bgGradients.Other;
  const isUpcoming = event.status === 'upcoming' || new Date(event.start_date) > new Date();
  const durationMs = event.end_date ? new Date(event.end_date).getTime() - new Date(event.start_date).getTime() : 0;
  const durationHrs = durationMs > 0 ? (durationMs / (1000 * 60 * 60)).toFixed(1) : null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-sm mb-4 transition-colors">
          <ArrowLeft size={16} /> Back to Events
        </button>
      </motion.div>

      {/* Hero */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
        <Card className="overflow-hidden">
          {event.banner_url ? (
            <img src={event.banner_url} alt={event.title} className="w-full h-72 object-cover" />
          ) : (
            <div className={`h-56 bg-gradient-to-br ${grad} flex items-center justify-center relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white, transparent 60%)' }} />
              <Calendar size={64} className="text-white/30" />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant={badgeColors[event.category]} size="sm">{event.category}</Badge>
                  {event.is_paid
                    ? <Badge variant="warning" size="sm"><CreditCard size={10} className="inline mr-1" />₹{event.fee}</Badge>
                    : <Badge variant="success" size="sm">Free</Badge>}
                  {(event as any).club && <Badge variant="default" size="sm">{(event as any).club.name}</Badge>}
                  <Badge variant={event.status === 'upcoming' ? 'info' : event.status === 'ongoing' ? 'success' : 'default'} size="sm">
                    {event.status}
                  </Badge>
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{event.title}</h1>
                {(event as any).organizer && (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <User size={14} />
                    <span>Organized by <strong className="text-zinc-700 dark:text-zinc-300">{(event as any).organizer.name}</strong></span>
                    {(event as any).organizer.department && <span>· {(event as any).organizer.department}</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isRegistered && <CheckCircle2 size={20} className="text-emerald-500" />}
                {isUpcoming && (
                  <Button
                    variant={isRegistered ? 'outline' : 'primary'}
                    loading={registering}
                    onClick={handleRegister}
                  >
                    {isRegistered ? 'Unregister' : 'Register Now'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <motion.div className="lg:col-span-2 space-y-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {event.description && (
            <Card className="p-6">
              <h2 className="font-semibold text-zinc-900 dark:text-white mb-3">About this Event</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">{event.description}</p>
            </Card>
          )}

          {event.tags && event.tags.length > 0 && (
            <Card className="p-5">
              <h2 className="font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                <Tag size={15} className="text-zinc-400" /> Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {event.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    #{tag}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Attendees list for faculty/admin */}
          {canManage && (
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <h2 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Users size={16} className="text-blue-500" /> Registered Attendees
                  <Badge variant="info" size="sm">{registrations.length}</Badge>
                </h2>
              </div>
              {registrations.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-6">No registrations yet</p>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-72 overflow-y-auto">
                  {registrations.map((reg: any, i: number) => (
                    <motion.div key={reg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 px-5 py-3">
                      <Avatar name={reg.user?.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{reg.user?.name}</p>
                        <p className="text-xs text-zinc-400">{reg.user?.student_id || ''}{reg.user?.department ? ` · ${reg.user.department}` : ''}</p>
                      </div>
                      <Badge variant="success" size="sm">Registered</Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </motion.div>

        {/* Sidebar info */}
        <motion.div className="space-y-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold text-zinc-900 dark:text-white">Event Details</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Calendar size={14} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Date</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{formatDate(event.start_date)}</p>
                  {event.end_date && new Date(event.end_date).toDateString() !== new Date(event.start_date).toDateString() && (
                    <p className="text-xs text-zinc-400">to {formatDate(event.end_date)}</p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Clock size={14} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Time</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{formatTime(event.start_date)}</p>
                  {durationHrs && <p className="text-xs text-zinc-400">Duration: {durationHrs}h</p>}
                </div>
              </div>
              {event.location && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <MapPin size={14} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Location</p>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{event.location}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                  <Users size={14} className="text-rose-500" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Registrations</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {event.registered_count}
                    {event.max_capacity ? ` / ${event.max_capacity}` : ''}
                  </p>
                  {event.max_capacity && (
                    <div className="mt-1 w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min((event.registered_count / event.max_capacity) * 100, 100)}%` }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <CreditCard size={14} className="text-zinc-500" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Entry Fee</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {event.is_paid ? `₹${event.fee}` : 'Free'}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {isUpcoming && (
            <Button className="w-full" variant={isRegistered ? 'outline' : 'primary'}
              loading={registering} onClick={handleRegister}>
              {isRegistered ? 'Unregister' : 'Register Now'}
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
};
