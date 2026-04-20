import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, MessageCircle, Award, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Avatar } from '../../../components/ui/Avatar';

interface StudentRow {
  id: string;
  name: string;
  student_id: string;
  department: string;
  avgPct: number;
  gradePoints: number;
  letter: string;
  letterColor: string;
  attendanceRate: number;
  gradesCount: number;
}

const getGrade = (pct: number) => {
  if (pct >= 90) return { letter: 'A+', gp: 10, color: 'text-emerald-500' };
  if (pct >= 80) return { letter: 'A', gp: 9, color: 'text-emerald-500' };
  if (pct >= 70) return { letter: 'B+', gp: 8, color: 'text-blue-500' };
  if (pct >= 60) return { letter: 'B', gp: 7, color: 'text-blue-400' };
  if (pct >= 50) return { letter: 'C', gp: 6, color: 'text-amber-500' };
  if (pct >= 40) return { letter: 'D', gp: 5, color: 'text-orange-500' };
  return { letter: 'F', gp: 0, color: 'text-red-500' };
};

interface Props {
  courseId: string;
  onMessageStudent: (student: { id: string; name: string }) => void;
}

export const CourseStudents: React.FC<Props> = ({ courseId, onMessageStudent }) => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [courseId]);

  const load = async () => {
    const [enrollRes, gradesRes, attRes] = await Promise.all([
      supabase.from('course_enrollments')
        .select('*, student:student_id(id, name, student_id, department)')
        .eq('course_id', courseId),
      supabase.from('grades')
        .select('student_id, marks, max_marks, grade_points')
        .eq('course_id', courseId),
      supabase.from('attendance')
        .select('student_id, status')
        .eq('course_id', courseId),
    ]);

    const gradesByStudent: Record<string, { pctSum: number; count: number; gpSum: number }> = {};
    (gradesRes.data || []).forEach((g: any) => {
      if (!gradesByStudent[g.student_id]) gradesByStudent[g.student_id] = { pctSum: 0, count: 0, gpSum: 0 };
      gradesByStudent[g.student_id].pctSum += (g.marks / g.max_marks) * 100;
      gradesByStudent[g.student_id].count++;
      gradesByStudent[g.student_id].gpSum += g.grade_points || 0;
    });

    const attByStudent: Record<string, { total: number; present: number }> = {};
    (attRes.data || []).forEach((a: any) => {
      if (!attByStudent[a.student_id]) attByStudent[a.student_id] = { total: 0, present: 0 };
      attByStudent[a.student_id].total++;
      if (a.status === 'present' || a.status === 'late') attByStudent[a.student_id].present++;
    });

    const rows: StudentRow[] = (enrollRes.data || []).map((e: any) => {
      const s = e.student;
      const gd = gradesByStudent[s.id];
      const avgPct = gd ? Math.round(gd.pctSum / gd.count) : 0;
      const gp = gd ? Math.round((gd.gpSum / gd.count) * 100) / 100 : 0;
      const { letter, color } = getGrade(avgPct);
      const att = attByStudent[s.id] || { total: 0, present: 0 };
      return {
        id: s.id,
        name: s.name,
        student_id: s.student_id,
        department: s.department || '',
        avgPct,
        gradePoints: gp,
        letter: gd ? letter : '—',
        letterColor: gd ? color : 'text-zinc-400',
        attendanceRate: att.total > 0 ? Math.round((att.present / att.total) * 100) : 0,
        gradesCount: gd?.count || 0,
      };
    }).sort((a, b) => b.avgPct - a.avgPct);

    setStudents(rows);
    setLoading(false);
  };

  const avgGrade = students.filter(s => s.gradesCount > 0).length > 0
    ? Math.round(students.filter(s => s.gradesCount > 0).reduce((sum, s) => sum + s.avgPct, 0) / students.filter(s => s.gradesCount > 0).length)
    : 0;

  return (
    <div className="p-6 max-w-4xl space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">{students.length}</p>
          <p className="text-xs text-zinc-500">Enrolled Students</p>
        </Card>
        <Card className="p-4 text-center">
          <p className={`text-2xl font-bold ${getGrade(avgGrade).color}`}>{avgGrade}%</p>
          <p className="text-xs text-zinc-500">Class Average</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-zinc-900 dark:text-white">
            {students.length > 0 ? Math.round(students.reduce((s, st) => s + st.attendanceRate, 0) / students.length) : 0}%
          </p>
          <p className="text-xs text-zinc-500">Avg Attendance</p>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-16 rounded-xl"/>)}</div>
      ) : students.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title="No students enrolled" description="Students will appear here once they enroll" />
      ) : (
        <Card className="overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <Users size={16} className="text-blue-500" /> Student Roster
            </h3>
            <span className="text-xs text-zinc-400">{students.length} students</span>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {students.map((s, i) => (
              <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 flex-shrink-0">
                  {i + 1}
                </div>
                <Avatar name={s.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{s.name}</p>
                  <p className="text-xs text-zinc-400">{s.student_id}{s.department ? ` · ${s.department}` : ''}</p>
                </div>
                <div className="flex items-center gap-4">
                  {/* Grade */}
                  <div className="text-center w-16">
                    {s.gradesCount > 0 ? (
                      <>
                        <p className={`text-base font-black ${s.letterColor}`}>{s.letter}</p>
                        <p className="text-xs text-zinc-400">{s.avgPct}%</p>
                      </>
                    ) : (
                      <div className="flex items-center gap-1 text-zinc-400">
                        <AlertCircle size={12} />
                        <span className="text-xs">No grades</span>
                      </div>
                    )}
                  </div>
                  {/* Attendance */}
                  <div className="text-center w-16">
                    <p className={`text-base font-bold ${s.attendanceRate >= 75 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {s.attendanceRate}%
                    </p>
                    <p className="text-xs text-zinc-400">Att.</p>
                  </div>
                  {/* GPA */}
                  <div className="text-center w-14">
                    <p className="text-base font-bold text-zinc-900 dark:text-white">
                      {s.gradesCount > 0 ? s.gradePoints.toFixed(1) : '—'}
                    </p>
                    <p className="text-xs text-zinc-400">GPA</p>
                  </div>
                  {/* Message */}
                  <button
                    onClick={() => onMessageStudent({ id: s.id, name: s.name })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                  >
                    <MessageCircle size={13} /> Message
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
