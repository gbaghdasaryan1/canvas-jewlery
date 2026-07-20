import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en } from "./dictionaries/en";
import { ru } from "./dictionaries/ru";
import { hy } from "./dictionaries/hy";
import type { Dict, Lang } from "./types";

const DICTS: Record<Lang, Dict> = { hy, ru, en };

/** Switcher order + labels. */
export const LANGS: Lang[] = ["hy", "ru", "en"];
export const LANG_LABELS: Record<Lang, string> = { hy: "ՀԱՅ", ru: "РУС", en: "ENG" };

const STORAGE_KEY = "cairn.lang";
const DEFAULT_LANG: Lang = "hy";

function initialLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "hy" || saved === "ru" || saved === "en") return saved;
  return DEFAULT_LANG;
}

interface LocaleContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** The active dictionary — read as `t.section.key`. */
  t: Dict;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore storage errors (private mode) */
    }
  }, [lang]);

  const value = useMemo<LocaleContextValue>(() => ({ lang, setLang, t: DICTS[lang] }), [lang]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Full locale context — language, setter, and the active dictionary. */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}

/** Shortcut for the active dictionary: `const t = useT(); t.hero.title`. */
export function useT(): Dict {
  return useLocale().t;
}
