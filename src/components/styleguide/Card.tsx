import type { ReactNode } from "react";
import styles from "./stage.module.css";

interface CardProps {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}

export function Card({ title, aside, children }: CardProps) {
  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <h4 className={styles.cardTitle}>{title}</h4>
        {aside}
      </header>
      {children}
    </article>
  );
}
