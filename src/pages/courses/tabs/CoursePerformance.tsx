import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Award, TrendingUp, CheckCircle2, XCircle, Clock, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatDate } from '../../../lib/utils';
import type { Grade, AttendanceRecord } from '../../../types';

interface StudentSummary {
  student_id: string;
  name: string;
  avgPct: number;
  gradesCount: number;
  attendanceRate: number;
}

const getGrade = (pct: number) => {
  if (pct >= 90) return { letter: 'A+', color: 'text-emerald-500', gp: 10 };
  if (pct >= 80) return { letter: 'A', color: 'text-emerald-500', gp: 9 };
  if (pct >= 70) return { letter: 'B+', color: 'text-blue-500', gp: 8 };
  if (pct >= 60) return { letter: 'B', color: 'text-blue-400', gp: 7 };
  if (pct >= 50) return { letter: 'C', color: 'text-amber-500', gp: 6 };
  if (pct >= 40) return { letter: 'D', color: 'text-orange-500', gp: 5 };
  return { letter: 'F', color: 'text-red-500', gp: 0 };
};

export const CoursePerformance: React.FC<{ courseId: string }> = ({ courseId }) => {
  const { profile } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [allStudents, setAllStudents] = useState<StudentSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const isStudent = profile?.role === 'student';

  useEffect(() => {
    const load = async () => {
      if (isStudent) {
        const [gradesRes, attRes] = await Promise.all([
          supabase.from('grades').select('*, assignment:assignment_id(title, type)')
            .eq('course_id', courseId).eq('student_id', profile!.id),
          supabase.from('attendance').select('*').eq('course_id', courseId).eq('student_id', profile!.id).order('date'),
        ]);
        if (gradesRes.data) setGrades(gradesRes.data);
        if (attRes.data) setAttendance(attRes.data);
      } else {
        // Faculty: show all students summary
        const [gradesRes, attRes, enrollRes] = await Promise.all([
          supabase.from('grades').select('*, student:student_id(id, name)').eq('course_id', courseId),
          supabase.from('attendance').select('*').eq('course_id', courseId),
          supabase.from('course_enrollments').select('*, student:student_id(id, name)').eq('course_id', courseId),
        ]);

        const gradesByStudent: Record<string, { marks: number[]; maxMarks: number[]; name: string }> = {};
        (gradesRes.data || []).forEach((g: any) => {
          if (!gradesByStudent[g.student_id]) gradesByStudent[g.student_id] = { marks: [], maxMarks: [], name: g.student?.name || '' };
          gradesByStudent[g.student_id].marks.push(g.marks);
          gradesByStudent[g.student_id].maxMarks.push(g.max_marks);
        });

        const attByStudent: Record<string, { total: number; present: number }> = {};
        (attRes.data || []).forEach((a: any) => {
          if (!attByStudent[a.student_id]) attByStudent[a.student_id] = { total: 0, present: 0 };
          attByStudent[a.student_id].total++;
          if (a.status === 'present' || a.status === 'late') attByStudent[a.student_id].present++;
        });

        const summaries: StudentSummary[] = (enrollRes.data || []).map((e: any) => {
          const sid = e.student?.id;
          const gdata = gradesByStudent[sid];
          const avgPct = gdata && gdata.marks.length > 0
            ? Math.round(gdata.marks.reduce((s, m, i) => s + (m / gdata.maxMarks[i]) * 100, 0) / gdata.marks.length)
            : 0;
          const att = attByStudent[sid] || { total: 0, present: 0 };
          return {
            student_id: sid,
            name: e.student?.name || 'Unknown',
            avgPct,
            gradesCount: gdata?.marks.length || 0,
            attendanceRate: att.total > 0 ? Math.round((att.present / att.total) * 100) : 0,
          };
        });
        setAllStudents(summaries.sort((a, b) => b.avgPct - a.avgPct));
      }
      setLoading(false);
    };
    if (profile) load();
  }, [courseId, profile, isStudent]);

  if (loading) return (
    <div className="p-6 space-y-4">
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
    </div>
  );

  // Faculty view
  if (!isStudent) {
    const avgClassGrade = allStudents.length > 0
      ? Math.round(allStudents.filter(s => s.gradesCount > 0).reduce((s, st) => s + st.avgPct, 0) / Math.max(allStudents.filter(s => s.gradesCount > 0).length, 1))
      : 0;

    return (
      <div className="p-6 max-w-4xl space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-5 text-center">
            <div className="text-3xl font-black text-blue-500 mb-1">{allStudents.length}</div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Enrolled</p>
            <p className="text-xs text-zinc-400">Total students</p>
          </Card>
          <Card className="p-5 text-center">
            <div className={`text-3xl font-black mb-1 ${getGrade(avgClassGrade).color}`}>{avgClassGrade}%</div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Class Average</p>
            <p className="text-xs text-zinc-400">{getGrade(avgClassGrade).letter} grade</p>
          </Card>
          <Card className="p-5 text-center">
            <div className="text-3xl font-black text-emerald-500 mb-1">
              {allStudents.length > 0 ? Math.round(allStudents.reduce((s, st) => s + st.attendanceRate, 0) / allStudents.length) : 0}%
            </div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Avg Attendance</p>
            <p className="text-xs text-zinc-400">Across all students</p>
          </Card>
        </div>

        {allStudents.length > 0 && (
          <Card className="p-5">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Users size={16} className="text-blue-500" /> Student Performance
            </h3>
            <div className="space-y-3">
              {allStudents.map((s, i) => {
                const g = getGrade(s.avgPct);
                return (
                  <motion.div key={s.student_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{s.name}</p>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {s.gradesCount > 0 ? (
                            <Badge variant={s.avgPct >= 60 ? 'success' : 'danger'} size="sm">{g.letter} · {s.avgPct}%</Badge>
                          ) : (
                            <Badge variant="default" size="sm">No grades</Badge>
                          )}
                          <Badge variant={s.attendanceRate >= 75 ? 'success' : 'warning'} size="sm">{s.attendanceRate}% att</Badge>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${s.avgPct}%` }} transition={{ duration: 0.7, delay: i * 0.04 }}
                          className={`h-full rounded-full ${s.avgPct >= 75 ? 'bg-emerald-500' : s.avgPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // Student view
  const attendanceRate = attendance.length > 0
    ? Math.round((attendance.filter(a => a.status === 'present' || a.status === 'late').length / attendance.length) * 100)
    : 0;
  const avgGrade = grades.length > 0
    ? Math.round(grades.reduce((acc, g) => acc + (g.marks / g.max_marks) * 100, 0) / grades.length)
    : 0;
  const gradeInfo = getGrade(avgGrade);

  const gradeChartData = grades.map(g => ({
    name: (g as any).assignment?.title?.substring(0, 12) || 'Task',
    score: Math.round((g.marks / g.max_marks) * 100),
    marks: g.marks,
    max: g.max_marks,
  }));

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0 }}>
          <Card className="p-5 text-center">
            <div className={`text-4xl font-black mb-1 ${gradeInfo.color}`}>{gradeInfo.letter}</div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Overall Grade</p>
            <p className="text-2xl font-bold text-zinc-500 dark:text-zinc-400">{avgGrade}%</p>
            <p className="text-xs text-zinc-400 mt-1">{gradeInfo.gp}/10 grade pts</p>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
          <Card className="p-5 text-center">
            <div className={`text-4xl font-black mb-1 ${attendanceRate >= 75 ? 'text-emerald-500' : 'text-red-500'}`}>{attendanceRate}%</div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Attendance</p>
            <p className="text-xs text-zinc-400">{attendance.filter(a => a.status === 'present').length}/{attendance.length} classes</p>
            {attendanceRate < 75 && (
              <p className="text-xs text-red-500 mt-1 font-medium">Below 75% threshold</p>
            )}
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
          <Card className="p-5 text-center">
            <div className="text-4xl font-black text-blue-500 mb-1">{grades.length}</div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Graded Items</p>
            <p className="text-xs text-zinc-400">Assignments evaluated</p>
          </Card>
        </motion.div>
      </div>

      {gradeChartData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-5">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-500" /> Grade Progression
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gradeChartData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: 12, fontSize: 12 }}
                  formatter={(v: any, _: any, p: any) => [`${p.payload.marks}/${p.payload.max} (${v}%)`, 'Score']}
                />
                <Bar dataKey="score" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      )}

      {grades.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Award size={16} className="text-amber-500" /> Grade Breakdown
            </h3>
            <div className="space-y-2">
              {grades.map((g, i) => {
                const pct = Math.round((g.marks / g.max_marks) * 100);
                const gi = getGrade(pct);
                return (
                  <motion.div key={g.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{(g as any).assignment?.title || 'Assignment'}</p>
                      <p className="text-xs text-zinc-400">{g.marks}/{g.max_marks} marks</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-sm ${gi.color}`}>{gi.letter}</p>
                      <p className="text-xs text-zinc-400">{pct}%</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {attendance.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-5">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Attendance Record</h3>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {attendance.slice(-20).reverse().map(a => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div className="flex items-center gap-3">
                    {a.status === 'present' ? <CheckCircle2 size={15} className="text-emerald-500" />
                      : a.status === 'late' ? <Clock size={15} className="text-amber-500" />
                      : <XCircle size={15} className="text-red-500" />}
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{formatDate(a.date)}</span>
                  </div>
                  <Badge variant={a.status === 'present' ? 'success' : a.status === 'late' ? 'warning' : 'danger'} size="sm">
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      {grades.length === 0 && attendance.length === 0 && (
        <div className="text-center py-12 text-zinc-400">
          <Award size={48} className="mx-auto mb-3 opacity-30" />
          <p>No performance data yet</p>
        </div>
      )}
    </div>
  );
};
