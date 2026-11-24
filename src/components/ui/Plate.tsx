import type { ReactNode } from "react";

interface PlateProps {
  index: string;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Plate({ index, title, meta, children, className = "" }: PlateProps) {
  return (
    <section className={`plate min-w-0 ${className}`}>
      <header className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 border-b border-hairline px-4 py-2.5">
        <span className="label text-signal">Pl. {index}</span>
        <h2 className="label text-ink">{title}</h2>
        {meta ? <div className="label ml-auto flex items-center gap-3 text-right">{meta}</div> : null}
      </header>
      {children}
    </section>
  );
}
