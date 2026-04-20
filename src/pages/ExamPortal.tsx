import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, TrendingUp, BookOpen, BarChart2, Star, AlertCircle, Users, ChevronDown, ChevronUp, CheckCircle2, CreditCard as Edit2, Save, X } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';

/* ─────────────────────────── helpers ─────────────────────────── */
const getLetterAndPoints = (pct: number) => {
  if (pct >= 90) return { letter: 'A+', points: 10, color: 'text-emerald-500' };
  if (pct >= 80) return { letter: 'A',  points: 9,  color: 'text-emerald-500' };
  if (pct >= 70) return { letter: 'B+', points: 8,  color: 'text-blue-500'   };
  if (pct >= 60) return { letter: 'B',  points: 7,  color: 'text-blue-400'   };
  if (pct >= 50) return { letter: 'C',  points: 6,  color: 'text-amber-500'  };
  if (pct >= 40) return { letter: 'D',  points: 5,  color: 'text-orange-500' };
  return           { letter: 'F',  points: 0,  color: 'text-red-500'    };
};

/* ═══════════════════════ STUDENT VIEW ═══════════════════════ */
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

const StudentExamPortal: React.FC = () => {
  const { profile } = useAuth();
  const [courseGrades, setCourseGrades] = useState<CourseGrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (profile) loadGrades(); }, [profile]);

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

      const avgPct = grades && grades.length > 0
        ? grades.reduce((s: number, g: any) => s + (g.marks / g.max_marks) * 100, 0) / grades.length
        : 0;
      const { letter, points } = getLetterAndPoints(avgPct);
      results.push({
        course_id: course.id, course_name: course.name, course_code: course.code,
        course_color: course.color || '#3B82F6', credits: course.credits || 3,
        semester: course.semester || 'Current', avgPct: Math.round(avgPct),
        gradePoints: points, letter: grades?.length ? letter : 'N/A', gradesCount: grades?.length || 0,
      });
    }));

    setCourseGrades(results.sort((a, b) => b.avgPct - a.avgPct));
    setLoading(false);
  };

  const bySemester: Record<string, CourseGrade[]> = {};
  courseGrades.forEach(cg => {
    const sem = cg.semester || 'Current';
    if (!bySemester[sem]) bySemester[sem] = [];
    bySemester[sem].push(cg);
  });

  const semesterGPA: Record<string, number> = {};
  Object.entries(bySemester).forEach(([sem, courses]) => {
    const graded = courses.filter(c => c.gradesCount > 0);
    const totalCr = graded.reduce((s, c) => s + c.credits, 0);
    semesterGPA[sem] = totalCr > 0
      ? Math.round((graded.reduce((s, c) => s + c.gradePoints * c.credits, 0) / totalCr) * 100) / 100
      : 0;
  });

  const gradedCourses = courseGrades.filter(c => c.gradesCount > 0);
  const totalCredits = gradedCourses.reduce((s, c) => s + c.credits, 0);
  const cgpa = totalCredits > 0
    ? Math.round((gradedCourses.reduce((s, c) => s + c.gradePoints * c.credits, 0) / totalCredits) * 100) / 100
    : 0;

  const cgpaLabel = cgpa >= 9 ? 'Outstanding' : cgpa >= 8 ? 'Excellent' : cgpa >= 7 ? 'Very Good'
    : cgpa >= 6 ? 'Good' : cgpa >= 5 ? 'Average' : 'Needs Improvement';
  const cgpaColor = cgpa >= 8 ? 'text-emerald-500' : cgpa >= 6 ? 'text-blue-500'
    : cgpa >= 5 ? 'text-amber-500' : 'text-red-500';

  const chartData = gradedCourses.map(c => ({ name: c.course_code, gpa: c.gradePoints, pct: c.avgPct, color: c.course_color }));
  const radarData = gradedCourses.map(c => ({ subject: c.course_code, score: c.gradePoints, fullMark: 10 }));

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i=><Skeleton key={i} className="h-28 rounded-2xl"/>)}</div>
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
                      strokeDasharray={`${(cgpa / 10) * 314} 314`} strokeLinecap="round" transform="rotate(-90 60 60)" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-white">{cgpa.toFixed(2)}</span>
                    <span className="text-xs text-zinc-400 font-medium">CGPA</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <p className={`text-2xl font-bold mb-1 ${cgpaColor}`}>{cgpaLabel}</p>
                <p className="text-zinc-400 text-sm mb-4">Cumulative Grade Point Average</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-white">{gradedCourses.length}</p>
                    <p className="text-xs text-zinc-400">Graded</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-white">{totalCredits}</p>
                    <p className="text-xs text-zinc-400">Credits</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-xl font-bold text-white">{Object.keys(bySemester).length}</p>
                    <p className="text-xs text-zinc-400">Semesters</p>
                  </div>
                </div>
              </div>
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
                  <YAxis domain={[0, 10]} ticks={[0,2,4,6,8,10]} tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any, _: any, p: any) => [`${v} pts (${p.payload.pct}%)`, 'Grade Points']} />
                  <Bar dataKey="gpa" fill="#3B82F6" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
          {radarData.length >= 3 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="p-5">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <Star size={16} className="text-amber-500" /> Radar
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
                  <Card className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: cg.course_color }}>{cg.course_code?.substring(0, 2)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-white text-sm truncate">{cg.course_name}</p>
                        <p className="text-xs text-zinc-400 font-mono">{cg.course_code} · {cg.credits} cr</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {cg.gradesCount > 0
                          ? <><p className={`text-xl font-black ${color}`}>{cg.letter}</p><p className="text-xs text-zinc-400">{cg.gradePoints}/10 GP</p></>
                          : <div className="flex items-center gap-1 text-zinc-400"><AlertCircle size={13}/><span className="text-xs">No grades</span></div>}
                      </div>
                    </div>
                    {cg.gradesCount > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-zinc-400 mb-1">
                          <span>{cg.avgPct}% avg</span><span>{cg.gradesCount} items</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${cg.avgPct}%` }} transition={{ duration: 0.8, delay: i * 0.05 }}
                            className="h-full rounded-full" style={{ backgroundColor: cg.course_color }} />
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

/* ═══════════════════════ FACULTY VIEW ═══════════════════════ */
interface FacultyCourse {
  id: string; name: string; code: string; color: string; credits: number; semester: string;
}

interface StudentGPARow {
  student_id: string; name: string; sid: string; department: string;
  assignments: { id: string; title: string; marks: number; max_marks: number; grade_points: number; graded: boolean }[];
  avgPct: number; cgpa: number; letter: string; letterColor: string;
}

const GP_OPTIONS = [
  { label: 'A+ (10)', value: 10 }, { label: 'A (9)',  value: 9  },
  { label: 'B+ (8)', value: 8  }, { label: 'B (7)',  value: 7  },
  { label: 'C (6)',  value: 6  }, { label: 'D (5)',  value: 5  },
  { label: 'F (0)',  value: 0  },
];

const FacultyExamPortal: React.FC = () => {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<FacultyCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<FacultyCourse | null>(null);
  const [students, setStudents] = useState<StudentGPARow[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ studentId: string; assignmentId: string } | null>(null);
  const [editGP, setEditGP] = useState<number>(0);
  const [savingCell, setSavingCell] = useState(false);

  useEffect(() => { if (profile) loadCourses(); }, [profile]);

  const loadCourses = async () => {
    const isAdmin = profile!.role === 'admin';
    const query = supabase.from('courses').select('id, name, code, color, credits, semester');
    const { data } = isAdmin ? await query : await query.eq('faculty_id', profile!.id);
    if (data) { setCourses(data); if (data.length > 0) selectCourse(data[0]); }
    setLoading(false);
  };

  const selectCourse = async (course: FacultyCourse) => {
    setSelectedCourse(course);
    setExpandedStudent(null);
    setEditingCell(null);
    setLoadingStudents(true);

    const [enrollRes, assignRes, gradesRes] = await Promise.all([
      supabase.from('course_enrollments').select('*, student:student_id(id, name, student_id, department)').eq('course_id', course.id),
      supabase.from('assignments').select('id, title, max_marks').eq('course_id', course.id).order('due_date'),
      supabase.from('grades').select('student_id, assignment_id, marks, max_marks, grade_points').eq('course_id', course.id),
    ]);

    const asgns = assignRes.data || [];
    setAssignments(asgns);

    const gradeMap: Record<string, Record<string, { marks: number; max_marks: number; grade_points: number }>> = {};
    (gradesRes.data || []).forEach((g: any) => {
      if (!gradeMap[g.student_id]) gradeMap[g.student_id] = {};
      gradeMap[g.student_id][g.assignment_id] = { marks: g.marks, max_marks: g.max_marks, grade_points: g.grade_points };
    });

    const rows: StudentGPARow[] = (enrollRes.data || []).map((e: any) => {
      const s = e.student;
      const aRows = asgns.map((a: any) => {
        const g = gradeMap[s.id]?.[a.id];
        return {
          id: a.id, title: a.title, max_marks: a.max_marks,
          marks: g?.marks ?? 0, grade_points: g?.grade_points ?? 0, graded: !!g,
        };
      });
      const graded = aRows.filter(a => a.graded);
      const avgPct = graded.length > 0
        ? graded.reduce((s, a) => s + (a.marks / a.max_marks) * 100, 0) / graded.length
        : 0;
      const totalCr = graded.length > 0 ? course.credits : 0;
      const totalGP = graded.length > 0
        ? graded.reduce((s, a) => s + a.grade_points, 0) / graded.length
        : 0;
      const { letter, color } = getLetterAndPoints(avgPct);
      return {
        student_id: s.id, name: s.name, sid: s.student_id || '', department: s.department || '',
        assignments: aRows, avgPct: Math.round(avgPct),
        cgpa: graded.length > 0 ? Math.round(totalGP * 100) / 100 : 0,
        letter: graded.length > 0 ? letter : '—',
        letterColor: graded.length > 0 ? color : 'text-zinc-400',
      };
    }).sort((a, b) => b.cgpa - a.cgpa);

    setStudents(rows);
    setLoadingStudents(false);
  };

  const startEdit = (studentId: string, assignmentId: string, currentGP: number) => {
    setEditingCell({ studentId, assignmentId });
    setEditGP(currentGP || 0);
  };

  const saveGradePoints = async () => {
    if (!editingCell || !selectedCourse || !profile) return;
    setSavingCell(true);

    const student = students.find(s => s.student_id === editingCell.studentId);
    const assignment = assignments.find(a => a.id === editingCell.assignmentId);
    if (!student || !assignment) { setSavingCell(false); return; }

    // Compute marks from GP → pct → marks
    const pct = editGP >= 10 ? 95 : editGP >= 9 ? 85 : editGP >= 8 ? 75 : editGP >= 7 ? 65
      : editGP >= 6 ? 55 : editGP >= 5 ? 45 : 0;
    const marks = Math.round((pct / 100) * assignment.max_marks);

    const { error } = await supabase.from('grades').upsert({
      course_id: selectedCourse.id,
      student_id: editingCell.studentId,
      assignment_id: editingCell.assignmentId,
      marks,
      max_marks: assignment.max_marks,
      grade_points: editGP,
      feedback: '',
      graded_by: profile.id,
      graded_at: new Date().toISOString(),
    }, { onConflict: 'course_id,student_id,assignment_id' });

    setSavingCell(false);
    if (error) { toast.error('Failed to save'); return; }
    toast.success('Grade points saved');
    setEditingCell(null);
    selectCourse(selectedCourse);
  };

  const classAvgGPA = students.filter(s => s.cgpa > 0).length > 0
    ? (students.filter(s => s.cgpa > 0).reduce((s, st) => s + st.cgpa, 0) / students.filter(s => s.cgpa > 0).length).toFixed(2)
    : '—';

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-16 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );

  if (courses.length === 0) return (
    <div className="p-6 flex items-center justify-center min-h-96">
      <EmptyState icon={<BookOpen size={32} />} title="No Courses" description="You have not created any courses yet." />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Exam Portal</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Review student grades and assign grade points per course</p>
      </motion.div>

      {/* Course selector */}
      <div className="flex gap-2 flex-wrap">
        {courses.map(c => (
          <button key={c.id} onClick={() => selectCourse(c)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedCourse?.id === c.id
                ? 'text-white shadow-md'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            style={selectedCourse?.id === c.id ? { backgroundColor: c.color } : {}}>
            <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: c.color }} />
            {c.code} — {c.name}
          </button>
        ))}
      </div>

      {selectedCourse && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Students', value: students.length, color: 'text-blue-500' },
              { label: 'Assignments', value: assignments.length, color: 'text-zinc-900 dark:text-white' },
              { label: 'Class Avg GPA', value: classAvgGPA, color: 'text-emerald-500' },
              { label: 'Credits', value: selectedCourse.credits, color: 'text-amber-500' },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-4 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Student GPA table */}
          {loadingStudents ? (
            <div className="space-y-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-14 rounded-xl"/>)}</div>
          ) : students.length === 0 ? (
            <EmptyState icon={<Users size={28} />} title="No students enrolled" />
          ) : (
            <Card className="overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Award size={16} className="text-amber-500" /> Student Grade Points — {selectedCourse.code}
                </h3>
                <span className="text-xs text-zinc-400">{students.length} students · {assignments.length} assignments</span>
              </div>

              {/* Column headers */}
              {assignments.length > 0 && (
                <div className="px-5 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 flex-shrink-0" />
                    <div className="w-48 flex-shrink-0" />
                    <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${assignments.length}, minmax(0,1fr))` }}>
                      {assignments.map((a: any) => (
                        <div key={a.id} className="text-center">
                          <p className="text-xs font-semibold text-zinc-500 truncate" title={a.title}>{a.title.substring(0, 10)}</p>
                          <p className="text-xs text-zinc-400">{a.max_marks}m</p>
                        </div>
                      ))}
                    </div>
                    <div className="w-28 flex-shrink-0 text-center">
                      <p className="text-xs font-semibold text-zinc-500">Avg GPA</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                <AnimatePresence>
                  {students.map((s, i) => (
                    <motion.div key={s.student_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                      {/* Main row */}
                      <div className={`px-5 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer ${expandedStudent === s.student_id ? 'bg-zinc-50 dark:bg-zinc-800/30' : ''}`}
                        onClick={() => setExpandedStudent(p => p === s.student_id ? null : s.student_id)}>
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="w-48 flex-shrink-0 flex items-center gap-2">
                          <Avatar name={s.name} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{s.name}</p>
                            <p className="text-xs text-zinc-400">{s.sid}</p>
                          </div>
                        </div>
                        {assignments.length > 0 && (
                          <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${assignments.length}, minmax(0,1fr))` }}>
                            {s.assignments.map(a => (
                              <div key={a.id} className="text-center">
                                {a.graded ? (
                                  <div>
                                    <p className={`text-sm font-bold ${getLetterAndPoints(a.grade_points * 10).color}`}>{a.grade_points}</p>
                                    <p className="text-xs text-zinc-400">{a.marks}/{a.max_marks}</p>
                                  </div>
                                ) : (
                                  <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="w-28 flex-shrink-0 flex items-center justify-between">
                          <div className="text-center flex-1">
                            <p className={`text-lg font-black ${s.letterColor}`}>{s.letter}</p>
                            <p className="text-xs text-zinc-400">{s.cgpa > 0 ? `${s.cgpa} GPA` : 'No data'}</p>
                          </div>
                          {expandedStudent === s.student_id
                            ? <ChevronUp size={14} className="text-zinc-400 flex-shrink-0" />
                            : <ChevronDown size={14} className="text-zinc-400 flex-shrink-0" />}
                        </div>
                      </div>

                      {/* Expanded: grade each assignment */}
                      <AnimatePresence>
                        {expandedStudent === s.student_id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                            className="overflow-hidden">
                            <div className="px-5 pb-4 pt-2 bg-blue-50/40 dark:bg-blue-500/5 border-t border-zinc-100 dark:border-zinc-800">
                              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
                                Assign Grade Points for {s.name}
                              </p>
                              {assignments.length === 0 ? (
                                <p className="text-sm text-zinc-400">No assignments in this course yet</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {s.assignments.map(a => {
                                    const isEditing = editingCell?.studentId === s.student_id && editingCell?.assignmentId === a.id;
                                    const gInfo = a.graded ? getLetterAndPoints(a.grade_points * 10) : null;
                                    return (
                                      <div key={a.id} className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700">
                                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 truncate">{a.title}</p>
                                        {isEditing ? (
                                          <div className="space-y-2">
                                            <select
                                              value={editGP}
                                              onChange={e => setEditGP(Number(e.target.value))}
                                              className="w-full px-2 py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                              {GP_OPTIONS.map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                              ))}
                                            </select>
                                            <div className="flex gap-1">
                                              <button onClick={saveGradePoints} disabled={savingCell}
                                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                                <Save size={12} /> {savingCell ? '...' : 'Save'}
                                              </button>
                                              <button onClick={() => setEditingCell(null)}
                                                className="px-2 py-1.5 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 transition-colors">
                                                <X size={12} />
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-between">
                                            <div>
                                              {a.graded ? (
                                                <>
                                                  <span className={`text-xl font-black ${gInfo?.color}`}>{a.grade_points}</span>
                                                  <span className="text-xs text-zinc-400 ml-1">/ 10 GP</span>
                                                  <p className="text-xs text-zinc-400">{a.marks}/{a.max_marks} marks</p>
                                                </>
                                              ) : (
                                                <span className="text-sm text-zinc-400">Not graded</span>
                                              )}
                                            </div>
                                            <button
                                              onClick={e => { e.stopPropagation(); startEdit(s.student_id, a.id, a.grade_points); }}
                                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                                              <Edit2 size={11} /> {a.graded ? 'Edit' : 'Assign'}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {/* Overall summary for this student */}
                              <div className="mt-3 flex items-center gap-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 size={14} className="text-emerald-500" />
                                  <span className="text-xs text-zinc-500">Avg GPA for this course:</span>
                                  <span className={`text-sm font-bold ${s.letterColor}`}>
                                    {s.cgpa > 0 ? `${s.cgpa} (${s.letter})` : 'No grades yet'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 ml-auto">
                                  <span className="text-xs text-zinc-400">{s.assignments.filter(a => a.graded).length}/{assignments.length} graded</span>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </Card>
          )}

          {/* Class GPA bar chart */}
          {students.filter(s => s.cgpa > 0).length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="p-5">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-500" /> Class GPA Distribution
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={students.filter(s => s.cgpa > 0).map(s => ({ name: s.name.split(' ')[0], gpa: s.cgpa }))} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.08)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} ticks={[0,2,4,6,8,10]} tick={{ fontSize: 11, fill: '#71717A' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.95)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: 10, fontSize: 12 }} />
                    <Bar dataKey="gpa" fill="#10B981" radius={[6,6,0,0]} name="GPA" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
};

/* ═══════════════════════ ROOT EXPORT ═══════════════════════ */
export const ExamPortal: React.FC = () => {
  const { profile } = useAuth();
  const isFaculty = profile?.role === 'faculty' || profile?.role === 'admin';
  return isFaculty ? <FacultyExamPortal /> : <StudentExamPortal />;
};
