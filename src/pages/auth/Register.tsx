import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Hash, Building, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';

export const Register: React.FC = () => {
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'student', student_id: '', faculty_id: '', department: '',
  });
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (form.role === 'student' && !form.student_id) { toast.error('Student ID is required'); return; }
    if (form.role === 'faculty' && !form.faculty_id) { toast.error('Faculty ID is required'); return; }

    setLoading(true);
    const { error } = await signUp(form);
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Registration failed');
    } else {
      toast.success('Account created! Welcome to CampusPulse.');
      navigate('/dashboard');
    }
  };

  const roles = [
    { value: 'student', label: 'Student' },
    { value: 'faculty', label: 'Faculty' },
    { value: 'admin', label: 'Administrator' },
    { value: 'security', label: 'Security Staff' },
    { value: 'visitor', label: 'Visitor' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/25">
            <Zap size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-zinc-400">Join CampusPulse today</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" value={form.name} onChange={e => update('name', e.target.value)}
              placeholder="John Doe" icon={<User size={16} />} required />
            <Input label="Email Address" type="email" value={form.email}
              onChange={e => update('email', e.target.value)} placeholder="you@university.edu"
              icon={<Mail size={16} />} required />
            <Select label="Role" value={form.role} onChange={e => update('role', e.target.value)} options={roles} />

            {form.role === 'student' && (
              <Input label="Student ID" value={form.student_id}
                onChange={e => update('student_id', e.target.value)}
                placeholder="e.g., STU-2024-001" icon={<Hash size={16} />} required />
            )}
            {form.role === 'faculty' && (
              <Input label="Faculty ID" value={form.faculty_id}
                onChange={e => update('faculty_id', e.target.value)}
                placeholder="e.g., FAC-2024-001" icon={<Hash size={16} />} required />
            )}
            <Input label="Department" value={form.department}
              onChange={e => update('department', e.target.value)}
              placeholder="e.g., Computer Science" icon={<Building size={16} />} />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Password" type="password" value={form.password}
                onChange={e => update('password', e.target.value)}
                placeholder="Min. 6 characters" icon={<Lock size={16} />} required />
              <Input label="Confirm Password" type="password" value={form.confirmPassword}
                onChange={e => update('confirmPassword', e.target.value)}
                placeholder="Repeat password" icon={<Lock size={16} />} required />
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-zinc-400 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
};
