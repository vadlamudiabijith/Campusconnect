import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, FileText, Download, Eye, FolderOpen } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Input, Select, Textarea } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDate } from '../../../lib/utils';
import type { Material } from '../../../types';

export const CourseMaterials: React.FC<{ courseId: string }> = ({ courseId }) => {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', file_url: '', file_type: 'pdf', module: 'General' });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('materials').select('*, uploader:uploaded_by(name)')
      .eq('course_id', courseId).order('module').order('created_at');
    if (data) setMaterials(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [courseId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase.from('materials').insert({ ...form, course_id: courseId, uploaded_by: profile.id });
    setSaving(false);
    if (error) { toast.error('Failed to upload'); return; }
    toast.success('Material added!');
    setShowForm(false);
    setForm({ title: '', description: '', file_url: '', file_type: 'pdf', module: 'General' });
    load();
  };

  const grouped = materials.reduce((acc, m) => {
    (acc[m.module] = acc[m.module] || []).push(m);
    return acc;
  }, {} as Record<string, Material[]>);

  const canUpload = profile?.role === 'faculty' || profile?.role === 'admin';
  const typeIcon: Record<string, string> = { pdf: '📄', doc: '📝', video: '🎥', link: '🔗', image: '🖼️' };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-zinc-500">{materials.length} material{materials.length !== 1 ? 's' : ''}</p>
        {canUpload && <Button icon={<Plus size={16} />} size="sm" onClick={() => setShowForm(true)}>Add Material</Button>}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : materials.length === 0 ? (
        <EmptyState icon={<FolderOpen size={24} />} title="No materials yet"
          description={canUpload ? 'Upload study materials for students' : 'Faculty will upload materials here'} />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([module, items]) => (
            <div key={module}>
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 text-xs">📚</span>
                {module}
              </h3>
              <div className="space-y-2">
                {items.map((m, idx) => (
                  <motion.div key={m.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{typeIcon[m.file_type] || '📄'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-zinc-900 dark:text-white text-sm truncate">{m.title}</p>
                          {m.description && <p className="text-xs text-zinc-500 mt-0.5">{m.description}</p>}
                          <p className="text-xs text-zinc-400 mt-0.5">{(m as any).uploader?.name} · {formatDate(m.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" size="sm">{m.file_type}</Badge>
                          {m.file_url && (
                            <>
                              {m.file_type === 'pdf' && (
                                <Button size="sm" variant="ghost" icon={<Eye size={14} />} onClick={() => setPreviewUrl(m.file_url)} />
                              )}
                              <a href={m.file_url} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline" icon={<Download size={14} />}>Open</Button>
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {previewUrl && (
        <Modal isOpen={true} onClose={() => setPreviewUrl(null)} title="Material Preview" size="xl">
          <iframe src={previewUrl} className="w-full h-96 rounded-xl border border-zinc-200 dark:border-zinc-700" />
        </Modal>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Material">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Textarea label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
          <Input label="File/Resource URL" value={form.file_url} onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))}
            placeholder="https://..." />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.file_type} onChange={e => setForm(f => ({ ...f, file_type: e.target.value }))}
              options={[{value:'pdf',label:'PDF'},{value:'doc',label:'Document'},{value:'video',label:'Video'},{value:'link',label:'Link'},{value:'image',label:'Image'}]} />
            <Input label="Module/Topic" value={form.module} onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
              placeholder="e.g., Week 1" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
