import { Link } from "react-router-dom";
import { LandingHeader } from "./LandingHeader";
import { HomeHero } from "./HomeHero";
import { HeroStory } from "./HeroStory";
import { Collections } from "./Collections";
import { Gallery } from "./Gallery";
import { HowItWorks } from "./HowItWorks";

/** The marketing landing page at /. */
export function Landing() {
  return (
    <div className="home">
      <LandingHeader />
      <HomeHero />
      <HeroStory />
      <Collections />
      <Gallery />
      <HowItWorks />

      <section className="home-final">
        <div className="wrap home-final-inner">
          <h2 className="home-h2">Your place, made to keep.</h2>
          <p className="section-sub">It takes about a minute to design. Nothing to install.</p>
          <Link className="btn-primary lg" to="/mountains">Start designing</Link>
        </div>
      </section>

      <footer className="home-foot">
        <div className="wrap home-foot-inner">
          <div>
            <div className="home-brand" style={{ marginBottom: 8 }}>CAIRN</div>
            <div>Bespoke topographic jewelry · made to order</div>
          </div>
          <div className="mono">
            Map data © OpenStreetMap contributors
          </div>
        </div>
      </footer>
    </div>
  );
}
