-- Extend alert status workflow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'alert_status' AND e.enumlabel = 'pending_approval'
  ) THEN
    ALTER TYPE public.alert_status ADD VALUE 'pending_approval';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'alert_status' AND e.enumlabel = 'closed'
  ) THEN
    ALTER TYPE public.alert_status ADD VALUE 'closed';
  END IF;
END $$;

-- Region / zone tagging
ALTER TABLE public.alerts
ADD COLUMN IF NOT EXISTS region TEXT;

CREATE INDEX IF NOT EXISTS idx_alerts_region_created_at
  ON public.alerts (region, created_at DESC);

-- Dispatch logs for reliability monitoring and retries
CREATE TABLE IF NOT EXISTS public.dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  attempts INT NOT NULL DEFAULT 1,
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_logs_alert_created_at
  ON public.dispatch_logs (alert_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dispatch_logs_status_created_at
  ON public.dispatch_logs (status, created_at DESC);

ALTER TABLE public.dispatch_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read dispatch logs" ON public.dispatch_logs;
CREATE POLICY "Authenticated can read dispatch logs"
  ON public.dispatch_logs FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert dispatch logs" ON public.dispatch_logs;
CREATE POLICY "Authenticated can insert dispatch logs"
  ON public.dispatch_logs FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update dispatch logs" ON public.dispatch_logs;
CREATE POLICY "Authenticated can update dispatch logs"
  ON public.dispatch_logs FOR UPDATE TO authenticated
  USING (true);
