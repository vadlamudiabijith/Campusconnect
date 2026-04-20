import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Clock, MapPin, BookOpen } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import type { TimetableEntry, Course } from '../types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];

export const Timetable: React.FC = () => {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ course_id: '', day_of_week: 'Monday', start_time: '09:00', end_time: '10:00', room: '', week_topic: '' });

  const load = async () => {
    const [ttRes, coursesRes] = await Promise.all([
      supabase.from('timetable').select('*, course:course_id(name, code, color)').order('day_of_week').order('start_time'),
      supabase.from('courses').select('id, name, code, color'),
    ]);
    if (ttRes.data) setEntries(ttRes.data);
    if (coursesRes.data) { setCourses(coursesRes.data); if (coursesRes.data.length > 0) setForm(f => ({ ...f, course_id: coursesRes.data[0].id })); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('timetable').insert(form);
    setSaving(false);
    if (error) { toast.error('Failed to add'); return; }
    toast.success('Class added!');
    setShowForm(false);
    load();
  };

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const canEdit = profile?.role === 'admin' || profile?.role === 'faculty';

  const getEntryForSlot = (day: string, hour: string) => {
    return entries.filter(e => e.day_of_week === day && e.start_time <= hour + ':59' && e.end_time > hour);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Weekly Timetable</h2>
          <p className="text-sm text-zinc-500">Today is <span className="font-medium text-blue-500">{today}</span></p>
        </div>
        {canEdit && <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>Add Class</Button>}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 gap-1 mb-2">
              <div className="text-xs text-zinc-400 text-right pr-2 pt-2">Time</div>
              {DAYS.map(day => (
                <div key={day} className={`text-center py-2 rounded-xl text-sm font-semibold ${day === today ? 'bg-blue-500 text-white' : 'text-zinc-600 dark:text-zinc-400'}`}>
                  {day.substring(0, 3)}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-7 gap-1 min-h-[60px]">
                  <div className="text-xs text-zinc-400 text-right pr-2 pt-1">{hour}</div>
                  {DAYS.map(day => {
                    const slotEntries = getEntryForSlot(day, hour);
                    return (
                      <div key={`${day}-${hour}`} className={`rounded-xl min-h-[52px] relative ${day === today ? 'bg-blue-50 dark:bg-blue-500/5' : 'bg-zinc-50 dark:bg-zinc-900/50'}`}>
                        {slotEntries.map(entry => {
                          const color = (entry as any).course?.color || '#3B82F6';
                          return entry.start_time === hour + ':00' ? (
                            <motion.div key={entry.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              className="absolute inset-1 rounded-lg p-1.5 overflow-hidden cursor-pointer"
                              style={{ backgroundColor: color + '20', borderLeft: `3px solid ${color}` }}>
                              <p className="text-xs font-semibold truncate" style={{ color }}>{(entry as any).course?.code || 'Course'}</p>
                              <p className="text-[10px] text-zinc-600 dark:text-zinc-400 truncate">{(entry as any).course?.name}</p>
                              {entry.room && <p className="text-[10px] text-zinc-400 flex items-center gap-0.5"><MapPin size={8} />{entry.room}</p>}
                              {entry.week_topic && <p className="text-[10px] text-zinc-500 italic truncate mt-0.5">{entry.week_topic}</p>}
                            </motion.div>
                          ) : null;
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {entries.length === 0 && !loading && (
        <EmptyState icon={<Clock size={28} />} title="No classes scheduled"
          description={canEdit ? 'Add classes to build the timetable' : 'No schedule available yet'}
          action={canEdit ? <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>Add Class</Button> : undefined} />
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Class to Timetable">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Course" value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}
            options={courses.map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }))} />
          <Select label="Day" value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}
            options={DAYS.map(d => ({ value: d, label: d }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Start Time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
              options={HOURS.map(h => ({ value: h, label: h }))} />
            <Select label="End Time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
              options={HOURS.map(h => ({ value: h, label: h }))} />
          </div>
          <Input label="Room" value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
            placeholder="e.g., Room 301, Block A" icon={<MapPin size={16} />} />
          <Input label="Topic This Week (optional)" value={form.week_topic}
            onChange={e => setForm(f => ({ ...f, week_topic: e.target.value }))} placeholder="What will be taught..." />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Add Class</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
