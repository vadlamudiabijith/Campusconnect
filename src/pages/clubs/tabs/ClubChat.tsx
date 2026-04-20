import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Lock, MessageSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatDistanceToNow } from '../../../lib/utils';
import { useNavigate } from 'react-router-dom';

interface Props {
  clubId: string;
  clubName: string;
  isMember: boolean;
}

export const ClubChat: React.FC<Props> = ({ clubId, clubName, isMember }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase.from('club_messages')
      .select('*, sender:sender_id(name, role, avatar_url)')
      .eq('club_id', clubId)
      .order('created_at')
      .limit(100);
    if (data) setMessages(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase.channel(`club-${clubId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'club_messages', filter: `club_id=eq.${clubId}` },
        async (payload) => {
          const { data } = await supabase.from('club_messages').select('*, sender:sender_id(name, role, avatar_url)')
            .eq('id', payload.new.id).maybeSingle();
          if (data) setMessages(m => [...m, data]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clubId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !profile || sending) return;
    setSending(true);
    await supabase.from('club_messages').insert({ club_id: clubId, sender_id: profile.id, content: text.trim() });
    setText('');
    setSending(false);
  };

  const isOwn = (msg: any) => msg.sender_id === profile?.id;

  if (!isMember && profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <Lock size={28} className="text-zinc-400" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">Members Only</h3>
          <p className="text-sm text-zinc-500 mt-1">Join the club to access the chat and connect with other members.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 340px)' }}>
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-zinc-400 text-sm">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400">
            <MessageSquare size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No messages yet. Start the {clubName} conversation!</p>
          </div>
        ) : (
          <>
            <div className="text-center py-2">
              <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                {clubName} · Members Chat
              </span>
            </div>
            {messages.map((msg, idx) => {
              const own = isOwn(msg);
              const showAvatar = !own && (idx === 0 || messages[idx - 1].sender_id !== msg.sender_id);
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex items-end gap-2 ${own ? 'flex-row-reverse' : ''}`}>
                  {!own && (
                    <div className="w-8 flex-shrink-0">
                      {showAvatar && <Avatar name={msg.sender?.name} src={msg.sender?.avatar_url} size="sm" />}
                    </div>
                  )}
                  <div className={`max-w-xs lg:max-w-sm ${own ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    {showAvatar && !own && (
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{msg.sender?.name}</span>
                        <Badge variant={msg.sender?.role === 'faculty' ? 'info' : 'default'} size="sm">{msg.sender?.role}</Badge>
                      </div>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${own
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-bl-md shadow-sm border border-zinc-100 dark:border-zinc-700'}`}>
                      {msg.content}
                    </div>
                    <span className="text-xs text-zinc-400 px-1">{formatDistanceToNow(msg.created_at)}</span>
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
        <form onSubmit={send} className="flex items-center gap-3">
          <Avatar name={profile?.name} src={profile?.avatar_url} size="sm" />
          <div className="flex-1 relative">
            <input value={text} onChange={e => setText(e.target.value)}
              placeholder={`Message ${clubName}...`}
              className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 pr-12"
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(e as any); }} />
            <button type="submit" disabled={!text.trim() || sending}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center disabled:opacity-40 hover:bg-blue-500 transition-colors">
              <Send size={14} className="text-white" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
