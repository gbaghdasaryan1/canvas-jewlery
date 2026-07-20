import { useT } from "@/shared/i18n";

/** Objection-handling FAQ — reduces friction before the final CTA. */
export function Faq() {
  const t = useT();
  return (
    <section id="faq" className="home-section faq-section">
      <div className="wrap faq-wrap">
        <div className="faq-head">
          <div className="eyebrow">{t.faq.eyebrow}</div>
          <h2 className="home-h2">{t.faq.title}</h2>
        </div>
        <div className="faq-list">
          {t.faq.items.map((f) => (
            <details className="faq-item" key={f.q}>
              <summary>
                <span>{f.q}</span>
                <span className="faq-mark" aria-hidden />
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
