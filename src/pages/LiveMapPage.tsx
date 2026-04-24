import { Suspense, lazy, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

const AlertMap = lazy(() => import("@/components/AlertMap").then((mod) => ({ default: mod.AlertMap })));

export default function LiveMapPage() {
  const { t } = useLanguage();
  const { alerts, loading } = useDashboardMetrics();
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);

  return (
    <AppShell title={t("liveMapPage")} subtitle={t("geospatialMonitor")}> 
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{t("totalAlerts")}: {alerts.length}</Badge>
          <Badge className="bg-emergency text-emergency-foreground">{t("emergencyAlerts")}: {alerts.filter((a) => a.priority === "emergency").length}</Badge>
        </div>

        <Card className="p-4">
          {loading ? (
            <div className="h-[640px] grid place-items-center border rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="h-[640px] grid place-items-center border rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <AlertMap
                autoCenterUser
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
