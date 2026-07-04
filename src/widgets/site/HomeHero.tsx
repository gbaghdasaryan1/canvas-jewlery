import { ContourArt } from "./ContourArt";

/** Marketing hero banner — the top of the landing page. */
export function HomeHero() {
  return (
    <section className="home-hero">
      <div className="wrap home-hero-inner">
        <div className="home-hero-copy">
          <div className="eyebrow">Bespoke topographic jewelry</div>
          <h1 className="home-hero-title">
            Wear the ground<br />you <em>stood on.</em>
          </h1>
          <p className="home-hero-lede">
            Choose any place on Earth — a summit, a coastline, the city where you met.
            We read its real terrain and shape it into a pendant you can hold.
          </p>
          <div className="home-hero-cta">
            <a className="btn-primary lg" href="/design">Start designing</a>
            <a className="btn-ghost lg" href="#collections">Explore collections</a>
          </div>
          <div className="home-hero-meta mono">
            Real elevation data · recycled metals · made to order
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
