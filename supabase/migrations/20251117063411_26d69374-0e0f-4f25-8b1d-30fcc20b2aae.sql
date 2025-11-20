-- Drop the problematic RLS policy
DROP POLICY IF EXISTS "Users can view members of collaborations they're in" ON collaboration_members;

-- Create a security definer function to check collaboration membership
CREATE OR REPLACE FUNCTION public.is_collaboration_member(collab_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM collaboration_members
    WHERE collaboration_id = collab_id
      AND collaboration_members.user_id = user_id
  )
$$;

-- Create new RLS policy using the security definer function
CREATE POLICY "Users can view members of their collaborations"
ON collaboration_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  public.is_collaboration_member(collaboration_id, auth.uid())
);