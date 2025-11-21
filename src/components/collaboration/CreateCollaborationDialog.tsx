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
    const trimmed = currentEmail.trim().toLowerCase();
    if (!trimmed) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return toast.error('Enter a valid email.');

    if (emails.includes(trimmed)) return toast.error('Already added.');

    setEmails([...emails, trimmed]);
    setCurrentEmail('');
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase.rpc(
        'create_collaboration_with_invites',
        {
          _name: name.trim(),
          _description: description.trim() || null,
          _invited_emails: emails,
        }
      );

      if (error) throw error;

      toast.success(
        emails.length
          ? 'Collaboration created! Invitations sent.'
          : 'Collaboration created successfully!'
      );

      onSuccess();
      setName('');
      setDescription('');
      setEmails([]);
    } catch (err) {
      toast.error('Failed to create collaboration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-6 rounded-xl shadow-md border bg-background">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-xl font-semibold">
            Create Collaboration
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create a workspace and optionally invite team members.
          </DialogDescription>
        </DialogHeader>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Project Name */}
          <div className="space-y-2">
            <Label>Collaboration Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Design Team, Build Crew"
              className="h-10"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this collaboration for?"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Invite Emails */}
          <div className="space-y-2">
            <Label>Invite by Email</Label>

            <div className="flex gap-2">
              <Input
                type="email"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                placeholder="user@example.com"
                className="h-10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEmail();
                  }
                }}
              />
              <Button type="button" size="icon" onClick={addEmail}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Email Chips */}
            {emails.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-2 mt-2 border space-y-2">
                {emails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between bg-muted px-3 py-2 rounded-md"
                  >
                    <span className="text-sm">{email}</span>
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

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
