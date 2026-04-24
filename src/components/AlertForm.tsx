import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { generateMessages, type Priority } from "@/lib/messageGenerator";
import { ALERT_TEMPLATES } from "@/lib/alertTemplates";
import { LANG_LABEL, type Lang } from "@/lib/translations";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";

export type AlertStatus = "draft" | "published" | "archived" | "pending_approval" | "closed";

export interface AlertDraft {
  message: string;
  location: string;
  alertType: string;
  priority: Priority;
  status: AlertStatus;
  language: Lang;
  nextUpdate: string;
  region: string;
}

interface Props {
  selected: { lat: number; lng: number } | null;
  onSaved: () => void;
  draft?: AlertDraft | null;
  onDraftConsumed?: () => void;
}

const MAX_MSG = 500;

export const AlertForm = ({ selected, onSaved, draft, onDraftConsumed }: Props) => {
  const { t, lang } = useLanguage();
  const { user, role } = useAuth();
  const [message, setMessage] = useState("");
  const [location, setLocation] = useState("");
  const [alertType, setAlertType] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [status, setStatus] = useState<AlertStatus>("draft");
  const [msgLang, setMsgLang] = useState<Lang>(lang);
  const [nextUpdate, setNextUpdate] = useState("");
  const [region, setRegion] = useState("");
  const [templateId, setTemplateId] = useState<string>("none");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMsgLang(lang);
  }, [lang]);

  useEffect(() => {
    if (!draft) return;
    setMessage(draft.message);
    setLocation(draft.location);
    setAlertType(draft.alertType);
    setPriority(draft.priority);
    setStatus(draft.status);
    setMsgLang(draft.language);
    setNextUpdate(draft.nextUpdate);
    setRegion(draft.region);
    onDraftConsumed?.();
  }, [draft, onDraftConsumed]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    if (id === "none") return;
    const template = ALERT_TEMPLATES.find((item) => item.id === id);
    if (!template) return;
    setAlertType(template.alertType);
    setMessage(template.message);
    if (template.region) setRegion(template.region);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selected) {
      toast.error(t("locationHint"));
      return;
    }
    setBusy(true);

    const generated = generateMessages({
      message, location, alertType, priority,
      language: msgLang,
      nextUpdate: nextUpdate || null,
    });

    const computedStatus: AlertStatus =
      role !== "admin" && priority === "emergency" && status === "published"
        ? "pending_approval"
        : status;

    const { error } = await supabase.from("alerts").insert({
      user_id: user.id,
      message,
      location,
      latitude: selected.lat,
      longitude: selected.lng,
      alert_type: alertType,
      priority,
      status: computedStatus,
      language: msgLang,
      region: region || null,
      next_update: nextUpdate || null,
      ...generated,
    });

    setBusy(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("saved"));
      setMessage("");
      setLocation("");
      setAlertType("");
      setNextUpdate("");
      setRegion("");
      setStatus("draft");
      setTemplateId("none");
      onSaved();
    }
  };

  return (
    <Card className="p-6 shadow-card animate-fade-in">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Send className="h-4 w-4" />
        {t("createAlert")}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>{t("template")}</Label>
          <Select value={templateId} onValueChange={applyTemplate}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("noneTemplate")}</SelectItem>
              {ALERT_TEMPLATES.map((template) => (
                <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="msg">{t("message")}</Label>
          <Textarea
            id="msg"
            required
            maxLength={MAX_MSG}
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="text-xs text-muted-foreground text-right mt-1">
            {message.length}/{MAX_MSG} {t("chars")}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="loc">{t("location")}</Label>
            <Input
              id="loc"
              required
              placeholder={selected ? `${selected.lat.toFixed(3)}, ${selected.lng.toFixed(3)}` : t("locationHint")}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="region">{t("region")}</Label>
            <Input
              id="region"
              placeholder="North Zone"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="type">{t("alertType")}</Label>
            <Input
              id="type"
              required
              placeholder="Flood / Fire / Cyclone..."
              value={alertType}
              onChange={(e) => setAlertType(e.target.value)}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>{t("priority")}</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">{t("normal")}</SelectItem>
                <SelectItem value="emergency">{t("emergency")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("status")}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as AlertStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t("draft")}</SelectItem>
                <SelectItem value="pending_approval">{t("pendingApproval")}</SelectItem>
                <SelectItem value="published">{t("published")}</SelectItem>
                <SelectItem value="archived">{t("archived")}</SelectItem>
                <SelectItem value="closed">{t("closed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("language")}</Label>
            <Select value={msgLang} onValueChange={(v) => setMsgLang(v as Lang)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
                  <SelectItem key={l} value={l}>{LANG_LABEL[l]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="next">{t("nextUpdate")}</Label>
            <Input
              id="next"
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
              value={nextUpdate}
              onChange={(e) => setNextUpdate(e.target.value)}
            />
          </div>
        </div>

        {role !== "admin" && priority === "emergency" && status === "published" && (
          <p className="text-xs text-amber-600">{t("publishRequiresApproval")}</p>
        )}

        <Button
          type="submit"
          disabled={busy}
          className={priority === "emergency" ? "w-full bg-gradient-emergency hover:opacity-90" : "w-full bg-gradient-brand hover:opacity-90"}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("generate")}
        </Button>
      </form>
    </Card>
  );
};
