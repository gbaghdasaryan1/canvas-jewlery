/**
 * Generated topographic "contour" artwork — used as elegant, on-theme product
 * imagery without any external image assets. Deterministic from `seed`.
 */
const TONES: Record<string, [string, string, string]> = {
  gold:   ["#efe7d3", "#d8c39a", "#8a6f42"],
  silver: ["#eef0f2", "#d3d7db", "#8f959b"],
  bronze: ["#ecdcc6", "#cdae86", "#8a6a44"],
  sage:   ["#e4e8dd", "#c3ccb6", "#78856b"],
  stone:  ["#ece7dd", "#d3cabb", "#8b8271"],
};

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ContourArt({ seed = 1, tone = "gold" }: { seed?: number; tone?: keyof typeof TONES | string }) {
  const rnd = mulberry32((seed * 2654435761) >>> 0);
  const cx = 50 + (rnd() - 0.5) * 34;
  const cy = 50 + (rnd() - 0.5) * 34;
  const phase = rnd() * 6.283;
  const squash = 0.72 + rnd() * 0.22;

  const rings: string[] = [];
  for (let r = 5; r < 78; r += 4.5) {
    let d = "";
    for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.22) {
      const wob = Math.sin(a * 3 + phase + r * 0.045) * r * 0.09 + Math.sin(a * 5 + r * 0.02) * r * 0.045;
      const rr = r + wob;
      const x = cx + Math.cos(a) * rr * 1.12;
      const y = cy + Math.sin(a) * rr * squash;
      d += (a === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
    }
    rings.push(d + "Z");
  }

  const [c0, c1, c2] = TONES[tone] ?? TONES.gold;
  const gid = `g${seed}`;

  return (
    <svg className="contour-art" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c0} />
          <stop offset="1" stopColor={c1} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${gid})`} />
      <g fill="none" stroke={c2} strokeWidth="0.5" strokeOpacity="0.34">
        {rings.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </svg>
  );
}
