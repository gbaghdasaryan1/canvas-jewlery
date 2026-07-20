import { Link } from "react-router-dom";
import { useT } from "@/shared/i18n";
import { ContourArt } from "./ContourArt";

const ART = [
  { tone: "gold", seed: 23 },
  { tone: "bronze", seed: 57 },
  { tone: "sage", seed: 88 },
  { tone: "stone", seed: 132 },
];

/** Occasion / gifting section — sells the use-cases, expanding perceived value. */
export function Occasions() {
  const t = useT();
  return (
    <section className="home-section occasions-section">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">{t.occasions.eyebrow}</div>
            <h2 className="home-h2">{t.occasions.title}</h2>
          </div>
          <p className="section-sub">{t.occasions.sub}</p>
        </div>

        <div className="occasions-grid">
          {t.occasions.items.map((o, i) => (
            <Link key={o.label} className="occasion-card" to="/mountains" aria-label={o.label}>
              <div className="occasion-art">
                <ContourArt seed={ART[i].seed} tone={ART[i].tone} />
              </div>
              <div className="occasion-body">
                <div className="occasion-label">{o.label}</div>
                <p className="occasion-line">{o.line}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
