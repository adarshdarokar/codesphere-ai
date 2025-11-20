-- Fix search_path for notify_collaboration_invite function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;