-- ============================================================
-- RumahQu Database Schema (Reference / Future Migration)
-- ============================================================

-- 1. Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- 3. Group members table
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Groups: members can view their groups
CREATE POLICY "Members can view groups"
  ON public.groups FOR SELECT
  TO authenticated
  USING (public.is_group_member(auth.uid(), id));

-- Groups: any authenticated user can create
CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Groups: only creator can delete
CREATE POLICY "Creator can delete group"
  ON public.groups FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Group members: members can see other members in their groups
CREATE POLICY "Members can view group members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

-- Group members: group owner can add members
CREATE POLICY "Owner can add members"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_members.group_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
    OR auth.uid() = user_id -- user can add themselves (accept invite)
  );

-- Group members: owner can remove, or user can remove self
CREATE POLICY "Owner or self can remove members"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'owner'
    )
  );

-- 4. Group invites table
CREATE TABLE public.group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, invited_email)
);

CREATE INDEX idx_group_invites_email ON public.group_invites(invited_email);

ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Invites: viewable by group members or the invited user
CREATE POLICY "Members and invitee can view invites"
  ON public.group_invites FOR SELECT
  TO authenticated
  USING (
    public.is_group_member(auth.uid(), group_id)
    OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Invites: group owner can create
CREATE POLICY "Owner can create invites"
  ON public.group_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_invites.group_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- Invites: owner or invitee can delete (accept/decline)
CREATE POLICY "Owner or invitee can delete invite"
  ON public.group_invites FOR DELETE
  TO authenticated
  USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_id = group_invites.group_id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- 5. Inventory items table (per-group, not per-user)
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'pcs',
  expiration_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_group ON public.inventory_items(group_id);
CREATE INDEX idx_inventory_expiry ON public.inventory_items(expiration_date);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Inventory: group members can view
CREATE POLICY "Group members can view items"
  ON public.inventory_items FOR SELECT
  TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

-- Inventory: group members can insert
CREATE POLICY "Group members can insert items"
  ON public.inventory_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_group_member(auth.uid(), group_id));

-- Inventory: group members can update
CREATE POLICY "Group members can update items"
  ON public.inventory_items FOR UPDATE
  TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

-- Inventory: group members can delete
CREATE POLICY "Group members can delete items"
  ON public.inventory_items FOR DELETE
  TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

-- Auto-create personal group on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_group_id UUID;
BEGIN
  INSERT INTO public.groups (name, created_by)
  VALUES (
    'Rumah ' || COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), 'Keluarga'),
    NEW.id
  )
  RETURNING id INTO new_group_id;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (new_group_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_group
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_group();
