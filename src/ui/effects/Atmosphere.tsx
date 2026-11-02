/** Moon, drifting fog and a graveyard skyline behind everything. Purely ambient, hidden from assistive tech. */
export function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden="true">
      <div className="moon" />
      <div className="fog fog-back" />
      <div className="fog fog-front" />
      <svg className="skyline" viewBox="0 0 1200 160" preserveAspectRatio="none">
        <path
          d="M0 120 Q150 90 300 110 T600 100 T900 115 T1200 95 V160 H0Z"
          fill="var(--hill)"
        />
        <g fill="var(--hill-front)">
          <path d="M80 160 V112 a18 18 0 0 1 36 0 V160Z" />
          <path d="M260 160 V120 h10 v-14 h8 v14 h10 V160Z" />
          <path d="M930 160 V108 a22 22 0 0 1 44 0 V160Z" />
          <path d="M1090 160 V118 h9 v-12 h7 v12 h9 V160Z" />
          <path d="M0 140 Q300 125 600 140 T1200 135 V160 H0Z" />
        </g>
      </svg>
    </div>
  );
}
