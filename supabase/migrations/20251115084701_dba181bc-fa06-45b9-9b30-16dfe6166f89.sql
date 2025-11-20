-- Create collaborations table
CREATE TABLE public.collaborations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create collaboration_members table
CREATE TABLE public.collaboration_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaboration_id UUID NOT NULL REFERENCES public.collaborations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(collaboration_id, user_id)
);

-- Create collaboration_messages table
CREATE TABLE public.collaboration_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaboration_id UUID NOT NULL REFERENCES public.collaborations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_ai BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaborations
CREATE POLICY "Users can view collaborations they are members of"
ON public.collaborations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.collaboration_members
    WHERE collaboration_members.collaboration_id = collaborations.id
    AND collaboration_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create collaborations"
ON public.collaborations FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their collaborations"
ON public.collaborations FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their collaborations"
ON public.collaborations FOR DELETE
USING (auth.uid() = creator_id);

-- RLS Policies for collaboration_members
CREATE POLICY "Users can view members of their collaborations"
ON public.collaboration_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.collaboration_members cm
    WHERE cm.collaboration_id = collaboration_members.collaboration_id
    AND cm.user_id = auth.uid()
  )
);

CREATE POLICY "Creators can add members"
ON public.collaboration_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.collaborations
    WHERE collaborations.id = collaboration_members.collaboration_id
    AND collaborations.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can remove themselves from collaborations"
ON public.collaboration_members FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for collaboration_messages
CREATE POLICY "Users can view messages in their collaborations"
ON public.collaboration_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.collaboration_members
    WHERE collaboration_members.collaboration_id = collaboration_messages.collaboration_id
    AND collaboration_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their collaborations"
ON public.collaboration_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.collaboration_members
    WHERE collaboration_members.collaboration_id = collaboration_messages.collaboration_id
    AND collaboration_members.user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_collaborations_updated_at
BEFORE UPDATE ON public.collaborations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for collaboration messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_messages;