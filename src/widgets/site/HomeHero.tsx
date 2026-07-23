import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "@/shared/i18n";
import { ContourArt } from "./ContourArt";
import styles from "./HomeHero.module.css";

// Each slide is a pair of blocks (left + right) shown side by side. The slider
// cross-fades/slides through them behind the fixed centre brand overlay.
const SLIDES: { left: { seed: number; tone: string }; right: { seed: number; tone: string } }[] = [
  { left: { seed: 7, tone: "bronze" }, right: { seed: 214, tone: "gold" } },
  { left: { seed: 61, tone: "sage" }, right: { seed: 388, tone: "silver" } },
  { left: { seed: 129, tone: "stone" }, right: { seed: 452, tone: "bronze" } },
];

const SLIDE_MS = 5000;

/** Marketing hero — a two-block slider with an absolutely-centred brand line. */
export function HomeHero() {
  const t = useT();
  const [i, setI] = useState(0);

  // Auto-advance the slider.
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % SLIDES.length), SLIDE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className={styles.hero}>
      {/* Slider — the parent div holding every slide's two blocks. */}
      <div className={styles.slider} aria-hidden>
        <div className={styles.track} style={{ transform: `translateX(-${i * 100}%)` }}>
          {SLIDES.map((s, n) => (
            <div className={styles.slide} key={n}>
              <div className={styles.block}>
                <ContourArt seed={s.left.seed} tone={s.left.tone} />
              </div>
              <div className={styles.block}>
                <ContourArt seed={s.right.seed} tone={s.right.tone} />
              </div>
            </div>
          ))}
        </div>
        <div className={styles.scrim} />
      </div>

      {/* Brand line — absolutely centred over the slider. */}
      <div className={styles.brand}>
        <div className="eyebrow">{t.hero.eyebrow}</div>
        <h1 className={styles.title}>
          {t.hero.title.l1}
          <br />
          {t.hero.title.l2}
          <em>{t.hero.title.em}</em>
        </h1>
        <p className={styles.lead}>{t.hero.lead}</p>
        <div className={styles.cta}>
          <Link className="btn-primary lg" to="/mountains">
            {t.hero.ctaPrimary}
          </Link>
          <a className="btn-ghost lg" href="#gallery">
            {t.hero.ctaSecondary}
          </a>
        </div>
      </div>

      {/* Slider dots */}
      <div className={styles.dots}>
        {SLIDES.map((_, n) => (
          <button
            key={n}
            type="button"
            className={`${styles.dot} ${n === i ? styles.on : ""}`}
            aria-label={`Slide ${n + 1}`}
            aria-current={n === i}
            onClick={() => setI(n)}
          />
        ))}
      </div>
    </section>
  );
}
