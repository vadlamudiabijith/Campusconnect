import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { Award, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatDate } from '../../../lib/utils';
import type { Grade, AttendanceRecord } from '../../../types';

export const CoursePerformance: React.FC<{ courseId: string }> = ({ courseId }) => {
  const { profile } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPerf = async () => {
      const [gradesRes, attRes] = await Promise.all([
        supabase.from('grades').select('*, assignment:assignment_id(title, type)')
          .eq('course_id', courseId).eq('student_id', profile!.id),
        supabase.from('attendance').select('*').eq('course_id', courseId).eq('student_id', profile!.id).order('date'),
      ]);
      if (gradesRes.data) setGrades(gradesRes.data);
      if (attRes.data) setAttendance(attRes.data);
      setLoading(false);
    };
    if (profile) loadPerf();
  }, [courseId, profile]);

  const attendanceRate = attendance.length > 0
    ? Math.round((attendance.filter(a => a.status === 'present' || a.status === 'late').length / attendance.length) * 100)
    : 0;

  const avgGrade = grades.length > 0
    ? Math.round(grades.reduce((acc, g) => acc + (g.marks / g.max_marks) * 100, 0) / grades.length)
    : 0;

  const gradeChartData = grades.map(g => ({
    name: (g as any).assignment?.title?.substring(0, 12) || 'Task',
    score: Math.round((g.marks / g.max_marks) * 100),
    marks: g.marks,
    max: g.max_marks,
  }));

  const getGradeLetter = (pct: number) => {
    if (pct >= 90) return { letter: 'A+', color: 'text-emerald-500' };
    if (pct >= 80) return { letter: 'A', color: 'text-emerald-500' };
    if (pct >= 70) return { letter: 'B', color: 'text-blue-500' };
    if (pct >= 60) return { letter: 'C', color: 'text-amber-500' };
    if (pct >= 50) return { letter: 'D', color: 'text-orange-500' };
    return { letter: 'F', color: 'text-red-500' };
  };

  const grade = getGradeLetter(avgGrade);

  if (loading) return (
    <div className="p-6 space-y-4">
      {Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5 text-center">
          <div className={`text-4xl font-black mb-1 ${grade.color}`}>{grade.letter}</div>
          <p className="text-sm font-medium text-zinc-900 dark:text-white">Overall Grade</p>
          <p className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">{avgGrade}%</p>
        </Card>
        <Card className="p-5 text-center">
          <div className={`text-4xl font-black mb-1 ${attendanceRate >= 75 ? 'text-emerald-500' : 'text-red-500'}`}>{attendanceRate}%</div>
          <p className="text-sm font-medium text-zinc-900 dark:text-white">Attendance</p>
          <p className="text-xs text-zinc-400">{attendance.filter(a => a.status === 'present').length}/{attendance.length} classes</p>
        </Card>
        <Card className="p-5 text-center">
          <div className="text-4xl font-black text-blue-500 mb-1">{grades.length}</div>
          <p className="text-sm font-medium text-zinc-900 dark:text-white">Graded Items</p>
          <p className="text-xs text-zinc-400">Assignments evaluated</p>
        </Card>
      </div>

      {gradeChartData.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Grade Progression</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gradeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'rgba(24,24,27,0.9)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: 12, fontSize: 12 }}
                formatter={(value: any, name: any, props: any) => [`${props.payload.marks}/${props.payload.max} (${value}%)`, 'Score']}
              />
              <Bar dataKey="score" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {attendance.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Attendance Record</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {attendance.slice(-20).reverse().map(a => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <div className="flex items-center gap-3">
                  {a.status === 'present' ? <CheckCircle2 size={16} className="text-emerald-500" />
                    : a.status === 'late' ? <CheckCircle2 size={16} className="text-amber-500" />
                    : <XCircle size={16} className="text-red-500" />}
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{formatDate(a.date)}</span>
                </div>
                <Badge variant={a.status === 'present' ? 'success' : a.status === 'late' ? 'warning' : 'danger'} size="sm">
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
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
