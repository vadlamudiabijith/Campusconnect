import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Megaphone, FileText, FolderOpen, MessageSquare, BarChart2, Lock } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<Tab>('announcements');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from('courses').select('*, faculty:faculty_id(name, email, department)').eq('id', id).maybeSingle()
      .then(({ data }) => { if (data) setCourse(data); setLoading(false); });
  }, [id]);

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

  return (
    <div className="flex flex-col h-full">
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${course.color}20, ${course.color}05)` }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle at 80% 50%, ${course.color}, transparent 50%)` }} />
        <div className="relative px-6 py-6">
          <button onClick={() => navigate('/courses')}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-sm mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Course Hub
          </button>
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
        </div>
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
      </div>

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
    </div>
  );
};
