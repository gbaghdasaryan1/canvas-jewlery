import { useEffect, useRef, useState } from "react";
import { LANGS, LANG_LABELS, useLocale } from "@/shared/i18n";
import styles from "./LanguageSwitcher.module.css";

interface LanguageSwitcherProps {
  /** "light" (default, on paper) or "dark" (on the ink designer chrome). */
  variant?: "light" | "dark";
}

/** Compact language dropdown, persisted via LocaleProvider. */
export function LanguageSwitcher({ variant = "light" }: LanguageSwitcherProps) {
  const { lang, setLang } = useLocale();
  const [open, setOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!switcherRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={switcherRef} className={`lang-switch ${styles.root} ${styles[variant]}`}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        onClick={() => setOpen((value) => !value)}
      >
        {LANG_LABELS[lang]}
        <svg
          className={styles.chevron}
          viewBox="0 0 12 12"
          width="10"
          height="10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m3 4.5 3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div className={styles.menu} role="listbox" aria-label="Language options">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              className={`${styles.option} ${lang === l ? styles.on : ""}`}
              role="option"
              aria-selected={lang === l}
              onClick={() => {
                setLang(l);
                setOpen(false);
              }}
            >
              {LANG_LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
