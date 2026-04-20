import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, X, Clock, Plus, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select, Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { formatDate } from '../lib/utils';
import type { AttendanceRecord, Course } from '../types';

export const Attendance: React.FC = () => {
  const { profile } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [showMark, setShowMark] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [markCourse, setMarkCourse] = useState('');
  const [markDate, setMarkDate] = useState(new Date().toISOString().split('T')[0]);
  const [markData, setMarkData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const isFacultyOrAdmin = profile!.role === 'faculty' || profile!.role === 'admin';
    let attQuery = supabase
      .from('attendance')
      .select('*, course:course_id(name, code, color), student:student_id(name)')
      .order('date', { ascending: false })
      .limit(200);

    if (!isFacultyOrAdmin) {
      attQuery = attQuery.eq('student_id', profile!.id);
    }

    const [attRes, coursesRes] = await Promise.all([
      attQuery,
      supabase.from('courses').select('*'),
    ]);
    if (attRes.data) setAttendance(attRes.data);
    if (coursesRes.data) {
      setCourses(coursesRes.data);
      if (coursesRes.data.length > 0) setMarkCourse(coursesRes.data[0].id);
    }
    setLoading(false);
  };

  useEffect(() => { if (profile) load(); }, [profile]);

  const loadStudents = async (courseId: string) => {
    const { data } = await supabase.from('course_enrollments').select('*, student:student_id(id, name)').eq('course_id', courseId);
    if (data) {
      const studs = data.map((e: any) => e.student);
      setStudents(studs);
      const initial: Record<string, string> = {};
      studs.forEach((s: any) => { initial[s.id] = 'present'; });
      setMarkData(initial);
    }
  };

  const openMarkModal = async () => {
    setShowMark(true);
    await loadStudents(markCourse);
  };

  const handleMarkAttendance = async () => {
    if (!profile || !markCourse) return;
    setSaving(true);
    const records = Object.entries(markData).map(([studentId, status]) => ({
      course_id: markCourse, student_id: studentId, date: markDate, status, marked_by: profile.id,
    }));
    const { error } = await supabase.from('attendance').upsert(records);
    setSaving(false);
    if (error) { toast.error('Failed to mark attendance'); return; }
    toast.success('Attendance marked!');
    setShowMark(false);
    load();
  };

  const filteredAttendance = selectedCourse === 'all' ? attendance : attendance.filter(a => a.course_id === selectedCourse);

  const byCourse: Record<string, { total: number; present: number; late: number }> = {};
  attendance.forEach(a => {
    if (!byCourse[a.course_id]) byCourse[a.course_id] = { total: 0, present: 0, late: 0 };
    byCourse[a.course_id].total++;
    if (a.status === 'present') byCourse[a.course_id].present++;
    if (a.status === 'late') byCourse[a.course_id].late++;
  });

  const overallRate = attendance.length > 0
    ? Math.round((attendance.filter(a => a.status !== 'absent').length / attendance.length) * 100) : 0;

  const canMark = profile?.role === 'faculty' || profile?.role === 'admin';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Attendance</h2>
          <p className="text-sm text-zinc-500">Overall rate: <span className={`font-semibold ${overallRate >= 75 ? 'text-emerald-500' : 'text-red-500'}`}>{overallRate}%</span></p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="w-40"
            options={[{value:'all',label:'All Courses'},...courses.map(c=>({value:c.id,label:c.code}))]} />
          {canMark && <Button icon={<Plus size={16} />} onClick={openMarkModal}>Mark Attendance</Button>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Classes', value: filteredAttendance.length, color: 'blue' },
          { label: 'Present', value: filteredAttendance.filter(a => a.status === 'present').length, color: 'emerald' },
          { label: 'Late', value: filteredAttendance.filter(a => a.status === 'late').length, color: 'amber' },
          { label: 'Absent', value: filteredAttendance.filter(a => a.status === 'absent').length, color: 'rose' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{s.value}</p>
              <p className="text-sm text-zinc-500">{s.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {courses.filter(c => byCourse[c.id]).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {courses.filter(c => byCourse[c.id]).map(course => {
            const stats = byCourse[course.id] || { total: 0, present: 0, late: 0 };
            const rate = stats.total > 0 ? Math.round(((stats.present + stats.late) / stats.total) * 100) : 0;
            return (
              <Card key={course.id} className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: course.color || '#3B82F6' }}>
                    {course.code?.substring(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white text-sm">{course.name}</p>
                    <p className="text-xs text-zinc-400">{stats.total} classes</p>
                  </div>
                  <span className={`ml-auto font-bold text-lg ${rate >= 75 ? 'text-emerald-500' : 'text-red-500'}`}>{rate}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${rate}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                    className={`h-full rounded-full ${rate >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : filteredAttendance.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Recent Attendance</h3>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredAttendance.slice(0, 20).map(a => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  {a.status === 'present' ? <CheckSquare size={16} className="text-emerald-500" />
                    : a.status === 'late' ? <Clock size={16} className="text-amber-500" />
                    : <X size={16} className="text-red-500" />}
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{formatDate(a.date)}</span>
                  <span className="text-xs text-zinc-400">{(a as any).course?.code}</span>
                  {canMark && (a as any).student?.name && (
                    <span className="text-xs text-zinc-500">{(a as any).student.name}</span>
                  )}
                </div>
                <Badge variant={a.status === 'present' ? 'success' : a.status === 'late' ? 'warning' : 'danger'}>
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Modal isOpen={showMark} onClose={() => setShowMark(false)} title="Mark Attendance" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Course" value={markCourse}
              onChange={e => { setMarkCourse(e.target.value); loadStudents(e.target.value); }}
              options={courses.map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }))} />
            <Input label="Date (any past or present date)" type="date" value={markDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setMarkDate(e.target.value)} />
          </div>
          {markDate !== new Date().toISOString().split('T')[0] && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-700">
              <Clock size={14} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Backdating attendance for <strong>{markDate}</strong>. Existing records for this date will be updated.
              </p>
            </div>
          )}
          {students.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-4">No enrolled students found</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {students.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm text-zinc-800 dark:text-zinc-200">{s.name}</span>
                  <div className="flex gap-1">
                    {['present', 'late', 'absent'].map(status => (
                      <button key={status} onClick={() => setMarkData(d => ({ ...d, [s.id]: status }))}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${markData[s.id] === status
                          ? status === 'present' ? 'bg-emerald-500 text-white' : status === 'late' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowMark(false)}>Cancel</Button>
            <Button loading={saving} className="flex-1" onClick={handleMarkAttendance}>Save Attendance</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
