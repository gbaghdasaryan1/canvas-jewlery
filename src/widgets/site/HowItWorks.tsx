import { useT } from "@/shared/i18n";

export function HowItWorks() {
  const t = useT();
  return (
    <section id="how">
      <div className="wrap">
        <div className="eyebrow">{t.how.eyebrow}</div>
        <h2 className="section-title">{t.how.title}</h2>
        <div className="steps">
          {t.how.steps.map((s) => (
            <div className="step" key={s.n}>
              <div className="num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              <div className="rule" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
