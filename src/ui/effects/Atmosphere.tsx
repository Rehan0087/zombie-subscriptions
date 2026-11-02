/**
 * Moonlight, low fog and a wrought-iron cemetery fence. Purely ambient and hidden from assistive tech.
 * The landing page shows the full moon; the graveyard keeps only its glow so data stays in front.
 */
export function Atmosphere({ variant }: { variant: "landing" | "graveyard" }) {
  const pickets = Array.from({ length: 48 }, (_, i) => i * 25 + 6);
  return (
    <div className="atmosphere" data-variant={variant} aria-hidden="true">
      <div className="moon" />
      <div className="fog" />
      <div className="fog" />
      <svg className="fence" viewBox="0 0 1200 120" preserveAspectRatio="xMidYMax slice">
        <g fill="currentColor">
          <rect x="0" y="60" width="1200" height="5" />
          <rect x="0" y="100" width="1200" height="5" />
          {pickets.map((x) => (
            <path key={x} d={`M${x} 120 V44 l4 -12 l4 12 V120 Z`} />
          ))}
          <path d="M0 112 Q300 100 600 112 T1200 108 V120 H0Z" />
        </g>
      </svg>
    </div>
  );
}
