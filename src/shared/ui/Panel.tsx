import type { ReactNode } from "react";

interface PanelProps {
  label?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** Framed surface with a small mono caption used across the studio. */
export function Panel({ label, className = "", children }: PanelProps) {
  return (
    <div className={`panel ${className}`}>
      {label && <div className="cap">{label}</div>}
      {children}
    </div>
  );
}
