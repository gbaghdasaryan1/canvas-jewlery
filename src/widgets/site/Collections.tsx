import { Link } from "react-router-dom";
import { useT } from "@/shared/i18n";
import { ContourArt } from "./ContourArt";

const OPTION_META = [
  { shape: "rectangle", tone: "stone", seed: 11 },
  { shape: "circle", tone: "sage", seed: 41 },
];

/** Jewelry options — the themed forms a customer can create. */
export function Collections() {
  const t = useT();
  return (
    <section id="collections" className="home-section">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">{t.collections.eyebrow}</div>
            <h2 className="home-h2">{t.collections.title}</h2>
          </div>
          <p className="section-sub">{t.collections.sub}</p>
        </div>

        <div className="options-grid">
          {t.collections.options.map((o, i) => (
            <Link key={OPTION_META[i].shape} className="option-card" to={`/mountains?shape=${OPTION_META[i].shape}`}>
              <div className="option-art">
                <ContourArt seed={OPTION_META[i].seed} tone={OPTION_META[i].tone} />
              </div>
              <div className="option-body">
                <h3 className="option-title">{o.title}</h3>
                <p className="option-blurb">{o.blurb}</p>
                <span className="option-link">{t.collections.link}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
