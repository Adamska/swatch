import { z } from "zod";
import { FontRoleSchema } from "./tokens";

const DraftMeasureSchema = z.object({ name: z.string(), px: z.number() });

export const AiTokenDraftSchema = z.object({
  name: z.string().describe("Short human name for the design system, at most four words"),
  colors: z.object({
    background: z.string(),
    surface: z.string(),
    foreground: z.string(),
    muted: z.string(),
    border: z.string(),
    primary: z.string(),
    primaryForeground: z.string(),
    secondary: z.string(),
    accent: z.string(),
    success: z.string(),
    warning: z.string(),
    danger: z.string(),
  }),
  typography: z.object({
    families: z.object({ display: z.string(), body: z.string(), mono: z.string() }),
    steps: z.array(
      z.object({
        name: z.string(),
        sizePx: z.number(),
        lineHeight: z.number(),
        weight: z.number(),
        letterSpacingEm: z.number(),
        family: FontRoleSchema,
      }),
    ),
  }),
  spacing: z.object({ baseUnitPx: z.number(), steps: z.array(DraftMeasureSchema) }),
  radii: z.array(DraftMeasureSchema),
  shadows: z.array(z.object({ name: z.string(), value: z.string() })),
});

export type AiTokenDraft = z.infer<typeof AiTokenDraftSchema>;
