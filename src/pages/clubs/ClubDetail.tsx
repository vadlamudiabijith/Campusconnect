import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Megaphone, Calendar, Users, MessageSquare, UserPlus, UserCheck, CheckSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { ClubAnnouncements } from './tabs/ClubAnnouncements';
import { ClubEvents } from './tabs/ClubEvents';
import { ClubMembers } from './tabs/ClubMembers';
import { ClubChat } from './tabs/ClubChat';
import { ClubAttendance } from './tabs/ClubAttendance';
import type { Club } from '../../types';

type Tab = 'announcements' | 'events' | 'members' | 'chat' | 'attendance';

const tabs = [
  { id: 'announcements' as Tab, label: 'Announcements', icon: <Megaphone size={15} /> },
  { id: 'events' as Tab, label: 'Events', icon: <Calendar size={15} /> },
  { id: 'attendance' as Tab, label: 'Attendance', icon: <CheckSquare size={15} /> },
  { id: 'members' as Tab, label: 'Members', icon: <Users size={15} /> },
  { id: 'chat' as Tab, label: 'Chat', icon: <MessageSquare size={15} /> },
];

const categoryGradients: Record<string, string> = {
  Technology: 'from-blue-600 to-cyan-500',
  Arts: 'from-pink-600 to-rose-500',
  Academic: 'from-violet-600 to-purple-500',
  Sports: 'from-emerald-600 to-green-500',
  Environment: 'from-green-700 to-emerald-600',
  Cultural: 'from-orange-600 to-amber-500',
  Social: 'from-cyan-600 to-sky-500',
  General: 'from-zinc-600 to-zinc-500',
};

export const ClubDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [memberRole, setMemberRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('announcements');
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    loadClub();
  }, [id, profile]);

  const loadClub = async () => {
    const [clubRes, memberRes, countRes] = await Promise.all([
      supabase.from('clubs').select('*, president:president_id(name, email)').eq('id', id!).maybeSingle(),
      profile ? supabase.from('club_members').select('role').eq('club_id', id!).eq('user_id', profile.id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('club_members').select('count').eq('club_id', id!).single(),
    ]);
    if (clubRes.data) setClub(clubRes.data);
    if (memberRes.data) { setIsMember(true); setMemberRole(memberRes.data.role); }
    else { setIsMember(false); setMemberRole(null); }
    if (countRes.data) setMemberCount((countRes.data as any).count || 0);
    setLoading(false);
  };

  const handleJoinLeave = async () => {
    if (!profile || !club) return;
    setJoining(true);
    if (isMember) {
      await supabase.from('club_members').delete().eq('club_id', club.id).eq('user_id', profile.id);
      await supabase.from('clubs').update({ member_count: Math.max(0, (club.member_count || 1) - 1) }).eq('id', club.id);
      setIsMember(false);
      setMemberRole(null);
      toast.success('You left the club');
    } else {
      await supabase.from('club_members').insert({ club_id: club.id, user_id: profile.id, role: 'member' });
      await supabase.from('clubs').update({ member_count: (club.member_count || 0) + 1 }).eq('id', club.id);
      setIsMember(true);
      setMemberRole('member');
      toast.success('Welcome to the club!');
    }
    setJoining(false);
    loadClub();
  };

  if (loading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );

  if (!club) return (
    <div className="p-6 text-center text-zinc-500">Club not found</div>
  );

  const gradient = categoryGradients[club.category] || categoryGradients.General;

  return (
    <div className="flex flex-col h-full">
      <div className={`relative bg-gradient-to-br ${gradient} overflow-hidden`}>
        {club.banner_url && <img src={club.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay" />}
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative px-6 py-6">
          <button onClick={() => navigate('/clubs')}
            className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-5 transition-colors">
            <ArrowLeft size={16} /> Back to Clubs
          </button>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white font-black text-2xl flex-shrink-0`}>
                {club.name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="default" size="sm" className="bg-white/20 text-white border-0 text-xs">{club.category}</Badge>
                  {isMember && memberRole && (
                    <Badge variant="default" size="sm" className="bg-white/20 text-white border-0 text-xs capitalize">{memberRole}</Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-white">{club.name}</h1>
                <p className="text-white/70 text-sm mt-1 max-w-xl">{club.description}</p>
                <div className="flex items-center gap-4 mt-3 text-white/60 text-xs">
                  <span className="flex items-center gap-1"><Users size={12} /> {memberCount} members</span>
                  {club.meeting_schedule && <span>{club.meeting_schedule}</span>}
                </div>
              </div>
            </div>
            <Button
              variant={isMember ? 'outline' : 'primary'}
              className={isMember ? 'border-white/30 text-white hover:bg-white/10' : ''}
              icon={isMember ? <UserCheck size={14} /> : <UserPlus size={14} />}
              loading={joining}
              onClick={handleJoinLeave}
            >
              {isMember ? 'Joined' : 'Join Club'}
            </Button>
          </div>
        </div>

        <div className="relative px-6 border-t border-white/10 bg-black/10 backdrop-blur-sm">
          <div className="flex gap-0">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-white text-white'
                    : 'border-transparent text-white/50 hover:text-white/80'}`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {activeTab === 'announcements' && <ClubAnnouncements clubId={id!} isMember={isMember} memberRole={memberRole} />}
            {activeTab === 'events' && <ClubEvents clubId={id!} clubName={club.name} isMember={isMember} />}
            {activeTab === 'attendance' && <ClubAttendance clubId={id!} isMember={isMember} memberRole={memberRole || ''} />}
            {activeTab === 'members' && <ClubMembers clubId={id!} />}
            {activeTab === 'chat' && <ClubChat clubId={id!} clubName={club.name} isMember={isMember} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
