export const BLOCKED_RESOURCE_TYPES: ReadonlySet<string> = new Set([
  "image",
  "media",
  "font",
  "texttrack",
  "eventsource",
  "websocket",
  "manifest",
  "ping",
  "cspviolationreport",
  "other",
]);

const TRACKER_DOMAINS: ReadonlySet<string> = new Set([
  "google-analytics.com",
  "googletagmanager.com",
  "googlesyndication.com",
  "googleadservices.com",
  "doubleclick.net",
  "connect.facebook.net",
  "analytics.tiktok.com",
  "snap.licdn.com",
  "bat.bing.com",
  "static.ads-twitter.com",
  "clarity.ms",
  "hotjar.com",
  "segment.com",
  "segment.io",
  "mixpanel.com",
  "amplitude.com",
  "heapanalytics.com",
  "fullstory.com",
  "mouseflow.com",
  "crazyegg.com",
  "posthog.com",
  "plausible.io",
  "intercom.io",
  "intercomcdn.com",
  "hs-scripts.com",
  "hs-analytics.net",
  "optimizely.com",
  "newrelic.com",
  "nr-data.net",
  "sentry.io",
  "datadoghq.com",
  "bugsnag.com",
  "taboola.com",
  "outbrain.com",
  "criteo.com",
  "criteo.net",
  "adnxs.com",
  "amazon-adsystem.com",
  "scorecardresearch.com",
  "quantserve.com",
  "cookielaw.org",
  "onetrust.com",
  "cookiebot.com",
]);

export function isTrackerHost(hostname: string): boolean {
  const labels = hostname.toLowerCase().split(".");
  for (let start = 0; start < labels.length - 1; start += 1) {
    if (TRACKER_DOMAINS.has(labels.slice(start).join("."))) return true;
  }
  return false;
}
