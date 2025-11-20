import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Users, MessageSquare } from 'lucide-react';
import { CreateCollaborationDialog } from '@/components/collaboration/CreateCollaborationDialog';
import { CollaborationChat } from '@/components/collaboration/CollaborationChat';
import { toast } from 'sonner';

interface Collaboration {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  creator_id: string;
}

const Collaborate = () => {
  const { user } = useAuth();
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [selectedCollaboration, setSelectedCollaboration] = useState<Collaboration | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCollaborations();
    }
  }, [user]);

  const fetchCollaborations = async () => {
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('collaboration_members')
        .select('collaboration_id')
        .eq('user_id', user?.id);

      if (memberError) throw memberError;

      const collaborationIds = memberData.map(m => m.collaboration_id);

      if (collaborationIds.length === 0) {
        setCollaborations([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('collaborations')
        .select('*')
        .in('id', collaborationIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCollaborations(data || []);
    } catch (error: any) {
      toast.error('Failed to load collaborations');
      console.error('Error fetching collaborations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCollaborationCreated = () => {
    fetchCollaborations();
    setShowCreateDialog(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading collaborations...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar with collaborations list */}
      <div className="w-80 border-r border-border bg-muted/30 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Collaborations</h2>
            <Button size="icon" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {collaborations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No collaborations yet</p>
              <p className="text-sm mt-1">Create one to get started!</p>
            </div>
          ) : (
            collaborations.map((collab) => (
              <Card
                key={collab.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-muted ${
                  selectedCollaboration?.id === collab.id ? 'bg-muted border-primary' : ''
                }`}
                onClick={() => setSelectedCollaboration(collab)}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 mt-1 text-primary" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{collab.name}</h3>
                    {collab.description && (
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {collab.description}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1">
        {selectedCollaboration ? (
          <CollaborationChat collaboration={selectedCollaboration} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg">Select a collaboration to start chatting</p>
          </div>
        )}
      </div>

      <CreateCollaborationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCollaborationCreated}
      />
    </div>
  );
};

export default Collaborate;
