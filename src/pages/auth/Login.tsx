import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, BookOpen, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Invalid credentials');
    } else {
      toast.success('Welcome back!');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-950">
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-zinc-900 via-blue-950/30 to-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.1),transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <BookOpen size={20} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl">CampusPulse</span>
          </div>
          <div>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="text-5xl font-bold text-white leading-tight mb-4">
                Your campus,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">intelligently</span><br />
                connected.
              </h2>
              <p className="text-zinc-400 text-lg max-w-md">
                One unified platform for academics, events, communication, and everything campus life.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-12 grid grid-cols-3 gap-4">
              {[
                { label: 'Students', value: '12,000+' },
                { label: 'Courses', value: '850+' },
                { label: 'Daily Active', value: '6,500+' },
              ].map(stat => (
                <div key={stat.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-zinc-400 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-md w-full mx-auto flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <BookOpen size={16} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg">CampusPulse</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Sign in</h1>
            <p className="text-zinc-400">Welcome back to CampusPulse</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@university.edu"
              icon={<Mail size={16} />}
              required
            />
            <div className="relative">
              <Input
                label="Password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                icon={<Lock size={16} />}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-9 text-zinc-400 hover:text-zinc-300"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Sign In
            </Button>
          </form>

          <p className="text-center text-zinc-400 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">Create one</Link>
          </p>

          <div className="mt-8 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
            <p className="text-xs text-zinc-500 font-medium mb-3">Demo accounts — click to fill:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { role: 'Student', email: 'student@education.edu', pass: 'demo1234', color: 'text-blue-400' },
                { role: 'Faculty', email: 'faculty@education.edu', pass: 'demo1234', color: 'text-emerald-400' },
                { role: 'Admin', email: 'admin@education.edu', pass: 'demo1234', color: 'text-amber-400' },
                { role: 'Parent', email: 'parent@education.edu', pass: 'demo1234', color: 'text-rose-400' },
                { role: 'Security', email: 'security@education.edu', pass: 'demo1234', color: 'text-zinc-400' },
                { role: 'Student 2', email: 'student2@education.edu', pass: 'demo1234', color: 'text-cyan-400' },
              ].map(d => (
                <button
                  key={d.role}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword(d.pass); }}
                  className="text-left text-xs px-3 py-2 rounded-lg hover:bg-zinc-800 border border-zinc-800/50 hover:border-zinc-700 text-zinc-500 hover:text-zinc-200 transition-all"
                >
                  <span className={`font-semibold ${d.color}`}>{d.role}</span>
                  <br /><span className="text-zinc-600 text-[10px]">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
