import { useT } from "@/shared/i18n";
import styles from "./Faq.module.css";

/** Objection-handling FAQ — reduces friction before the final CTA. */
export function Faq() {
  const t = useT();
  return (
    <section id="faq" className={`home-section ${styles.section}`}>
      <div className={`wrap ${styles.grid}`}>
        <div className={styles.head}>
          <div className="eyebrow">{t.faq.eyebrow}</div>
          <h2 className="home-h2">{t.faq.title}</h2>
        </div>
        <div className={styles.list}>
          {t.faq.items.map((f) => (
            <details className={styles.item} key={f.q}>
              <summary>
                <span>{f.q}</span>
                <span className={styles.mark} aria-hidden />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
