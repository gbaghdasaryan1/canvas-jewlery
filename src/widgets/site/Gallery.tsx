import { Link } from "react-router-dom";
import { useT } from "@/shared/i18n";
import { ContourArt } from "./ContourArt";

const TONES = ["gold", "silver", "bronze", "sage", "stone"];
// Geographic proper nouns — kept untranslated across languages.
const PLACES = [
  "Everest", "Santorini", "Kyoto", "Grand Canyon", "Reykjavík", "Cape Town",
  "Yosemite", "Amalfi", "Patagonia", "Faroe Islands", "Yerevan", "Queenstown",
];

/** Grid gallery of generated pieces — social-proof / inspiration. */
export function Gallery() {
  const t = useT();
  return (
    <section id="gallery" className="home-section gallery-section">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">{t.gallery.eyebrow}</div>
            <h2 className="home-h2">{t.gallery.title}</h2>
          </div>
          <p className="section-sub">{t.gallery.sub}</p>
        </div>

        <div className="gallery-grid">
          {PLACES.map((p, i) => (
            <Link key={p} className="gallery-tile" to="/mountains" aria-label={t.gallery.designLike(p)}>
              <ContourArt seed={(i + 3) * 97} tone={TONES[i % TONES.length]} />
              <div className="gallery-cap">
                <span>{p}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
