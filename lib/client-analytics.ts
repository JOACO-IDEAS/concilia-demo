"use client";

import { track } from "@vercel/analytics";

type SafeProperties = Record<string, string>;

export function trackShowroomEvent(event: string, properties: SafeProperties = {}) {
  track(event, properties);
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, properties }),
    keepalive: true,
  }).catch(() => undefined);
}
