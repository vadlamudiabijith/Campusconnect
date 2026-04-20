import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Zap, Bot, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { formatDistanceToNow } from '../../lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  actions?: { label: string; path: string }[];
  timestamp: Date;
}

const KNOWLEDGE_BASE = [
  { keywords: ['dashboard', 'home', 'overview', 'start'], response: 'The **Dashboard** gives you a real-time overview of your campus activity — courses, issues, events, and deadlines.', navigate: '/dashboard' },
  { keywords: ['course', 'class', 'subject', 'lecture', 'hub'], response: 'The **Course Hub** works like Google Classroom — each course has announcements, assignments, materials, live chat, and performance tracking.', navigate: '/courses' },
  { keywords: ['attendance', 'present', 'absent', 'late', 'mark'], response: 'The **Attendance** module shows your attendance rate per course. Faculty can mark attendance; students see their stats.', navigate: '/attendance' },
  { keywords: ['timetable', 'schedule', 'class time', 'slot', 'when'], response: 'Your **Timetable** shows the weekly class schedule with rooms and topics. Today\'s classes are highlighted.', navigate: '/timetable' },
  { keywords: ['issue', 'problem', 'report', 'complaint', 'broken'], response: 'Use **Issue Management** to report campus problems like infrastructure issues, IT problems, or safety concerns. You can track status and upvote issues.', navigate: '/issues' },
  { keywords: ['club', 'society', 'community', 'join', 'membership'], response: 'The **Clubs** section has all campus clubs. Each club has its own announcements, events, members, and chat space. You can join any club!', navigate: '/clubs' },
  { keywords: ['event', 'fest', 'workshop', 'seminar', 'register'], response: 'Check the **Events** page for upcoming campus and club events. Some events require registration and may have an entry fee in MYR.', navigate: '/events' },
  { keywords: ['payment', 'fee', 'pay', 'ringgit', 'myr', 'transaction'], response: 'The **Payments** module handles all campus fees in **Malaysian Ringgit (MYR)**. You can pay event fees, view transaction history, and track payment status.', navigate: '/payments' },
  { keywords: ['visitor', 'guest', 'qr', 'security', 'scan', 'entry'], response: 'The **Visitor Management** system lets you register guests, generate QR codes for entry, and security staff can scan to log check-ins/outs.', navigate: '/visitors' },
  { keywords: ['feedback', 'rating', 'review', 'opinion', 'star'], response: 'Submit anonymous or named **Feedback** about courses, faculty, events, or campus in general. Star ratings with comments.', navigate: '/feedback' },
  { keywords: ['admin', 'analytics', 'statistics', 'report', 'data'], response: 'The **Admin Panel** shows campus-wide analytics, user distribution, issue reports, and activity charts. Admin access only.', navigate: '/admin' },
  { keywords: ['profile', 'account', 'name', 'edit', 'bio', 'settings'], response: 'Edit your **Profile** — update your name, department, bio, and avatar URL. Your role and ID are displayed there too.', navigate: '/profile' },
  { keywords: ['chat', 'message', 'talk', 'communicate'], response: 'Each **Course** has a real-time chat tab where students and faculty can communicate directly. Club chats are also separate per club so messages never mix!' },
  { keywords: ['assignment', 'deadline', 'homework', 'submit', 'task'], response: 'View all assignments in each course\'s **Assignments** tab. Track deadlines, submit work, and see grades.', navigate: '/courses' },
  { keywords: ['grade', 'marks', 'score', 'performance', 'result'], response: 'Your **Performance** tab inside each course shows grades, a grade chart, and attendance records. Only you can see your own grades.', navigate: '/courses' },
  { keywords: ['material', 'resource', 'pdf', 'notes', 'study', 'file'], response: 'Course **Materials** are organized by module inside each course. Faculty upload PDFs, links, videos, and notes.', navigate: '/courses' },
  { keywords: ['announcement', 'notice', 'update', 'news'], response: 'Announcements appear in each **Course** and **Club** separately. Faculty post course updates; club officers post club news.' },
  { keywords: ['hello', 'hi', 'hey', 'good', 'morning', 'afternoon'], response: 'Hi there! I\'m **Pulse AI** — your campus navigation assistant. Ask me about any feature or say "go to payments" to navigate directly!' },
  { keywords: ['help', 'what can you do', 'features', 'guide'], response: 'I can help you navigate CampusPulse! Ask me about:\n- **Courses** (assignments, chat, grades)\n- **Clubs** (join, events, announcements)\n- **Events** & **Payments** (in MYR)\n- **Attendance**, **Issues**, **Timetable**\n- **Visitors**, **Feedback**, **Admin**' },
];

const QUICK_ACTIONS = [
  { label: 'My Courses', path: '/courses' },
  { label: 'Timetable', path: '/timetable' },
  { label: 'Attendance', path: '/attendance' },
  { label: 'Events', path: '/events' },
  { label: 'Clubs', path: '/clubs' },
  { label: 'Report Issue', path: '/issues' },
];

function processMessage(text: string, navigate: (path: string) => void): ChatMessage {
  const lower = text.toLowerCase();

  const gotoMatch = lower.match(/^(go to|navigate to|open|show me|take me to)\s+(.+)$/);
  if (gotoMatch) {
    const target = gotoMatch[2];
    for (const kb of KNOWLEDGE_BASE) {
      if (kb.keywords.some(k => target.includes(k)) && kb.navigate) {
        setTimeout(() => navigate(kb.navigate!), 800);
        return {
          id: Date.now().toString(),
          role: 'bot',
          content: `Navigating to **${kb.navigate.replace('/', '').charAt(0).toUpperCase() + kb.navigate.slice(2)}**...`,
          timestamp: new Date(),
        };
      }
    }
  }

  for (const kb of KNOWLEDGE_BASE) {
    if (kb.keywords.some(k => lower.includes(k))) {
      const actions = kb.navigate ? [{ label: `Open ${kb.navigate.replace('/', '').charAt(0).toUpperCase() + kb.navigate.slice(2)}`, path: kb.navigate }] : undefined;
      return {
        id: Date.now().toString(),
        role: 'bot',
        content: kb.response,
        actions,
        timestamp: new Date(),
      };
    }
  }

  return {
    id: Date.now().toString(),
    role: 'bot',
    content: "I'm not sure about that, but I can help you navigate! Try asking about **courses**, **clubs**, **events**, **payments**, or say **\"help\"** for a full feature list.",
    actions: [{ label: 'View Dashboard', path: '/dashboard' }],
    timestamp: new Date(),
  };
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

export const AIChatBot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'bot',
      content: "Hi! I'm **Pulse AI** — your smart campus assistant. Ask me anything about CampusPulse or say **\"help\"** to see what I can do!",
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { profile } = useAuth();

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString() + '-user',
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setTyping(true);

    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    setTyping(false);

    const response = processMessage(text, navigate);
    setMessages(m => [...m, response]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-24 right-6 w-96 z-50 flex flex-col"
            style={{ height: '520px' }}
          >
            <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">Pulse AI</p>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <p className="text-xs text-white/70">Campus Assistant · Online</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'bot' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                      {msg.role === 'bot' ? <Sparkles size={14} className="text-white" /> : <User size={14} className="text-zinc-600 dark:text-zinc-300" />}
                    </div>
                    <div className={`max-w-[72%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-bl-md'}`}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {msg.actions.map(action => (
                            <button key={action.path} onClick={() => { navigate(action.path); setOpen(false); }}
                              className="text-xs bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 px-2.5 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors font-medium">
                              {action.label} →
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {typing && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles size={14} className="text-white" />
                    </div>
                    <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                          className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                      ))}
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-4 pb-2">
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {QUICK_ACTIONS.slice(0, 4).map(a => (
                    <button key={a.path} onClick={() => sendMessage(`go to ${a.label.toLowerCase()}`)}
                      className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-2 py-1 rounded-lg transition-colors">
                      {a.label}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2">
                  <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                    placeholder="Ask Pulse AI anything..."
                    className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none" />
                  <button type="submit" disabled={!input.trim()}
                    className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center disabled:opacity-40 hover:bg-blue-500 transition-colors">
                    <Send size={13} className="text-white" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg shadow-blue-600/30 flex items-center justify-center text-white transition-all"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={22} />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} className="relative">
              <Sparkles size={22} />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-zinc-950 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
};
