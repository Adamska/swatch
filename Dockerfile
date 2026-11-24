# Runs Swatch with Playwright's own Chromium build, identical to local development.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production \
    SWATCH_CHROMIUM=bundled \
    PORT=7860

EXPOSE 7860
CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT}"]
