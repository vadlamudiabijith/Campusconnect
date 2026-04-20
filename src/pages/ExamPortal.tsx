import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, TrendingUp, BookOpen, BarChart2, Star, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

interface CourseGrade {
  course_id: string;
  course_name: string;
  course_code: string;
  course_color: string;
  credits: number;
  semester: string;
  avgPct: number;
  gradePoints: number;
  letter: string;
  gradesCount: number;
}

const getLetterAndPoints = (pct: number) => {
  if (pct >= 90) return { letter: 'A+', points: 10, color: 'text-emerald-500' };
  if (pct >= 80) return { letter: 'A', points: 9, color: 'text-emerald-500' };
  if (pct >= 70) return { letter: 'B+', points: 8, color: 'text-blue-500' };
  if (pct >= 60) return { letter: 'B', points: 7, color: 'text-blue-500' };
  if (pct >= 50) return { letter: 'C', points: 6, color: 'text-amber-500' };
  if (pct >= 40) return { letter: 'D', points: 5, color: 'text-orange-500' };
  return { letter: 'F', points: 0, color: 'text-red-500' };
};

export const ExamPortal: React.FC = () => {
  const { profile } = useAuth();
  const [courseGrades, setCourseGrades] = useState<CourseGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    loadGrades();
  }, [profile]);

  const loadGrades = async () => {
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('*, course:course_id(id, name, code, color, credits, semester)')
      .eq('student_id', profile!.id);

    if (!enrollments) { setLoading(false); return; }

    const courseList = enrollments.map((e: any) => e.course).filter(Boolean);
    const results: CourseGrade[] = [];

    await Promise.all(courseList.map(async (course: any) => {
      const { data: grades } = await supabase
        .from('grades')
        .select('marks, max_marks, grade_points')
        .eq('course_id', course.id)
        .eq('student_id', profile!.id);

      if (!grades || grades.length === 0) {
        results.push({
          course_id: course.id,
          course_name: course.name,
          course_code: course.code,
          course_color: course.color || '#3B82F6',
          credits: course.credits || 3,
          semester: course.semester || 'Current',
          avgPct: 0,
          gradePoints: 0,
          letter: 'N/A',
          gradesCount: 0,
        });
        return;
      }

      const avgPct = grades.reduce((sum, g) => sum + (g.marks / g.max_marks) * 100, 0) / grades.length;
      const { letter, points } = getLetterAndPoints(avgPct);

      results.push({
        course_id: course.id,
        course_name: course.name,
        course_code: course.code,
        course_color: course.color || '#3B82F6',
        credits: course.credits || 3,
        semester: course.semester || 'Current',
        avgPct: Math.round(avgPct),
        gradePoints: points,
        letter,
        gradesCount: grades.length,
      });
    }));

    setCourseGrades(results.sort((a, b) => b.avgPct - a.avgPct));
    setLoading(false);
  };

  // Group by semester
  const bySemester: Record<string, CourseGrade[]> = {};
  courseGrades.forEach(cg => {
    const sem = cg.semester || 'Current';
    if (!bySemester[sem]) bySemester[sem] = [];
    bySemester[sem].push(cg);
  });

  // SGPA per semester
  const semesterGPA: Record<string, number> = {};
  Object.entries(bySemester).forEach(([sem, courses]) => {
    const graded = courses.filter(c => c.gradesCount > 0);
    if (graded.length === 0) { semesterGPA[sem] = 0; return; }
    const totalCredits = graded.reduce((s, c) => s + c.credits, 0);
    const weightedSum = graded.reduce((s, c) => s + c.gradePoints * c.credits, 0);
    semesterGPA[sem] = totalCredits > 0 ? Math.round((weightedSum / totalCredits) * 100) / 100 : 0;
  });

  // CGPA across all graded courses
  const gradedCourses = courseGrades.filter(c => c.gradesCount > 0);
  const totalCredits = gradedCourses.reduce((s, c) => s + c.credits, 0);
  const weightedSum = gradedCourses.reduce((s, c) => s + c.gradePoints * c.credits, 0);
  const cgpa = totalCredits > 0 ? Math.round((weightedSum / totalCredits) * 100) / 100 : 0;

  const cgpaGrade = cgpa >= 9 ? { label: 'Outstanding', color: 'text-emerald-500' }
    : cgpa >= 8 ? { label: 'Excellent', color: 'text-blue-500' }
    : cgpa >= 7 ? { label: 'Very Good', color: 'text-blue-400' }
    : cgpa >= 6 ? { label: 'Good', color: 'text-amber-500' }
    : cgpa >= 5 ? { label: 'Average', color: 'text-orange-500' }
    : { label: 'Needs Improvement', color: 'text-red-500' };

  const chartData = courseGrades.filter(c => c.gradesCount > 0).map(c => ({
    name: c.course_code,
    gpa: c.gradePoints,
    pct: c.avgPct,
    color: c.course_color,
  }));

  const radarData = courseGrades.filter(c => c.gradesCount > 0).map(c => ({
    subject: c.course_code,
    score: c.gradePoints,
    fullMark: 10,
  }));

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );

  if (courseGrades.length === 0) return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <EmptyState icon={<BookOpen size={32} />} title="No Enrolled Courses" description="Enroll in courses to see your academic performance here." />
    </div>
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Exam Portal</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Your cumulative academic performance</p>
      </motion.div>

      {/* CGPA Hero */}
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 p-8">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="text-center">
                <div className="relative">
                  <svg className="w-36 h-36" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#3B82F6" strokeWidth="10"
                      strokeDasharray={`${(cgpa / 10) * 314} 314`}
                      strokeLinecap="round" transform="rotate(-90 60 60)" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-white">{cgpa.toFixed(2)}</span>
                    <span className="text-xs text-zinc-400 font-medium">CGPA</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <p className={`text-2xl font-bold mb-1 ${cgpaGrade.color}`}>{cgpaGrade.label}</p>
                <p className="text-zinc-400 text-sm mb-4">Cumulative Grade Point Average</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-white">{gradedCourses.length}</p>
                    <p className="text-xs text-zinc-400">Courses Graded</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-white">{totalCredits}</p>
                    <p className="text-xs text-zinc-400">Total Credits</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-white">{Object.keys(bySemester).length}</p>
                    <p className="text-xs text-zinc-400">Semesters</p>
                  </div>
                </div>
              </div>
              {/* SGPA column */}
              <div className="flex flex-col gap-2 min-w-40">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">SGPA by Semester</p>
                {Object.entries(semesterGPA).map(([sem, sgpa]) => (
                  <div key={sem} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                    <span className="text-xs text-zinc-300 truncate max-w-24">{sem}</span>
                    <span className={`text-sm font-bold ${sgpa >= 7 ? 'text-emerald-400' : sgpa >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                      {sgpa.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Charts */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-5">
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart2 size={16} className="text-blue-500" /> Grade Points by Course
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any, n: any, p: any) => [`${v} pts (${p.payload.pct}%)`, 'Grade Points']}
                  />
                  <Bar dataKey="gpa" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
          {radarData.length >= 3 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="p-5">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <Star size={16} className="text-amber-500" /> Performance Radar
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(150,150,150,0.15)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#71717A' }} />
                    <Radar name="GPA" dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      {/* Course breakdown by semester */}
      {Object.entries(bySemester).map(([sem, courses], si) => (
        <motion.div key={sem} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + si * 0.05 }}>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="font-semibold text-zinc-900 dark:text-white">{sem}</h3>
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            <span className="text-sm font-bold text-blue-500">SGPA: {(semesterGPA[sem] || 0).toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {courses.map((cg, i) => {
              const { color } = getLetterAndPoints(cg.avgPct);
              return (
                <motion.div key={cg.course_id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                  <Card className="p-4 overflow-hidden">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: cg.course_color }}>
                        {cg.course_code?.substring(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-white text-sm truncate">{cg.course_name}</p>
                        <p className="text-xs text-zinc-400 font-mono">{cg.course_code} · {cg.credits} cr</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {cg.gradesCount > 0 ? (
                          <>
                            <p className={`text-xl font-black ${color}`}>{cg.letter}</p>
                            <p className="text-xs text-zinc-400">{cg.gradePoints}/10 GP</p>
                          </>
                        ) : (
                          <div className="flex items-center gap-1 text-zinc-400">
                            <AlertCircle size={13} />
                            <span className="text-xs">No grades</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {cg.gradesCount > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-zinc-400 mb-1">
                          <span>{cg.avgPct}% average</span>
                          <span>{cg.gradesCount} items</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${cg.avgPct}%` }}
                            transition={{ duration: 0.8, delay: i * 0.05 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: cg.course_color }}
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
};
