-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Add index for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add function to notify on new collaboration member
CREATE OR REPLACE FUNCTION notify_collaboration_invite()
RETURNS TRIGGER AS $$
DECLARE
  collab_name TEXT;
BEGIN
  SELECT name INTO collab_name FROM collaborations WHERE id = NEW.collaboration_id;
  
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    NEW.user_id,
    'collaboration_invite',
    'New Collaboration Invitation',
    'You have been invited to ' || collab_name,
    '/collaborate'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for collaboration invites
CREATE TRIGGER on_collaboration_member_added
AFTER INSERT ON collaboration_members
FOR EACH ROW
EXECUTE FUNCTION notify_collaboration_invite();