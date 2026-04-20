import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Shield, User, UserMinus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { formatDate } from '../../../lib/utils';

interface Props {
  clubId: string;
}

export const ClubMembers: React.FC<Props> = ({ clubId }) => {
  const { profile } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from('club_members')
      .select('*, user:user_id(id, name, email, role, student_id, avatar_url, department)')
      .eq('club_id', clubId)
      .order('role');
    if (data) {
      setMembers(data);
      const me = data.find((m: any) => m.user_id === profile?.id);
      if (me) setMyRole(me.role);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [clubId, profile]);

  const promoteRole = async (memberId: string, newRole: string) => {
    const { error } = await supabase.from('club_members').update({ role: newRole }).eq('id', memberId);
    if (error) { toast.error('Failed to update role'); return; }
    toast.success('Role updated!');
    load();
  };

  const removeMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from the club?`)) return;
    const { error } = await supabase.from('club_members').delete().eq('id', memberId);
    if (error) { toast.error('Failed to remove member'); return; }
    toast.success('Member removed');
    load();
  };

  const roleIcon: Record<string, React.ReactNode> = {
    president: <Crown size={12} className="text-amber-500" />,
    officer: <Shield size={12} className="text-blue-500" />,
    member: <User size={12} className="text-zinc-400" />,
  };

  const roleColors: Record<string, any> = { president: 'warning', officer: 'info', member: 'default' };

  const canManage = myRole === 'president' || profile?.role === 'admin';

  const grouped = {
    president: members.filter(m => m.role === 'president'),
    officer: members.filter(m => m.role === 'officer'),
    member: members.filter(m => m.role === 'member'),
  };

  if (loading) return (
    <div className="p-6 space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-14 rounded-xl" />)}</div>
  );

  if (members.length === 0) return (
    <div className="p-6"><EmptyState icon={<User size={24} />} title="No members yet" /></div>
  );

  return (
    <div className="p-6 max-w-2xl">
      <p className="text-sm text-zinc-500 mb-4">{members.length} total member{members.length !== 1 ? 's' : ''}</p>
      {Object.entries(grouped).map(([role, roleMembers]) => roleMembers.length > 0 && (
        <div key={role} className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            {roleIcon[role]}
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{role}s ({roleMembers.length})</h3>
          </div>
          <div className="space-y-2">
            {roleMembers.map((m, idx) => (
              <motion.div key={m.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <Avatar name={m.user?.name} src={m.user?.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{m.user?.name}</p>
                    {m.user_id === profile?.id && <span className="text-xs text-blue-400">(you)</span>}
                  </div>
                  <p className="text-xs text-zinc-400 truncate">{m.user?.department || m.user?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={roleColors[m.role]} size="sm">{m.role}</Badge>
                  {canManage && m.user_id !== profile?.id && (
                    <div className="flex gap-1">
                      {m.role === 'member' && (
                        <Button size="sm" variant="ghost" onClick={() => promoteRole(m.id, 'officer')}
                          className="text-xs px-2">Promote</Button>
                      )}
                      {m.role === 'officer' && (
                        <Button size="sm" variant="ghost" onClick={() => promoteRole(m.id, 'member')}
                          className="text-xs px-2">Demote</Button>
                      )}
                      <Button size="sm" variant="ghost" icon={<UserMinus size={12} />}
                        onClick={() => removeMember(m.id, m.user?.name)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
