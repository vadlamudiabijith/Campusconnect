import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Plus, CheckCircle2, Clock, Users, RefreshCw, Lock, UserCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Avatar } from '../../../components/ui/Avatar';
import { formatDate } from '../../../lib/utils';

interface Props {
  clubId: string;
  isMember: boolean;
  memberRole: string;
}

const generateQR = () => 'CA-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

export const ClubAttendance: React.FC<Props> = ({ clubId, isMember, memberRole }) => {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showQR, setShowQR] = useState<any>(null);
  const [showScan, setShowScan] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [creating, setCreating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [records, setRecords] = useState<Record<string, any[]>>({});
  const [myAttendedSessions, setMyAttendedSessions] = useState<Set<string>>(new Set());

  const isAdmin = profile?.role === 'admin' || memberRole === 'president' || memberRole === 'officer';

  const load = async () => {
    const { data } = await supabase
      .from('club_attendance')
      .select('*, creator:created_by(name)')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });
    if (data) setSessions(data);

    if (profile) {
      const { data: myRecords } = await supabase
        .from('club_attendance_records')
        .select('session_id')
        .eq('user_id', profile.id);
      if (myRecords) setMyAttendedSessions(new Set(myRecords.map((r: any) => r.session_id)));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [clubId, profile]);

  const loadRecords = async (sessionId: string) => {
    if (records[sessionId]) return;
    const { data } = await supabase
      .from('club_attendance_records')
      .select('*, user:user_id(name, avatar_url)')
      .eq('session_id', sessionId);
    if (data) setRecords(r => ({ ...r, [sessionId]: data }));
  };

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setCreating(true);
    const qr = generateQR();
    const { error } = await supabase.from('club_attendance').insert({
      club_id: clubId,
      session_name: sessionName || `Session – ${formatDate(new Date().toISOString())}`,
      qr_code: qr,
      created_by: profile.id,
      is_active: true,
    });
    setCreating(false);
    if (error) { toast.error('Failed to create session'); return; }
    toast.success('Attendance session created!');
    setShowCreate(false);
    setSessionName('');
    load();
  };

  const handleScan = async () => {
    if (!profile) return;
    setScanning(true);
    const session = sessions.find(s => s.qr_code === scanCode.trim());
    if (!session) {
      toast.error('Invalid QR code');
      setScanning(false);
      return;
    }
    if (!session.is_active) {
      toast.error('This session is no longer active');
      setScanning(false);
      return;
    }
    if (myAttendedSessions.has(session.id)) {
      toast('You already marked attendance for this session');
      setScanning(false);
      return;
    }
    const { error } = await supabase.from('club_attendance_records').insert({
      session_id: session.id,
      user_id: profile.id,
    });
    setScanning(false);
    if (error) { toast.error('Failed to mark attendance'); return; }
    toast.success('Attendance marked successfully!');
    setScanCode('');
    setShowScan(false);
    load();
  };

  const toggleSession = async (session: any) => {
    await supabase.from('club_attendance').update({ is_active: !session.is_active }).eq('id', session.id);
    load();
  };

  if (!isMember) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Lock size={32} className="text-zinc-400" />
        <p className="text-zinc-500">Join the club to view and mark attendance</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">Club Attendance</h3>
          <p className="text-sm text-zinc-500">{sessions.length} sessions · {myAttendedSessions.size} attended</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" icon={<QrCode size={14} />} onClick={() => setShowScan(true)}>
            Scan QR
          </Button>
          {isAdmin && (
            <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
              New Session
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : sessions.length === 0 ? (
        <EmptyState icon={<Clock size={28} />} title="No attendance sessions yet"
          description={isAdmin ? 'Create a session and share the QR code with members' : 'No sessions have been created yet'}
          action={isAdmin ? <Button size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>Create Session</Button> : undefined} />
      ) : (
        <div className="space-y-3">
          {sessions.map((session, idx) => {
            const attended = myAttendedSessions.has(session.id);
            return (
              <motion.div key={session.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${attended ? 'bg-emerald-500/10' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                        {attended ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Clock size={20} className="text-zinc-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-zinc-900 dark:text-white truncate">{session.session_name}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">By {session.creator?.name} · {formatDate(session.created_at)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={session.is_active ? 'success' : 'default'} size="sm">
                            {session.is_active ? 'Active' : 'Closed'}
                          </Badge>
                          {attended && <Badge variant="success" size="sm"><UserCheck size={10} className="inline mr-1" />Attended</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {isAdmin && (
                        <>
                          <Button size="sm" variant="ghost" icon={<QrCode size={14} />}
                            onClick={() => { setShowQR(session); loadRecords(session.id); }}>
                            View QR
                          </Button>
                          <Button size="sm" variant="ghost"
                            onClick={() => toggleSession(session)}>
                            {session.is_active ? 'Close' : 'Reopen'}
                          </Button>
                        </>
                      )}
                      {!attended && session.is_active && !isAdmin && (
                        <Button size="sm" variant="outline" icon={<QrCode size={14} />} onClick={() => setShowScan(true)}>
                          Mark
                        </Button>
                      )}
                    </div>
                  </div>
                  {records[session.id] && (
                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <p className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1">
                        <Users size={12} /> {records[session.id].length} present
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {records[session.id].map((r: any) => (
                          <div key={r.id} className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-full px-2 py-0.5">
                            <Avatar name={r.user?.name} size="xs" />
                            <span className="text-xs text-zinc-600 dark:text-zinc-300">{r.user?.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Attendance Session">
        <form onSubmit={createSession} className="space-y-4">
          <Input label="Session Name" value={sessionName} onChange={e => setSessionName(e.target.value)}
            placeholder="e.g., Weekly Meeting – Week 5" />
          <p className="text-xs text-zinc-400">A unique QR code will be generated. Share it only with club members to mark attendance.</p>
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={creating} className="flex-1">Create Session</Button>
          </div>
        </form>
      </Modal>

      {showQR && (
        <Modal isOpen={true} onClose={() => setShowQR(null)} title={showQR.session_name} size="lg">
          <div className="space-y-5">
            <div className="text-center">
              <div className="w-56 h-56 mx-auto bg-zinc-50 dark:bg-zinc-800 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center gap-3">
                <QrCode size={80} className="text-zinc-400" />
                <p className="text-sm font-mono font-bold text-zinc-900 dark:text-white px-3 text-center break-all">{showQR.qr_code}</p>
              </div>
              <p className="text-xs text-zinc-400 mt-2">Share this QR code with club members to mark their attendance</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Admin Only</p>
              <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">Only share this QR code with actual club members. Do not post publicly.</p>
            </div>
            {records[showQR.id] ? (
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Attendance ({records[showQR.id].length} present)</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {records[showQR.id].map((r: any) => (
                    <div key={r.id} className="flex items-center gap-3 py-1.5">
                      <Avatar name={r.user?.name} size="sm" />
                      <p className="text-sm text-zinc-900 dark:text-white">{r.user?.name}</p>
                      <CheckCircle2 size={14} className="text-emerald-500 ml-auto" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full" icon={<RefreshCw size={14} />}
                onClick={() => loadRecords(showQR.id)}>Load Attendance Records</Button>
            )}
          </div>
        </Modal>
      )}

      <Modal isOpen={showScan} onClose={() => setShowScan(false)} title="Scan Attendance QR">
        <div className="space-y-4">
          <div className="flex items-center justify-center h-28 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            <QrCode size={48} className="text-zinc-300" />
          </div>
          <Input label="Enter QR Code" value={scanCode} onChange={e => setScanCode(e.target.value)}
            placeholder="CA-XXXXXXXX-XXXXXXXX" />
          <p className="text-xs text-zinc-400">Ask your club admin to share the session QR code. Enter the code above to mark your attendance.</p>
          <Button className="w-full" loading={scanning} onClick={handleScan} disabled={!scanCode.trim()}>
            Mark Attendance
          </Button>
        </div>
      </Modal>
    </div>
  );
};
