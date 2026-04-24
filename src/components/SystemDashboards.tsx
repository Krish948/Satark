import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import type { AlertRow } from "@/components/AlertHistory";
import { SystemSectionPanel } from "@/components/SystemSectionPanel";

interface Props {
  alerts: AlertRow[];
  failedDispatches: number;
}

export const SystemDashboards = ({ alerts, failedDispatches }: Props) => {
  const { t } = useLanguage();

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-sm font-medium">{t("systemDashboards")}</p>
        <Badge variant="secondary">{t("live")}</Badge>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border p-3 bg-card/60">
          <p className="text-xs text-muted-foreground mb-2">{t("historyPageTitle")}</p>
          <p className="text-xl font-semibold">{alerts.length}</p>
          <Link to="/alerts/history" className="inline-block mt-2">
            <Button size="sm" variant="outline">{t("openHistoryPage")}</Button>
          </Link>
        </div>
        <div className="rounded-lg border p-3 bg-card/60">
          <p className="text-xs text-muted-foreground mb-2">{t("alertingSystem")}</p>
          <p className="text-xl font-semibold">{t("systemOverview")}</p>
          <Link to="/systems/alerting" className="inline-block mt-2">
            <Button size="sm" variant="outline">{t("openPage")}</Button>
          </Link>
        </div>
        <div className="rounded-lg border p-3 bg-card/60">
          <p className="text-xs text-muted-foreground mb-2">{t("dispatchSystem")}</p>
          <p className="text-xl font-semibold">{t("healthCenter")}</p>
          <Link to="/systems/dispatch" className="inline-block mt-2">
            <Button size="sm" variant="outline">{t("openPage")}</Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="alerting" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="alerting">{t("alertingSystem")}</TabsTrigger>
          <TabsTrigger value="workflow">{t("workflowSystem")}</TabsTrigger>
          <TabsTrigger value="dispatch">{t("dispatchSystem")}</TabsTrigger>
          <TabsTrigger value="geo">{t("geoSystem")}</TabsTrigger>
        </TabsList>

        <TabsContent value="alerting" className="mt-3">
          <SystemSectionPanel section="alerting" alerts={alerts} failedDispatches={failedDispatches} />
          <Link to="/systems/alerting" className="inline-block mt-3">
            <Button size="sm" variant="outline">{t("openPage")}</Button>
          </Link>
        </TabsContent>

        <TabsContent value="workflow" className="mt-3">
          <SystemSectionPanel section="workflow" alerts={alerts} failedDispatches={failedDispatches} />
          <Link to="/systems/workflow" className="inline-block mt-3">
            <Button size="sm" variant="outline">{t("openPage")}</Button>
          </Link>
        </TabsContent>

        <TabsContent value="dispatch" className="mt-3">
          <SystemSectionPanel section="dispatch" alerts={alerts} failedDispatches={failedDispatches} />
          <Link to="/systems/dispatch" className="inline-block mt-3">
            <Button size="sm" variant="outline">{t("openPage")}</Button>
          </Link>
        </TabsContent>

        <TabsContent value="geo" className="mt-3">
          <SystemSectionPanel section="geo" alerts={alerts} failedDispatches={failedDispatches} />
          <Link to="/systems/geo" className="inline-block mt-3">
            <Button size="sm" variant="outline">{t("openPage")}</Button>
          </Link>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
