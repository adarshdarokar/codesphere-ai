-- Fix infinite recursion in collaboration_members RLS policies
DROP POLICY IF EXISTS "Users can view members of their collaborations" ON collaboration_members;
DROP POLICY IF EXISTS "Creators can add members" ON collaboration_members;

-- Create simpler policies that don't cause recursion
CREATE POLICY "Users can view members of collaborations they're in"
ON collaboration_members FOR SELECT
USING (
  user_id = auth.uid() OR
  collaboration_id IN (
    SELECT collaboration_id 
    FROM collaboration_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Creators can add members to their collaborations"
ON collaboration_members FOR INSERT
WITH CHECK (
  collaboration_id IN (
    SELECT id FROM collaborations WHERE creator_id = auth.uid()
  )
);

-- Add policy for users to join via invitation
CREATE POLICY "Users can add themselves when invited"
ON collaboration_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Update notifications table to support invitation actions
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_data JSONB;

-- Create function to handle invitation acceptance
CREATE OR REPLACE FUNCTION accept_collaboration_invite(notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notif_record RECORD;
BEGIN
  -- Get notification details
  SELECT * INTO notif_record
  FROM notifications
  WHERE id = notification_id AND user_id = auth.uid() AND type = 'collaboration_invite';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found or unauthorized';
  END IF;

  -- Add user to collaboration
  INSERT INTO collaboration_members (collaboration_id, user_id)
  VALUES (
    (notif_record.action_data->>'collaboration_id')::UUID,
    auth.uid()
  )
  ON CONFLICT DO NOTHING;

  -- Mark notification as read
  UPDATE notifications
  SET read = true
  WHERE id = notification_id;
END;
$$;

-- Update the invite trigger to include action data
CREATE OR REPLACE FUNCTION notify_collaboration_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  collab_name TEXT;
  creator_name TEXT;
  invited_user_id UUID;
BEGIN
  -- Get collaboration name
  SELECT name INTO collab_name
  FROM collaborations
  WHERE id = NEW.collaboration_id;

  -- Get creator name
  SELECT COALESCE(full_name, email) INTO creator_name
  FROM profiles
  WHERE id = (SELECT creator_id FROM collaborations WHERE id = NEW.collaboration_id);

  -- Get invited user id by email
  SELECT id INTO invited_user_id
  FROM profiles
  WHERE email = (SELECT email FROM profiles WHERE id = NEW.user_id);

  -- Only send notification if not the creator
  IF invited_user_id != (SELECT creator_id FROM collaborations WHERE id = NEW.collaboration_id) THEN
    INSERT INTO notifications (user_id, type, title, message, link, action_type, action_data)
    VALUES (
      NEW.user_id,
      'collaboration_invite',
      'Collaboration Invitation',
      creator_name || ' invited you to join "' || collab_name || '"',
      '/collaborate',
      'accept_invite',
      jsonb_build_object('collaboration_id', NEW.collaboration_id)
    );
  END IF;

  RETURN NEW;
END;
$$;