import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { translations } from "@/lib/translations";
import { dispatchAlert } from "@/lib/dispatch";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  PlusSquare,
  History,
  Map,
  Radar,
  Workflow,
  Send,
  Globe,
  Shield,
  LogOut,
  ShieldAlert,
  Loader2,
} from "lucide-react";

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

type TranslationKey = keyof typeof translations.en;

const links = [
  { to: "/", icon: LayoutDashboard, labelKey: "dashboardHome" as TranslationKey },
  { to: "/alerts/create", icon: PlusSquare, labelKey: "createAlertPage" as TranslationKey },
  { to: "/alerts/history", icon: History, labelKey: "historyPage" as TranslationKey },
  { to: "/map/live", icon: Map, labelKey: "liveMapPage" as TranslationKey },
  { to: "/systems/alerting", icon: Radar, labelKey: "alertingSystem" as TranslationKey },
  { to: "/systems/workflow", icon: Workflow, labelKey: "workflowSystem" as TranslationKey },
  { to: "/systems/dispatch", icon: Send, labelKey: "dispatchSystem" as TranslationKey },
  { to: "/systems/geo", icon: Globe, labelKey: "geoSystem" as TranslationKey },
  { to: "/admin", icon: Shield, labelKey: "adminConsole" as TranslationKey, adminOnly: true },
];

export const AppShell = ({ title, subtitle, children }: AppShellProps) => {
  const { user, role, loading, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;

    const runScheduledPublishing = async () => {
      const nowIso = new Date().toISOString();
      const dueQuery = supabase
        .from("alerts")
        .select("*")
        .eq("status", "draft")
        .lte("next_update", nowIso)
        .not("next_update", "is", null);

      const scopedQuery = role === "admin" ? dueQuery : dueQuery.eq("user_id", user.id);
      const { data: dueAlerts, error } = await scopedQuery;
      if (error || !dueAlerts?.length) return;

      for (const alert of dueAlerts) {
        const { error: updateError } = await supabase
          .from("alerts")
          .update({ status: "published" })
          .eq("id", alert.id);

        if (!updateError) {
          await dispatchAlert({
            id: alert.id,
            message: alert.message,
            location: alert.location,
            alert_type: alert.alert_type,
            priority: alert.priority,
            language: alert.language,
            region: (alert as { region?: string | null }).region ?? null,
            sms: alert.sms,
            twitter: alert.twitter,
            instagram: alert.instagram,
            facebook: alert.facebook,
            radio: alert.radio,
          });
        }
      }
    };

    runScheduledPublishing();
    const interval = window.setInterval(runScheduledPublishing, 60_000);
    return () => window.clearInterval(interval);
  }, [user, role]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 border-r bg-card/80 backdrop-blur flex-col">
        <div className="h-16 border-b px-5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-brand grid place-items-center shadow-elevated">
            <ShieldAlert className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold leading-tight">{t("appTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("controlCenter")}</p>
          </div>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto">
          {links.filter((link) => !("adminOnly" in link && link.adminOnly) || role === "admin").map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-base"
                activeClassName="bg-primary text-primary-foreground hover:bg-primary"
              >
                <Icon className="h-4 w-4" />
                {t(link.labelKey)}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="h-16 border-b bg-card/70 backdrop-blur sticky top-0 z-20 px-4 lg:px-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={role === "admin" ? "default" : "secondary"} className={role === "admin" ? "bg-gradient-brand" : ""}>
              {t("role")}: {role === "admin" ? t("admin") : t("user")}
            </Badge>
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> {t("signOut")}
            </Button>
          </div>
        </header>

        <div className="lg:hidden border-b bg-card/70 backdrop-blur px-3 py-2 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {links.filter((link) => !("adminOnly" in link && link.adminOnly) || role === "admin").map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs bg-secondary text-secondary-foreground"
                  activeClassName="bg-primary text-primary-foreground"
                >
                  <Icon className="h-3 w-3" />
                  {t(link.labelKey)}
                </NavLink>
              );
            })}
          </div>
        </div>

        <main className="container py-6">{children}</main>
      </div>
    </div>
  );
};
