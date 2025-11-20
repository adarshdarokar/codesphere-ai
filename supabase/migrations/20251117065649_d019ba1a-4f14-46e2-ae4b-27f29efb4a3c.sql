-- Update RPC to not auto-add invited users as members; only creator is added
create or replace function public.create_collaboration_with_invites(
  _name text,
  _description text default null,
  _invited_emails text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_collab_id uuid;
  collab_name text := trim(_name);
  creator_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Create collaboration owned by current user
  insert into public.collaborations (name, description, creator_id)
  values (collab_name, nullif(trim(coalesce(_description, '')), ''), auth.uid())
  returning id into new_collab_id;

  -- Add creator as member
  insert into public.collaboration_members (collaboration_id, user_id)
  values (new_collab_id, auth.uid())
  on conflict do nothing;

  -- Get creator display name for notifications
  select coalesce(p.full_name, p.email) into creator_name
  from public.profiles p
  where p.id = auth.uid();

  -- If emails provided, just send invite notifications to existing users (no auto-add)
  if _invited_emails is not null and array_length(_invited_emails, 1) > 0 then
    with norm_emails as (
      select lower(unnest(_invited_emails)) as email
    ), targets as (
      select p.id, p.email
      from public.profiles p
      join norm_emails e on lower(p.email) = e.email
      where p.id <> auth.uid()
    )
    insert into public.notifications (user_id, type, title, message, link, action_type, action_data)
    select t.id,
           'collaboration_invite',
           'Collaboration Invitation',
           creator_name || ' invited you to join "' || collab_name || '"',
           '/collaborate',
           'accept_invite',
           jsonb_build_object('collaboration_id', new_collab_id)
    from targets t;
  end if;

  return new_collab_id;
end;
$$;
