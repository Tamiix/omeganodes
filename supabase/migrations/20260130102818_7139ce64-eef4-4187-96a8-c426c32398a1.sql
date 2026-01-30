-- Create a helper function to check if user is owner
CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'owner'
  )
$$;

-- Update RLS policies on user_roles to allow owners to manage admins
-- Drop existing policies first
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

-- Create new policies that allow both owners and admins, but only owners can modify admin/owner roles
CREATE POLICY "Owners and admins can delete roles"
ON public.user_roles
FOR DELETE
USING (
  is_owner(auth.uid())
  OR
  (has_role(auth.uid(), 'admin') AND role NOT IN ('admin', 'owner'))
);

CREATE POLICY "Owners and admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
  is_owner(auth.uid())
  OR
  (has_role(auth.uid(), 'admin') AND role NOT IN ('admin', 'owner'))
);

CREATE POLICY "Owners and admins can update roles"
ON public.user_roles
FOR UPDATE
USING (
  is_owner(auth.uid())
  OR
  (has_role(auth.uid(), 'admin') AND role NOT IN ('admin', 'owner'))
);