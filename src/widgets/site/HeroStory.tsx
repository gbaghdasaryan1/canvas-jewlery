import { useT } from "@/shared/i18n";
import styles from "./HeroStory.module.css";

/** Narrative section below the hero — emotional "why" statement. */
export function HeroStory() {
  const t = useT();
  return (
    <section className={styles.story}>
      <div className="wrap">
        <div className={styles.inner}>
          <div className="eyebrow">{t.story.eyebrow}</div>
          <h2 className={styles.title}>{t.story.title}</h2>
          <p className={styles.opening}>{t.story.opening}</p>
          <ul className={styles.lines}>
            {t.story.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
