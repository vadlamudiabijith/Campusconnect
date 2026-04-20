import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, BookOpen, CheckCircle, LogIn, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { courseColors } from '../../lib/utils';
import type { Course } from '../../types';

export const CourseHub: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'enrolled' | 'available'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '', credits: '3', semester: '', color: '#3B82F6' });

  const isStudent = profile?.role === 'student';
  const canCreate = profile?.role === 'faculty' || profile?.role === 'admin';

  const loadCourses = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('courses')
      .select('*, faculty:faculty_id(name, email, department)')
      .order('created_at', { ascending: false });
    if (data) setCourses(data);
    setLoading(false);
  }, []);

  const loadEnrollments = useCallback(async () => {
    if (!profile || !isStudent) return;
    const { data } = await supabase
      .from('course_enrollments')
      .select('course_id')
      .eq('student_id', profile.id);
    if (data) setEnrolledIds(new Set(data.map(e => e.course_id)));
  }, [profile, isStudent]);

  useEffect(() => {
    loadCourses();
    loadEnrollments();
  }, [loadCourses, loadEnrollments]);

  const handleEnroll = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    if (!profile) return;
    setEnrollingId(courseId);
    const { error } = await supabase.from('course_enrollments').insert({
      course_id: courseId,
      student_id: profile.id,
    });
    setEnrollingId(null);
    if (error) {
      toast.error('Failed to enroll');
      return;
    }
    setEnrolledIds(prev => new Set([...prev, courseId]));
    toast.success('Enrolled successfully!');
  };

  const handleUnenroll = async (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    if (!profile) return;
    setEnrollingId(courseId);
    const { error } = await supabase
      .from('course_enrollments')
      .delete()
      .eq('course_id', courseId)
      .eq('student_id', profile.id);
    setEnrollingId(null);
    if (error) {
      toast.error('Failed to unenroll');
      return;
    }
    setEnrolledIds(prev => {
      const next = new Set(prev);
      next.delete(courseId);
      return next;
    });
    toast.success('Unenrolled from course');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setCreating(true);
    const { error } = await supabase.from('courses').insert({
      ...form, credits: parseInt(form.credits), faculty_id: profile.id,
    });
    setCreating(false);
    if (error) { toast.error('Failed to create course'); return; }
    toast.success('Course created!');
    setShowCreate(false);
    setForm({ code: '', name: '', description: '', credits: '3', semester: '', color: '#3B82F6' });
    loadCourses();
  };

  const filtered = courses.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'enrolled') return enrolledIds.has(c.id);
    if (filter === 'available') return !enrolledIds.has(c.id);
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Course Hub</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isStudent
              ? `${enrolledIds.size} enrolled · ${courses.length - enrolledIds.size} available`
              : `${courses.length} courses available`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isStudent && (
            <div className="flex rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
              {(['all', 'enrolled', 'available'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          <Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)}
            icon={<Search size={16} />} className="w-56" />
          {canCreate && (
            <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>New Course</Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<BookOpen size={28} />} title="No courses found"
          description={search ? 'Try a different search' : filter === 'enrolled' ? 'You have not enrolled in any courses yet' : 'No courses available'}
          action={canCreate ? <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Create Course</Button> : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course, idx) => {
            const enrolled = enrolledIds.has(course.id);
            const enrolling = enrollingId === course.id;
            return (
              <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <Card
                  hover={enrolled || !isStudent}
                  onClick={() => (enrolled || !isStudent) ? navigate(`/courses/${course.id}`) : undefined}
                  className={`overflow-hidden ${isStudent && !enrolled ? 'cursor-default' : ''}`}
                >
                  <div className="h-2 w-full" style={{ backgroundColor: course.color || '#3B82F6' }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                        style={{ backgroundColor: course.color || '#3B82F6' }}>
                        {course.code?.substring(0, 2)}
                      </div>
                      <div className="flex items-center gap-2">
                        {isStudent && enrolled && (
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle size={14} />
                            <span className="text-xs font-medium">Enrolled</span>
                          </div>
                        )}
                        <Badge variant="default" size="sm">{course.credits} credits</Badge>
                      </div>
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white mb-1 line-clamp-1">{course.name}</h3>
                    <p className="text-xs text-zinc-400 mb-1 font-mono">{course.code}</p>
                    <p className="text-sm text-zinc-500 line-clamp-2 mb-4">{course.description || 'No description provided'}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                          {(course as any).faculty?.name?.[0] || 'F'}
                        </div>
                        <span className="text-xs text-zinc-500">{(course as any).faculty?.name || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {course.semester && <span className="text-xs text-zinc-400">{course.semester}</span>}
                        {isStudent && (
                          enrolled ? (
                            <button
                              onClick={e => handleUnenroll(e, course.id)}
                              disabled={enrolling}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                            >
                              <LogOut size={12} />
                              {enrolling ? 'Leaving...' : 'Leave'}
                            </button>
                          ) : (
                            <button
                              onClick={e => handleEnroll(e, course.id)}
                              disabled={enrolling}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                            >
                              <LogIn size={12} />
                              {enrolling ? 'Joining...' : 'Enroll'}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New Course">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Course Code" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              placeholder="e.g., CS-301" required />
            <Select label="Credits" value={form.credits}
              onChange={e => setForm(f => ({ ...f, credits: e.target.value }))}
              options={[{value:'1',label:'1'},{value:'2',label:'2'},{value:'3',label:'3'},{value:'4',label:'4'},{value:'5',label:'5'}]} />
          </div>
          <Input label="Course Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g., Data Structures & Algorithms" required />
          <Textarea label="Description" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
            placeholder="Course overview..." />
          <Input label="Semester" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
            placeholder="e.g., Fall 2024" />
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Course Color</label>
            <div className="flex items-center gap-2">
              {courseColors().map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={creating} className="flex-1">Create Course</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
