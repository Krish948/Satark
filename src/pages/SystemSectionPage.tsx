import { useParams } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { AppShell } from "@/components/AppShell";
import { SystemSectionPanel, type SystemSection } from "@/components/SystemSectionPanel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw } from "lucide-react";

const isSection = (value: string | undefined): value is SystemSection =>
  value === "alerting" || value === "workflow" || value === "dispatch" || value === "geo";

export default function SystemSectionPage() {
  const { t } = useLanguage();
  const { section } = useParams();
  const { alerts, failedDispatches, loading, reload } = useDashboardMetrics();

  if (!isSection(section)) {
    return (
      <AppShell title={t("invalidSection")}>
        <Card className="p-6 w-full max-w-xl text-center space-y-4">
          <p className="text-lg font-semibold">{t("invalidSection")}</p>
        </Card>
      </AppShell>
    );
  }

  const titleMap: Record<SystemSection, string> = {
    alerting: t("alertingSystem"),
    workflow: t("workflowSystem"),
    dispatch: t("dispatchSystem"),
    geo: t("geoSystem"),
  };

  const subtitleMap: Record<SystemSection, string> = {
    alerting: t("newIncidentBroadcast"),
    workflow: t("auditAndReview"),
    dispatch: t("healthCenter"),
    geo: t("locationAwareness"),
  };

  return (
    <AppShell title={titleMap[section]} subtitle={subtitleMap[section]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary">{t("live")}</Badge>
          <Button variant="outline" size="sm" onClick={reload}>
            <RefreshCcw className="h-4 w-4 mr-1" /> {t("refresh")}
          </Button>
        </div>
        <Card className="p-6 space-y-4">
          <h1 className="text-xl font-semibold">{titleMap[section]}</h1>
          {loading ? (
            <div className="h-28 grid place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SystemSectionPanel section={section} alerts={alerts} failedDispatches={failedDispatches} />
          )}
        </Card>
      </div>
    </AppShell>
  );
}
