import { useT } from "@/shared/i18n";
import styles from "./Testimonials.module.css";

// NOTE: placeholder testimonials (in every dictionary) — replace with real,
// attributable customer quotes (with permission) before going live.

/** Social proof. Placeholder quotes — swap for real customer testimonials. */
export function Testimonials() {
  const t = useT();
  return (
    <section className="home-section" aria-label={t.testimonials.title}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">{t.testimonials.eyebrow}</div>
            <h2 className="home-h2">{t.testimonials.title}</h2>
          </div>
          <p className="section-sub">{t.testimonials.sub}</p>
        </div>

        <div className={styles.grid}>
          {t.testimonials.quotes.map((q) => (
            <figure className={styles.card} key={q.name}>
              <div className={styles.stars} aria-label="5 / 5">
                ★★★★★
              </div>
              <blockquote>{q.body}</blockquote>
              <figcaption>
                <span className={styles.name}>{q.name}</span>
                <span className={`${styles.place} mono`}>{q.place}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
