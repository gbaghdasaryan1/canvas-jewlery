import { Link } from "react-router-dom";
import { useT } from "@/shared/i18n";
import { LanguageSwitcher } from "@/features/language-switcher/LanguageSwitcher";
import styles from "./LandingHeader.module.css";

export function BrandMark() {
  return (
    <div className={styles.brandMark}>
      <div />
    </div>
  );
}

export function LandingHeader() {
  const t = useT();

  return (
    <>

      <header className={styles.top}>
        <div className="wrap">
          <Link className="home-brand" to="/">
            <BrandMark />
            Mémoire
          </Link>
          <nav className={styles.nav}>
            <a href="#how">{t.nav.how}</a>
            <a href="#gallery">{t.nav.gallery}</a>
            <a href="#prices">{t.nav.prices}</a>
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
