import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { ExtractionError } from "./extractionError";

const MAX_REDIRECTS = 5;
const PREFLIGHT_TIMEOUT_MS = 4000;
const ALLOWED_PORTS = new Set(["", "80", "443", "8080", "8443"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa", ".intranet"];

const IPV4_RANGES: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const IPV6_RANGES: [string, number][] = [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];

const blockList = new BlockList();
for (const [network, prefix] of IPV4_RANGES) blockList.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of IPV6_RANGES) blockList.addSubnet(network, prefix, "ipv6");

export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return true;
  return blockList.check(address, family === 4 ? "ipv4" : "ipv6");
}

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

export function parsePublicUrl(input: string): URL {
  const trimmed = input.trim();
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new ExtractionError("invalid_url", "Enter a valid http or https URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ExtractionError("invalid_url", "Only http and https URLs can be inspected.");
  }
  if (url.username || url.password) {
    throw new ExtractionError("invalid_url", "URLs with embedded credentials are not supported.");
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new ExtractionError("blocked_target", "This port is not allowed for inspection.");
  }
  url.hash = "";
  return url;
}

export interface HostGuard {
  assertPublicHost(hostname: string): Promise<void>;
}

async function verifyHost(rawHostname: string): Promise<void> {
  const hostname = normalizeHostname(rawHostname);
  const blocked = new ExtractionError(
    "blocked_target",
    "This address resolves to a private or reserved network and cannot be inspected.",
  );

  if (isIP(hostname) !== 0) {
    if (isBlockedAddress(hostname)) throw blocked;
    return;
  }
  const isInternalName =
    hostname === "localhost" ||
    !hostname.includes(".") ||
    BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  if (isInternalName) throw blocked;

  const records = await lookup(hostname, { all: true, verbatim: true }).catch(() => {
    throw new ExtractionError("navigation_failed", `Could not resolve ${hostname}.`);
  });
  if (records.length === 0 || records.some((record) => isBlockedAddress(record.address))) {
    throw blocked;
  }
}

export function createHostGuard(): HostGuard {
  const verdicts = new Map<string, Promise<void>>();
  return {
    assertPublicHost(hostname) {
      const key = normalizeHostname(hostname);
      let verdict = verdicts.get(key);
      if (!verdict) {
        verdict = verifyHost(key);
        verdicts.set(key, verdict);
      }
      return verdict;
    },
  };
}

export async function resolvePublicTarget(
  input: string,
  guard: HostGuard,
  userAgent: string,
): Promise<URL> {
  let current = parsePublicUrl(input);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await guard.assertPublicHost(current.hostname);

    const response = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS),
    }).catch(() => null);
    if (!response) return current;

    const location = response.headers.get("location");
    await response.body?.cancel().catch(() => undefined);
    if (response.status < 300 || response.status >= 400 || !location) return current;

    current = parsePublicUrl(new URL(location, current).href);
  }

  throw new ExtractionError("navigation_failed", "The target redirected too many times.");
}
