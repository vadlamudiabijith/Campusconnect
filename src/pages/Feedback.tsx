import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Textarea, Select } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { formatDistanceToNow } from '../lib/utils';
import type { Feedback as FeedbackType, Course } from '../types';

const StarRating: React.FC<{ value: number; onChange?: (v: number) => void }> = ({ value, onChange }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(0)}
          className="transition-transform hover:scale-110"
          disabled={!onChange}>
          <Star size={28} className={`transition-colors ${(hover || value) >= star ? 'text-amber-400 fill-current' : 'text-zinc-300 dark:text-zinc-600'}`} />
        </button>
      ))}
    </div>
  );
};

export const Feedback: React.FC = () => {
  const { profile } = useAuth();
  const [feedbacks, setFeedbacks] = useState<FeedbackType[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [targetType, setTargetType] = useState<'campus' | 'course' | 'faculty' | 'event'>('campus');
  const [targetId, setTargetId] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [fbRes, cRes] = await Promise.all([
      supabase.from('feedback').select('*, user:user_id(name, avatar_url)').order('created_at', { ascending: false }),
      supabase.from('courses').select('id, name, code'),
    ]);
    if (fbRes.data) setFeedbacks(fbRes.data);
    if (cRes.data) setCourses(cRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || rating === 0) { toast.error('Please select a rating'); return; }
    setSaving(true);
    const { error } = await supabase.from('feedback').insert({
      user_id: profile.id, target_type: targetType,
      target_id: targetId || null, rating, comment, is_anonymous: isAnon,
    });
    setSaving(false);
    if (error) { toast.error('Failed to submit'); return; }
    toast.success('Feedback submitted!');
    setRating(0); setComment(''); setIsAnon(false);
    load();
  };

  const avgRating = feedbacks.length > 0
    ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1) : '—';

  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    stars: r, count: feedbacks.filter(f => f.rating === r).length,
    pct: feedbacks.length > 0 ? (feedbacks.filter(f => f.rating === r).length / feedbacks.length) * 100 : 0,
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Feedback & Ratings</h2>
        <p className="text-sm text-zinc-500">Share your campus experience</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Submit Feedback</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Select label="Category" value={targetType} onChange={e => setTargetType(e.target.value as any)}
                options={[{value:'campus',label:'Campus General'},{value:'course',label:'Course'},{value:'faculty',label:'Faculty'},{value:'event',label:'Event'}]} />
              {targetType === 'course' && (
                <Select label="Course" value={targetId} onChange={e => setTargetId(e.target.value)}
                  options={[{value:'',label:'Select course...'}, ...courses.map(c => ({ value: c.id, label: `${c.code} - ${c.name}` }))]} />
              )}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Your Rating</label>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <Textarea label="Comments" value={comment} onChange={e => setComment(e.target.value)} rows={4}
                placeholder="Share your experience..." />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} className="w-4 h-4 rounded" />
                <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                  {isAnon ? <EyeOff size={14} /> : <Eye size={14} />}
                  Submit anonymously
                </div>
              </label>
              <Button type="submit" loading={saving} className="w-full" disabled={rating === 0}>Submit Feedback</Button>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-zinc-900 dark:text-white mb-4">Rating Overview</h3>
            <div className="text-center mb-4">
              <span className="text-5xl font-black text-zinc-900 dark:text-white">{avgRating}</span>
              <div className="flex justify-center mt-2"><StarRating value={Math.round(parseFloat(avgRating as string) || 0)} /></div>
              <p className="text-sm text-zinc-400 mt-1">{feedbacks.length} reviews</p>
            </div>
            <div className="space-y-2">
              {ratingDist.map(r => (
                <div key={r.stars} className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 w-4">{r.stars}</span>
                  <Star size={12} className="text-amber-400 fill-current flex-shrink-0" />
                  <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                      className="h-full bg-amber-400 rounded-full" />
                  </div>
                  <span className="text-xs text-zinc-400 w-6">{r.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
          ) : feedbacks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
              <MessageSquare size={48} className="mb-3 opacity-30" />
              <p>No feedback yet. Be the first to share!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((fb, idx) => (
                <motion.div key={fb.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}>
                  <Card className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                          {fb.is_anonymous ? '?' : ((fb as any).user?.name?.[0] || 'U')}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-white text-sm">
                            {fb.is_anonymous ? 'Anonymous' : (fb as any).user?.name}
                          </p>
                          <p className="text-xs text-zinc-400">{formatDistanceToNow(fb.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" size="sm">{fb.target_type}</Badge>
                        {fb.is_anonymous && <EyeOff size={12} className="text-zinc-400" />}
                      </div>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={14} className={s <= fb.rating ? 'text-amber-400 fill-current' : 'text-zinc-200 dark:text-zinc-700'} />
                      ))}
                    </div>
                    {fb.comment && <p className="text-sm text-zinc-600 dark:text-zinc-400">{fb.comment}</p>}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
