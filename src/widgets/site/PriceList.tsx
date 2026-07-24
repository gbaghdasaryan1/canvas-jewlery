import { Link } from "react-router-dom";
import { useT } from "@/shared/i18n";
import { JEWELRY_PRICE_AMD, formatAMD } from "@/shared/lib/pricing";
import styles from "./PriceList.module.css";

/** Public price list — one row per jewelry type, driven by JEWELRY_PRICE_AMD so
    it always matches what the buy panel charges. */
export function PriceList() {
  const t = useT();
  const p = t.priceList;
  return (
    <section id="prices" className="home-section">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h2 className="home-h2">{p.eyebrow}</h2>
          </div>
        </div>

        <div className={styles.list}>
          {p.items.map((item) => (
            <Link
              key={item.type}
              className={styles.row}
              to={`/mountains?type=${item.type}`}
            >
              <div className={styles.info}>
                <h3 className={styles.name}>{t.designer.jewelry[item.type]}</h3>
              </div>
              <div className={styles.priceCol}>
                <span className={styles.price}>
                  {p.priceFrom(formatAMD(JEWELRY_PRICE_AMD[item.type]))}
                </span>
                <span className={styles.cta}>{p.cta} →</span>
              </div>
            </Link>
          ))}
        </div>

        <p className={`mono ${styles.foot}`}>{p.note}</p>
      </div>
    </section>
  );
}
