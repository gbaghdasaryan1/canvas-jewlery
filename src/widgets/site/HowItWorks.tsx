const STEPS = [
  { n: "01", title: "You choose the place", body: "Anywhere with real relief. We pull topographic elevation for the exact patch you frame on the map." },
  { n: "02", title: "We mill the terrain", body: "The heightfield is wrapped into a band and CNC-cut in wax, preserving every ridge and valley at wearable scale." },
  { n: "03", title: "Cast in precious metal", body: "Lost-wax cast in recycled gold, silver or platinum, then hand-finished. A summit you can hold." },
];

export function HowItWorks() {
  return (
    <section id="how">
      <div className="wrap">
        <div className="eyebrow">How it's made</div>
        <h2 className="section-title">From elevation to heirloom</h2>
        <div className="steps">
          {STEPS.map((s) => (
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
