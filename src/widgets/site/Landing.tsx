import { Link } from "react-router-dom";
import { useT } from "@/shared/i18n";
import { LandingHeader } from "./LandingHeader";
import { HomeHero } from "./HomeHero";
import { HeroStory } from "./HeroStory";
import { Occasions } from "./Occasions";
import { Collections } from "./Collections";
import { Gallery } from "./Gallery";
import { HowItWorks } from "./HowItWorks";
import { Faq } from "./Faq";
import styles from "./Landing.module.css";

export function Landing() {
  const t = useT();
  return (
    <div className="home">
      <LandingHeader />
      <HomeHero />
      <HeroStory />
      <Occasions />
      <HowItWorks />
      <Collections />
      <Gallery />
      <Faq />

      <section className={styles.final}>
        <div className={`wrap ${styles.finalInner}`}>
          <div className="eyebrow">{t.final.eyebrow}</div>
          <h2 className="home-h2">{t.final.title}</h2>
          <p className="section-sub">{t.final.sub}</p>
          <Link className="btn-primary lg" to="/mountains">
            {t.final.cta}
          </Link>
          <div className={styles.guarantee}>
            {t.final.guarantee.map((g) => (
              <span key={g}>✓ {g}</span>
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.foot}>
        <div className={`wrap ${styles.footInner}`}>
          <div>
            <div className="home-brand" style={{ marginBottom: 8 }}>
              Mémoire
            </div>
            <div>{t.footer.tagline}</div>
          </div>
          <div className="mono">{t.footer.mapData}</div>
        </div>
      </footer>
    </div>
  );
}
