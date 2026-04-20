import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';
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
import { formatDate, isOverdue, daysUntil } from '../../../lib/utils';
import type { Assignment } from '../../../types';

export const CourseAssignments: React.FC<{ courseId: string }> = ({ courseId }) => {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', max_marks: '100', type: 'assignment' });

  const load = async () => {
    const { data } = await supabase.from('assignments').select('*, submission:assignment_submissions(status,marks)')
      .eq('course_id', courseId).order('due_date');
    if (data) setAssignments(data.map(a => ({ ...a, submission: Array.isArray(a.submission) ? a.submission[0] : a.submission })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [courseId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('assignments').insert({
      ...form, course_id: courseId, created_by: profile.id, max_marks: parseInt(form.max_marks),
    });
    setSaving(false);
    if (error) { toast.error('Failed to create'); return; }
    toast.success('Assignment created!');
    setShowForm(false);
    setForm({ title: '', description: '', due_date: '', max_marks: '100', type: 'assignment' });
    load();
  };

  const markComplete = async (assignmentId: string) => {
    if (!profile) return;
    await supabase.from('assignment_submissions').upsert({
      assignment_id: assignmentId, student_id: profile.id, status: 'submitted', submitted_at: new Date().toISOString(),
    });
    toast.success('Marked as submitted!');
    load();
  };

  const canCreate = profile?.role === 'faculty' || profile?.role === 'admin';
  const typeColors: Record<string, string> = { assignment: 'info', quiz: 'warning', project: 'purple', exam: 'danger' };

  const getDeadlineStatus = (a: Assignment) => {
    if (a.submission?.status === 'submitted' || a.submission?.status === 'graded') return { icon: <CheckCircle2 size={14} className="text-emerald-500" />, text: 'Submitted', color: 'text-emerald-500' };
    if (!a.due_date) return { icon: <FileText size={14} className="text-zinc-400" />, text: 'No deadline', color: 'text-zinc-400' };
    if (isOverdue(a.due_date)) return { icon: <AlertCircle size={14} className="text-red-500" />, text: 'Overdue', color: 'text-red-500' };
    const days = daysUntil(a.due_date);
    if (days <= 2) return { icon: <Clock size={14} className="text-amber-500" />, text: `Due in ${days}d`, color: 'text-amber-500' };
    return { icon: <Clock size={14} className="text-zinc-400" />, text: formatDate(a.due_date), color: 'text-zinc-400' };
  };

  const pending = assignments.filter(a => !a.submission || a.submission.status === 'pending');
  const submitted = assignments.filter(a => a.submission?.status === 'submitted' || a.submission?.status === 'graded');
  const total = assignments.length;
  const completionRate = total > 0 ? Math.round((submitted.length / total) * 100) : 0;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white">{completionRate}%</span>
            <p className="text-xs text-zinc-500">Completed</p>
          </div>
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{submitted.length}/{total} submitted</p>
            <div className="w-32 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mt-1 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${completionRate}%` }} transition={{ duration: 0.8 }} className="h-full bg-blue-500 rounded-full" />
            </div>
          </div>
        </div>
        {canCreate && <Button icon={<Plus size={16} />} size="sm" onClick={() => setShowForm(true)}>Add Assignment</Button>}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : assignments.length === 0 ? (
        <EmptyState icon={<FileText size={24} />} title="No assignments yet" />
      ) : (
        <div className="space-y-3">
          {assignments.map((a, idx) => {
            const ds = getDeadlineStatus(a);
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                <Card className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${a.submission?.status === 'submitted' || a.submission?.status === 'graded' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-blue-50 dark:bg-blue-500/10'}`}>
                      {a.submission?.status === 'submitted' || a.submission?.status === 'graded'
                        ? <CheckCircle2 size={18} className="text-emerald-500" />
                        : <FileText size={18} className="text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-zinc-900 dark:text-white truncate">{a.title}</h4>
                        <Badge variant={typeColors[a.type] as any} size="sm">{a.type}</Badge>
                        {a.submission?.marks !== undefined && <Badge variant="success" size="sm">{a.submission.marks}/{a.max_marks}</Badge>}
                      </div>
                      {a.description && <p className="text-xs text-zinc-500 mb-2 line-clamp-2">{a.description}</p>}
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${ds.color}`}>
                        {ds.icon}
                        <span>{ds.text}</span>
                        <span className="text-zinc-300 dark:text-zinc-600 mx-1">·</span>
                        <span className="text-zinc-400">{a.max_marks} marks</span>
                      </div>
                    </div>
                    {profile?.role === 'student' && (!a.submission || a.submission.status === 'pending') && (
                      <Button size="sm" variant="outline" onClick={() => markComplete(a.id)}>Submit</Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create Assignment">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Due Date" type="datetime-local" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            <Input label="Max Marks" type="number" value={form.max_marks} onChange={e => setForm(f => ({ ...f, max_marks: e.target.value }))} />
          </div>
          <Select label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            options={[{value:'assignment',label:'Assignment'},{value:'quiz',label:'Quiz'},{value:'project',label:'Project'},{value:'exam',label:'Exam'}]} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
