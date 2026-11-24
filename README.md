# Swatch

Swatch inspects any public URL in headless Chromium, reads the styles the page actually computes, and resolves them into a design system: semantic colors, a type scale, a spacing scale, radii and shadows. The result is rendered as an interactive styleguide with a live component stage, and exported as a `tailwind.config.js`, a CSS variables file, or JSON.

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
| `npm run browsers` | Install Chromium for Playwright |

## Configuration

Copy `.env.example` to `.env.local` to enable model-assisted normalization.

| Variable | Default | Effect |
| --- | --- | --- |
| `OPENAI_API_KEY` | unset | Enables structured token synthesis. Unset means deterministic normalization only. |
| `SWATCH_OPENAI_MODEL` | `gpt-5.4-mini` | Model used for synthesis. |

## Using the bench

- **Spectral readout.** The chromatic spectrum shows the clustered palette, sized by weighted presence and ordered neutrals first, then by hue. Markers on the hue rail and the luminance wedge show where each cluster sits. Four WCAG contrast checks update as you edit.
- **Specimens.** Three tabs:
  - *Color*: twelve semantic chips. Click a chip to copy its hex value; use **Tune** to change it. Each chip reports its contrast ratio against the role it is normally paired with.
  - *Typography*: one row per type step with cap-height, x-height and baseline guides measured from the resolved face. Drag the slider to resize a step, and toggle optical sizing.
  - *Measure*: a vernier ruler for spacing (drag along a track to move its jaw), corner radii and captured shadows.
- **Live component stage.** Button, Card, Input and Badge components styled only by the active tokens. Every edit restyles the stage immediately.
- **Export.** `tailwind.config.js`, CSS variables or JSON, regenerated on every edit, with one-click copy. The CSS variable names follow the Tailwind v4 theme namespaces (`--color-*`, `--text-*`, `--spacing-*`, `--radius-*`, `--shadow-*`), so the block can be pasted into an `@theme` rule.

## How it works

```
URL ──> urlGuard ──> scraper (Playwright) ──> RawExtraction
                                                  │
                          tokenNormalizer (deterministic, ~1 ms)
                                                  │
                     aiNormalizer (optional, reconciled per section)
                                                  │
                                         DesignSystemTokens
                                                  │
                    styleguide · live stage · tailwindExporter
```

### 1. Extraction

`POST /api/extract` validates the target, opens it in a fresh browser context, and runs a bounded sampler inside the page.

The sampler does not walk the whole DOM. It takes an evenly spaced sample of up to 90 elements from each of seven selector groups (landmarks, controls, headings, code, links, body copy, card-like surfaces), then adds a breadth-first walk from `body` limited to depth 7 with a fan-out of 10 children per parent. The total is capped at 900 elements. For each visible element it records:

- background colors weighted by visible area, text colors weighted by text length, border colors, and the fills of actionable controls as accent candidates;
- font family, size, weight, line height and letter spacing, tagged by role;
- padding, margin and gap values, corner radii, and box shadows.

Colors in any CSS syntax are resolved to sRGB through a one-pixel canvas, so `oklch()`, `lab()` and `color()` values are handled alongside `rgb()`.

### 2. Normalization

`src/lib/tokenNormalizer.ts` turns a `RawExtraction` into `DesignSystemTokens`. It is pure TypeScript with no server dependencies, so the same code runs in the API route and in the browser.

- **Colors** are composited over the page background, clustered in OKLab, then assigned to roles. The foreground is the text cluster with the best combination of usage and contrast. Brand colors are ranked by usage share, usage type and chroma. Status colors are looked up in fixed hue windows and synthesized when a page has none.
- **Type** sizes within 6% of each other are merged. The `base` step is the most used body size between 14 and 22 px, and the remaining steps are named outward from it.
- **Spacing** is snapped to a detected 4 px or 5 px grid and keyed the Tailwind way (pixels divided by four).
- **Radii and shadows** are merged, ranked by frequency and named by size.

The output is validated against `DesignSystemTokensSchema`.

### 3. Model-assisted synthesis

`POST /api/normalize` always computes the deterministic baseline first. With an API key present it then asks the model for a structured draft (`generateText` with `Output.object` from the Vercel AI SDK). The draft is treated as a proposal: each section is repaired, validated on its own against the strict schema, and replaced by the baseline section if it does not hold. A failed or slow model request returns the baseline with a notice.

In the app, live extractions are normalized in the browser straight away, and the model result replaces them only if you have not started editing.

## Security model

The extractor fetches URLs chosen by the user, so it is built to refuse anything that is not a public web page.

- Only `http` and `https` are accepted. URLs with embedded credentials are rejected. Ports are limited to 80, 443, 8080 and 8443.
- Hostnames are resolved before any request and rejected if any record is loopback, private, link-local, carrier-grade NAT, multicast, documentation, NAT64, 6to4 or unique-local. Single-label names and `.local`, `.internal`, `.localhost`, `.lan` and similar suffixes are refused without a lookup. Numeric encodings such as `http://2130706433/` are normalized by the URL parser and then blocked.
- Redirects on the main document are followed manually, at most five hops, and every hop passes the same checks before Chromium navigates.
- Inside the browser, every request is intercepted and its host re-checked. Redirect hops that Playwright does not expose to interception are checked as they happen, and the connected server address of every response is verified. A violation closes the context and fails the extraction.
- Service workers, downloads and WebSockets are blocked, and at most three extractions run at once.

Known limit: host checks and Chromium's own DNS resolution are separate lookups, so a hostile DNS server could answer them differently. The response address check catches this after the fact, but for a public deployment you should also run the service with network egress rules that deny private ranges.

## Performance strategy

**Extraction budget**

| Phase | Limit |
| --- | --- |
| Whole extraction | 20 s |
| Navigation to `domcontentloaded` | 10 s |
| Wait for `load` | 3.5 s |
| Network-idle settle | 0.9 s |

- One Chromium process is launched lazily and reused; each request gets an isolated context.
- Images, media, fonts, WebSockets, event streams, manifests and pings are aborted, along with a list of analytics and advertising hosts. Blocking fonts is safe here because computed `font-family` reflects the declared stack whether or not the file loads.
- The sampler is a single synchronous pass with a hard node cap, so page size has little effect on sampling time.

On the development machine, extractions of large marketing sites completed in about 3 seconds end to end, and deterministic normalization took about 1 ms per extraction.

**Interface budget**

- Components subscribe to narrow slices of the Zustand store. Editing one color re-renders the chips that depend on it, the contrast checks and the stage wrapper, not the whole styleguide.
- The live stage is driven by CSS custom properties set on one element. Colors and radii are registered with `@property`, so switching systems interpolates them while edits apply instantly.
- The export panel renders from a deferred copy of the tokens, so syntax highlighting never blocks a drag. Copy always uses the current tokens.

Measured on a production build during a 120-step color drag: about 1 ms of synchronous work per edit and a 16.7 ms median frame.

## Project layout

```
src/
  app/
    api/extract/route.ts      POST { url } -> { extraction }
    api/normalize/route.ts    POST { extraction } -> { tokens, fallbackReason }
    globals.css               Theme tokens, drafting grid, plates, motion
  components/
    Studio.tsx                Page shell, morph window, spotlight sweep
    UrlInputBar.tsx           Target input and sample profile loader
    SpectrumBar.tsx           Chromatic spectrum and hue rail
    CalibrationStrip.tsx      Luminance wedge and contrast checks
    StyleguideView.tsx        Tabbed specimen plate
    ComponentSandbox.tsx      Live component stage
    TailwindCodePanel.tsx     Export panel with copy
    styleguide/               Color chips, type rack, vernier ruler, radii and
                              shadows, and the Button, Card, Input and Badge
                              components used on the stage
  hooks/                      Clipboard, font metrics, morph window
  lib/
    urlGuard.ts               URL parsing, DNS checks, redirect resolution
    resourcePolicy.ts         Blocked resource types and tracker hosts
    pageSampler.ts            In-page DOM sampler
    scraper.ts                Playwright orchestration and time budgets
    samples.ts                Bundled sample extractions
    color.ts                  OKLab/OKLCH conversion, contrast, mixing
    colorRoles.ts             Clustering and semantic color assignment
    scaleRoles.ts             Type, spacing, radius and shadow scales
    tokenNormalizer.ts        Deterministic normalizer and draft reconciliation
    aiNormalizer.ts           Structured model synthesis (server only)
    tailwindExporter.ts       Tailwind config, CSS variables and JSON output
  store/useTokenStore.ts      Extraction state, token edits, tab and format
  types/tokens.ts             Zod schemas and inferred types
```

The URL guard and sample profiles live in their own modules instead of inside `scraper.ts`. This keeps every file short, and lets the browser import the samples without pulling in Playwright.

## API

### `POST /api/extract`

```json
{ "url": "https://example.com" }
```

Returns `{ "extraction": RawExtraction }`. Errors use `{ "error": { "code", "message" } }` with these codes:

| Code | Status | Meaning |
| --- | --- | --- |
| `invalid_request`, `invalid_url` | 400 | Malformed body or URL |
| `blocked_target` | 403 | Private, reserved or disallowed address or port |
| `busy` | 429 | Too many concurrent extractions |
| `navigation_failed`, `upstream_status` | 502 | The page could not be loaded or returned an error status |
| `browser_unavailable` | 503 | Chromium failed to start |
| `timeout` | 504 | A time budget was exceeded |

### `POST /api/normalize`

```json
{ "extraction": { "...": "RawExtraction" }, "mode": "auto" }
```

Returns `{ "tokens": DesignSystemTokens, "fallbackReason": string | null }`. Set `mode` to `"deterministic"` to skip the model even when a key is configured.

## Limitations

- Pages are sampled once, at 1440 by 900, in their default state. Hover styles, dark mode variants and content behind interaction or sign-in are not captured.
- Sites that block automated browsers return an error status and are reported as `upstream_status`.
- Type specimens use the extracted font stack. Fonts that are not installed locally fall back to the next family in that stack; Geist, Geist Mono and Fraunces are bundled.
- Semantic roles are inferred from usage. Treat them as a well-informed first draft and adjust them on the bench.
- The bundled sample profiles are fictional sites authored for the demo.

## License

[MIT](LICENSE)
