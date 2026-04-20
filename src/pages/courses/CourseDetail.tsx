import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Megaphone, FileText, FolderOpen, MessageSquare, BarChart2, Lock, LogIn, LogOut, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { CourseAnnouncements } from './tabs/CourseAnnouncements';
import { CourseAssignments } from './tabs/CourseAssignments';
import { CourseMaterials } from './tabs/CourseMaterials';
import { CourseChat } from './tabs/CourseChat';
import { CoursePerformance } from './tabs/CoursePerformance';
import { CoursePrivateChat } from './tabs/CoursePrivateChat';
import type { Course } from '../../types';

type Tab = 'announcements' | 'assignments' | 'materials' | 'chat' | 'performance' | 'private';

const tabs = [
  { id: 'announcements' as Tab, label: 'Announcements', icon: <Megaphone size={16} /> },
  { id: 'assignments' as Tab, label: 'Assignments', icon: <FileText size={16} /> },
  { id: 'materials' as Tab, label: 'Materials', icon: <FolderOpen size={16} /> },
  { id: 'chat' as Tab, label: 'Class Chat', icon: <MessageSquare size={16} /> },
  { id: 'private' as Tab, label: 'Ask Faculty', icon: <Lock size={16} /> },
  { id: 'performance' as Tab, label: 'Performance', icon: <BarChart2 size={16} /> },
];

export const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('announcements');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  const isStudent = profile?.role === 'student';
  const canViewAll = profile?.role === 'faculty' || profile?.role === 'admin';

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const [courseRes, enrollRes] = await Promise.all([
        supabase.from('courses').select('*, faculty:faculty_id(name, email, department)').eq('id', id).maybeSingle(),
        isStudent && profile
          ? supabase.from('course_enrollments').select('course_id').eq('course_id', id).eq('student_id', profile.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (courseRes.data) setCourse(courseRes.data);
      setEnrolled(!!enrollRes.data);
      setLoading(false);
    };
    load();
  }, [id, profile, isStudent]);

  const handleEnroll = async () => {
    if (!profile || !id) return;
    setEnrolling(true);
    const { error } = await supabase.from('course_enrollments').insert({ course_id: id, student_id: profile.id });
    setEnrolling(false);
    if (error) { toast.error('Failed to enroll'); return; }
    setEnrolled(true);
    toast.success('You are now enrolled!');
  };

  const handleUnenroll = async () => {
    if (!profile || !id) return;
    setEnrolling(true);
    const { error } = await supabase.from('course_enrollments').delete().eq('course_id', id).eq('student_id', profile.id);
    setEnrolling(false);
    if (error) { toast.error('Failed to unenroll'); return; }
    setEnrolled(false);
    toast.success('Unenrolled from course');
  };

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );

  if (!course) return (
    <div className="p-6 text-center text-zinc-500">Course not found</div>
  );

  const showContent = canViewAll || enrolled;

  return (
    <div className="flex flex-col h-full">
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${course.color}20, ${course.color}05)` }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle at 80% 50%, ${course.color}, transparent 50%)` }} />
        <div className="relative px-6 py-6">
          <button onClick={() => navigate('/courses')}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-sm mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Course Hub
          </button>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg flex-shrink-0"
                style={{ backgroundColor: course.color || '#3B82F6' }}>
                {course.code?.substring(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-zinc-400">{course.code}</span>
                  <span className="text-zinc-300 dark:text-zinc-600">·</span>
                  <span className="text-xs text-zinc-400">{course.credits} credits</span>
                  {course.semester && <>
                    <span className="text-zinc-300 dark:text-zinc-600">·</span>
                    <span className="text-xs text-zinc-400">{course.semester}</span>
                  </>}
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{course.name}</h1>
                <p className="text-sm text-zinc-500 mt-1">
                  {(course as any).faculty?.name || 'Faculty'} · {(course as any).faculty?.department || 'Department'}
                </p>
              </div>
            </div>
            {isStudent && (
              enrolled ? (
                <button
                  onClick={handleUnenroll}
                  disabled={enrolling}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <LogOut size={15} />
                  {enrolling ? 'Leaving...' : 'Unenroll'}
                </button>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <LogIn size={15} />
                  {enrolling ? 'Enrolling...' : 'Enroll Now'}
                </button>
              )
            )}
          </div>
        </div>

        {showContent && (
          <div className="px-6 border-b border-zinc-200 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
            <div className="flex gap-0">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}>
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showContent ? (
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {activeTab === 'announcements' && <CourseAnnouncements courseId={id!} />}
              {activeTab === 'assignments' && <CourseAssignments courseId={id!} />}
              {activeTab === 'materials' && <CourseMaterials courseId={id!} />}
              {activeTab === 'chat' && <CourseChat courseId={id!} />}
              {activeTab === 'private' && <CoursePrivateChat courseId={id!} facultyId={(course as any).faculty_id || ''} facultyName={(course as any).faculty?.name || 'Faculty'} />}
              {activeTab === 'performance' && <CoursePerformance courseId={id!} />}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md"
          >
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 text-white font-bold text-3xl shadow-xl"
              style={{ backgroundColor: course.color || '#3B82F6' }}>
              {course.code?.substring(0, 2)}
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">{course.name}</h2>
            <p className="text-zinc-500 text-sm mb-1">{course.description || 'No description provided'}</p>
            <p className="text-zinc-400 text-xs mb-8">
              {(course as any).faculty?.name || 'Faculty'} · {course.credits} credits
              {course.semester ? ` · ${course.semester}` : ''}
            </p>
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 mb-6">
              <div className="flex items-center justify-center gap-2 text-zinc-500 mb-3">
                <Lock size={16} />
                <span className="text-sm font-medium">Enrollment required to access course content</span>
              </div>
              <p className="text-xs text-zinc-400">Enroll to view announcements, assignments, materials, class chat, and your performance.</p>
            </div>
            <Button
              onClick={handleEnroll}
              loading={enrolling}
              icon={<LogIn size={16} />}
              size="lg"
              className="w-full"
            >
              Enroll in {course.name}
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
