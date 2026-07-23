import { useT } from "@/shared/i18n";
import styles from "./TrustStrip.module.css";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS = [
  <svg viewBox="0 0 24 24" width="22" height="22" {...stroke}>
    <path d="M3 20 9 8l4 7 3-5 5 10Z" />
  </svg>,
  <svg viewBox="0 0 24 24" width="22" height="22" {...stroke}>
    <path d="M12 3 4 8v8l8 5 8-5V8Z" />
    <path d="M12 3v18M4 8l8 5 8-5" />
  </svg>,
  <svg viewBox="0 0 24 24" width="22" height="22" {...stroke}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>,
  <svg viewBox="0 0 24 24" width="22" height="22" {...stroke}>
    <path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>,
];

/** Factual credibility band under the hero — reduces perceived risk. */
export function TrustStrip() {
  const t = useT();
  return (
    <section className={styles.strip} aria-label="Mémoire">
      <div className={`wrap ${styles.grid}`}>
        {t.trust.map((it, i) => (
          <div className={styles.item} key={it.title}>
            <span className={styles.ico} aria-hidden>
              {ICONS[i]}
            </span>
            <div>
              <div className={styles.title}>{it.title}</div>
              <div className={styles.body}>{it.body}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
