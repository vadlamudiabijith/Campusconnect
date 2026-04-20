import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Calendar, CreditCard, BookOpen, TrendingUp, Clock, Users, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { StatCard } from '../components/ui/StatCard';
import { formatDate } from '../lib/utils';

export const ParentPortal: React.FC = () => {
  const { profile } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'parent') return;
    loadStudentData();
  }, [profile]);

  const loadStudentData = async () => {
    if (!profile?.parent_of) { setLoading(false); return; }

    const { data: studentData } = await supabase
      .from('profiles')
      .select('*')
      .eq('student_id', profile.parent_of)
      .maybeSingle();

    if (!studentData) { setLoading(false); return; }
    setStudent(studentData);

    const [coursesRes, gradesRes, attendanceRes, paymentsRes, timetableRes] = await Promise.all([
      supabase.from('course_enrollments').select('*, course:course_id(*, faculty:faculty_id(name))').eq('student_id', studentData.id),
      supabase.from('grades').select('*, assignment:assignment_id(title, type), course:course_id(name, code)').eq('student_id', studentData.id).order('created_at', { ascending: false }),
      supabase.from('attendance').select('*, course:course_id(name, code)').eq('student_id', studentData.id).order('date', { ascending: false }).limit(20),
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

  if (!profile || profile.role !== 'parent') {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <EmptyState icon={<Shield size={32} />} title="Access Restricted" description="This section is only accessible to parent accounts." />
      </div>
    );
  }

  if (!profile.parent_of) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <EmptyState icon={<GraduationCap size={32} />} title="No Student Linked" description="Your account is not linked to any student. Please contact the admin to link your child's student ID." />
      </div>
    );
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const avgGrade = grades.length ? (grades.reduce((s, g) => s + (g.score / g.max_score) * 100, 0) / grades.length).toFixed(1) : 0;
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const attPercent = attendance.length ? ((presentCount / attendance.length) * 100).toFixed(0) : 0;
  const totalPaid = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Parent Portal</h2>
            <p className="text-zinc-500 mt-0.5">Monitoring your child's academic progress</p>
          </div>
          {student && (
            <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
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

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : student ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Courses Enrolled" value={courses.length} icon={<BookOpen size={20} />} color="blue" delay={0} />
            <StatCard label="Average Grade" value={`${avgGrade}%`} icon={<TrendingUp size={20} />} color="emerald" delay={0.05} />
            <StatCard label="Attendance" value={`${attPercent}%`} icon={<Calendar size={20} />} color="amber" delay={0.1} />
            <StatCard label="Total Paid" value={`₹${totalPaid.toFixed(0)}`} icon={<CreditCard size={20} />} color="rose" delay={0.15} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <BookOpen size={16} className="text-blue-500" /> Enrolled Courses
              </h3>
              {courses.length === 0 ? (
                <p className="text-sm text-zinc-400 py-4 text-center">No courses enrolled</p>
              ) : (
                <div className="space-y-3">
                  {courses.map((c: any, i: number) => (
                    <motion.div key={c.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: c.course?.color || '#3B82F6' }}>
                        {c.course?.code?.substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-white text-sm truncate">{c.course?.name}</p>
                        <p className="text-xs text-zinc-400">Faculty: {c.course?.faculty?.name || 'N/A'}</p>
                      </div>
                      <Badge variant="info" size="sm">{c.course?.credits} cr</Badge>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" /> Recent Grades
              </h3>
              {grades.length === 0 ? (
                <p className="text-sm text-zinc-400 py-4 text-center">No grades recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {grades.slice(0, 6).map((g: any, i: number) => {
                    const pct = Math.round((g.score / g.max_score) * 100);
                    const letter = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'D';
                    const color = pct >= 80 ? 'success' : pct >= 60 ? 'warning' : 'danger';
                    return (
                      <motion.div key={g.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-900 dark:text-white text-sm truncate">{g.assignment?.title}</p>
                          <p className="text-xs text-zinc-400">{g.course?.code} · {g.score}/{g.max_score}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={color as any} size="sm">{letter} ({pct}%)</Badge>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-amber-500" /> Weekly Timetable
              </h3>
              {timetable.length === 0 ? (
                <p className="text-sm text-zinc-400 py-4 text-center">No timetable available</p>
              ) : (
                <div className="space-y-3">
                  {days.map(day => {
                    const slots = timetable.filter((t: any) => t.day_of_week === day);
                    if (!slots.length) return null;
                    return (
                      <div key={day}>
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">{day}</p>
                        <div className="space-y-1">
                          {slots.map((slot: any) => (
                            <div key={slot.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                              style={{ backgroundColor: `${slot.course?.color}15` }}>
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: slot.course?.color || '#3B82F6' }} />
                              <span className="text-xs font-medium text-zinc-900 dark:text-white flex-1">{slot.course?.name}</span>
                              <span className="text-xs text-zinc-500">{slot.start_time}–{slot.end_time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard size={16} className="text-rose-500" /> Payment History
              </h3>
              {payments.length === 0 ? (
                <p className="text-sm text-zinc-400 py-4 text-center">No payments made</p>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 6).map((p: any, i: number) => (
                    <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{p.description}</p>
                        <p className="text-xs text-zinc-400">{formatDate(p.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-zinc-900 dark:text-white text-sm">₹{p.amount.toFixed(2)}</p>
                        <Badge variant={p.status === 'completed' ? 'success' : 'warning'} size="sm">{p.status}</Badge>
                      </div>
                    </motion.div>
                  ))}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
                    <span className="text-sm text-zinc-500">Total Paid</span>
                    <span className="font-bold text-zinc-900 dark:text-white">₹{totalPaid.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock size={16} className="text-blue-500" /> Recent Attendance
            </h3>
            {attendance.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">No attendance records</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attendance.slice(0, 10).map((a: any, i: number) => (
                  <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${a.status === 'present' ? 'bg-emerald-500' : a.status === 'late' ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{a.course?.name}</p>
                      <p className="text-xs text-zinc-400">{formatDate(a.date)}</p>
                    </div>
                    <Badge variant={a.status === 'present' ? 'success' : a.status === 'late' ? 'warning' : 'danger'} size="sm">{a.status}</Badge>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </>
      ) : (
        <EmptyState icon={<Users size={32} />} title="Student Not Found" description="Could not find student with the linked ID. Please contact admin." />
      )}
    </div>
  );
};
