import { Link } from "react-router-dom";
import { useT } from "@/shared/i18n";
import { ContourArt } from "./ContourArt";

/** Marketing hero banner — the top of the landing page. */
export function HomeHero() {
  const t = useT();
  return (
    <section className="home-hero">
      <div className="wrap home-hero-inner">
        <div className="home-hero-copy">
          <div className="eyebrow">{t.hero.eyebrow}</div>
          <h1 className="home-hero-title">
            {t.hero.title.l1}<br />{t.hero.title.l2}<em>{t.hero.title.em}</em>
          </h1>
          <p className="home-hero-lead">{t.hero.lead}</p>
          <div className="home-hero-cta">
            <Link className="btn-primary lg" to="/mountains">{t.hero.ctaPrimary}</Link>
            <a className="btn-ghost lg" href="#gallery">{t.hero.ctaSecondary}</a>
          </div>
          <div className="home-hero-trust">
            {t.hero.trust.map((s) => <span key={s}>✓ {s}</span>)}
          </div>
        </div>

        <div className="home-hero-art">
          <div className="hero-art-frame">
            <ContourArt seed={7} tone="bronze" />
          </div>
          <div className="hero-art-badge mono">Mont Blanc · 45.83°N</div>
        </div>
      </div>
    </section>
  );
}
