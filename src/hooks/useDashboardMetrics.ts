import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AlertRow } from "@/components/AlertHistory";
import { useAuth } from "@/hooks/useAuth";

export const useDashboardMetrics = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [failedDispatches, setFailedDispatches] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setFailedDispatches(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const typed = data as AlertRow[];
      setAlerts(typed);

      if (typed.length) {
        const { data: failures, error: failureError } = await supabase
          .from("dispatch_logs")
          .select("id")
          .in("alert_id", typed.map((a) => a.id))
          .eq("status", "failed");
        if (!failureError) setFailedDispatches(failures?.length ?? 0);
      } else {
        setFailedDispatches(0);
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { alerts, failedDispatches, loading, reload };
};
