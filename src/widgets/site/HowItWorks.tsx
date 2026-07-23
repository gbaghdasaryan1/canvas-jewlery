import { useT } from "@/shared/i18n";
import styles from "./HowItWorks.module.css";

export function HowItWorks() {
  const t = useT();
  return (
    <section id="how" className={styles.section}>
      <div className="wrap">
        <div className="eyebrow">{t.how.eyebrow}</div>
        <h2 className="section-title">{t.how.title}</h2>
        <div className={styles.steps}>
          {t.how.steps.map((s) => (
            <div className={styles.step} key={s.n}>
              <div className={styles.num}>{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <div className={styles.rule} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
