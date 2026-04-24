import { describe, expect, it } from "vitest";
import { generateMessages } from "@/lib/messageGenerator";

describe("messageGenerator", () => {
  it("keeps twitter output within 280 characters", () => {
    const messages = generateMessages({
      message: "Heavy rainfall expected across multiple low-lying areas. Move to safer zones immediately and avoid riverbanks.",
      location: "Pune District",
      alertType: "Flood",
      priority: "emergency",
      language: "en",
      nextUpdate: "2026-04-24T12:00:00.000Z",
    });

    expect(messages.twitter.length).toBeLessThanOrEqual(280);
  });

  it("truncates sms output to max 320 characters", () => {
    const messages = generateMessages({
      message: "A".repeat(500),
      location: "Nagpur",
      alertType: "Fire",
      priority: "normal",
      language: "en",
      nextUpdate: null,
    });

    expect(messages.sms.length).toBeLessThanOrEqual(320);
    expect(messages.sms.endsWith("...")).toBe(true);
  });

  it("includes translated labels for hindi output", () => {
    const messages = generateMessages({
      message: "तूफान की चेतावनी जारी।",
      location: "मुंबई",
      alertType: "Cyclone",
      priority: "emergency",
      language: "hi",
      nextUpdate: null,
    });

    expect(messages.radio).toContain("जन सुरक्षा प्रसारण");
    expect(messages.facebook).toContain("स्थान");
  });
});
