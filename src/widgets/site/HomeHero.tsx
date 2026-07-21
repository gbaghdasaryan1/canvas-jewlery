import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "@/shared/i18n";
import { ContourArt } from "./ContourArt";

// Each slide is a pair of blocks (left + right) shown side by side. The slider
// cross-fades/slides through them behind the fixed centre brand overlay.
const SLIDES: { left: { seed: number; tone: string }; right: { seed: number; tone: string } }[] = [
  { left: { seed: 7, tone: "bronze" },   right: { seed: 214, tone: "gold" } },
  { left: { seed: 61, tone: "sage" },    right: { seed: 388, tone: "silver" } },
  { left: { seed: 129, tone: "stone" },  right: { seed: 452, tone: "bronze" } },
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
    <section className="home-hero">
      {/* Slider — the parent div holding every slide's two blocks. */}
      <div className="home-hero-slider" aria-hidden>
        <div className="home-hero-track" style={{ transform: `translateX(-${i * 100}%)` }}>
          {SLIDES.map((s, n) => (
            <div className="home-hero-slide" key={n}>
              <div className="home-hero-block">
                <ContourArt seed={s.left.seed} tone={s.left.tone} />
              </div>
              <div className="home-hero-block">
                <ContourArt seed={s.right.seed} tone={s.right.tone} />
              </div>
            </div>
          ))}
        </div>
        <div className="home-hero-scrim" />
      </div>

      {/* Brand line — absolutely centred over the slider. */}
      <div className="home-hero-brand">
        <div className="eyebrow">{t.hero.eyebrow}</div>
        <h1 className="home-hero-title">
          {t.hero.title.l1}<br />{t.hero.title.l2}<em>{t.hero.title.em}</em>
        </h1>
        <p className="home-hero-lead">{t.hero.lead}</p>
        <div className="home-hero-cta">
          <Link className="btn-primary lg" to="/mountains">{t.hero.ctaPrimary}</Link>
          <a className="btn-ghost lg" href="#gallery">{t.hero.ctaSecondary}</a>
        </div>
      </div>

      {/* Slider dots */}
      <div className="home-hero-dots">
        {SLIDES.map((_, n) => (
          <button
            key={n}
            type="button"
            className={`home-hero-dot ${n === i ? "on" : ""}`}
            aria-label={`Slide ${n + 1}`}
            aria-current={n === i}
            onClick={() => setI(n)}
          />
        ))}
      </div>
    </section>
  );
}
