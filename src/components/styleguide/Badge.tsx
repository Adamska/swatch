import type { ReactNode } from "react";
import styles from "./stage.module.css";

export type BadgeTone = "neutral" | "primary" | "secondary" | "accent" | "success" | "warning" | "danger";

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: "",
  primary: styles.tonePrimary,
  secondary: styles.toneSecondary,
  accent: styles.toneAccent,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`${styles.badge} ${TONE_CLASS[tone]}`}>{children}</span>;
}
