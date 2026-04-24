import { Suspense, lazy, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { AppShell } from "@/components/AppShell";
import { AlertForm } from "@/components/AlertForm";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const AlertMap = lazy(() => import("@/components/AlertMap").then((mod) => ({ default: mod.AlertMap })));

export default function CreateAlertPage() {
  const { t } = useLanguage();
  const { alerts, loading, reload } = useDashboardMetrics();
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);

  return (
    <AppShell title={t("createAlertPage")} subtitle={t("broadcastComposer")}> 
      <div className="grid xl:grid-cols-2 gap-6">
        <AlertForm selected={selected} onSaved={reload} />

        <Card className="p-4">
          <h2 className="text-base font-semibold mb-2">{t("map")}</h2>
          <p className="text-xs text-muted-foreground mb-3">{t("locationHint")}</p>
          {loading ? (
            <div className="h-[460px] grid place-items-center border rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="h-[460px] grid place-items-center border rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <AlertMap
                alerts={alerts.map((a) => ({
                  id: a.id,
                  message: a.message,
                  alert_type: a.alert_type,
                  language: a.language,
                  latitude: a.latitude,
                  longitude: a.longitude,
                  priority: a.priority,
                  created_at: a.created_at,
                }))}
                selected={selected}
                onSelect={setSelected}
              />
            </Suspense>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
