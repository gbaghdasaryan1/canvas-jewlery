import { useT } from "@/shared/i18n";

// NOTE: placeholder testimonials (in every dictionary) — replace with real,
// attributable customer quotes (with permission) before going live.

/** Social proof. Placeholder quotes — swap for real customer testimonials. */
export function Testimonials() {
  const t = useT();
  return (
    <section className="home-section testimonials-section" aria-label={t.testimonials.title}>
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">{t.testimonials.eyebrow}</div>
            <h2 className="home-h2">{t.testimonials.title}</h2>
          </div>
          <p className="section-sub">{t.testimonials.sub}</p>
        </div>

        <div className="testimonials-grid">
          {t.testimonials.quotes.map((q) => (
            <figure className="testimonial" key={q.name}>
              <div className="testimonial-stars" aria-label="5 / 5">★★★★★</div>
              <blockquote>{q.body}</blockquote>
              <figcaption>
                <span className="testimonial-name">{q.name}</span>
                <span className="testimonial-place mono">{q.place}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
