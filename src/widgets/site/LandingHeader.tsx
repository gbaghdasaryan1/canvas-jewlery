import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useT } from "@/shared/i18n";
import { LanguageSwitcher } from "@/features/language-switcher/LanguageSwitcher";
import styles from "./LandingHeader.module.css";

function BrandMark() {
  return (
    <svg viewBox="0 0 20 24" fill="none" aria-hidden width="18" height="22">
      <path d="M10 1 14 6H6L10 1Z" fill="var(--bronze-2)" />
      <path d="M6.5 8 13.5 8 16 13H4L6.5 8Z" fill="var(--bronze)" />
      <path d="M3.5 15h13L20 22H0L3.5 15Z" fill="#98a2ae" />
    </svg>
  );
}

export function LandingHeader() {
  const t = useT();
  const promos = t.promos;
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % promos.length), 4200);
    return () => clearInterval(id);
  }, [promos.length]);
  // Guard against index overflow when switching to a language with fewer promos.
  const promo = promos[i % promos.length];

  return (
    <>
      <div className={styles.promobar} role="status" aria-live="polite">
        <span key={`${promo}`} className={styles.promobarMsg}>
          {promo}
        </span>
      </div>
      <header className={styles.top}>
        <div className="wrap">
          <Link className="home-brand" to="/">
            <BrandMark />
            CAIRN
          </Link>
          <nav className={styles.nav}>
            <a href="#how">{t.nav.how}</a>
            <a href="#gallery">{t.nav.gallery}</a>
            <a href="#faq">{t.nav.faq}</a>
          </nav>
          <LanguageSwitcher />
          <Link className="btn-primary" to="/mountains">
            {t.nav.designYours}
          </Link>
        </div>
      </header>
    </>
  );
}
