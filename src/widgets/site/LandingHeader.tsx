import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const PROMOS = [
  "Handcrafted to order — each piece is unique to your place",
  "Complimentary insured shipping worldwide",
  "Recycled precious metals · 30-day returns",
];

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
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PROMOS.length), 4200);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <div className="promobar" role="status" aria-live="polite">
        <span key={i} className="promobar-msg">{PROMOS[i]}</span>
      </div>
      <header className="home-top">
        <div className="wrap">
          <Link className="home-brand" to="/">
            <BrandMark />
            CAIRN
          </Link>
          <nav className="home-nav">
            <a href="#collections">Collections</a>
            <a href="#gallery">Gallery</a>
            <Link to="/maps">maps</Link>
            <a href="#how">How it's made</a>
          </nav>
          <Link className="btn-primary" to="/mountains">Design yours</Link>
        </div>
      </header>
    </>
  );
}
