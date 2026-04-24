import { useLanguage } from "@/hooks/useLanguage";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { AppShell } from "@/components/AppShell";
import { AlertHistory } from "@/components/AlertHistory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, History } from "lucide-react";

export default function AlertHistoryPage() {
  const { t } = useLanguage();
  const { alerts, loading: loadingMetrics, reload } = useDashboardMetrics();

  return (
    <AppShell title={t("historyPageTitle")} subtitle={t("auditAndReview")}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <h1 className="text-xl font-semibold">{t("historyPageTitle")}</h1>
            <Badge variant="secondary">{alerts.length}</Badge>
          </div>

          <Button variant="outline" size="sm" onClick={reload}>
            <RefreshCcw className="h-4 w-4 mr-1" /> {t("refresh")}
          </Button>
        </div>

        {loadingMetrics ? (
          <Card className="p-6 h-52 grid place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </Card>
        ) : (
          <AlertHistory alerts={alerts} onChange={reload} />
        )}
      </div>
    </AppShell>
  );
}
