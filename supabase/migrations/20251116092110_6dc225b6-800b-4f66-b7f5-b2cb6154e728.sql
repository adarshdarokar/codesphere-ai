-- Function to notify collaboration members of new messages
CREATE OR REPLACE FUNCTION notify_collaboration_message()
RETURNS TRIGGER AS $$
DECLARE
  member_record RECORD;
  sender_name TEXT;
  collab_name TEXT;
BEGIN
  -- Don't send notifications for AI messages
  IF NEW.is_ai THEN
    RETURN NEW;
  END IF;

  -- Get sender name
  SELECT COALESCE(full_name, email) INTO sender_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Get collaboration name
  SELECT name INTO collab_name
  FROM collaborations
  WHERE id = NEW.collaboration_id;

  -- Notify all members except the sender
  FOR member_record IN
    SELECT user_id
    FROM collaboration_members
    WHERE collaboration_id = NEW.collaboration_id
      AND user_id != NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (
      member_record.user_id,
      'collaboration_message',
      'New message in ' || collab_name,
      sender_name || ': ' || LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
      '/collaborate'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new collaboration messages
CREATE TRIGGER on_collaboration_message_created
AFTER INSERT ON collaboration_messages
FOR EACH ROW
EXECUTE FUNCTION notify_collaboration_message();