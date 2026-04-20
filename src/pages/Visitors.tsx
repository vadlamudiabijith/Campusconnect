import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, QrCode, CheckCircle2, Clock, Shield, LogIn, LogOut } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate, formatTime } from '../lib/utils';
import type { Visitor } from '../types';

export const Visitors: React.FC = () => {
  const { profile } = useAuth();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showQR, setShowQR] = useState<Visitor | null>(null);
  const [scanCode, setScanCode] = useState('');
  const [showScan, setShowScan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', purpose: '', host_name: '' });

  const load = async () => {
    const { data } = await supabase.from('visitors').select('*, host:host_id(name)')
      .order('created_at', { ascending: false });
    if (data) setVisitors(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile]);

  const generateQR = (id: string) => `CP-VIS-${id.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const qr = generateQR(Math.random().toString());
    const { data, error } = await supabase.from('visitors').insert({
      ...form, host_id: profile.id, qr_code: qr, status: 'pending',
    }).select().single();
    setSaving(false);
    if (error) { toast.error('Failed to register visitor'); return; }
    toast.success('Visitor registered!');
    setShowForm(false);
    setForm({ name: '', email: '', phone: '', purpose: '', host_name: '' });
    load();
    if (data) setShowQR(data);
  };

  const handleScan = async () => {
    const visitor = visitors.find(v => v.qr_code === scanCode.trim());
    if (!visitor) { toast.error('Invalid QR code'); return; }
    const now = new Date().toISOString();
    if (visitor.status === 'pending') {
      await supabase.from('visitors').update({ status: 'checked_in', check_in: now }).eq('id', visitor.id);
      toast.success(`${visitor.name} checked in!`);
    } else if (visitor.status === 'checked_in') {
      await supabase.from('visitors').update({ status: 'checked_out', check_out: now }).eq('id', visitor.id);
      toast.success(`${visitor.name} checked out!`);
    }
    setScanCode('');
    setShowScan(false);
    load();
  };

  const filtered = visitors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.purpose.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor: Record<string, any> = { pending: 'warning', checked_in: 'success', checked_out: 'default', expired: 'danger' };
  const statusIcon: Record<string, React.ReactNode> = {
    pending: <Clock size={14} />,
    checked_in: <LogIn size={14} />,
    checked_out: <LogOut size={14} />,
    expired: <Shield size={14} />,
  };

  const canScan = profile?.role === 'security' || profile?.role === 'admin';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Visitor Management</h2>
          <p className="text-sm text-zinc-500">{visitors.filter(v => v.status === 'checked_in').length} currently on campus</p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Search visitors..." value={search} onChange={e => setSearch(e.target.value)}
            icon={<Search size={16} />} className="w-48" />
          {canScan && <Button icon={<QrCode size={16} />} variant="outline" onClick={() => setShowScan(true)}>Scan QR</Button>}
          <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>Register Visitor</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Pending', status: 'pending', color: 'amber' },
          { label: 'On Campus', status: 'checked_in', color: 'emerald' },
          { label: 'Checked Out', status: 'checked_out', color: 'zinc' },
          { label: 'Total Today', status: 'all', color: 'blue' },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">
              {s.status === 'all' ? visitors.filter(v => v.created_at >= new Date().toISOString().split('T')[0]).length : visitors.filter(v => v.status === s.status).length}
            </p>
            <p className="text-sm text-zinc-500">{s.label}</p>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Shield size={28} />} title="No visitors"
          action={<Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>Register Visitor</Button>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((v, idx) => (
              <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold">
                    {v.name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-white">{v.name}</p>
                    <p className="text-xs text-zinc-400">{v.purpose} · Host: {(v as any).host?.name || v.host_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {v.check_in && <span className="text-xs text-zinc-400">In: {formatTime(v.check_in)}</span>}
                  {v.check_out && <span className="text-xs text-zinc-400">Out: {formatTime(v.check_out)}</span>}
                  <Badge variant={statusColor[v.status]}>{v.status.replace('_', ' ')}</Badge>
                  <Button size="sm" variant="ghost" icon={<QrCode size={14} />} onClick={() => setShowQR(v)}>QR</Button>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Register Visitor">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Visitor Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            <Input label="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <Textarea label="Purpose of Visit" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} rows={2} required />
          <Input label="Host Name" value={form.host_name} onChange={e => setForm(f => ({ ...f, host_name: e.target.value }))} placeholder="Person being visited" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Register & Generate QR</Button>
          </div>
        </form>
      </Modal>

      {showQR && (
        <Modal isOpen={true} onClose={() => setShowQR(null)} title="Visitor QR Code">
          <div className="text-center space-y-4">
            <div className="w-48 h-48 mx-auto bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 border-dashed border-zinc-300 dark:border-zinc-700">
              <QrCode size={64} className="text-zinc-400" />
              <p className="text-xs font-mono text-zinc-500 px-3 text-center break-all">{showQR.qr_code}</p>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-white">{showQR.name}</p>
              <p className="text-sm text-zinc-500">{showQR.purpose}</p>
              <Badge variant={statusColor[showQR.status]} className="mt-2">{showQR.status}</Badge>
            </div>
            <p className="text-xs text-zinc-400">Security can scan this code to check-in/check-out the visitor</p>
          </div>
        </Modal>
      )}

      {showScan && (
        <Modal isOpen={true} onClose={() => setShowScan(false)} title="Scan Visitor QR">
          <div className="space-y-4">
            <div className="flex items-center justify-center h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              <QrCode size={48} className="text-zinc-300" />
            </div>
            <Input label="Enter QR Code" value={scanCode} onChange={e => setScanCode(e.target.value)}
              placeholder="CP-VIS-XXXXXXXX-XXXXXX" />
            <Button className="w-full" onClick={handleScan} disabled={!scanCode.trim()}>Process Entry/Exit</Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
