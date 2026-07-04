import { ContourArt } from "./ContourArt";

const TONES = ["gold", "silver", "bronze", "sage", "stone"];
const PLACES = [
  "Everest", "Santorini", "Kyoto", "Grand Canyon", "Reykjavík", "Cape Town",
  "Yosemite", "Amalfi", "Patagonia", "Faroe Islands", "Yerevan", "Queenstown",
];

/** Grid gallery of generated pieces — social-proof / inspiration. */
export function Gallery() {
  return (
    <section id="gallery" className="home-section gallery-section">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">Gallery</div>
            <h2 className="home-h2">Places people are wearing</h2>
          </div>
          <p className="section-sub">A few of the landscapes recently turned into keepsakes.</p>
        </div>

        <div className="gallery-grid">
          {PLACES.map((p, i) => (
            <a key={p} className="gallery-tile" href="/design" aria-label={`Design a piece like ${p}`}>
              <ContourArt seed={(i + 3) * 97} tone={TONES[i % TONES.length]} />
              <div className="gallery-cap">
                <span>{p}</span>
                <span className="mono">◷ made to order</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
