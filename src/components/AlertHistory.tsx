import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { dispatchAlert } from "@/lib/dispatch";
import { toast } from "sonner";
import { Copy, Trash2, Search, MessageSquare, Twitter, Instagram, Facebook, Radio, History, Download, Calendar, FileText, Layers, Repeat } from "lucide-react";

export interface AlertRow {
  id: string;
  message: string;
  location: string;
  latitude: number;
  longitude: number;
  alert_type: string;
  priority: "normal" | "emergency";
  status: "draft" | "published" | "archived" | "pending_approval" | "closed";
  language: string;
  region: string | null;
  next_update: string | null;
  sms: string | null;
  twitter: string | null;
  instagram: string | null;
  facebook: string | null;
  radio: string | null;
  created_at: string;
  user_id: string;
}

interface Props {
  alerts: AlertRow[];
  onChange: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  onDuplicate?: (alert: AlertRow) => void;
}

interface SavedPreset {
  id: string;
  name: string;
  query: string;
  typeFilter: string;
  statusFilter: string;
  regionFilter: string;
  dateFilter: string;
  fromDate: string;
  toDate: string;
}

const channels = [
  { key: "sms", label: "SMS", Icon: MessageSquare },
  { key: "twitter", label: "Twitter / X", Icon: Twitter },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "radio", label: "Radio", Icon: Radio },
] as const;

export const AlertHistory = ({ alerts, onChange, hasMore = false, loadingMore = false, onLoadMore, onDuplicate }: Props) => {
  const { t } = useLanguage();
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const [regionFilter, setRegionFilter] = useState<string>("__all__");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showTimeline, setShowTimeline] = useState(false);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState("none");
  const [failedDispatchByAlert, setFailedDispatchByAlert] = useState<Record<string, number>>({});

  useEffect(() => {
    const raw = localStorage.getItem("satark-history-presets");
    if (!raw) return;
    try {
      setSavedPresets(JSON.parse(raw) as SavedPreset[]);
    } catch {
      setSavedPresets([]);
    }
  }, []);

  useEffect(() => {
    if (!alerts.length) {
      setFailedDispatchByAlert({});
      return;
    }

    const loadDispatchFailures = async () => {
      const { data, error } = await supabase
        .from("dispatch_logs")
        .select("alert_id,status")
        .in("alert_id", alerts.map((a) => a.id));
      if (error || !data) return;

      const map: Record<string, number> = {};
      for (const row of data) {
        if ((row as { status: string }).status !== "failed") continue;
        const id = (row as { alert_id: string }).alert_id;
        map[id] = (map[id] ?? 0) + 1;
      }
      setFailedDispatchByAlert(map);
    };

    loadDispatchFailures();
  }, [alerts]);

  const types = useMemo(() => {
    const set = new Set(alerts.map((a) => a.alert_type));
    return Array.from(set);
  }, [alerts]);

  const regions = useMemo(() => {
    const set = new Set(alerts.map((a) => a.region).filter(Boolean));
    return Array.from(set) as string[];
  }, [alerts]);

  const inDateRange = useCallback((value: string) => {
    if (dateFilter === "all") return true;
    const created = new Date(value).getTime();
    if (Number.isNaN(created)) return false;
    const now = Date.now();

    if (dateFilter === "today") {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      return created >= dayStart.getTime();
    }
    if (dateFilter === "24h") return created >= now - 24 * 60 * 60 * 1000;
    if (dateFilter === "7d") return created >= now - 7 * 24 * 60 * 60 * 1000;
    if (dateFilter === "30d") return created >= now - 30 * 24 * 60 * 60 * 1000;
    if (dateFilter === "custom") {
      const from = fromDate ? new Date(fromDate).getTime() : Number.MIN_SAFE_INTEGER;
      const to = toDate ? new Date(`${toDate}T23:59:59`).getTime() : Number.MAX_SAFE_INTEGER;
      return created >= from && created <= to;
    }
    return true;
  }, [dateFilter, fromDate, toDate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alerts.filter((a) => {
      if (typeFilter !== "__all__" && a.alert_type !== typeFilter) return false;
      if (statusFilter !== "__all__" && a.status !== statusFilter) return false;
      if (regionFilter !== "__all__" && (a.region ?? "") !== regionFilter) return false;
      if (!inDateRange(a.created_at)) return false;
      if (!q) return true;

      const searchCorpus = [
        a.message,
        a.location,
        a.alert_type,
        a.region ?? "",
        a.priority,
        a.language,
        a.status,
        a.sms ?? "",
        a.twitter ?? "",
        a.instagram ?? "",
        a.facebook ?? "",
        a.radio ?? "",
      ].join(" ").toLowerCase();

      return searchCorpus.includes(q);
    });
  }, [alerts, query, typeFilter, statusFilter, regionFilter, inDateRange]);

  const timeline = useMemo(() => {
    const groups = new Map<string, AlertRow[]>();
    for (const alert of filtered) {
      const key = new Date(alert.created_at).toLocaleDateString();
      const arr = groups.get(key) ?? [];
      arr.push(alert);
      groups.set(key, arr);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const exportCsv = () => {
    const escape = (value: unknown) => {
      const text = String(value ?? "");
      if (text.includes(",") || text.includes("\n") || text.includes('"')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const headers = [
      "id",
      "created_at",
      "priority",
      "status",
      "language",
      "alert_type",
      "region",
      "location",
      "message",
      "sms",
      "twitter",
      "instagram",
      "facebook",
      "radio",
    ];

    const rows = filtered.map((a) => [
      a.id,
      a.created_at,
      a.priority,
      a.status,
      a.language,
      a.alert_type,
      a.region ?? "",
      a.location,
      a.message,
      a.sms ?? "",
      a.twitter ?? "",
      a.instagram ?? "",
      a.facebook ?? "",
      a.radio ?? "",
    ]);

    const csv = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    anchor.href = url;
    anchor.download = `${t("exportFilename")}-${timestamp}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success(t("exported"));
  };

  const exportPdfReport = () => {
    const reportHtml = `
      <html>
        <head>
          <title>Satark Incident Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { margin-bottom: 4px; }
            p { color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f3f3f3; }
          </style>
        </head>
        <body>
          <h1>Satark Incident Summary</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Type</th>
                <th>Status</th>
                <th>Region</th>
                <th>Location</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map((a) => `
                <tr>
                  <td>${new Date(a.created_at).toLocaleString()}</td>
                  <td>${a.alert_type}</td>
                  <td>${a.status}</td>
                  <td>${a.region ?? "-"}</td>
                  <td>${a.location}</td>
                  <td>${a.message}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) return;
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
    toast.success(t("reportReady"));
  };

  const savePreset = () => {
    const name = window.prompt(t("presetNamePrompt"));
    if (!name) return;
    const preset: SavedPreset = {
      id: crypto.randomUUID(),
      name,
      query,
      typeFilter,
      statusFilter,
      regionFilter,
      dateFilter,
      fromDate,
      toDate,
    };
    const next = [...savedPresets, preset];
    setSavedPresets(next);
    localStorage.setItem("satark-history-presets", JSON.stringify(next));
    toast.success(t("presetSaved"));
  };

  const applyPreset = (id: string) => {
    setSelectedPreset(id);
    if (id === "none") return;
    const preset = savedPresets.find((item) => item.id === id);
    if (!preset) return;
    setQuery(preset.query);
    setTypeFilter(preset.typeFilter);
    setStatusFilter(preset.statusFilter);
    setRegionFilter(preset.regionFilter);
    setDateFilter(preset.dateFilter);
    setFromDate(preset.fromDate);
    setToDate(preset.toDate);
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(t("copied"));
  };

  const logAudit = async (action: string, alertId?: string, metadata?: Record<string, unknown>) => {
    if (!user) return;
    await supabase.from("audit_logs").insert({
      actor_user_id: user.id,
      alert_id: alertId ?? null,
      action,
      metadata: metadata ?? {},
    });
  };

  const updateStatus = async (id: string, status: AlertRow["status"]) => {
    const { error } = await supabase.from("alerts").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAudit("alert.status_updated", id, { status });
    toast.success(t("statusUpdated"));
    onChange();
  };

  const publishWithDispatch = async (alert: AlertRow, approved = false) => {
    const nextStatus: AlertRow["status"] = "published";
    const { error } = await supabase.from("alerts").update({ status: nextStatus }).eq("id", alert.id);
    if (error) {
      toast.error(error.message);
      return;
    }

    await dispatchAlert(alert);
    await logAudit(approved ? "alert.approved_and_published" : "alert.published", alert.id, {
      previousStatus: alert.status,
      nextStatus,
    });
    toast.success(t("statusUpdated"));
    onChange();
  };

  const retryDispatch = async (alert: AlertRow) => {
    const failedCount = failedDispatchByAlert[alert.id] ?? 0;
    await dispatchAlert(alert, failedCount + 1);
    await logAudit("alert.dispatch_retry", alert.id, { previousFailures: failedCount });
    toast.success(t("retryQueued"));
    onChange();
  };

  const deleteOne = async (id: string) => {
    const { error } = await supabase.from("alerts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      await logAudit("alert.deleted", id);
      toast.success(t("deleted"));
      onChange();
    }
  };

  const clearAll = async () => {
    const deletedIds = alerts.map((a) => a.id);
    const { error } = await supabase.from("alerts").delete().not("id", "is", null);
    if (error) toast.error(error.message);
    else {
      await logAudit("alert.cleared_all", undefined, { deletedCount: deletedIds.length, deletedIds });
      toast.success(t("cleared"));
      onChange();
    }
  };

  return (
    <Card className="p-6 shadow-card animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <History className="h-4 w-4" />
          {t("history")} <span className="text-muted-foreground font-normal">({filtered.length})</span>
        </h2>

        {isAdmin && alerts.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-1" /> {t("clearAll")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("confirm")}</AlertDialogTitle>
                <AlertDialogDescription>{t("clearAll")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={clearAll}>{t("delete")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:w-[200px]"><SelectValue placeholder={t("filter")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("all")}</SelectItem>
            {types.map((tp) => (<SelectItem key={tp} value={tp}>{tp}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-[200px]"><SelectValue placeholder={t("statusFilter")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("allStatuses")}</SelectItem>
            <SelectItem value="draft">{t("draft")}</SelectItem>
            <SelectItem value="pending_approval">{t("pendingApproval")}</SelectItem>
            <SelectItem value="published">{t("published")}</SelectItem>
            <SelectItem value="archived">{t("archived")}</SelectItem>
            <SelectItem value="closed">{t("closed")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="sm:w-[200px]"><SelectValue placeholder={t("regionFilter")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("allRegions")}</SelectItem>
            {regions.map((rg) => (<SelectItem key={rg} value={rg}>{rg}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="sm:w-[200px]"><SelectValue placeholder={t("dateRange")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTime")}</SelectItem>
            <SelectItem value="today">{t("today")}</SelectItem>
            <SelectItem value="24h">{t("last24Hours")}</SelectItem>
            <SelectItem value="7d">{t("last7Days")}</SelectItem>
            <SelectItem value="30d">{t("last30Days")}</SelectItem>
            <SelectItem value="custom">{t("customRange")}</SelectItem>
          </SelectContent>
        </Select>
        {dateFilter === "custom" && (
          <>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="sm:w-[180px]" />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="sm:w-[180px]" />
          </>
        )}
        <Select value={selectedPreset} onValueChange={applyPreset}>
          <SelectTrigger className="sm:w-[220px]"><SelectValue placeholder={t("savedPresets")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("noPreset")}</SelectItem>
            {savedPresets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>{preset.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={savePreset}>
          <Layers className="h-4 w-4 mr-1" /> {t("savePreset")}
        </Button>
        <Button type="button" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-1" /> {t("exportCsv")}
        </Button>
        <Button type="button" variant="outline" onClick={exportPdfReport} disabled={filtered.length === 0}>
          <FileText className="h-4 w-4 mr-1" /> {t("exportPdf")}
        </Button>
        <Button type="button" variant="outline" onClick={() => setShowTimeline((v) => !v)}>
          <Calendar className="h-4 w-4 mr-1" /> {showTimeline ? t("cardView") : t("timelineView")}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">{t("noAlerts")}</p>
      ) : (
        <>
          {showTimeline ? (
            <ul className="space-y-4">
              {timeline.map(([date, items]) => (
                <li key={date} className="rounded-xl border p-4">
                  <p className="text-sm font-semibold mb-2">{date}</p>
                  <ul className="space-y-2">
                    {items.map((a) => (
                      <li key={a.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{a.alert_type}</span>
                          <Badge variant="secondary">{t(a.status)}</Badge>
                        </div>
                        <p className="mt-1">{a.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleTimeString()} - {a.location}</p>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
          <ul className="space-y-3">
            {filtered.map((a) => {
              const canDelete = isAdmin || a.user_id === user?.id;
              const failedDispatches = failedDispatchByAlert[a.id] ?? 0;
              return (
                <li
                  key={a.id}
                  className={`rounded-xl border p-4 transition-base ${
                    a.priority === "emergency"
                      ? "border-emergency/40 bg-emergency-soft"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge
                          className={
                            a.priority === "emergency"
                              ? "bg-emergency text-emergency-foreground"
                              : "bg-normal text-normal-foreground"
                          }
                        >
                          {a.priority === "emergency" ? t("emergency") : t("normal")}
                        </Badge>
                        <Badge variant="outline">{a.alert_type}</Badge>
                        {a.region && <Badge variant="outline">{a.region}</Badge>}
                        <Badge variant="secondary">{a.language.toUpperCase()}</Badge>
                        <Badge variant="secondary">{t(a.status)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="font-medium">{a.message}</p>
                      <p className="text-sm text-muted-foreground">📍 {a.location}</p>
                    </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {a.status === "draft" && (
                          <Button size="sm" variant="outline" onClick={() => publishWithDispatch(a)}>
                            {t("markPublished")}
                          </Button>
                        )}
                        {isAdmin && a.status === "pending_approval" && (
                          <Button size="sm" variant="outline" onClick={() => publishWithDispatch(a, true)}>
                            {t("approvePublish")}
                          </Button>
                        )}
                        {a.status === "published" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, "closed")}>
                            {t("closeAlert")}
                          </Button>
                        )}
                        {a.status !== "archived" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, "archived")}>
                            {t("archive")}
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => onDuplicate?.(a)}>
                          {t("duplicate")}
                        </Button>
                        {failedDispatches > 0 && (
                          <Button size="sm" variant="outline" onClick={() => retryDispatch(a)}>
                            <Repeat className="h-3 w-3 mr-1" /> {t("retryDispatch")} ({failedDispatches})
                          </Button>
                        )}
                    {canDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("confirm")}</AlertDialogTitle>
                            <AlertDialogDescription>{t("delete")}? </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteOne(a.id)}>{t("delete")}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    </div>
                  </div>

                  <Tabs defaultValue="sms" className="mt-3">
                    <TabsList className="flex-wrap h-auto">
                      {channels.map(({ key, label, Icon }) => (
                        <TabsTrigger key={key} value={key} className="text-xs">
                          <Icon className="h-3 w-3 mr-1" /> {label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {channels.map(({ key }) => {
                        const text = a[key];
                      return (
                        <TabsContent key={key} value={key} className="mt-2">
                          <div className="rounded-lg bg-muted/40 border p-3 text-sm whitespace-pre-wrap">
                            {text || "—"}
                          </div>
                          {text && (
                            <Button
                              size="sm" variant="ghost" className="mt-2"
                              onClick={() => copy(text)}
                            >
                              <Copy className="h-3 w-3 mr-1" /> Copy
                            </Button>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </li>
              );
            })}
          </ul>
          )}
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={onLoadMore} disabled={loadingMore}>
                {loadingMore ? t("loading") : t("loadMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
