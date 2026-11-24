import { describe, expect, it } from "vitest";
import { ExtractionError } from "@/lib/extractionError";
import { createHostGuard, isBlockedAddress, parsePublicUrl } from "@/lib/urlGuard";

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.9",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fe80::1",
    "fd12:3456::1",
    "::ffff:10.0.0.1",
    "not-an-ip",
  ])("blocks %s", (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(["1.1.1.1", "140.82.112.3", "2606:4700:4700::1111"])("allows %s", (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });
});

describe("parsePublicUrl", () => {
  it("adds https to bare hosts and drops the fragment", () => {
    expect(parsePublicUrl("example.com/path#section").href).toBe("https://example.com/path");
  });

  it.each([
    ["file:///etc/passwd", "invalid_url"],
    ["javascript:alert(1)", "invalid_url"],
    ["http://user:secret@example.com/", "invalid_url"],
    ["https://example.com:22/", "blocked_target"],
    ["http://[", "invalid_url"],
  ])("rejects %s", (input, code) => {
    expect(() => parsePublicUrl(input)).toThrowError(ExtractionError);
    try {
      parsePublicUrl(input);
    } catch (error) {
      expect((error as ExtractionError).code).toBe(code);
    }
  });
});

describe("createHostGuard", () => {
  const guard = createHostGuard();

  it.each(["localhost", "intranet", "printer.local", "db.internal", "127.0.0.1", "[::1]", "169.254.169.254"])(
    "refuses %s without a public lookup",
    async (host) => {
      await expect(guard.assertPublicHost(host)).rejects.toMatchObject({ code: "blocked_target" });
    },
  );

  it("normalizes numeric hosts through the URL parser before checking", async () => {
    const { hostname } = parsePublicUrl("http://2130706433/");
    await expect(guard.assertPublicHost(hostname)).rejects.toMatchObject({ code: "blocked_target" });
  });
});
