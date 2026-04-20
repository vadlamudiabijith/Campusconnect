import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, BookOpen, Users, Award } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', description: '', credits: '3', semester: '', color: '#3B82F6' });

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('courses')
      .select('*, faculty:faculty_id(name, email, department)')
      .order('created_at', { ascending: false });
    if (data) setCourses(data);
    setLoading(false);
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

  const filtered = courses.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const canCreate = profile?.role === 'faculty' || profile?.role === 'admin';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Course Hub</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{courses.length} courses available</p>
        </div>
        <div className="flex items-center gap-3">
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
          description={search ? 'Try a different search' : 'No courses available yet'}
          action={canCreate ? <Button icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>Create Course</Button> : undefined} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course, idx) => (
            <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <Card hover onClick={() => navigate(`/courses/${course.id}`)} className="overflow-hidden">
                <div className="h-2 w-full" style={{ backgroundColor: course.color || '#3B82F6' }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: course.color || '#3B82F6' }}>
                      {course.code?.substring(0, 2)}
                    </div>
                    <Badge variant="default" size="sm">{course.credits} credits</Badge>
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
                    {course.semester && <span className="text-xs text-zinc-400">{course.semester}</span>}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
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
