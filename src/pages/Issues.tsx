import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, AlertCircle, MapPin, ChevronRight, ThumbsUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { formatDistanceToNow, getStatusColor, getPriorityColor } from '../lib/utils';
import type { Issue, IssueTimeline } from '../types';

const categories = ['Infrastructure', 'IT/Technology', 'Safety', 'Cleanliness', 'Academic', 'Administrative', 'Other'];
const statusSteps = ['open', 'in_progress', 'resolved', 'closed'];
const statusLabels: Record<string, string> = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };

export const Issues: React.FC = () => {
  const { profile } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [timeline, setTimeline] = useState<IssueTimeline[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'Infrastructure', priority: 'medium', location: '', image_url: '' });

  const load = async () => {
    const { data } = await supabase.from('issues').select('*, reporter:reporter_id(name, avatar_url)')
      .order('created_at', { ascending: false });
    if (data) setIssues(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (issue: Issue) => {
    setSelected(issue);
    const { data } = await supabase.from('issue_timeline').select('*, actor:actor_id(name)')
      .eq('issue_id', issue.id).order('created_at');
    if (data) setTimeline(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('issues').insert({ ...form, reporter_id: profile.id });
    setSaving(false);
    if (error) { toast.error('Failed to submit issue'); return; }
    toast.success('Issue reported!');
    setShowForm(false);
    setForm({ title: '', description: '', category: 'Infrastructure', priority: 'medium', location: '', image_url: '' });
    load();
  };

  const updateStatus = async (issueId: string, status: string) => {
    if (!profile) return;
    const { error } = await supabase.from('issues').update({ status, updated_at: new Date().toISOString() }).eq('id', issueId);
    if (error) { toast.error('Failed to update'); return; }
    await supabase.from('issue_timeline').insert({ issue_id: issueId, actor_id: profile.id, action: `Status changed to ${statusLabels[status]}` });
    toast.success('Status updated!');
    load();
    if (selected?.id === issueId) openDetail({ ...selected, status: status as any });
  };

  const upvote = async (issue: Issue) => {
    await supabase.from('issues').update({ upvotes: issue.upvotes + 1 }).eq('id', issue.id);
    setIssues(is => is.map(i => i.id === issue.id ? { ...i, upvotes: i.upvotes + 1 } : i));
  };

  const filtered = issues.filter(i => {
    const matchSearch = i.title.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || i.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const isAdmin = profile?.role === 'admin' || profile?.role === 'faculty';

  const priorityColors: Record<string, string> = { low: 'bg-emerald-500', medium: 'bg-amber-500', high: 'bg-orange-500', critical: 'bg-red-500' };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Issue Management</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{issues.length} total issues</p>
        </div>
        <div className="flex items-center gap-3">
          <Input placeholder="Search issues..." value={search} onChange={e => setSearch(e.target.value)}
            icon={<Search size={16} />} className="w-48" />
          <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-36"
            options={[{value:'all',label:'All Status'},{value:'open',label:'Open'},{value:'in_progress',label:'In Progress'},{value:'resolved',label:'Resolved'},{value:'closed',label:'Closed'}]} />
          <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>Report Issue</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        {['open','in_progress','resolved','closed'].map(s => (
          <div key={s} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">{issues.filter(i => i.status === s).length}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{statusLabels[s]}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({length:4}).map((_,i) => <CardSkeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<AlertCircle size={28} />} title="No issues found"
          action={<Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>Report an Issue</Button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((issue, idx) => (
            <motion.div key={issue.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
              <Card hover onClick={() => openDetail(issue)} className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${priorityColors[issue.priority]}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-zinc-900 dark:text-white line-clamp-1">{issue.title}</h3>
                    <p className="text-sm text-zinc-500 mt-0.5 line-clamp-2">{issue.description}</p>
                  </div>
                  <ChevronRight size={16} className="text-zinc-400 flex-shrink-0" />
                </div>
                {issue.image_url && (
                  <img src={issue.image_url} alt="Issue" className="w-full h-32 object-cover rounded-xl mb-3" />
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getStatusColor(issue.status) as any}>{statusLabels[issue.status]}</Badge>
                  <Badge variant={getPriorityColor(issue.priority) as any}>{issue.priority}</Badge>
                  <Badge variant="default">{issue.category}</Badge>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Avatar name={(issue as any).reporter?.name} size="xs" />
                    <span className="text-xs text-zinc-400">{formatDistanceToNow(issue.created_at)}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); upvote(issue); }}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-blue-500 transition-colors">
                    <ThumbsUp size={12} /> {issue.upvotes}
                  </button>
                </div>
                {issue.location && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-zinc-400">
                    <MapPin size={11} /> {issue.location}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Report an Issue" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Brief description of the issue" required />
          <Textarea label="Description" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4}
            placeholder="Provide detailed information..." required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              options={categories.map(c => ({ value: c, label: c }))} />
            <Select label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              options={[{value:'low',label:'Low'},{value:'medium',label:'Medium'},{value:'high',label:'High'},{value:'critical',label:'Critical'}]} />
          </div>
          <Input label="Location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="e.g., Block A, Room 201" icon={<MapPin size={16} />} />
          <Input label="Image URL (optional)" value={form.image_url}
            onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
          {form.image_url && <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover rounded-xl" onError={e => (e.currentTarget.style.display = 'none')} />}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Submit Issue</Button>
          </div>
        </form>
      </Modal>

      {selected && (
        <Modal isOpen={true} onClose={() => setSelected(null)} title="Issue Details" size="lg">
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">{selected.title}</h3>
                <p className="text-sm text-zinc-500 mt-1">{selected.description}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Badge variant={getStatusColor(selected.status) as any}>{statusLabels[selected.status]}</Badge>
                <Badge variant={getPriorityColor(selected.priority) as any}>{selected.priority}</Badge>
              </div>
            </div>
            {selected.image_url && <img src={selected.image_url} alt="Issue" className="w-full h-48 object-cover rounded-xl" />}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-zinc-400">Category:</span> <span className="font-medium text-zinc-900 dark:text-white ml-1">{selected.category}</span></div>
              {selected.location && <div><span className="text-zinc-400">Location:</span> <span className="font-medium text-zinc-900 dark:text-white ml-1">{selected.location}</span></div>}
            </div>

            {isAdmin && (
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Update Status</p>
                <div className="flex gap-2">
                  {statusSteps.map(s => (
                    <Button key={s} size="sm"
                      variant={selected.status === s ? 'primary' : 'outline'}
                      onClick={() => updateStatus(selected.id, s)}>
                      {statusLabels[s]}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Timeline</p>
              {timeline.length === 0 ? (
                <p className="text-sm text-zinc-400">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {timeline.map(t => (
                    <div key={t.id} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{t.action}</p>
                        <p className="text-xs text-zinc-400">{(t as any).actor?.name} · {formatDistanceToNow(t.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
