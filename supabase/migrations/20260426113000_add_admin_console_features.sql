-- Admin console support: user activation, region configuration, and dispatch control

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.system_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read regions" ON public.system_regions;
CREATE POLICY "Authenticated can read regions"
  ON public.system_regions FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage regions" ON public.system_regions;
CREATE POLICY "Admins manage regions"
  ON public.system_regions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_system_regions_updated_at ON public.system_regions;
CREATE TRIGGER set_system_regions_updated_at
  BEFORE UPDATE ON public.system_regions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.dispatch_controls (
  id TEXT PRIMARY KEY,
  paused BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dispatch_controls ENABLE ROW LEVEL SECURITY;

INSERT INTO public.dispatch_controls (id, paused)
VALUES ('global', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can read dispatch controls" ON public.dispatch_controls;
CREATE POLICY "Authenticated can read dispatch controls"
  ON public.dispatch_controls FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage dispatch controls" ON public.dispatch_controls;
CREATE POLICY "Admins manage dispatch controls"
  ON public.dispatch_controls FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_dispatch_controls_updated_at ON public.dispatch_controls;
CREATE TRIGGER set_dispatch_controls_updated_at
  BEFORE UPDATE ON public.dispatch_controls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
