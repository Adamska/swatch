import type { Page } from "playwright";
import type { StateSample } from "@/types/extraction";

const PROBE_ATTRIBUTE = "data-swatch-probe";
const FREEZE_MOTION = "*,*::before,*::after{transition:none!important;animation:none!important}";

interface ProbeReading {
  fill: string | null;
  ring: string | null;
}

/** In-page: tags up to `limit` prominent filled controls inside the first viewport and returns their fills. */
function tagControls({ attribute, limit }: { attribute: string; limit: number }): number {
  const selector = "button, [role=button], a[class*=btn i], a[class*=button i], input[type=submit]";
  let tagged = 0;
  for (const element of document.querySelectorAll(selector)) {
    if (tagged >= limit) break;
    const rect = element.getBoundingClientRect();
    if (rect.width < 40 || rect.width > 600 || rect.height < 20 || rect.top < 0 || rect.bottom > window.innerHeight) continue;
    const fill = getComputedStyle(element).backgroundColor;
    if (!fill || fill === "transparent" || /rgba\([^)]*,\s*0(\.0+)?\)$/.test(fill)) continue;
    element.setAttribute(attribute, String(tagged));
    tagged += 1;
  }
  return tagged;
}

/** In-page: reads the current fill and focus ring of a tagged control as hex values. */
function readControl({ attribute, index }: { attribute: string; index: number }): ProbeReading {
  const element = document.querySelector(`[${attribute}="${index}"]`);
  if (!element) return { fill: null, ring: null };
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const painter = canvas.getContext("2d", { willReadFrequently: true });
  const toHex = (value: string): string | null => {
    if (!painter || !value || value === "transparent") return null;
    painter.clearRect(0, 0, 1, 1);
    painter.fillStyle = "#000000";
    painter.fillStyle = value;
    painter.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = painter.getImageData(0, 0, 1, 1).data;
    return a < 128 ? null : `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
  };
  const style = getComputedStyle(element);
  const outline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0 ? toHex(style.outlineColor) : null;
  const shadowColor = /rgba?\([^)]*\)/.exec(style.boxShadow)?.[0];
  return { fill: toHex(style.backgroundColor), ring: outline ?? (shadowColor ? toHex(shadowColor) : null) };
}

/**
 * Hovers and focuses a few primary-looking controls with motion frozen, so transitions cannot leave the
 * reading half way between two states.
 */
export async function probeStates(page: Page, limit = 3): Promise<StateSample[]> {
  await page.addStyleTag({ content: FREEZE_MOTION });
  const count = await page.evaluate(tagControls, { attribute: PROBE_ATTRIBUTE, limit });
  const states: StateSample[] = [];

  for (let index = 0; index < count; index += 1) {
    const selector = `[${PROBE_ATTRIBUTE}="${index}"]`;
    const rest = await page.evaluate(readControl, { attribute: PROBE_ATTRIBUTE, index });
    if (!rest.fill) continue;

    await page.hover(selector, { timeout: 600, force: true }).catch(() => undefined);
    const hovered = await page.evaluate(readControl, { attribute: PROBE_ATTRIBUTE, index });
    await page.mouse.move(0, 0);

    await page
      .locator(selector)
      .evaluate((element) => (element as HTMLElement).focus({ focusVisible: true } as FocusOptions))
      .catch(() => undefined);
    const focused = await page.evaluate(readControl, { attribute: PROBE_ATTRIBUTE, index });
    await page.locator(selector).evaluate((element) => (element as HTMLElement).blur()).catch(() => undefined);

    states.push({
      restFill: rest.fill,
      hoverFill: hovered.fill && hovered.fill !== rest.fill ? hovered.fill : null,
      focusRing: focused.ring && focused.ring !== rest.ring ? focused.ring : null,
    });
  }
  return states;
}
