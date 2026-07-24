import { Link } from "react-router-dom";
import { useT } from "@/shared/i18n";
import { LandingHeader } from "./LandingHeader";
import { HomeHero } from "./HomeHero";
import { HeroStory } from "./HeroStory";
import { Occasions } from "./Occasions";
import { Collections } from "./Collections";
import { PriceList } from "./PriceList";
import { Gallery } from "./Gallery";
import { HowItWorks } from "./HowItWorks";
import { Faq } from "./Faq";
import styles from "./Landing.module.css";

const CONTACT = {
  phone: "+37443467118",
  email: "memoiresilver@gmail.com",
  instagram: "https://www.instagram.com/memoire_silver/",
  pinterest: "https://www.pinterest.com/memoiresilver/",
  tiktok: "",
};

// Pretty-print the phone: +374 43 467118.
const PHONE_DISPLAY = "+374 43 467118";

export function Landing() {
  const t = useT();
  return (
    <div className="home">
      <LandingHeader />
      <HomeHero />
      <HeroStory />
      <Occasions />
      <HowItWorks />
      <Collections />
      <PriceList />
      <Gallery />
      <Faq />

      <section className={styles.final}>
        <div className={`wrap ${styles.finalInner}`}>
          <div className="eyebrow">{t.final.eyebrow}</div>
          <h2 className="home-h2">{t.final.title}</h2>
          <p className="section-sub">{t.final.sub}</p>
          <Link className="btn-primary lg" to="/mountains">
            {t.final.cta}
          </Link>
          <div className={styles.guarantee}>
            {t.final.guarantee.map((g) => (
              <span key={g}>✓ {g}</span>
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.foot}>
        <div className={`wrap ${styles.footInner}`}>
          <div>
            <div className="home-brand" style={{ marginBottom: 8 }}>
              Mémoire
            </div>
            <div>{t.footer.tagline}</div>
            <div className={`mono ${styles.footMapData}`}>{t.footer.mapData}</div>
          </div>

          <div className={styles.footContact}>
            <div className={`mono ${styles.footHead}`}>{t.footer.contact}</div>
            <a href={`tel:${CONTACT.phone}`}>{PHONE_DISPLAY}</a>
            <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
          </div>

          <div className={styles.footContact}>
            <div className={`mono ${styles.footHead}`}>{t.footer.follow}</div>
            <a href={CONTACT.instagram} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
            <a href={CONTACT.pinterest} target="_blank" rel="noopener noreferrer">
              Pinterest
            </a>
            {CONTACT.tiktok && (
              <a href={CONTACT.tiktok} target="_blank" rel="noopener noreferrer">
                TikTok
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
