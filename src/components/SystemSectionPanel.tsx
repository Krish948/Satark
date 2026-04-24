import { useLanguage } from "@/hooks/useLanguage";
import type { AlertRow } from "@/components/AlertHistory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export type SystemSection = "alerting" | "workflow" | "dispatch" | "geo";

interface Props {
  section: SystemSection;
  alerts: AlertRow[];
  failedDispatches: number;
}

const Metric = ({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "danger" | "success" }) => {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "success"
      ? "text-emerald-600"
      : "text-foreground";

  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold leading-tight ${toneClass}`}>{value}</p>
    </div>
  );
};

export const SystemSectionPanel = ({ section, alerts, failedDispatches }: Props) => {
  const { t } = useLanguage();

  const total = alerts.length;
  const published = alerts.filter((a) => a.status === "published").length;
  const draft = alerts.filter((a) => a.status === "draft").length;
  const emergency = alerts.filter((a) => a.priority === "emergency").length;
  const pendingApproval = alerts.filter((a) => a.status === "pending_approval").length;
  const archived = alerts.filter((a) => a.status === "archived").length;
  const closed = alerts.filter((a) => a.status === "closed").length;
  const openQueue = draft + pendingApproval;
  const publishRate = total ? Math.round((published / total) * 100) : 0;

  const withCoordinates = alerts.filter((a) => Number.isFinite(a.latitude) && Number.isFinite(a.longitude)).length;
  const withRegion = alerts.filter((a) => (a.region ?? "").trim().length > 0).length;
  const regions = new Set(alerts.map((a) => a.region).filter(Boolean)).size;
  const regionCoverage = total ? Math.round((withRegion / total) * 100) : 0;

  const dispatchSuccessApprox = Math.max(published * 5 - failedDispatches, 0);
  const failureRate = published ? Math.round((failedDispatches / (published * 5)) * 100) : 0;
  const affectedPublishedAlerts = Math.min(published, Math.ceil(failedDispatches / 5));

  const typeCounts = alerts.reduce<Record<string, number>>((acc, alert) => {
    acc[alert.alert_type] = (acc[alert.alert_type] ?? 0) + 1;
    return acc;
  }, {});

  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const regionCounts = alerts.reduce<Record<string, number>>((acc, alert) => {
    const region = (alert.region ?? "").trim();
    if (!region) return acc;
    acc[region] = (acc[region] ?? 0) + 1;
    return acc;
  }, {});

  const topRegions = Object.entries(regionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const renderTopList = (items: Array<[string, number]>) => {
    if (!items.length) {
      return <p className="text-sm text-muted-foreground">{t("noData")}</p>;
    }

    return (
      <ul className="space-y-2">
        {items.map(([name, count]) => (
          <li key={name} className="flex items-center justify-between text-sm">
            <span className="truncate pr-2">{name}</span>
            <span className="text-muted-foreground">{count}</span>
          </li>
        ))}
      </ul>
    );
  };

  if (section === "alerting") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label={t("totalAlerts")} value={alerts.length} />
          <Metric label={t("publishedAlerts")} value={published} tone="success" />
          <Metric label={t("draft")} value={draft} />
          <Metric label={t("emergencyAlerts")} value={emergency} tone="danger" />
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <Card className="p-4 space-y-2">
            <p className="text-sm font-semibold">{t("publishRate")}</p>
            <p className="text-2xl font-semibold text-emerald-600">{publishRate}%</p>
            <p className="text-xs text-muted-foreground">{t("openQueue")}: {openQueue}</p>
          </Card>
          <Card className="p-4 space-y-2">
            <p className="text-sm font-semibold">{t("topAlertTypes")}</p>
            {renderTopList(topTypes)}
          </Card>
          <Card className="p-4 space-y-3">
            <p className="text-sm font-semibold">{t("quickActions")}</p>
            <Link to="/alerts/create"><Button variant="outline" size="sm" className="w-full">{t("gotoCreate")}</Button></Link>
            <Link to="/alerts/history"><Button variant="outline" size="sm" className="w-full">{t("gotoHistory")}</Button></Link>
          </Card>
        </div>
      </div>
    );
  }

  if (section === "workflow") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label={t("pendingApprovals")} value={pendingApproval} tone="danger" />
          <Metric label={t("published")} value={published} tone="success" />
          <Metric label={t("archived")} value={archived} />
          <Metric label={t("closed")} value={closed} />
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <Card className="p-4 space-y-2">
            <p className="text-sm font-semibold">{t("queueHealth")}</p>
            <p className="text-2xl font-semibold">{openQueue}</p>
            <p className="text-xs text-muted-foreground">{t("openQueue")}</p>
          </Card>
          <Card className="p-4 space-y-3">
            <p className="text-sm font-semibold">{t("lifecycleMix")}</p>
            <div className="space-y-2">
              <div className="h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${publishRate}%` }} /></div>
              <div className="h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${total ? Math.round((archived / total) * 100) : 0}%` }} /></div>
              <div className="h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-emerald-600" style={{ width: `${total ? Math.round((closed / total) * 100) : 0}%` }} /></div>
            </div>
          </Card>
          <Card className="p-4 space-y-3">
            <p className="text-sm font-semibold">{t("quickActions")}</p>
            <Link to="/alerts/history"><Button variant="outline" size="sm" className="w-full">{t("gotoHistory")}</Button></Link>
            <Link to="/alerts/create"><Button variant="outline" size="sm" className="w-full">{t("gotoCreate")}</Button></Link>
          </Card>
        </div>
      </div>
    );
  }

  if (section === "dispatch") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label={t("dispatchFailures")} value={failedDispatches} tone="danger" />
          <Metric label={t("dispatchSuccesses")} value={dispatchSuccessApprox} tone="success" />
          <Metric label={t("publishedAlerts")} value={published} />
          <Metric label={t("channelsPerAlert")} value={5} />
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <Card className="p-4 space-y-2">
            <p className="text-sm font-semibold">{t("failureRate")}</p>
            <p className="text-2xl font-semibold text-destructive">{failureRate}%</p>
            <p className="text-xs text-muted-foreground">{t("dispatchFailures")}: {failedDispatches}</p>
          </Card>
          <Card className="p-4 space-y-2">
            <p className="text-sm font-semibold">{t("affectedAlerts")}</p>
            <p className="text-2xl font-semibold">{affectedPublishedAlerts}</p>
            <p className="text-xs text-muted-foreground">{t("publishedAlerts")}</p>
          </Card>
          <Card className="p-4 space-y-3">
            <p className="text-sm font-semibold">{t("quickActions")}</p>
            <Link to="/alerts/history"><Button variant="outline" size="sm" className="w-full">{t("gotoHistory")}</Button></Link>
            <Link to="/systems/dispatch"><Button variant="outline" size="sm" className="w-full">{t("openPage")}</Button></Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label={t("alertsWithCoordinates")} value={withCoordinates} tone="success" />
        <Metric label={t("alertsWithRegion")} value={withRegion} />
        <Metric label={t("activeRegions")} value={regions} />
        <Metric
          label={t("mapCoverage")}
          value={alerts.length ? `${Math.round((withCoordinates / alerts.length) * 100)}%` : "0%"}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="p-4 space-y-2">
          <p className="text-sm font-semibold">{t("mappedAlerts")}</p>
          <p className="text-2xl font-semibold">{withCoordinates}</p>
          <p className="text-xs text-muted-foreground">{t("regionCoverage")}: {regionCoverage}%</p>
        </Card>
        <Card className="p-4 space-y-2">
          <p className="text-sm font-semibold">{t("topRegions")}</p>
          {renderTopList(topRegions)}
        </Card>
        <Card className="p-4 space-y-3">
          <p className="text-sm font-semibold">{t("quickActions")}</p>
          <Link to="/map/live"><Button variant="outline" size="sm" className="w-full">{t("gotoMap")}</Button></Link>
          <Link to="/alerts/create"><Button variant="outline" size="sm" className="w-full">{t("gotoCreate")}</Button></Link>
        </Card>
      </div>
    </div>
  );
};
