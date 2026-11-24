import type { BrowserContext, Page, Route } from "playwright";
import { ExtractionError } from "./extractionError";
import { BLOCKED_RESOURCE_TYPES, isTrackerHost } from "./resourcePolicy";
import { isBlockedAddress, type HostGuard } from "./urlGuard";

export interface ContextGuard {
  isViolated(): boolean;
  assertClean(): void;
  watchPage(page: Page): void;
}

export const blockedError = () =>
  new ExtractionError("blocked_target", "The page tried to reach a private or reserved network address.");

/**
 * Re-validates every request the browser makes. Navigation requests that resolve to a blocked host,
 * redirect hops, and responses served from blocked addresses all mark the context as violated and close it.
 */
export async function guardContext(context: BrowserContext, guard: HostGuard): Promise<ContextGuard> {
  let violated = false;
  const flag = () => {
    if (violated) return;
    violated = true;
    void context.close().catch(() => undefined);
  };

  await context.route("**/*", async (route: Route) => {
    const request = route.request();
    if (BLOCKED_RESOURCE_TYPES.has(request.resourceType())) return route.abort("blockedbyclient");
    let url: URL;
    try {
      url = new URL(request.url());
    } catch {
      return route.abort("blockedbyclient");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return route.abort("blockedbyclient");
    if (!request.isNavigationRequest() && isTrackerHost(url.hostname)) return route.abort("blockedbyclient");
    try {
      await guard.assertPublicHost(url.hostname);
    } catch {
      if (request.isNavigationRequest()) flag();
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
  await context.routeWebSocket(/.*/, (socket) => void socket.close());

  return {
    isViolated: () => violated,
    assertClean: () => {
      if (violated) throw blockedError();
    },
    watchPage(page) {
      page.on("dialog", (dialog) => void dialog.dismiss().catch(() => undefined));
      page.on("request", (request) => {
        if (!request.redirectedFrom()) return;
        guard.assertPublicHost(new URL(request.url()).hostname).catch(flag);
      });
      page.on("response", (response) => {
        void response
          .serverAddr()
          .then((server) => {
            if (server && isBlockedAddress(server.ipAddress)) flag();
          })
          .catch(() => undefined);
      });
    },
  };
}
