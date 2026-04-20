import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, AlertCircle, Calendar, Users, TrendingUp, Clock, CheckSquare, ArrowRight, Star } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Skeleton, CardSkeleton } from '../components/ui/Skeleton';
import { formatDate, formatDistanceToNow, getStatusColor } from '../lib/utils';
import type { Course, Assignment, Event, Issue } from '../types';

const activityData = [
  { day: 'Mon', tasks: 4, attendance: 90 },
  { day: 'Tue', tasks: 7, attendance: 85 },
  { day: 'Wed', tasks: 5, attendance: 95 },
  { day: 'Thu', tasks: 8, attendance: 88 },
  { day: 'Fri', tasks: 6, attendance: 92 },
  { day: 'Sat', tasks: 3, attendance: 70 },
  { day: 'Sun', tasks: 2, attendance: 60 },
];

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ courses: 0, issues: 0, events: 0, clubs: 0 });
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [recentIssues, setRecentIssues] = useState<Issue[]>([]);

  useEffect(() => {
    if (!profile) return;
    loadDashboard();
  }, [profile]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [coursesRes, issuesRes, eventsRes, assignmentsRes] = await Promise.all([
        supabase.from('courses').select('*, faculty:faculty_id(name, email)').limit(4),
        supabase.from('issues').select('*, reporter:reporter_id(name)').order('created_at', { ascending: false }).limit(3),
        supabase.from('events').select('*').gte('start_date', new Date().toISOString()).order('start_date').limit(3),
        supabase.from('assignments').select('*').order('due_date').limit(5),
      ]);

      if (coursesRes.data) setCourses(coursesRes.data);
      if (issuesRes.data) setRecentIssues(issuesRes.data);
      if (eventsRes.data) setUpcomingEvents(eventsRes.data);
      if (assignmentsRes.data) setAssignments(assignmentsRes.data);

      setStats({
        courses: coursesRes.data?.length || 0,
        issues: issuesRes.data?.length || 0,
        events: eventsRes.data?.length || 0,
        clubs: 5,
      });
    } finally {
      setLoading(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const isSecurity = profile?.role === 'security';
  const priorityBadge: Record<string, string> = { low: 'success', medium: 'warning', high: 'danger', critical: 'danger' };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {greeting()}, {profile?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-zinc-500 mt-0.5">
            Here's what's happening on campus today.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-3 py-2">
          <Star size={14} className="text-amber-500" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400 capitalize">{profile?.role}</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
        ) : isSecurity ? (
          <>
            <StatCard label="Visitors Today" value={stats.issues} icon={<Users size={20} />} color="blue" delay={0} />
            <StatCard label="Open Issues" value={stats.issues} icon={<AlertCircle size={20} />} color="rose" delay={0.05} />
            <StatCard label="Upcoming Events" value={stats.events} icon={<Calendar size={20} />} color="emerald" delay={0.1} />
            <StatCard label="Active Alerts" value={0} icon={<TrendingUp size={20} />} color="amber" delay={0.15} />
          </>
        ) : (
          <>
            <StatCard label="My Courses" value={stats.courses} icon={<BookOpen size={20} />} color="blue" trend={12} delay={0} />
            <StatCard label="Open Issues" value={stats.issues} icon={<AlertCircle size={20} />} color="rose" delay={0.05} />
            <StatCard label="Upcoming Events" value={stats.events} icon={<Calendar size={20} />} color="emerald" delay={0.1} />
            <StatCard label="Joined Clubs" value={stats.clubs} icon={<Users size={20} />} color="amber" delay={0.15} />
          </>
        )}
      </div>

      <div className={`grid gap-6 ${isSecurity ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'}`}>
        <Card className={`${isSecurity ? '' : 'lg:col-span-2'} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Weekly Activity</h3>
            <Badge variant="info">This Week</Badge>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#71717A' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#71717A' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.9)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: 12, fontSize: 12 }} />
              <Area type="monotone" dataKey="tasks" stroke="#3B82F6" fill="url(#colorTasks)" strokeWidth={2} name="Tasks" />
              <Area type="monotone" dataKey="attendance" stroke="#10B981" fill="url(#colorAttendance)" strokeWidth={2} name="Attendance %" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {!isSecurity && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white">Upcoming Deadlines</h3>
              <button onClick={() => navigate('/courses')} className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1">
                View all <ArrowRight size={12} />
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">{Array.from({length: 3}).map((_,i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : assignments.length === 0 ? (
              <div className="py-6 text-center text-zinc-400 text-sm">No upcoming deadlines</div>
            ) : (
              <div className="space-y-2">
                {assignments.slice(0, 4).map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <CheckSquare size={14} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{a.title}</p>
                      <p className="text-xs text-zinc-400">{a.due_date ? formatDate(a.due_date) : 'No deadline'}</p>
                    </div>
                    <Badge variant={a.type === 'exam' ? 'danger' : 'info'} size="sm">{a.type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {!isSecurity && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white">My Courses</h3>
              <button onClick={() => navigate('/courses')} className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1">
                View all <ArrowRight size={12} />
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">{Array.from({length: 3}).map((_,i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : courses.length === 0 ? (
              <div className="py-6 text-center text-zinc-400 text-sm">No courses enrolled</div>
            ) : (
              <div className="space-y-2">
                {courses.map(course => (
                  <motion.div
                    key={course.id}
                    whileHover={{ x: 2 }}
                    onClick={() => navigate(`/courses/${course.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: course.color || '#3B82F6' }}>
                      {course.code?.substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{course.name}</p>
                      <p className="text-xs text-zinc-400">{(course as any).faculty?.name || 'Faculty'} · {course.credits} credits</p>
                    </div>
                    <ArrowRight size={14} className="text-zinc-400" />
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        )}

        <Card className={`p-5 ${isSecurity ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Recent Issues</h3>
            <button onClick={() => navigate('/issues')} className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">{Array.from({length: 3}).map((_,i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
          ) : recentIssues.length === 0 ? (
            <div className="py-6 text-center text-zinc-400 text-sm">No issues reported</div>
          ) : (
            <div className="space-y-2">
              {recentIssues.map(issue => (
                <motion.div
                  key={issue.id}
                  whileHover={{ x: 2 }}
                  onClick={() => navigate('/issues')}
                  className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${issue.priority === 'critical' || issue.priority === 'high' ? 'bg-red-500' : issue.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{issue.title}</p>
                    <p className="text-xs text-zinc-400">{issue.category} · {formatDistanceToNow(issue.created_at)}</p>
                  </div>
                  <Badge variant={getStatusColor(issue.status) as any} size="sm">{issue.status.replace('_', ' ')}</Badge>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {upcomingEvents.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Upcoming Events</h3>
            <button onClick={() => navigate('/events')} className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {upcomingEvents.map(event => (
              <motion.div
                key={event.id}
                whileHover={{ y: -2 }}
                onClick={() => navigate('/events')}
                className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-500/10 dark:to-cyan-500/10 border border-blue-100 dark:border-blue-500/20 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="info" size="sm">{event.category}</Badge>
                  {event.is_paid && <Badge variant="warning" size="sm">₹{event.fee}</Badge>}
                </div>
                <p className="font-medium text-zinc-900 dark:text-white text-sm mt-2">{event.title}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
                  <Clock size={11} />
                  <span>{formatDate(event.start_date)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
