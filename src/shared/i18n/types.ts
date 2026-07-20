import type { en } from "./dictionaries/en";

/** Supported languages. Order = display order in the switcher. */
export type Lang = "hy" | "ru" | "en";

/** The translation dictionary shape, derived from the English canonical dict. */
export type Dict = typeof en;
