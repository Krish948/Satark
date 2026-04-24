import { supabase } from "@/integrations/supabase/client";

const WEBHOOKS: Record<string, string | undefined> = {
  sms: import.meta.env.VITE_DISPATCH_WEBHOOK_SMS,
  twitter: import.meta.env.VITE_DISPATCH_WEBHOOK_TWITTER,
  instagram: import.meta.env.VITE_DISPATCH_WEBHOOK_INSTAGRAM,
  facebook: import.meta.env.VITE_DISPATCH_WEBHOOK_FACEBOOK,
  radio: import.meta.env.VITE_DISPATCH_WEBHOOK_RADIO,
};

type DispatchStatus = "success" | "failed" | "skipped";

export interface DispatchableAlert {
  id: string;
  message: string;
  location: string;
  alert_type: string;
  priority: string;
  language: string;
  region?: string | null;
  sms?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  radio?: string | null;
}

const CHANNELS: Array<keyof Pick<DispatchableAlert, "sms" | "twitter" | "instagram" | "facebook" | "radio">> = [
  "sms",
  "twitter",
  "instagram",
  "facebook",
  "radio",
];

const insertDispatchLog = async (
  alertId: string,
  channel: string,
  status: DispatchStatus,
  attempts: number,
  payload: Record<string, unknown>,
  response: Record<string, unknown>,
  errorMessage?: string,
) => {
  await supabase.from("dispatch_logs").insert({
    alert_id: alertId,
    channel,
    status,
    attempts,
    payload,
    response,
    error_message: errorMessage ?? null,
  } as never);
};

export const dispatchAlert = async (alert: DispatchableAlert, attempts = 1) => {
  await Promise.all(
    CHANNELS.map(async (channel) => {
      const text = alert[channel];
      if (!text) return;

      const webhook = WEBHOOKS[channel];
      const payload = {
        alertId: alert.id,
        channel,
        message: text,
        metadata: {
          baseMessage: alert.message,
          location: alert.location,
          alertType: alert.alert_type,
          priority: alert.priority,
          language: alert.language,
          region: alert.region ?? null,
        },
      };

      if (!webhook) {
        await insertDispatchLog(alert.id, channel, "skipped", attempts, payload, { reason: "webhook_not_configured" });
        return;
      }

      try {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const responseText = await res.text();

        if (!res.ok) {
          await insertDispatchLog(
            alert.id,
            channel,
            "failed",
            attempts,
            payload,
            { status: res.status, body: responseText },
            `HTTP ${res.status}`,
          );
          return;
        }

        await insertDispatchLog(alert.id, channel, "success", attempts, payload, { status: res.status, body: responseText });
      } catch (error) {
        await insertDispatchLog(
          alert.id,
          channel,
          "failed",
          attempts,
          payload,
          {},
          error instanceof Error ? error.message : "Unknown dispatch error",
        );
      }
    }),
  );
};
