import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, Users, Clock, Plus, CheckCircle, MapPin, Bell, Eye, X, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate } from '../lib/utils';

interface SecurityLog {
  id: string;
  event_type: string;
  title: string;
  description: string;
  location: string;
  severity: string;
  resolved: boolean;
  created_at: string;
  logged_by?: string;
}

interface CampusAlert {
  id: string;
  title: string;
  message: string;
  alert_type: string;
  is_active: boolean;
  created_at: string;
}

interface Visitor {
  id: string;
  name: string;
  purpose: string;
  host_name: string;
  status: string;
  check_in?: string;
  created_at: string;
}

const severityColors: Record<string, string> = {
  low: 'success', medium: 'warning', high: 'danger', critical: 'danger',
};

const alertTypeColors: Record<string, string> = {
  info: 'info', warning: 'warning', danger: 'danger', success: 'success',
};

export const SecurityDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [alerts, setAlerts] = useState<CampusAlert[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logForm, setLogForm] = useState({ title: '', description: '', location: '', event_type: 'incident', severity: 'low' });
  const [alertForm, setAlertForm] = useState({ title: '', message: '', alert_type: 'info' });

  const load = async () => {
    const [logsRes, alertsRes, visitorsRes] = await Promise.all([
      supabase.from('security_logs').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('campus_alerts').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('visitors').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    if (logsRes.data) setLogs(logsRes.data);
    if (alertsRes.data) setAlerts(alertsRes.data);
    if (visitorsRes.data) setVisitors(visitorsRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('security_logs').insert({ ...logForm, logged_by: profile.id });
    setSaving(false);
    if (error) { toast.error('Failed to log incident'); return; }
    toast.success('Incident logged');
    setShowLogModal(false);
    setLogForm({ title: '', description: '', location: '', event_type: 'incident', severity: 'low' });
    load();
  };

  const submitAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('campus_alerts').insert({ ...alertForm, created_by: profile.id });
    setSaving(false);
    if (error) { toast.error('Failed to create alert'); return; }
    toast.success('Alert published');
    setShowAlertModal(false);
    setAlertForm({ title: '', message: '', alert_type: 'info' });
    load();
  };

  const resolveLog = async (id: string) => {
    await supabase.from('security_logs').update({ resolved: true }).eq('id', id);
    toast.success('Marked as resolved');
    load();
  };

  const dismissAlert = async (id: string) => {
    await supabase.from('campus_alerts').update({ is_active: false }).eq('id', id);
    toast.success('Alert dismissed');
    load();
  };

  const activeVisitors = visitors.filter(v => v.status === 'checked_in');
  const todayLogs = logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString());
  const openIncidents = logs.filter(l => !l.resolved);
  const highSeverity = logs.filter(l => (l.severity === 'high' || l.severity === 'critical') && !l.resolved);

  const stats = [
    { label: 'On Campus Now', value: activeVisitors.length, icon: <Users size={18} />, color: 'blue' },
    { label: "Today's Logs", value: todayLogs.length, icon: <Activity size={18} />, color: 'emerald' },
    { label: 'Open Incidents', value: openIncidents.length, icon: <AlertTriangle size={18} />, color: openIncidents.length > 0 ? 'amber' : 'emerald' },
    { label: 'High Priority', value: highSeverity.length, icon: <Shield size={18} />, color: highSeverity.length > 0 ? 'rose' : 'emerald' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Shield size={22} className="text-blue-500" /> Security Dashboard
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5">Campus safety & incident management</p>
        </div>
        <div className="flex gap-2">
          <Button icon={<Bell size={15} />} variant="outline" size="sm" onClick={() => setShowAlertModal(true)}>
            Broadcast Alert
          </Button>
          <Button icon={<Plus size={15} />} size="sm" onClick={() => setShowLogModal(true)}>
            Log Incident
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[s.color]}`}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{s.value}</p>
                  <p className="text-xs text-zinc-500">{s.label}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-amber-500" />
            <h3 className="font-semibold text-zinc-900 dark:text-white">Active Campus Alerts</h3>
          </div>
          <div className="space-y-2">
            <AnimatePresence>
              {alerts.map(alert => (
                <motion.div key={alert.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                  <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                    alert.alert_type === 'danger' ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-800' :
                    alert.alert_type === 'warning' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800' :
                    'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-800'
                  }`}>
                    <AlertTriangle size={16} className={`mt-0.5 flex-shrink-0 ${
                      alert.alert_type === 'danger' ? 'text-red-500' :
                      alert.alert_type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-900 dark:text-white text-sm">{alert.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{alert.message}</p>
                    </div>
                    <button onClick={() => dismissAlert(alert.id)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                      <X size={15} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitors on campus */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <Eye size={16} className="text-blue-500" /> Visitors on Campus
              </h3>
              <Badge variant={activeVisitors.length > 0 ? 'info' : 'default'} size="sm">
                {activeVisitors.length} active
              </Badge>
            </div>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
            ) : visitors.length === 0 ? (
              <EmptyState icon={<Users size={24} />} title="No visitors today" />
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {visitors.map((v, i) => (
                  <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      v.status === 'checked_in' ? 'bg-emerald-500' :
                      v.status === 'checked_out' ? 'bg-zinc-400' : 'bg-amber-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{v.name}</p>
                      <p className="text-xs text-zinc-400 truncate">{v.purpose} · Host: {v.host_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge variant={v.status === 'checked_in' ? 'success' : v.status === 'pending' ? 'warning' : 'default'} size="sm">
                        {v.status.replace('_', ' ')}
                      </Badge>
                      {v.check_in && <p className="text-xs text-zinc-400 mt-0.5">{new Date(v.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Incident Logs */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" /> Incident Log
              </h3>
              <Badge variant={openIncidents.length > 0 ? 'warning' : 'success'} size="sm">
                {openIncidents.length} open
              </Badge>
            </div>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : logs.length === 0 ? (
              <EmptyState icon={<Shield size={24} />} title="No incidents logged" description="Campus is all clear" />
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                <AnimatePresence>
                  {logs.map((log, i) => (
                    <motion.div key={log.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}
                      className={`p-3 rounded-xl border transition-all ${log.resolved
                        ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 opacity-60'
                        : log.severity === 'critical' || log.severity === 'high'
                          ? 'bg-red-50 dark:bg-red-500/5 border-red-200 dark:border-red-800/50'
                          : 'bg-white dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700'
                      }`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white">{log.title}</p>
                            <Badge variant={severityColors[log.severity] as any} size="sm">{log.severity}</Badge>
                            {log.resolved && <Badge variant="success" size="sm">resolved</Badge>}
                          </div>
                          {log.location && (
                            <p className="text-xs text-zinc-400 flex items-center gap-1">
                              <MapPin size={10} /> {log.location}
                            </p>
                          )}
                          <p className="text-xs text-zinc-400 mt-0.5">{formatDate(log.created_at)}</p>
                        </div>
                        {!log.resolved && (
                          <button onClick={() => resolveLog(log.id)}
                            className="text-emerald-500 hover:text-emerald-600 transition-colors flex-shrink-0 mt-0.5">
                            <CheckCircle size={16} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Recent Patrol Timeline */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card className="p-5">
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-blue-500" /> Activity Timeline
          </h3>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-4">No activity recorded yet</p>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-4">
                {logs.slice(0, 10).map((log, i) => (
                  <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-start gap-4 relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 ${
                      log.severity === 'critical' ? 'bg-red-100 dark:bg-red-500/20 text-red-500' :
                      log.severity === 'high' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500' :
                      log.resolved ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500' :
                      'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                    }`}>
                      {log.resolved ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    </div>
                    <div className="flex-1 pt-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">{log.title}</p>
                        <Badge variant={severityColors[log.severity] as any} size="sm">{log.severity}</Badge>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {log.location && <><MapPin size={10} className="inline mr-1" />{log.location} · </>}
                        {formatDate(log.created_at)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Log Incident Modal */}
      <Modal isOpen={showLogModal} onClose={() => setShowLogModal(false)} title="Log Security Incident">
        <form onSubmit={submitLog} className="space-y-4">
          <Input label="Incident Title" value={logForm.title} onChange={e => setLogForm(f => ({ ...f, title: e.target.value }))} required placeholder="Brief description of incident" />
          <Textarea label="Description" value={logForm.description} onChange={e => setLogForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Detailed account..." />
          <Input label="Location" value={logForm.location} onChange={e => setLogForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g., Gate A, Block B" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Event Type" value={logForm.event_type} onChange={e => setLogForm(f => ({ ...f, event_type: e.target.value }))}
              options={[{ value: 'incident', label: 'Incident' }, { value: 'patrol', label: 'Patrol Report' }, { value: 'visitor', label: 'Visitor Issue' }, { value: 'maintenance', label: 'Maintenance' }, { value: 'other', label: 'Other' }]} />
            <Select label="Severity" value={logForm.severity} onChange={e => setLogForm(f => ({ ...f, severity: e.target.value }))}
              options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowLogModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Log Incident</Button>
          </div>
        </form>
      </Modal>

      {/* Broadcast Alert Modal */}
      <Modal isOpen={showAlertModal} onClose={() => setShowAlertModal(false)} title="Broadcast Campus Alert">
        <form onSubmit={submitAlert} className="space-y-4">
          <Input label="Alert Title" value={alertForm.title} onChange={e => setAlertForm(f => ({ ...f, title: e.target.value }))} required placeholder="e.g., Fire Drill at 3 PM" />
          <Textarea label="Message" value={alertForm.message} onChange={e => setAlertForm(f => ({ ...f, message: e.target.value }))} rows={3} placeholder="Alert details..." />
          <Select label="Alert Type" value={alertForm.alert_type} onChange={e => setAlertForm(f => ({ ...f, alert_type: e.target.value }))}
            options={[{ value: 'info', label: 'Information' }, { value: 'warning', label: 'Warning' }, { value: 'danger', label: 'Danger / Emergency' }, { value: 'success', label: 'All Clear' }]} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAlertModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Broadcast</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
