import { ContourArt } from "./ContourArt";

/** Marketing hero banner — the top of the landing page. */
export function HomeHero() {
  return (
    <section className="home-hero">
      <div className="wrap home-hero-inner">
        <div className="home-hero-copy">
          <div className="eyebrow">Bespoke topographic jewelry</div>
          <h1 className="home-hero-title">
            Turn Your Favorite<br />Place Into <em>Art</em>
          </h1>
          <div className="home-hero-moments">
            <p>From the mountain where you proposed.</p>
            <p>The city where you met.</p>
            <p>The home you'll never forget.</p>
          </div>
          <div className="home-hero-cta">
            <a className="btn-primary lg" href="/design">Start Designing</a>
            <a className="btn-ghost lg" href="#gallery">Explore Gallery</a>
          </div>
          <div className="home-hero-trust">
            <span>✓ Crafted from real geographic data</span>
            <span>✓ Available in Silver, Gold &amp; Platinum</span>
            <span>✓ Worldwide shipping</span>
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
