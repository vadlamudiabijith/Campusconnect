import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, MessageCircle, GraduationCap } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { formatDistanceToNow } from '../../../lib/utils';

interface Props {
  courseId: string;
  facultyId: string;
  facultyName: string;
}

export const CoursePrivateChat: React.FC<Props> = ({ courseId, facultyId, facultyName }) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isFaculty = profile?.role === 'faculty' || profile?.role === 'admin';
  const otherUserId = isFaculty ? selectedStudent?.id : facultyId;

  const loadConversations = async () => {
    if (!isFaculty || !profile) return;
    const { data } = await supabase
      .from('private_messages')
      .select('sender:sender_id(id, name, avatar_url), receiver:receiver_id(id, name, avatar_url)')
      .eq('course_id', courseId)
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`);

    if (data) {
      const userMap = new Map<string, any>();
      data.forEach((m: any) => {
        const other = m.sender?.id === profile.id ? m.receiver : m.sender;
        if (other && other.id !== profile.id) userMap.set(other.id, other);
      });
      setConversations(Array.from(userMap.values()));
    }
    setLoading(false);
  };

  const loadMessages = async () => {
    if (!profile || !otherUserId) return;
    const { data } = await supabase
      .from('private_messages')
      .select('*, sender:sender_id(name, avatar_url)')
      .eq('course_id', courseId)
      .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${profile.id})`)
      .order('created_at');
    if (data) setMessages(data);
    await supabase.from('private_messages')
      .update({ is_read: true })
      .eq('course_id', courseId)
      .eq('receiver_id', profile.id)
      .eq('sender_id', otherUserId);
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  useEffect(() => {
    if (isFaculty) {
      loadConversations();
    } else {
      loadMessages();
    }
  }, [profile, courseId, facultyId]);

  useEffect(() => {
    if (otherUserId) loadMessages();
  }, [otherUserId]);

  useEffect(() => {
    if (!profile || !otherUserId) return;
    const channel = supabase.channel(`private-${courseId}-${[profile.id, otherUserId].sort().join('-')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages' }, (payload) => {
        const msg = payload.new as any;
        if (
          (msg.sender_id === profile.id && msg.receiver_id === otherUserId) ||
          (msg.sender_id === otherUserId && msg.receiver_id === profile.id)
        ) {
          loadMessages();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, otherUserId, courseId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !profile || !otherUserId) return;
    setSending(true);
    await supabase.from('private_messages').insert({
      sender_id: profile.id,
      receiver_id: otherUserId,
      course_id: courseId,
      content: input.trim(),
    });
    setInput('');
    setSending(false);
  };

  if (isFaculty && !selectedStudent) {
    return (
      <div className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">Student Messages</h3>
          <p className="text-sm text-zinc-500 mt-0.5">Private conversations from students in this course</p>
        </div>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : conversations.length === 0 ? (
          <EmptyState icon={<MessageCircle size={28} />} title="No private messages yet" description="Students can message you privately about this course" />
        ) : (
          <div className="space-y-2">
            {conversations.map(student => (
              <motion.button key={student.id} whileHover={{ x: 2 }} onClick={() => setSelectedStudent(student)}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-600 transition-all text-left">
                <Avatar name={student.name} size="md" />
                <div className="flex-1">
                  <p className="font-medium text-zinc-900 dark:text-white">{student.name}</p>
                  <p className="text-xs text-zinc-400">Click to view conversation</p>
                </div>
                <MessageCircle size={16} className="text-zinc-400" />
              </motion.button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-96">
      {isFaculty && selectedStudent && (
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3 bg-white dark:bg-zinc-900">
          <button onClick={() => setSelectedStudent(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 text-sm">← Back</button>
          <Avatar name={selectedStudent.name} size="sm" />
          <p className="font-medium text-zinc-900 dark:text-white text-sm">{selectedStudent.name}</p>
        </div>
      )}
      {!isFaculty && (
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3 bg-white dark:bg-zinc-900">
          <GraduationCap size={18} className="text-blue-500" />
          <div>
            <p className="font-medium text-zinc-900 dark:text-white text-sm">{facultyName}</p>
            <p className="text-xs text-zinc-400">Course Faculty · Private</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-zinc-50 dark:bg-zinc-950">
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <MessageCircle size={32} className="text-zinc-300" />
            <p className="text-zinc-500 text-sm">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.sender_id === profile?.id;
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
                className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isOwn && <Avatar name={msg.sender?.name} size="sm" className="flex-shrink-0 mt-1" />}
                <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-blue-500 text-white rounded-tr-md'
                      : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-tl-md'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-xs text-zinc-400 mt-1 px-1">{formatDistanceToNow(msg.created_at)}</span>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`Message ${isFaculty ? selectedStudent?.name : facultyName}...`}
          className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        <Button type="submit" size="sm" icon={<Send size={14} />} loading={sending} disabled={!input.trim()}>Send</Button>
      </form>
    </div>
  );
};
