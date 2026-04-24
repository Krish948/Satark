// Message generator — turns a single alert into platform-specific messages.
// Templates per language keep the meaning consistent across channels.

import type { Lang } from "./translations";

export type Priority = "normal" | "emergency";

export interface AlertInput {
  message: string;
  location: string;
  alertType: string;
  priority: Priority;
  language: Lang;
  nextUpdate?: string | null; // ISO string
}

export interface GeneratedMessages {
  sms: string;
  twitter: string;
  instagram: string;
  facebook: string;
  radio: string;
}

// Per-language labels used inside generated content.
const labels: Record<Lang, {
  alert: string; emergency: string; location: string; nextUpdate: string;
  type: string; stayTuned: string; thisIs: string; broadcast: string;
}> = {
  en: {
    alert: "ALERT", emergency: "EMERGENCY", location: "Location",
    nextUpdate: "Next update", type: "Type", stayTuned: "Stay tuned for updates.",
    thisIs: "This is an official advisory.", broadcast: "Public safety broadcast",
  },
  hi: {
    alert: "अलर्ट", emergency: "आपातकाल", location: "स्थान",
    nextUpdate: "अगला अपडेट", type: "प्रकार", stayTuned: "अपडेट के लिए जुड़े रहें।",
    thisIs: "यह एक आधिकारिक सूचना है।", broadcast: "जन सुरक्षा प्रसारण",
  },
  mr: {
    alert: "अलर्ट", emergency: "आणीबाणी", location: "स्थान",
    nextUpdate: "पुढील अद्यतन", type: "प्रकार", stayTuned: "अद्यतनांसाठी संपर्कात रहा.",
    thisIs: "ही एक अधिकृत सूचना आहे.", broadcast: "सार्वजनिक सुरक्षा प्रसारण",
  },
};

const formatTime = (iso?: string | null) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const tagify = (s: string) =>
  s.replace(/[^\p{L}\p{N}]+/gu, "").slice(0, 20);

export function generateMessages(input: AlertInput): GeneratedMessages {
  const L = labels[input.language];
  const head = input.priority === "emergency" ? `🚨 ${L.emergency}` : `📢 ${L.alert}`;
  const next = input.nextUpdate ? ` | ${L.nextUpdate}: ${formatTime(input.nextUpdate)}` : "";

  // SMS — short, plain text, ~160 chars target
  const smsBase = `${head}: ${input.message} (${L.location}: ${input.location})${next}`;
  const sms = smsBase.length > 320 ? smsBase.slice(0, 317) + "..." : smsBase;

  // Twitter — under 280 chars, hashtags
  const tags = `#${tagify(input.alertType) || "Alert"} #${tagify(input.location) || "Update"}`;
  const twitterBase = `${head} ${input.message} 📍${input.location} ${tags}${next}`;
  const twitter = twitterBase.length > 280 ? twitterBase.slice(0, 277) + "..." : twitterBase;

  // Instagram — emoji-rich, line breaks
  const instagram = [
    `${head} ${input.alertType.toUpperCase()}`,
    "",
    input.message,
    "",
    `📍 ${L.location}: ${input.location}`,
    input.nextUpdate ? `⏱ ${L.nextUpdate}: ${formatTime(input.nextUpdate)}` : "",
    "",
    tags + " #SafetyFirst",
  ].filter(Boolean).join("\n");

  // Facebook — longer, with sign-off
  const facebook = [
    `${head} — ${input.alertType}`,
    "",
    input.message,
    "",
    `${L.location}: ${input.location}`,
    input.nextUpdate ? `${L.nextUpdate}: ${formatTime(input.nextUpdate)}` : "",
    "",
    L.thisIs + " " + L.stayTuned,
  ].filter(Boolean).join("\n");

  // Radio — script-style, spelled out for a presenter
  const radio = [
    `[${L.broadcast}]`,
    `${head}. ${L.type}: ${input.alertType}.`,
    `${input.message}`,
    `${L.location}: ${input.location}.`,
    input.nextUpdate ? `${L.nextUpdate}: ${formatTime(input.nextUpdate)}.` : "",
    L.stayTuned,
  ].filter(Boolean).join(" ");

  return { sms, twitter, instagram, facebook, radio };
}
