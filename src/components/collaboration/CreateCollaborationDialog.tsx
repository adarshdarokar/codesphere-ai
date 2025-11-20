import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';

interface CreateCollaborationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateCollaborationDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: CreateCollaborationDialogProps) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const addEmail = () => {
    const trimmedEmail = currentEmail.trim().toLowerCase();
    if (!trimmedEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (emails.includes(trimmedEmail)) {
      toast.error('Email already added');
      return;
    }

    setEmails([...emails, trimmedEmail]);
    setCurrentEmail('');
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setLoading(true);
    try {
      // Create collaboration atomically via RPC (handles RLS, creator membership, and sends invites)
      const { data: newCollabId, error: createError } = await supabase.rpc('create_collaboration_with_invites', {
        _name: name.trim(),
        _description: description.trim() || null,
        _invited_emails: emails,
      });

      if (createError) throw createError;

      if (emails.length > 0) {
        toast.success('Collaboration created! Invites sent to added emails.');
      } else {
        toast.success('Collaboration created successfully!');
      }

      onSuccess();
      setName('');
      setDescription('');
      setEmails([]);
    } catch (error: any) {
      toast.error('Failed to create collaboration');
      console.error('Error creating collaboration:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Collaboration</DialogTitle>
          <DialogDescription>
            Create a new collaboration space and invite team members via email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Collaboration Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project Team"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this collaboration about?"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="email">Invite Members (by email)</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                placeholder="user@example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEmail();
                  }
                }}
              />
              <Button type="button" onClick={addEmail} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {emails.length > 0 && (
              <div className="mt-3 space-y-2">
                {emails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between bg-muted px-3 py-2 rounded-md"
                  >
                    <span className="text-sm text-foreground">{email}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEmail(email)}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create Collaboration'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
