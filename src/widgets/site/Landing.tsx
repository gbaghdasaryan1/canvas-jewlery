import { Link } from "react-router-dom";
import { useT } from "@/shared/i18n";
import { LandingHeader } from "./LandingHeader";
import { HomeHero } from "./HomeHero";
import { TrustStrip } from "./TrustStrip";
import { HeroStory } from "./HeroStory";
import { Occasions } from "./Occasions";
import { Collections } from "./Collections";
import { Gallery } from "./Gallery";
import { Testimonials } from "./Testimonials";
import { HowItWorks } from "./HowItWorks";
import { Faq } from "./Faq";


export function Landing() {
  const t = useT();
  return (
    <div className="home">
      <LandingHeader />
      <HomeHero />
      <TrustStrip />
      <HeroStory />
      <Occasions />
      <HowItWorks />
      <Collections />
      <Gallery />
      <Testimonials />
      <Faq />

      <section className="home-final">
        <div className="wrap home-final-inner">
          <div className="eyebrow">{t.final.eyebrow}</div>
          <h2 className="home-h2">{t.final.title}</h2>
          <p className="section-sub">{t.final.sub}</p>
          <Link className="btn-primary lg" to="/mountains">{t.final.cta}</Link>
          <div className="home-final-guarantee">
            {t.final.guarantee.map((g) => <span key={g}>✓ {g}</span>)}
          </div>
        </div>
      </section>

      <footer className="home-foot">
        <div className="wrap home-foot-inner">
          <div>
            <div className="home-brand" style={{ marginBottom: 8 }}>CAIRN</div>
            <div>{t.footer.tagline}</div>
          </div>
          <div className="mono">
            {t.footer.mapData}
          </div>
        </div>
      </footer>
    </div>
  );
}
