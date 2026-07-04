import { ContourArt } from "./ContourArt";

interface Option {
  shape: string;
  title: string;
  blurb: string;
  tone: string;
  seed: number;
}

const OPTIONS: Option[] = [
  { shape: "rectangle", title: "Terrain Plaque", blurb: "A clean rectangular relief of your landscape.", tone: "stone", seed: 11 },
  { shape: "heart", title: "Heart Keepsake", blurb: "The place you love, shaped like it.", tone: "bronze", seed: 23 },
  { shape: "circle", title: "Round Locket", blurb: "A soft disc of mountains or coastline.", tone: "sage", seed: 41 },
  { shape: "skyline", title: "City Skyline", blurb: "Your city's buildings, streets and rivers in 3D.", tone: "silver", seed: 5 },
];

/** Jewelry options — the themed forms a customer can create. */
export function Collections() {
  return (
    <section id="collections" className="home-section">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">Collections</div>
            <h2 className="home-h2">Choose your form</h2>
          </div>
          <p className="section-sub">
            Every piece starts from the same idea — a real place — and takes the shape that suits it.
          </p>
        </div>

        <div className="options-grid">
          {OPTIONS.map((o) => (
            <a key={o.shape} className="option-card" href={`/design?shape=${o.shape}`}>
              <div className="option-art">
                <ContourArt seed={o.seed} tone={o.tone} />
              </div>
              <div className="option-body">
                <h3 className="option-title">{o.title}</h3>
                <p className="option-blurb">{o.blurb}</p>
                <span className="option-link">Design this →</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
