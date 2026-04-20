import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, AlertCircle, Calendar, TrendingUp, Activity, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { Skeleton } from '../components/ui/Skeleton';
import { Avatar } from '../components/ui/Avatar';
import { formatDistanceToNow } from '../lib/utils';
import type { Profile, Issue } from '../types';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6'];

export const Admin: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ students: 0, faculty: 0, courses: 0, issues: 0, events: 0, clubs: 0 });
  const [users, setUsers] = useState<Profile[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleData, setRoleData] = useState<{name: string; value: number}[]>([]);
  const [issueData, setIssueData] = useState<{category: string; count: number}[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [usersRes, coursesRes, issuesRes, eventsRes, clubsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('courses').select('count').single(),
      supabase.from('issues').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('events').select('count').single(),
      supabase.from('clubs').select('count').single(),
    ]);

    if (usersRes.data) {
      setUsers(usersRes.data);
      const roleCounts = usersRes.data.reduce((acc: Record<string, number>, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {});
      setRoleData(Object.entries(roleCounts).map(([name, value]) => ({ name, value })));
      setStats(s => ({
        ...s,
        students: usersRes.data.filter(u => u.role === 'student').length,
        faculty: usersRes.data.filter(u => u.role === 'faculty').length,
      }));
    }

    if (issuesRes.data) {
      setIssues(issuesRes.data);
      const catCounts = issuesRes.data.reduce((acc: Record<string, number>, i) => {
        acc[i.category] = (acc[i.category] || 0) + 1;
        return acc;
      }, {});
      setIssueData(Object.entries(catCounts).map(([category, count]) => ({ category, count })));
    }

    setStats(s => ({
      ...s,
      courses: (coursesRes.data as any)?.count || 0,
      issues: (issuesRes.data as any)?.length || 0,
      events: (eventsRes.data as any)?.count || 0,
      clubs: (clubsRes.data as any)?.count || 0,
    }));
    setLoading(false);
  };

  const activityData = [
    { day: 'Mon', users: 145, issues: 8 },
    { day: 'Tue', users: 210, issues: 12 },
    { day: 'Wed', users: 189, issues: 6 },
    { day: 'Thu', users: 230, issues: 15 },
    { day: 'Fri', users: 198, issues: 9 },
    { day: 'Sat', users: 87, issues: 3 },
    { day: 'Sun', users: 45, issues: 1 },
  ];

  if (profile?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-zinc-400">
          <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Access restricted to administrators</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Admin Dashboard</h2>
        <p className="text-sm text-zinc-500">Campus-wide analytics and management</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Students" value={stats.students} icon={<Users size={20} />} color="blue" trend={8} delay={0} />
          <StatCard label="Faculty" value={stats.faculty} icon={<Users size={20} />} color="emerald" trend={2} delay={0.05} />
          <StatCard label="Courses" value={stats.courses} icon={<BookOpen size={20} />} color="amber" delay={0.1} />
          <StatCard label="Open Issues" value={issues.filter(i => i.status === 'open').length} icon={<AlertCircle size={20} />} color="rose" delay={0.15} />
          <StatCard label="Events" value={stats.events} icon={<Calendar size={20} />} color="cyan" delay={0.2} />
          <StatCard label="Active Clubs" value={stats.clubs} icon={<Activity size={20} />} color="amber" delay={0.25} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Weekly Platform Activity</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#71717A' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#71717A' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.9)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="users" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Active Users" />
              <Bar dataKey="issues" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Issues" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">User Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={roleData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {roleData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgba(24,24,27,0.9)', border: '1px solid rgba(63,63,70,0.5)', borderRadius: 12, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Recent Users</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {users.slice(0, 10).map(u => (
              <div key={u.id} className="flex items-center gap-3 py-2">
                <Avatar name={u.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{u.name}</p>
                  <p className="text-xs text-zinc-400 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={u.role === 'admin' ? 'danger' : u.role === 'faculty' ? 'info' : 'default'} size="sm">{u.role}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Recent Issues</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {issues.map(issue => (
              <div key={issue.id} className="flex items-start gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${issue.priority === 'critical' || issue.priority === 'high' ? 'bg-red-500' : issue.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{issue.title}</p>
                  <p className="text-xs text-zinc-400">{issue.category} · {formatDistanceToNow(issue.created_at)}</p>
                </div>
                <Badge variant={issue.status === 'open' ? 'warning' : issue.status === 'resolved' ? 'success' : 'default'} size="sm">
                  {issue.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
