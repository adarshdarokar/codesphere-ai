import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserCircle, UserMinus, Crown } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Member {
  id: string;
  user_id: string;
  joined_at: string;
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

interface MembersListProps {
  collaborationId: string;
  creatorId: string;
}

export const MembersList = ({ collaborationId, creatorId }: MembersListProps) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const isCreator = user?.id === creatorId;

  useEffect(() => {
    fetchMembers();
    subscribeToPresence();
  }, [collaborationId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('collaboration_members')
        .select('*')
        .eq('collaboration_id', collaborationId);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = data.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const membersWithProfiles = data.map(member => ({
          ...member,
          profiles: profileMap.get(member.user_id),
        }));

        setMembers(membersWithProfiles);
      }
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    }
  };

  const subscribeToPresence = () => {
    const channel = supabase.channel(`collaboration-presence:${collaborationId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            online.add(presence.user_id);
          });
        });
        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && user) {
          await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !isCreator) return;

    try {
      const { error } = await supabase
        .from('collaboration_members')
        .delete()
        .eq('id', memberToRemove.id);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
      toast.success('Member removed successfully');
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    } finally {
      setMemberToRemove(null);
    }
  };

  return (
    <>
      <div className="w-64 border-l border-border bg-muted/30 flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Members ({members.length})</h3>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {members.map((member) => {
              const isOnline = onlineUsers.has(member.user_id);
              const isMemberCreator = member.user_id === creatorId;
              const isCurrentUser = member.user_id === user?.id;

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <UserCircle className="h-8 w-8 text-muted-foreground" />
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.profiles?.full_name || member.profiles?.email}
                        {isCurrentUser && ' (You)'}
                      </p>
                      {isMemberCreator && (
                        <Crown className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {isOnline ? 'Online' : 'Offline'}
                    </p>
                  </div>
                  {isCreator && !isMemberCreator && !isCurrentUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setMemberToRemove(member)}
                    >
                      <UserMinus className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              {memberToRemove?.profiles?.full_name || memberToRemove?.profiles?.email} from this
              collaboration? They will lose access to all messages and content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
