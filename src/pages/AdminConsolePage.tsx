import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dispatchAlert } from "@/lib/dispatch";
import { toast } from "sonner";
import { Loader2, Shield, Users, Send, Settings, FileText, BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import type { AlertRow } from "@/components/AlertHistory";

interface ProfileRow {
  id: string;
  display_name: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
}

interface UserRoleRow {
  id: string;
  user_id: string;
  role: "admin" | "user";
}

interface AuditRow {
  id: string;
  action: string;
  actor_user_id: string;
  alert_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface DispatchControlRow {
  id: string;
  paused: boolean;
}

interface RegionRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface DispatchFailureRow {
  alert_id: string;
  count: number;
}

type AnalyticsRangePreset = "7d" | "30d" | "90d" | "custom";

const byDateDesc = <T extends { created_at: string }>(items: T[]) =>
  [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

const AdminConsolePage = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, "admin" | "user">>({});
  const [allAlerts, setAllAlerts] = useState<AlertRow[]>([]);
  const [pendingAlerts, setPendingAlerts] = useState<AlertRow[]>([]);
  const [publishedAlerts, setPublishedAlerts] = useState<AlertRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [dispatchFailures, setDispatchFailures] = useState<DispatchFailureRow[]>([]);
  const [dispatchControl, setDispatchControl] = useState<DispatchControlRow | null>(null);
  const [regions, setRegions] = useState<RegionRow[]>([]);

  const [newRegionName, setNewRegionName] = useState("");
  const [newRegionDescription, setNewRegionDescription] = useState("");

  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRangePreset>("7d");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);

    const [profilesRes, rolesRes, alertsRes, auditRes, dispatchRes, controlRes, regionRes] = await Promise.all([
      supabase.from("profiles").select("id,display_name,email,is_active,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("id,user_id,role"),
      supabase.from("alerts").select("*").order("created_at", { ascending: false }),
      supabase.from("audit_logs").select("id,action,actor_user_id,alert_id,created_at,metadata").order("created_at", { ascending: false }).limit(80),
      supabase.from("dispatch_logs").select("alert_id,status").eq("status", "failed"),
      supabase.from("dispatch_controls").select("id,paused").eq("id", "global").maybeSingle(),
      supabase.from("system_regions").select("id,name,description,is_active").order("name", { ascending: true }),
    ]);

    if (profilesRes.error || rolesRes.error || alertsRes.error || auditRes.error || dispatchRes.error || controlRes.error || regionRes.error) {
      toast.error("Failed to load admin console data");
      setLoading(false);
      return;
    }

    const profileRows = (profilesRes.data ?? []) as ProfileRow[];
    const roleRows = (rolesRes.data ?? []) as UserRoleRow[];
    const alertsRows = (alertsRes.data ?? []) as AlertRow[];

    const roleMap: Record<string, "admin" | "user"> = {};
    for (const row of roleRows) {
      roleMap[row.user_id] = row.role === "admin" ? "admin" : "user";
    }

    const failureCountMap: Record<string, number> = {};
    for (const row of dispatchRes.data ?? []) {
      const alertId = (row as { alert_id: string }).alert_id;
      failureCountMap[alertId] = (failureCountMap[alertId] ?? 0) + 1;
    }

    setProfiles(profileRows);
    setRolesByUser(roleMap);
    setAllAlerts(byDateDesc(alertsRows));
    setPendingAlerts(byDateDesc(alertsRows.filter((alert) => alert.status === "pending_approval")));
    setPublishedAlerts(byDateDesc(alertsRows.filter((alert) => alert.status === "published")));
    setAuditLogs((auditRes.data ?? []) as AuditRow[]);
    setDispatchControl((controlRes.data as DispatchControlRow | null) ?? { id: "global", paused: false });
    setRegions((regionRes.data ?? []) as RegionRow[]);
    setDispatchFailures(
      Object.entries(failureCountMap)
        .map(([alert_id, count]) => ({ alert_id, count }))
        .sort((a, b) => b.count - a.count),
    );

    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [user]);

  const logAudit = async (action: string, alertId?: string, metadata?: Record<string, unknown>) => {
    if (!user) return;
    await supabase.from("audit_logs").insert({
      actor_user_id: user.id,
      alert_id: alertId ?? null,
      action,
      metadata: metadata ?? {},
    });
  };

  const setUserRole = async (userId: string, role: "admin" | "user") => {
    const { error: removeError } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (removeError) {
      toast.error(removeError.message);
      return;
    }

    const { error: insertError } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (insertError) {
      toast.error(insertError.message);
      return;
    }

    await logAudit("admin.user_role_changed", undefined, { targetUserId: userId, role });
    toast.success("Role updated");
    loadAll();
  };

  const toggleUserActive = async (profile: ProfileRow) => {
    const nextState = !profile.is_active;
    const { error } = await supabase.from("profiles").update({ is_active: nextState }).eq("id", profile.id);
    if (error) {
      toast.error(error.message);
      return;
    }

    await logAudit("admin.user_activation_toggled", undefined, {
      targetUserId: profile.id,
      is_active: nextState,
    });
    toast.success(nextState ? "User activated" : "User deactivated");
    loadAll();
  };

  const approveAlert = async (alert: AlertRow) => {
    const { error } = await supabase.from("alerts").update({ status: "published" }).eq("id", alert.id);
    if (error) {
      toast.error(error.message);
      return;
    }

    await dispatchAlert(alert);
    await logAudit("admin.alert_approved", alert.id, { previousStatus: "pending_approval" });
    toast.success("Alert approved and dispatched");
    loadAll();
  };

  const rejectAlert = async (alert: AlertRow) => {
    const { error } = await supabase.from("alerts").update({ status: "archived" }).eq("id", alert.id);
    if (error) {
      toast.error(error.message);
      return;
    }

    await logAudit("admin.alert_rejected", alert.id, { previousStatus: "pending_approval" });
    toast.success("Alert archived");
    loadAll();
  };

  const setDispatchPaused = async (paused: boolean) => {
    if (!user) return;
    const { error } = await supabase
      .from("dispatch_controls")
      .upsert({ id: "global", paused, updated_by: user.id }, { onConflict: "id" });

    if (error) {
      toast.error(error.message);
      return;
    }

    await logAudit("admin.dispatch_pause_toggled", undefined, { paused });
    toast.success(paused ? "Dispatch paused" : "Dispatch resumed");
    loadAll();
  };

  const retryFailedDispatch = async (alertId: string) => {
    const alert = publishedAlerts.find((item) => item.id === alertId);
    if (!alert) {
      toast.error("Published alert not found");
      return;
    }

    const existingFailures = dispatchFailures.find((item) => item.alert_id === alertId)?.count ?? 0;
    await dispatchAlert(alert, existingFailures + 1);
    await logAudit("admin.dispatch_retry", alert.id, { previousFailures: existingFailures });
    toast.success("Retry dispatched");
    loadAll();
  };

  const addRegion = async () => {
    if (!newRegionName.trim() || !user) return;

    const { error } = await supabase.from("system_regions").insert({
      name: newRegionName.trim(),
      description: newRegionDescription.trim() || null,
      created_by: user.id,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    await logAudit("admin.region_created", undefined, { name: newRegionName.trim() });
    setNewRegionName("");
    setNewRegionDescription("");
    toast.success("Region added");
    loadAll();
  };

  const toggleRegion = async (region: RegionRow) => {
    const next = !region.is_active;
    const { error } = await supabase.from("system_regions").update({ is_active: next }).eq("id", region.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    await logAudit("admin.region_toggled", undefined, { regionId: region.id, is_active: next });
    toast.success(next ? "Region activated" : "Region disabled");
    loadAll();
  };

  const analytics = useMemo(() => {
    const totalUsers = profiles.length;
    const activeUsers = profiles.filter((profile) => profile.is_active).length;
    const adminUsers = Object.values(rolesByUser).filter((role) => role === "admin").length;
    const approvalQueue = pendingAlerts.length;
    const failedAlerts = dispatchFailures.length;
    return { totalUsers, activeUsers, adminUsers, approvalQueue, failedAlerts };
  }, [profiles, rolesByUser, pendingAlerts.length, dispatchFailures.length]);

  const analyticsRangeLabel = useMemo(() => {
    if (analyticsRange === "7d") return "Last 7 days";
    if (analyticsRange === "30d") return "Last 30 days";
    if (analyticsRange === "90d") return "Last 90 days";
    if (!customFromDate && !customToDate) return "Custom range";
    if (customFromDate && customToDate) return `${customFromDate} to ${customToDate}`;
    return customFromDate ? `From ${customFromDate}` : `Until ${customToDate}`;
  }, [analyticsRange, customFromDate, customToDate]);

  const analyticsAlerts = useMemo(() => {
    const now = Date.now();
    let fromTime = Number.MIN_SAFE_INTEGER;
    let toTime = Number.MAX_SAFE_INTEGER;

    if (analyticsRange === "7d") {
      fromTime = now - 7 * 24 * 60 * 60 * 1000;
    } else if (analyticsRange === "30d") {
      fromTime = now - 30 * 24 * 60 * 60 * 1000;
    } else if (analyticsRange === "90d") {
      fromTime = now - 90 * 24 * 60 * 60 * 1000;
    } else {
      if (customFromDate) fromTime = new Date(`${customFromDate}T00:00:00`).getTime();
      if (customToDate) toTime = new Date(`${customToDate}T23:59:59`).getTime();
    }

    return allAlerts.filter((alert) => {
      const created = new Date(alert.created_at).getTime();
      return created >= fromTime && created <= toTime;
    });
  }, [allAlerts, analyticsRange, customFromDate, customToDate]);

  const analyticsSummary = useMemo(() => {
    const totalAlerts = analyticsAlerts.length;
    const publishedCount = analyticsAlerts.filter((alert) => alert.status === "published").length;
    const pendingCount = analyticsAlerts.filter((alert) => alert.status === "pending_approval").length;
    const publishRate = totalAlerts ? Math.round((publishedCount / totalAlerts) * 100) : 0;
    return { totalAlerts, publishedCount, pendingCount, publishRate };
  }, [analyticsAlerts]);

  const analyticsFailedAlerts = useMemo(() => {
    const alertIds = new Set(analyticsAlerts.map((alert) => alert.id));
    return dispatchFailures.filter((row) => alertIds.has(row.alert_id)).length;
  }, [analyticsAlerts, dispatchFailures]);

  const trendWindowDays = useMemo(() => {
    if (analyticsRange === "7d") return 7;
    if (analyticsRange === "30d") return 30;
    if (analyticsRange === "90d") return 90;

    if (customFromDate && customToDate) {
      const from = new Date(`${customFromDate}T00:00:00`).getTime();
      const to = new Date(`${customToDate}T00:00:00`).getTime();
      const diff = Math.floor((to - from) / (24 * 60 * 60 * 1000)) + 1;
      return Math.max(1, Math.min(120, diff));
    }

    return 30;
  }, [analyticsRange, customFromDate, customToDate]);

  const trendStartDate = useMemo(() => {
    if (analyticsRange !== "custom") {
      const d = new Date();
      d.setDate(d.getDate() - (trendWindowDays - 1));
      d.setHours(0, 0, 0, 0);
      return d;
    }

    if (customFromDate) {
      const d = new Date(`${customFromDate}T00:00:00`);
      d.setHours(0, 0, 0, 0);
      return d;
    }

    const fallback = new Date();
    fallback.setDate(fallback.getDate() - (trendWindowDays - 1));
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }, [analyticsRange, customFromDate, trendWindowDays]);

  const alertsTrendData = useMemo(() => {
    const buckets = Array.from({ length: trendWindowDays }, (_, index) => {
      const d = new Date(trendStartDate);
      d.setDate(trendStartDate.getDate() + index);
      const key = d.toISOString().slice(0, 10);
      return {
        key,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        total: 0,
        published: 0,
      };
    });

    const bucketByKey = new Map(buckets.map((item) => [item.key, item]));
    for (const alert of analyticsAlerts) {
      const key = new Date(alert.created_at).toISOString().slice(0, 10);
      const bucket = bucketByKey.get(key);
      if (!bucket) continue;
      bucket.total += 1;
      if (alert.status === "published") bucket.published += 1;
    }

    return buckets;
  }, [analyticsAlerts, trendStartDate, trendWindowDays]);

  const statusData = useMemo(() => {
    const counts: Record<string, number> = {
      draft: 0,
      pending_approval: 0,
      published: 0,
      archived: 0,
      closed: 0,
    };

    for (const alert of analyticsAlerts) {
      counts[alert.status] = (counts[alert.status] ?? 0) + 1;
    }

    return [
      { status: "draft", label: "Draft", value: counts.draft },
      { status: "pending_approval", label: "Pending", value: counts.pending_approval },
      { status: "published", label: "Published", value: counts.published },
      { status: "archived", label: "Archived", value: counts.archived },
      { status: "closed", label: "Closed", value: counts.closed },
    ].filter((item) => item.value > 0);
  }, [analyticsAlerts]);

  const regionData = useMemo(() => {
    const counts = analyticsAlerts.reduce<Record<string, number>>((acc, alert) => {
      const region = (alert.region ?? "Unassigned").trim() || "Unassigned";
      acc[region] = (acc[region] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([region, alerts]) => ({ region, alerts }))
      .sort((a, b) => b.alerts - a.alerts)
      .slice(0, 6);
  }, [analyticsAlerts]);

  const alertsTrendConfig = {
    total: { label: "Total alerts", color: "hsl(var(--primary))" },
    published: { label: "Published", color: "hsl(var(--chart-2))" },
  } satisfies ChartConfig;

  const statusConfig = {
    draft: { label: "Draft", color: "hsl(var(--chart-1))" },
    pending_approval: { label: "Pending", color: "hsl(var(--chart-4))" },
    published: { label: "Published", color: "hsl(var(--chart-2))" },
    archived: { label: "Archived", color: "hsl(var(--chart-5))" },
    closed: { label: "Closed", color: "hsl(var(--chart-3))" },
  } satisfies ChartConfig;

  const regionConfig = {
    alerts: { label: "Alerts", color: "hsl(var(--chart-3))" },
  } satisfies ChartConfig;

  if (loading) {
    return (
      <AppShell title="Admin Console" subtitle="Loading admin tools">
        <Card className="p-6 h-52 grid place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin Console" subtitle="User management, workflow approvals, dispatch controls, and audit operations">
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total users</p>
            <p className="text-2xl font-semibold">{analytics.totalUsers}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Active users</p>
            <p className="text-2xl font-semibold text-emerald-600">{analytics.activeUsers}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Admins</p>
            <p className="text-2xl font-semibold">{analytics.adminUsers}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Approval queue</p>
            <p className="text-2xl font-semibold text-amber-600">{analytics.approvalQueue}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Alerts with dispatch failures</p>
            <p className="text-2xl font-semibold text-destructive">{analytics.failedAlerts}</p>
          </Card>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" /> User management</TabsTrigger>
            <TabsTrigger value="approvals"><Shield className="h-4 w-4 mr-1" /> Alert approvals</TabsTrigger>
            <TabsTrigger value="dispatch"><Send className="h-4 w-4 mr-1" /> Dispatch control</TabsTrigger>
            <TabsTrigger value="config"><Settings className="h-4 w-4 mr-1" /> Region configuration</TabsTrigger>
            <TabsTrigger value="audit"><FileText className="h-4 w-4 mr-1" /> Audit logs</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1" /> Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <Card className="p-4 space-y-4">
              {profiles.map((profile) => {
                const role = rolesByUser[profile.id] ?? "user";
                return (
                  <div key={profile.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{profile.display_name ?? "Unnamed"}</p>
                      <p className="text-sm text-muted-foreground">{profile.email ?? "No email"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={profile.is_active ? "default" : "secondary"}>
                        {profile.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Select value={role} onValueChange={(value) => setUserRole(profile.id, value as "admin" | "user")}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => toggleUserActive(profile)}>
                        {profile.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </Card>
          </TabsContent>

          <TabsContent value="approvals" className="mt-4">
            <Card className="p-4 space-y-4">
              {pendingAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending approvals.</p>
              ) : (
                pendingAlerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{alert.alert_type}</Badge>
                      <Badge variant="secondary">{alert.priority}</Badge>
                      <Badge variant="secondary">{alert.region ?? "No region"}</Badge>
                    </div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm text-muted-foreground">{alert.location}</p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveAlert(alert)}>Approve + Publish</Button>
                      <Button size="sm" variant="outline" onClick={() => rejectAlert(alert)}>Reject</Button>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </TabsContent>

          <TabsContent value="dispatch" className="mt-4">
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-3 border rounded-lg p-3">
                <div>
                  <p className="font-medium">Global dispatch switch</p>
                  <p className="text-sm text-muted-foreground">Pause or resume all outgoing channel webhooks.</p>
                </div>
                <Button
                  variant={dispatchControl?.paused ? "default" : "outline"}
                  onClick={() => setDispatchPaused(!(dispatchControl?.paused ?? false))}
                >
                  {dispatchControl?.paused ? "Resume dispatch" : "Pause dispatch"}
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="font-medium">Failed dispatch by alert</p>
                {dispatchFailures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No failed dispatches found.</p>
                ) : (
                  dispatchFailures.slice(0, 20).map((item) => (
                    <div key={item.alert_id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <p className="font-mono text-xs">{item.alert_id}</p>
                        <p className="text-sm text-muted-foreground">Failures: {item.count}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => retryFailedDispatch(item.alert_id)}>
                        Retry dispatch
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <Card className="p-4 space-y-4">
              <div className="grid md:grid-cols-3 gap-2">
                <Input placeholder="Region name" value={newRegionName} onChange={(e) => setNewRegionName(e.target.value)} />
                <Input
                  placeholder="Description (optional)"
                  value={newRegionDescription}
                  onChange={(e) => setNewRegionDescription(e.target.value)}
                />
                <Button onClick={addRegion}>Add region</Button>
              </div>
              <div className="space-y-2">
                {regions.map((region) => (
                  <div key={region.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{region.name}</p>
                      {region.description && <p className="text-sm text-muted-foreground">{region.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={region.is_active ? "default" : "secondary"}>
                        {region.is_active ? "Active" : "Disabled"}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => toggleRegion(region)}>
                        {region.is_active ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Card className="p-4 space-y-3">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit logs yet.</p>
              ) : (
                auditLogs.map((row) => (
                  <div key={row.id} className="border rounded-lg p-3">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="outline">{row.action}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Actor: {row.actor_user_id}</p>
                    {row.alert_id && <p className="text-xs text-muted-foreground">Alert: {row.alert_id}</p>}
                  </div>
                ))
              )}
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={analyticsRange} onValueChange={(value) => setAnalyticsRange(value as AnalyticsRangePreset)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>

                  {analyticsRange === "custom" && (
                    <>
                      <Input
                        type="date"
                        value={customFromDate}
                        onChange={(event) => setCustomFromDate(event.target.value)}
                        className="w-[170px]"
                      />
                      <Input
                        type="date"
                        value={customToDate}
                        onChange={(event) => setCustomToDate(event.target.value)}
                        className="w-[170px]"
                      />
                    </>
                  )}

                  <Badge variant="secondary" className="ml-auto">
                    {analyticsRangeLabel}
                  </Badge>
                </div>
              </Card>

              <Card className="p-4 grid md:grid-cols-2 xl:grid-cols-5 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Open approval items</p>
                  <p className="text-2xl font-semibold">{analyticsSummary.pendingCount}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Published alerts</p>
                  <p className="text-2xl font-semibold">{analyticsSummary.publishedCount}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total alerts</p>
                  <p className="text-2xl font-semibold">{analyticsSummary.totalAlerts}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Publish rate</p>
                  <p className="text-2xl font-semibold">{analyticsSummary.publishRate}%</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Alerts with dispatch failures</p>
                  <p className="text-2xl font-semibold">{analyticsFailedAlerts}</p>
                </div>
              </Card>

              <div className="grid xl:grid-cols-2 gap-4">
                <Card className="p-4">
                  <p className="font-medium mb-1">Alert Trend</p>
                  <p className="text-xs text-muted-foreground mb-3">Total versus published alert volume for selected range.</p>
                  <ChartContainer config={alertsTrendConfig} className="h-[260px] w-full">
                    <LineChart data={alertsTrendData} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line dataKey="total" type="monotone" stroke="var(--color-total)" strokeWidth={2} dot={false} />
                      <Line dataKey="published" type="monotone" stroke="var(--color-published)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                </Card>

                <Card className="p-4">
                  <p className="font-medium mb-1">Status Distribution</p>
                  <p className="text-xs text-muted-foreground mb-3">Current lifecycle mix across alerts in selected range.</p>
                  <ChartContainer config={statusConfig} className="h-[260px] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                      <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                      <Pie data={statusData} dataKey="value" nameKey="status" innerRadius={56} outerRadius={90} paddingAngle={3}>
                        {statusData.map((entry) => (
                          <Cell key={entry.status} fill={`var(--color-${entry.status})`} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </Card>
              </div>

              <Card className="p-4">
                <p className="font-medium mb-1">Top Regions by Alert Volume</p>
                <p className="text-xs text-muted-foreground mb-3">Most active regions in selected range.</p>
                <ChartContainer config={regionConfig} className="h-[280px] w-full">
                  <BarChart data={regionData} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="region" tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={56} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="alerts" fill="var(--color-alerts)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};

export default AdminConsolePage;
