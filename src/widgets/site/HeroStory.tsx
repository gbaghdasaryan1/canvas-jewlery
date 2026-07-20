import { useT } from "@/shared/i18n";

/** Narrative section below the hero — emotional "why" statement. */
export function HeroStory() {
  const t = useT();
  return (
    <section className="hero-story">
      <div className="wrap">
        <div className="hero-story-inner">
          <div className="eyebrow">{t.story.eyebrow}</div>
          <h2 className="hero-story-title">{t.story.title}</h2>
          <p className="hero-story-opening">{t.story.opening}</p>
          <ul className="hero-story-lines">
            {t.story.lines.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
