import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, BookOpen, AlertCircle, Users, Calendar,
  Clock, CheckSquare, MessageSquare, CreditCard, Shield,
  BarChart3, LogOut, ChevronLeft, ChevronRight,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard', roles: ['student', 'faculty', 'admin', 'security', 'visitor'] },
  { to: '/courses', icon: <BookOpen size={18} />, label: 'Course Hub', roles: ['student', 'faculty', 'admin'] },
  { to: '/timetable', icon: <Clock size={18} />, label: 'Timetable', roles: ['student', 'faculty', 'admin'] },
  { to: '/attendance', icon: <CheckSquare size={18} />, label: 'Attendance', roles: ['student', 'faculty', 'admin'] },
  { to: '/issues', icon: <AlertCircle size={18} />, label: 'Issues', roles: ['student', 'faculty', 'admin', 'security'] },
  { to: '/clubs', icon: <Users size={18} />, label: 'Clubs', roles: ['student', 'faculty', 'admin'] },
  { to: '/events', icon: <Calendar size={18} />, label: 'Events', roles: ['student', 'faculty', 'admin'] },
  { to: '/payments', icon: <CreditCard size={18} />, label: 'Payments', roles: ['student', 'faculty', 'admin'] },
  { to: '/visitors', icon: <Shield size={18} />, label: 'Visitors', roles: ['security', 'admin', 'faculty'] },
  { to: '/feedback', icon: <MessageSquare size={18} />, label: 'Feedback', roles: ['student', 'faculty', 'admin'] },
  { to: '/parent', icon: <GraduationCap size={18} />, label: 'Parent Portal', roles: ['parent'] },
  { to: '/admin', icon: <BarChart3 size={18} />, label: 'Admin Panel', roles: ['admin'] },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const visibleItems = navItems.filter(item =>
    item.roles ? (profile && item.roles.includes(profile.role)) : true
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col h-screen bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/50 relative flex-shrink-0 overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-5 border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/25">
          <BookOpen size={18} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <p className="font-bold text-zinc-900 dark:text-white leading-none">CampusPulse</p>
              <p className="text-xs text-zinc-400 mt-0.5">Smart Campus Platform</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 rounded-xl bg-blue-50 dark:bg-blue-500/10"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex-shrink-0">{item.icon}</span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="relative z-10 text-sm font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-zinc-100 dark:border-zinc-800/50 p-3 space-y-1">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white ${isActive ? 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white' : ''}`
          }
        >
          <Avatar name={profile?.name} src={profile?.avatar_url} size="sm" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{profile?.name || 'User'}</p>
                <p className="text-xs text-zinc-400 capitalize">{profile?.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </NavLink>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-zinc-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium">
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3.5 top-[72px] w-7 h-7 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </motion.aside>
  );
};
