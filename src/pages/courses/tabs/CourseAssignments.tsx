import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckCircle2, Clock, AlertCircle, FileText, Award, X, ChevronDown, ChevronUp } from 'lucide-react';
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

interface Submission {
  id: string;
  student_id: string;
  status: string;
  marks?: number;
  notes?: string;
  submitted_at?: string;
  student?: { name: string; student_id: string };
}

export const CourseAssignments: React.FC<{ courseId: string }> = ({ courseId }) => {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', max_marks: '100', type: 'assignment' });

  // Grading state (faculty)
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [gradeInputs, setGradeInputs] = useState<Record<string, { marks: string; notes: string }>>({});
  const [savingGrades, setSavingGrades] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isStudent = profile?.role === 'student';
  const canCreate = profile?.role === 'faculty' || profile?.role === 'admin';

  const load = async () => {
    const query = isStudent
      ? supabase.from('assignments')
          .select('*, submission:assignment_submissions(id,status,marks,notes,submitted_at)')
          .eq('course_id', courseId)
          .order('due_date')
      : supabase.from('assignments')
          .select('*')
          .eq('course_id', courseId)
          .order('due_date');

    const { data } = await query;
    if (data) {
      setAssignments(data.map((a: any) => ({
        ...a,
        submission: Array.isArray(a.submission) ? a.submission[0] : a.submission,
      })));
    }
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

  const openGrading = async (assignment: Assignment) => {
    setGradingAssignment(assignment);
    setLoadingSubmissions(true);
    const { data } = await supabase
      .from('assignment_submissions')
      .select('*, student:student_id(name, student_id)')
      .eq('assignment_id', assignment.id);
    if (data) {
      setSubmissions(data);
      const inputs: Record<string, { marks: string; notes: string }> = {};
      data.forEach((s: Submission) => {
        inputs[s.student_id] = { marks: s.marks?.toString() ?? '', notes: s.notes ?? '' };
      });
      setGradeInputs(inputs);
    }
    setLoadingSubmissions(false);
  };

  const saveGrade = async (submission: Submission) => {
    if (!profile || !gradingAssignment) return;
    const input = gradeInputs[submission.student_id];
    if (!input?.marks) { toast.error('Enter marks first'); return; }
    const marksNum = parseInt(input.marks);
    if (marksNum > gradingAssignment.max_marks) { toast.error(`Max marks is ${gradingAssignment.max_marks}`); return; }

    setSavingGrades(s => ({ ...s, [submission.student_id]: true }));

    // Update submission
    await supabase.from('assignment_submissions')
      .update({ marks: marksNum, notes: input.notes, status: 'graded' })
      .eq('id', submission.id);

    // Upsert grade record
    const pct = (marksNum / gradingAssignment.max_marks) * 100;
    const gp = pct >= 90 ? 10 : pct >= 80 ? 9 : pct >= 70 ? 8 : pct >= 60 ? 7 : pct >= 50 ? 6 : pct >= 40 ? 5 : 0;
    await supabase.from('grades').upsert({
      course_id: courseId,
      student_id: submission.student_id,
      assignment_id: gradingAssignment.id,
      marks: marksNum,
      max_marks: gradingAssignment.max_marks,
      grade_points: gp,
      feedback: input.notes,
      graded_by: profile.id,
      graded_at: new Date().toISOString(),
    }, { onConflict: 'course_id,student_id,assignment_id' });

    setSavingGrades(s => ({ ...s, [submission.student_id]: false }));
    toast.success(`Grade saved for ${(submission.student as any)?.name}`);
    openGrading(gradingAssignment);
  };

  const getDeadlineStatus = (a: Assignment) => {
    if ((a.submission as any)?.status === 'submitted' || (a.submission as any)?.status === 'graded')
      return { icon: <CheckCircle2 size={14} className="text-emerald-500" />, text: 'Submitted', color: 'text-emerald-500' };
    if (!a.due_date) return { icon: <FileText size={14} className="text-zinc-400" />, text: 'No deadline', color: 'text-zinc-400' };
    if (isOverdue(a.due_date)) return { icon: <AlertCircle size={14} className="text-red-500" />, text: 'Overdue', color: 'text-red-500' };
    const days = daysUntil(a.due_date);
    if (days <= 2) return { icon: <Clock size={14} className="text-amber-500" />, text: `Due in ${days}d`, color: 'text-amber-500' };
    return { icon: <Clock size={14} className="text-zinc-400" />, text: formatDate(a.due_date), color: 'text-zinc-400' };
  };

  const typeColors: Record<string, string> = { assignment: 'info', quiz: 'warning', project: 'default', exam: 'danger' };
  const submitted = assignments.filter(a => (a.submission as any)?.status === 'submitted' || (a.submission as any)?.status === 'graded');
  const completionRate = assignments.length > 0 ? Math.round((submitted.length / assignments.length) * 100) : 0;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        {isStudent ? (
          <div className="flex items-center gap-3">
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-2">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white">{completionRate}%</span>
              <p className="text-xs text-zinc-500">Completed</p>
            </div>
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{submitted.length}/{assignments.length} submitted</p>
              <div className="w-32 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mt-1 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${completionRate}%` }} transition={{ duration: 0.8 }}
                  className="h-full bg-blue-500 rounded-full" />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-zinc-900 dark:text-white">{assignments.length} Assignments</p>
            <p className="text-sm text-zinc-500">Click an assignment to grade submissions</p>
          </div>
        )}
        {canCreate && <Button icon={<Plus size={16} />} size="sm" onClick={() => setShowForm(true)}>Add Assignment</Button>}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : assignments.length === 0 ? (
        <EmptyState icon={<FileText size={24} />} title="No assignments yet" />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {assignments.map((a, idx) => {
              const ds = getDeadlineStatus(a);
              const isExpanded = expandedId === a.id && canCreate;
              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }} transition={{ delay: idx * 0.04 }}>
                  <Card className="overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          (a.submission as any)?.status === 'graded' ? 'bg-emerald-50 dark:bg-emerald-500/10' :
                          (a.submission as any)?.status === 'submitted' ? 'bg-blue-50 dark:bg-blue-500/10' :
                          'bg-zinc-100 dark:bg-zinc-800'}`}>
                          {(a.submission as any)?.status === 'graded' ? <Award size={18} className="text-emerald-500" /> :
                           (a.submission as any)?.status === 'submitted' ? <CheckCircle2 size={18} className="text-blue-500" /> :
                           <FileText size={18} className="text-zinc-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-semibold text-zinc-900 dark:text-white">{a.title}</h4>
                            <Badge variant={typeColors[a.type] as any} size="sm">{a.type}</Badge>
                            {(a.submission as any)?.marks !== undefined && (
                              <Badge variant="success" size="sm">
                                {(a.submission as any).marks}/{a.max_marks}
                              </Badge>
                            )}
                          </div>
                          {a.description && <p className="text-xs text-zinc-500 mb-2 line-clamp-2">{a.description}</p>}
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${ds.color}`}>
                            {ds.icon}
                            <span>{ds.text}</span>
                            <span className="text-zinc-300 dark:text-zinc-600 mx-1">·</span>
                            <span className="text-zinc-400">{a.max_marks} marks</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isStudent && (!(a.submission as any) || (a.submission as any).status === 'pending') && (
                            <Button size="sm" variant="outline" onClick={() => markComplete(a.id)}>Submit</Button>
                          )}
                          {canCreate && (
                            <button
                              onClick={() => {
                                if (isExpanded) { setExpandedId(null); } else { setExpandedId(a.id); openGrading(a); }
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                            >
                              <Award size={13} />
                              Grade
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800"
                        >
                          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50">
                            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                              Submissions ({submissions.length})
                            </p>
                            {loadingSubmissions ? (
                              <div className="space-y-2">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
                              </div>
                            ) : submissions.length === 0 ? (
                              <p className="text-sm text-zinc-400 text-center py-3">No submissions yet</p>
                            ) : (
                              <div className="space-y-2">
                                {submissions.map(s => (
                                  <div key={s.id} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs flex-shrink-0">
                                      {(s.student as any)?.name?.[0] || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{(s.student as any)?.name || 'Student'}</p>
                                      <p className="text-xs text-zinc-400">{(s.student as any)?.student_id} · {s.submitted_at ? formatDate(s.submitted_at) : 'Not submitted'}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        max={a.max_marks}
                                        value={gradeInputs[s.student_id]?.marks ?? ''}
                                        onChange={e => setGradeInputs(g => ({ ...g, [s.student_id]: { ...g[s.student_id], marks: e.target.value } }))}
                                        placeholder="Marks"
                                        className="w-20 px-2 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                      />
                                      <span className="text-xs text-zinc-400">/{a.max_marks}</span>
                                      <button
                                        onClick={() => saveGrade(s)}
                                        disabled={savingGrades[s.student_id]}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                      >
                                        {savingGrades[s.student_id] ? '...' : s.status === 'graded' ? 'Update' : 'Save'}
                                      </button>
                                      {s.status === 'graded' && (
                                        <Badge variant="success" size="sm">{s.marks}/{a.max_marks}</Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
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
            options={[{ value: 'assignment', label: 'Assignment' }, { value: 'quiz', label: 'Quiz' }, { value: 'project', label: 'Project' }, { value: 'exam', label: 'Exam' }]} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
