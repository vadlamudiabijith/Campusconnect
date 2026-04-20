import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, Calendar, CreditCard, BookOpen, TrendingUp, Clock,
  Users, Shield, CheckCircle2, XCircle, AlertCircle, BarChart2, Award
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { StatCard } from '../components/ui/StatCard';
import { formatDate } from '../lib/utils';

const getLetterAndGP = (pct: number) => {
  if (pct >= 90) return { letter: 'A+', gp: 10, color: 'text-emerald-500' };
  if (pct >= 80) return { letter: 'A', gp: 9, color: 'text-emerald-500' };
  if (pct >= 70) return { letter: 'B+', gp: 8, color: 'text-blue-500' };
  if (pct >= 60) return { letter: 'B', gp: 7, color: 'text-blue-400' };
  if (pct >= 50) return { letter: 'C', gp: 6, color: 'text-amber-500' };
  if (pct >= 40) return { letter: 'D', gp: 5, color: 'text-orange-500' };
  return { letter: 'F', gp: 0, color: 'text-red-500' };
};

export const ParentPortal: React.FC = () => {
  const { profile } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'attendance' | 'academic' | 'payments' | 'schedule'>('overview');

  useEffect(() => {
    if (!profile || profile.role !== 'parent') return;
    loadStudentData();
  }, [profile]);

  const loadStudentData = async () => {
    if (!profile?.parent_of) { setLoading(false); return; }
    const { data: studentData } = await supabase.from('profiles').select('*').eq('student_id', profile.parent_of).maybeSingle();
    if (!studentData) { setLoading(false); return; }
    setStudent(studentData);

    const [coursesRes, gradesRes, attendanceRes, paymentsRes, timetableRes] = await Promise.all([
      supabase.from('course_enrollments').select('*, course:course_id(*, faculty:faculty_id(name, department))').eq('student_id', studentData.id),
      supabase.from('grades').select('*, assignment:assignment_id(title, type, max_marks), course:course_id(name, code, color, credits, semester)').eq('student_id', studentData.id).order('graded_at', { ascending: false }),
      supabase.from('attendance').select('*, course:course_id(name, code, color)').eq('student_id', studentData.id).order('date', { ascending: false }).limit(100),
      supabase.from('payments').select('*').eq('user_id', studentData.id).order('created_at', { ascending: false }),
      supabase.from('timetable').select('*, course:course_id(name, code, color)').order('day_of_week').order('start_time'),
    ]);

    if (coursesRes.data) setCourses(coursesRes.data);
    if (gradesRes.data) setGrades(gradesRes.data);
    if (attendanceRes.data) setAttendance(attendanceRes.data);
    if (paymentsRes.data) setPayments(paymentsRes.data);
    if (timetableRes.data) setTimetable(timetableRes.data);
    setLoading(false);
  };

  if (!profile || profile.role !== 'parent') return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <EmptyState icon={<Shield size={32} />} title="Access Restricted" description="This section is only accessible to parent accounts." />
    </div>
  );

  if (!profile.parent_of) return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <EmptyState icon={<GraduationCap size={32} />} title="No Student Linked" description="Your account is not linked to any student. Please contact admin." />
    </div>
  );

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const attPercent = attendance.length ? Math.round(((presentCount + lateCount) / attendance.length) * 100) : 0;
  const totalPaid = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);

  // Per-course attendance
  const byCourseAtt: Record<string, { name: string; code: string; color: string; total: number; present: number; late: number }> = {};
  attendance.forEach(a => {
    if (!byCourseAtt[a.course_id]) byCourseAtt[a.course_id] = { name: a.course?.name || '', code: a.course?.code || '', color: a.course?.color || '#3B82F6', total: 0, present: 0, late: 0 };
    byCourseAtt[a.course_id].total++;
    if (a.status === 'present') byCourseAtt[a.course_id].present++;
    if (a.status === 'late') byCourseAtt[a.course_id].late++;
  });

  // CGPA calc
  const courseGradeMap: Record<string, { marks: number[]; maxMarks: number[]; credits: number; name: string; code: string; color: string }> = {};
  grades.forEach(g => {
    if (!courseGradeMap[g.course_id]) courseGradeMap[g.course_id] = {
      marks: [], maxMarks: [], credits: g.course?.credits || 3, name: g.course?.name || '', code: g.course?.code || '', color: g.course?.color || '#3B82F6',
    };
    courseGradeMap[g.course_id].marks.push(g.marks);
    courseGradeMap[g.course_id].maxMarks.push(g.max_marks);
  });

  const courseGPAs = Object.entries(courseGradeMap).map(([id, data]) => {
    const avg = data.marks.reduce((s, m, i) => s + (m / data.maxMarks[i]) * 100, 0) / data.marks.length;
    const { letter, gp, color } = getLetterAndGP(avg);
    return { id, ...data, avgPct: Math.round(avg), letter, gp, color };
  });

  const totalCredits = courseGPAs.reduce((s, c) => s + c.credits, 0);
  const cgpa = totalCredits > 0 ? Math.round((courseGPAs.reduce((s, c) => s + c.gp * c.credits, 0) / totalCredits) * 100) / 100 : 0;

  const attChartData = Object.values(byCourseAtt).map(c => ({
    name: c.code, present: c.present, late: c.late, absent: c.total - c.present - c.late,
    rate: c.total > 0 ? Math.round(((c.present + c.late) / c.total) * 100) : 0,
  }));

  const sections = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={15} /> },
    { id: 'attendance', label: 'Attendance', icon: <Calendar size={15} /> },
    { id: 'academic', label: 'Academic', icon: <Award size={15} /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={15} /> },
    { id: 'schedule', label: 'Schedule', icon: <Clock size={15} /> },
  ] as const;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Parent Portal</h2>
            <p className="text-zinc-500 mt-0.5">Monitoring your child's academic journey</p>
          </div>
          {student && (
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex-shrink-0">
              <Avatar name={student.name} size="lg" />
              <div>
                <p className="font-bold text-zinc-900 dark:text-white">{student.name}</p>
                <p className="text-sm text-zinc-500">ID: {student.student_id}</p>
                <p className="text-xs text-zinc-400">{student.department}</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl w-fit">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSection === s.id
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : !student ? (
        <EmptyState icon={<Users size={32} />} title="Student Not Found" description="Could not find student. Contact admin." />
      ) : (
        <>
          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Courses Enrolled" value={courses.length} icon={<BookOpen size={20} />} color="blue" delay={0} />
                <StatCard label="CGPA" value={cgpa.toFixed(2)} icon={<Award size={20} />} color="emerald" delay={0.05} />
                <StatCard label="Attendance" value={`${attPercent}%`} icon={<Calendar size={20} />} color={attPercent >= 75 ? 'emerald' : 'rose'} delay={0.1} />
                <StatCard label="Total Paid" value={`₹${totalPaid.toFixed(0)}`} icon={<CreditCard size={20} />} color="amber" delay={0.15} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-5">
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar size={16} className="text-amber-500" /> Attendance by Course
                  </h3>
                  {attChartData.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-6">No attendance data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={attChartData} barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.08)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.4)', borderRadius: 10, fontSize: 12 }} />
                        <Bar dataKey="present" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} name="Present" />
                        <Bar dataKey="late" stackId="a" fill="#F59E0B" name="Late" />
                        <Bar dataKey="absent" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} name="Absent" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
                <Card className="p-5">
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                    <Award size={16} className="text-emerald-500" /> Academic Summary
                  </h3>
                  {courseGPAs.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-6">No grades recorded</p>
                  ) : (
                    <div className="space-y-3">
                      {courseGPAs.map((cg, i) => (
                        <motion.div key={cg.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                          className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: cg.color }}>
                            {cg.code?.substring(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{cg.name}</p>
                            <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mt-1 overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${cg.avgPct}%` }} transition={{ duration: 0.8, delay: i * 0.05 }}
                                className="h-full rounded-full" style={{ backgroundColor: cg.color }} />
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`text-sm font-bold ${cg.color}`}>{cg.letter}</span>
                            <p className="text-xs text-zinc-400">{cg.avgPct}%</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </motion.div>
          )}

          {/* ATTENDANCE */}
          {activeSection === 'attendance' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Total Classes', value: attendance.length, color: 'blue' },
                  { label: 'Present', value: presentCount, color: 'emerald' },
                  { label: 'Late', value: lateCount, color: 'amber' },
                  { label: 'Absent', value: absentCount, color: 'rose' },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className="p-4 text-center">
                      <p className="text-2xl font-bold text-zinc-900 dark:text-white">{s.value}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Per-course breakdown */}
              <Card className="p-5">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Attendance by Course</h3>
                <div className="space-y-4">
                  {Object.values(byCourseAtt).map((c, i) => {
                    const rate = c.total > 0 ? Math.round(((c.present + c.late) / c.total) * 100) : 0;
                    return (
                      <motion.div key={c.code} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
                        <div className="flex items-center gap-3 mb-1">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: c.color }}>
                            {c.code?.substring(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{c.name}</p>
                            <p className="text-xs text-zinc-400">{c.present}P · {c.late}L · {c.total - c.present - c.late}A of {c.total} classes</p>
                          </div>
                          <span className={`text-sm font-bold flex-shrink-0 ${rate >= 75 ? 'text-emerald-500' : 'text-red-500'}`}>{rate}%</span>
                        </div>
                        <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden ml-11">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${rate}%` }} transition={{ duration: 0.8, delay: i * 0.05 }}
                            className={`h-full rounded-full ${rate >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        </div>
                        {rate < 75 && (
                          <p className="text-xs text-red-500 ml-11 mt-1 flex items-center gap-1">
                            <AlertCircle size={11} /> Below 75% — attendance warning
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </Card>

              {/* Day-by-day log */}
              <Card className="p-5">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Attendance Log</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                  {attendance.map((a, i) => (
                    <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      {a.status === 'present' ? <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                        : a.status === 'late' ? <Clock size={15} className="text-amber-500 flex-shrink-0" />
                        : <XCircle size={15} className="text-red-500 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{a.course?.name}</p>
                        <p className="text-xs text-zinc-400">{formatDate(a.date)}</p>
                      </div>
                      <Badge variant={a.status === 'present' ? 'success' : a.status === 'late' ? 'warning' : 'danger'} size="sm">{a.status}</Badge>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* ACADEMIC */}
          {activeSection === 'academic' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* CGPA card */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 p-6">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <svg className="w-28 h-28" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#3B82F6" strokeWidth="10"
                          strokeDasharray={`${(cgpa / 10) * 314} 314`} strokeLinecap="round" transform="rotate(-90 60 60)" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-white">{cgpa.toFixed(2)}</span>
                        <span className="text-xs text-zinc-400">CGPA</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm mb-3">Cumulative Grade Point Average</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <p className="text-lg font-bold text-white">{courseGPAs.length}</p>
                          <p className="text-xs text-zinc-400">Courses</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3 text-center">
                          <p className="text-lg font-bold text-white">{totalCredits}</p>
                          <p className="text-xs text-zinc-400">Credits</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courseGPAs.map((cg, i) => (
                  <motion.div key={cg.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                    <Card className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ backgroundColor: cg.color }}>
                          {cg.code?.substring(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-900 dark:text-white text-sm truncate">{cg.name}</p>
                          <p className="text-xs text-zinc-400">{cg.code} · {cg.credits} credits</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-xl font-black ${cg.color}`}>{cg.letter}</p>
                          <p className="text-xs text-zinc-400">{cg.gp}/10</p>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-zinc-400 mb-1">
                        <span>{cg.avgPct}% average</span>
                        <span>{cg.marks.length} graded</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${cg.avgPct}%` }} transition={{ duration: 0.8, delay: i * 0.06 }}
                          className="h-full rounded-full" style={{ backgroundColor: cg.color }} />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <Card className="p-5">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-500" /> Recent Grades
                </h3>
                {grades.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-4">No grades recorded yet</p>
                ) : (
                  <div className="space-y-2">
                    {grades.slice(0, 15).map((g: any, i: number) => {
                      const pct = Math.round((g.marks / g.max_marks) * 100);
                      const { letter, color } = getLetterAndGP(pct);
                      return (
                        <motion.div key={g.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: g.course?.color || '#3B82F6' }}>
                            {g.course?.code?.substring(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-zinc-900 dark:text-white text-sm truncate">{g.assignment?.title}</p>
                            <p className="text-xs text-zinc-400">{g.course?.code} · {g.marks}/{g.max_marks}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`font-bold text-sm ${color}`}>{letter}</p>
                            <p className="text-xs text-zinc-400">{pct}%</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* PAYMENTS */}
          {activeSection === 'payments' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">₹{totalPaid.toFixed(0)}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Total Paid</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{payments.filter(p => p.status === 'pending').length}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Pending</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{payments.length}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Total Transactions</p>
                </Card>
              </div>
              <Card className="p-5">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Payment History</h3>
                {payments.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-6">No payments made</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p: any, i: number) => (
                      <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">{p.description}</p>
                          <p className="text-xs text-zinc-400">{formatDate(p.created_at)} · {p.payment_method}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-zinc-900 dark:text-white text-sm">₹{p.amount.toFixed(2)}</p>
                          <Badge variant={p.status === 'completed' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'} size="sm">{p.status}</Badge>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {/* SCHEDULE */}
          {activeSection === 'schedule' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-5">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" /> Weekly Timetable
                </h3>
                {timetable.length === 0 ? (
                  <p className="text-sm text-zinc-400 text-center py-6">No timetable available</p>
                ) : (
                  <div className="space-y-4">
                    {days.map(day => {
                      const slots = timetable.filter((t: any) => t.day_of_week === day);
                      if (!slots.length) return null;
                      return (
                        <div key={day}>
                          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">{day}</p>
                          <div className="space-y-1.5">
                            {slots.map((slot: any) => (
                              <motion.div key={slot.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-3 px-4 py-2.5 rounded-xl"
                                style={{ backgroundColor: `${slot.course?.color}15` }}>
                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: slot.course?.color || '#3B82F6' }} />
                                <span className="text-sm font-medium text-zinc-900 dark:text-white flex-1">{slot.course?.name}</span>
                                <span className="text-xs text-zinc-500 font-mono">{slot.start_time}–{slot.end_time}</span>
                                {slot.room && <span className="text-xs text-zinc-400">{slot.room}</span>}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};
