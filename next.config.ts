import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["playwright", "playwright-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/extract": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/playwright-core/browsers.json",
      "./node_modules/playwright-core/lib/**",
    ],
  },
};

export default nextConfig;
