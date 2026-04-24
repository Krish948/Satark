import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { SystemDashboards } from "@/components/SystemDashboards";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, PlusSquare, History, Map } from "lucide-react";

const Index = () => {
  const { t } = useLanguage();
  const { alerts, failedDispatches, loading } = useDashboardMetrics();

  return (
    <AppShell title={t("dashboardHome")} subtitle={t("appTagline")}>
      {loading ? (
        <Card className="p-6 h-52 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      ) : (
        <div className="space-y-6">
          <SystemDashboards alerts={alerts} failedDispatches={failedDispatches} />

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-5 bg-card/70 backdrop-blur">
              <p className="text-xs text-muted-foreground mb-2">{t("createAlertPage")}</p>
              <p className="font-semibold mb-3">{t("newIncidentBroadcast")}</p>
              <Link to="/alerts/create">
                <Button className="w-full">
                  <PlusSquare className="h-4 w-4 mr-1" /> {t("openPage")}
                </Button>
              </Link>
            </Card>

            <Card className="p-5 bg-card/70 backdrop-blur">
              <p className="text-xs text-muted-foreground mb-2">{t("historyPage")}</p>
              <p className="font-semibold mb-3">{t("auditAndReview")}</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{t("totalAlerts")}</span>
                <Badge variant="secondary">{alerts.length}</Badge>
              </div>
              <Link to="/alerts/history">
                <Button variant="outline" className="w-full">
                  <History className="h-4 w-4 mr-1" /> {t("openHistoryPage")}
                </Button>
              </Link>
            </Card>

            <Card className="p-5 bg-card/70 backdrop-blur">
              <p className="text-xs text-muted-foreground mb-2">{t("liveMapPage")}</p>
              <p className="font-semibold mb-3">{t("locationAwareness")}</p>
              <Link to="/map/live">
                <Button variant="outline" className="w-full">
                  <Map className="h-4 w-4 mr-1" /> {t("openPage")}
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default Index;
