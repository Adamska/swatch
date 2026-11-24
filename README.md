# Swatch

Swatch inspects any public URL in headless Chromium, reads the styles the page actually computes, and resolves them into a design system: semantic colors in a light and a dark scheme, tonal scales, a fluid type scale, spacing, radii, shadows and interaction states. The result is an interactive styleguide with a live component stage, a capture of the source page that shows where every value was found, and exports for Tailwind v3, Tailwind v4, CSS variables, shadcn/ui and W3C Design Tokens.

It works without any API key. When `OPENAI_API_KEY` is set, a model refines the token set through structured output; otherwise a deterministic perceptual clusterer does all the work locally.

## Quick start

Requires Node.js 20.9 or newer.

```bash
npm install
npm run browsers   # downloads the Chromium build Playwright drives
npm run dev
```

Open `http://localhost:3000`, then either enter a URL and press **Inspect**, or press **Load Sample Extraction** to put one of four bundled profiles on the bench. Sample profiles are normalized in the browser and need no network access.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | Run `tsc --noEmit` |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest unit suite |
| `npm run test:e2e` | Run the Playwright end-to-end suite (starts a dev server) |
| `npm run browsers` | Install Chromium for Playwright |

## Configuration

Copy `.env.example` to `.env.local`. Every variable is optional.

| Variable | Default | Effect |
| --- | --- | --- |
| `OPENAI_API_KEY` | unset | Enables structured token synthesis. Unset means deterministic normalization only. |
| `SWATCH_OPENAI_MODEL` | `gpt-5.4-mini` | Model used for synthesis. |
| `SWATCH_PUBLIC_URL` | Vercel URL or `http://localhost:3000` | Absolute origin used for share link preview images. |
| `SWATCH_CHROMIUM` | automatic | `bundled` forces Playwright's own Chromium, `serverless` forces `@sparticuz/chromium`. Detected from `VERCEL` and `AWS_LAMBDA_FUNCTION_NAME` when unset. |

## Using the bench

**Inspecting.** Enter a URL and press **Inspect**. A capture log streams each phase as it completes: address check, navigation, sampling, capture, hover and focus probing, the dark scheme pass, the mobile pass and the internal pages that were followed. Finished inspections are kept under **Recent** in your browser.

**Toolbar.**

- *Scheme* switches every specimen, the stage and the contrast checks between the extracted scheme and its opposite. The opposite scheme is extracted when the site responds to `prefers-color-scheme: dark`, and synthesized in OKLCH otherwise.
- *Vision* simulates protanopia, deuteranopia, tritanopia and achromatopsia across the whole bench.
- *Redlines* draws dimension lines over the stage components: size, padding, radius and type metrics.
- *Undo* and *Redo* also respond to `Cmd+Z` / `Ctrl+Z` and `Shift+Cmd+Z` / `Ctrl+Y`. One slider drag is one step.
- *Pin as reference* keeps the current system for the Compare tab.
- *Share link* copies a URL that restores the system, edits included. The link carries its own preview image.
- *Print specimen* lays the system out on one A3 landscape sheet; save it as PDF from the print dialog.

**Spectral readout.** The chromatic spectrum shows the clustered palette, sized by weighted presence. Hover it for a magnifying loupe. Markers on the hue rail and the luminance wedge show where each cluster sits. Four WCAG contrast checks update as you edit, and each failing pair offers **Lift**.

**Specimens.**

- *Color*: the sampled palette, the twelve semantic roles and their tonal scales. Drag a palette sample or a spectrum band onto a role to reassign it, or select a sample and then pick the role. Click a chip to copy its value or use **Tune** to pick any color. **Lift to AA** shifts only a role's perceptual lightness until it reaches 4.5:1 against the color it is read on. Each scale marks the extracted stop and the first stop that reads as body text on the page ground.
- *Typography*: one row per step with cap-height, x-height and baseline guides measured from the resolved face. Steps that shrink on mobile show their fluid range. Faces published on Google Fonts are loaded automatically, and each family reports whether it is bundled, installed, loaded or falling back.
- *Measure*: a vernier ruler for spacing, corner radii and captured shadows.
- *Compare*: perceptual distance for every role, type steps side by side and scale differences against the pinned reference.

**Stage and source.** The stage renders Button, Card, Input and Badge components styled only by the active tokens, including the observed hover color and focus ring. The **Source** view shows the structural capture of the inspected page; hover any chip, type row, spacing row or radius to spotlight where it appears.

**Export.** Every format regenerates on each edit and can be copied or downloaded.

| Format | File | Contents |
| --- | --- | --- |
| Tailwind v3 | `tailwind.config.js` | Colors with 50 to 950 scales and a primary hover, fonts, fluid font sizes, spacing, radii, shadows |
| Tailwind v4 | `theme.css` | An `@theme` block plus a custom variant carrying the opposite scheme |
| CSS variables | `tokens.css` | `:root` variables and a `[data-theme]` block for the opposite scheme |
| shadcn/ui | `shadcn-theme.css` | `:root` and `.dark` blocks in OKLCH, including chart and sidebar variables |
| Design Tokens | `tokens.json` | W3C Design Tokens with structured color, dimension, typography and shadow values |

## How it works

```
URL ──> urlGuard ──> scraper (Playwright, multi-pass) ──> RawExtraction + evidence
                                                              │
                                    tokenNormalizer (deterministic, ~1 ms)
                                                              │
                               aiNormalizer (optional, reconciled per section)
                                                              │
                                                     DesignSystemTokens
                                                              │
                                styleguide · stage · source view · exporters
```

### 1. Extraction

`POST /api/extract` validates the target, opens it in a fresh browser context and runs these passes:

1. **Sample.** A bounded sampler runs inside the page. It takes an evenly spaced sample of up to 90 elements from each of seven selector groups (landmarks, controls, headings, code, links, body copy, card-like surfaces), then adds a breadth-first walk from `body` limited to depth 7 with a fan-out of 10. The total is capped at 900 elements. It records area-weighted fills, text colors weighted by text length, borders, control fills, font metrics by role, padding, margins and gaps, radii and shadows. Colors in any CSS syntax are resolved through a one-pixel canvas.
2. **Capture.** A second in-page pass records where each color, type size, spacing value and radius appears in the first 1800 px, and a JPEG of that area is taken with media hidden.
3. **States.** Up to three filled controls in the first viewport are hovered and focused with transitions frozen, recording their hover fill and focus ring.
4. **Scheme.** The page is re-sampled under `prefers-color-scheme: dark`.
5. **Viewport.** Type is re-sampled at a 390 px viewport.
6. **Pages.** Two internal links from the header or navigation are sampled in parallel and merged at half weight.

Progress is streamed as NDJSON. Results are cached for ten minutes per URL.

### 2. Normalization

`src/lib/tokenNormalizer.ts` turns a `RawExtraction` into `DesignSystemTokens`. It is pure TypeScript, so the same code runs in the API route and in the browser.

- **Colors** are composited over the page background, clustered in OKLab, then assigned to roles. The foreground is the text cluster with the best combination of usage and contrast. Brand colors are ranked by usage share, usage type and chroma. Status colors are looked up in fixed hue windows and synthesized when a page has none.
- **Scheme.** The dark pass is accepted as the opposite scheme only if its ground flips and stays readable. Otherwise the opposite scheme is synthesized by mirroring neutral lightness and lifting brand roles to at least 3:1.
- **Tonal scales** place eleven stops at fixed OKLCH lightness, keep the extracted value verbatim at its nearest stop, and reduce chroma to stay inside sRGB.
- **Type** sizes within 6% of each other are merged. The `base` step is the most used body size between 14 and 22 px. Larger steps are paired by rank with mobile heading sizes to produce `clamp()` values between 390 and 1440 px.
- **Spacing** is snapped to a detected 4 px or 5 px grid and keyed the Tailwind way (pixels divided by four). **Radii and shadows** are merged, ranked and named by size.
- **States** use the observed hover of the control whose fill matches the primary; otherwise a hover is synthesized in OKLCH.

### 3. Model-assisted synthesis

`POST /api/normalize` always computes the deterministic baseline first. With an API key present it asks the model for a structured draft (`generateText` with `Output.object` from the Vercel AI SDK). Each section of the draft is repaired, validated on its own against the strict schema and replaced by the baseline section if it does not hold. A failed model request returns the baseline with a notice. In the app, the model result replaces the local one only if you have not started editing.

## Deploying

Both options below are free to start, need no code changes and run the same Playwright code as local development.

### Vercel (recommended)

1. Push the repository to GitHub and import it in Vercel. No settings are required.
2. Optionally add `OPENAI_API_KEY` and `SWATCH_PUBLIC_URL` in the project's environment variables.

On Vercel, Swatch launches `@sparticuz/chromium` through the same `playwright` API. Playwright is pinned to 1.63, whose bundled Chromium is the same 153 line as `@sparticuz/chromium` 153, so local and deployed extractions run the same engine. `next.config.ts` traces the Chromium archive into the extract function, and the route allows 60 seconds.

Things to know: the Hobby plan is for non-commercial use; the first extraction after a cold start spends one to three seconds unpacking Chromium; the in-memory cache and rate limiter are per instance.

### Docker (Hugging Face Spaces, Render, Fly or any container host)

The `Dockerfile` builds on Playwright's official image, so the browser is byte-for-byte the one used in development.

```bash
docker build -t swatch .
docker run -p 7860:7860 swatch
```

On Hugging Face Spaces, create a Docker Space and push this repository; the image listens on port 7860, the Spaces default. On other hosts, set `PORT` if the platform expects a different one.

## Security model

The extractor fetches URLs chosen by the user, so it refuses anything that is not a public web page.

- Only `http` and `https` are accepted. URLs with embedded credentials are rejected. Ports are limited to 80, 443, 8080 and 8443.
- Hostnames are resolved before the response stream opens and rejected if any record is loopback, private, link-local, carrier-grade NAT, multicast, documentation, NAT64, 6to4 or unique-local. Single-label names and `.local`, `.internal`, `.localhost`, `.lan` and similar suffixes are refused without a lookup. Numeric encodings such as `http://2130706433/` are normalized by the URL parser and then blocked.
- Redirects on the main document are followed manually, at most five hops, and every hop passes the same checks before Chromium navigates.
- Inside the browser, every request from every page, including the followed internal pages, is intercepted and its host re-checked. Redirect hops are checked as they happen, and the connected server address of every response is verified. A violation closes the context and fails the extraction.
- Service workers, downloads and WebSockets are blocked. At most three extractions run at once per instance, and each client may start eight per minute.

Known limit: host checks and Chromium's own DNS resolution are separate lookups, so a hostile DNS server could answer them differently. The response address check catches this after the fact, but a public deployment should also run with network egress rules that deny private ranges.

Privacy note: when a specimen uses a family published on Google Fonts, the viewer's browser requests it from `fonts.googleapis.com`.

## Performance strategy

**Extraction budget**

| Phase | Limit |
| --- | --- |
| Whole extraction | 25 s |
| Navigation to `domcontentloaded` | 10 s |
| Wait for `load` | 3.5 s |
| Network-idle settle | 0.9 s |
| Optional passes start before | 15 s |
| Each internal page | 7 s |

- One Chromium process is launched lazily and reused; each request gets an isolated context.
- Images, media, fonts, WebSockets, event streams, manifests and pings are aborted, along with a list of analytics and advertising hosts. Computed `font-family` reflects the declared stack whether or not the file loads.
- Internal pages load in parallel with the capture, state, scheme and viewport passes on the entry page.
- Optional passes are skipped, not failed, when the budget runs short.

Measured on the development machine: GitHub, Stripe, Tailwind CSS and Linear completed all passes in 3 to 6 seconds, and deterministic normalization took about 1 ms.

**Interface budget**

- Components subscribe to narrow slices of the Zustand store; view-only state such as the hovered specimen lives in a separate store, so hovering never re-renders tokens.
- The stage is driven by CSS custom properties on one element. Colors and radii are registered with `@property`, so switching systems interpolates them while edits apply instantly.
- Tonal scales and the opposite scheme are memoized per color and per token set.
- The export panel renders from a deferred copy of the tokens, so syntax highlighting never blocks a drag.

Measured on a production build during a 120-step color drag: about 1 ms of synchronous work per edit and a 16.7 ms median frame.

## Testing

`npm test` runs 82 unit tests: the URL guard, OKLCH math and contrast lifting, tonal scales, scheme synthesis, fluid type, multi-page merging, every exporter, the share codec, the rate limiter, the cache and undo history. The normalizer is checked against four real captures (GitHub, Stripe, Tailwind CSS and Linear) kept in `tests/fixtures`.

`npm run test:e2e` drives the bench in Chromium: a walk through every tab, a contrast lift undone from the keyboard, palette assignment, scheme and export switching, share link restoration, and SSRF refusal at the API. Set `E2E_PORT` to reuse a dev server that is already running.

## Project layout

```
src/
  app/
    api/extract/route.ts       POST { url } -> NDJSON progress, then the extraction
    api/normalize/route.ts     POST { extraction } -> { tokens, fallbackReason }
    og/route.tsx               Preview image for share links
    page.tsx                   Restores shared systems and sets their metadata
  components/
    Studio.tsx                 Page shell, shortcuts, morph window, spotlight sweep
    UrlInputBar.tsx            Target input, samples, recent captures, capture log
    BenchToolbar.tsx           Scheme, vision, redlines, history, share, print
    SpectrumBar.tsx            Spectrum with loupe and draggable bands
    CalibrationStrip.tsx       Luminance wedge and contrast checks
    StyleguideView.tsx         Color, Typography, Measure and Compare tabs
    ComponentSandbox.tsx       Live stage and source capture
    TailwindCodePanel.tsx      Export formats with copy and download
    SpecimenPoster.tsx         Print-only A3 specimen
    styleguide/                Specimens, stage components, redlines, compare sheet
  hooks/                       Clipboard, font metrics, web fonts, morph window
  lib/
    urlGuard.ts                URL parsing, DNS checks, redirect resolution
    browserPool.ts             Chromium launch (bundled or serverless) and slots
    requestGuard.ts            Per-context request interception
    scraper.ts                 Pass orchestration, budgets, progress
    pageSampler.ts             In-page style sampler
    anchorSampler.ts           In-page source anchors
    stateProbe.ts              Hover and focus probing
    extractionPasses.ts        Capture, scheme, viewport and internal page passes
    color.ts, colorScale.ts    OKLab and OKLCH math, contrast, scales, lifting
    colorRoles.ts              Clustering and semantic color assignment
    scaleRoles.ts, fluidType.ts  Type, spacing, radius and shadow scales
    schemes.ts, stateRoles.ts  Opposite scheme and interaction states
    tokenNormalizer.ts         Deterministic normalizer and draft reconciliation
    aiNormalizer.ts            Structured model synthesis (server only)
    tailwindExporter.ts        Format registry
    exporters/                 Tailwind v3, Tailwind v4 and CSS, shadcn/ui, DTCG
    shareCodec.ts              Compressed share payloads
  store/                       Token store, edit actions, history, view store
  styles/                      Drafting components, motion and print styles
  types/                       Zod schemas for extractions, tokens and drafts
tests/
  unit/                        Vitest suites
  e2e/                         Playwright suites
  fixtures/                    Live captures used as regression anchors
```

## API

### `POST /api/extract`

```json
{ "url": "https://example.com" }
```

Validation, address and rate-limit errors are returned before streaming as `{ "error": { "code", "message" } }` with the status codes below. Otherwise the response is `application/x-ndjson`, one event per line:

```json
{ "type": "progress", "phase": "navigate", "detail": "HTTP 200 from example.com", "elapsedMs": 1840 }
{ "type": "result", "extraction": { "...": "RawExtraction" }, "evidence": { "image": "data:image/jpeg;base64,...", "anchors": [] } }
```

A failure after streaming has started arrives as `{ "type": "error", "code", "message" }`.

| Code | Status | Meaning |
| --- | --- | --- |
| `invalid_request`, `invalid_url` | 400 | Malformed body or URL |
| `blocked_target` | 403 | Private, reserved or disallowed address or port |
| `rate_limited` | 429 | Too many inspections from this client; see `retry-after` |
| `busy` | 429 (in stream) | Too many concurrent extractions |
| `navigation_failed`, `upstream_status` | 502 | The page could not be resolved or loaded, or returned an error status |
| `browser_unavailable` | 503 (in stream) | Chromium failed to start |
| `timeout` | 504 (in stream) | A time budget was exceeded |

### `POST /api/normalize`

```json
{ "extraction": { "...": "RawExtraction" }, "mode": "auto" }
```

Returns `{ "tokens": DesignSystemTokens, "fallbackReason": string | null }`. Set `mode` to `"deterministic"` to skip the model even when a key is configured.

## Limitations

- Pages are sampled at 1440 by 900 and 390 px wide. Content behind interaction or sign-in is not captured, and only the first viewport's controls are probed for states.
- Sites that block automated browsers return an error status and are reported as `upstream_status`.
- Sites whose dark mode is a stored user preference rather than a media query get a synthesized opposite scheme.
- The source capture withholds images, video and webfonts, so it shows structure and fallback type rather than a pixel-perfect render.
- Semantic roles are inferred from usage. Treat them as a well-informed first draft and reassign them on the bench.
- The bundled sample profiles are fictional sites authored for the demo.

## License

[MIT](LICENSE)
