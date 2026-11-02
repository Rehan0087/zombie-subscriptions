import { toDayNumber, type Zombie } from "../../core";
import { formatMoney, formatMonth } from "../format";

/** One bar per charge: x = date, height = amount. Charges at the new price are red. */
export function Timeline({ zombie, currency }: { zombie: Zombie; currency: string }) {
  const width = 300;
  const height = 80;
  const days = zombie.charges.map((c) => toDayNumber(c.date));
  const first = days[0]!;
  const span = Math.max(1, days[days.length - 1]! - first);
  const max = Math.max(...zombie.charges.map((c) => Math.abs(c.amount)));
  const changeOn = zombie.priceChange?.on;
  const barWidth = Math.max(3, Math.min(14, (width - 20) / zombie.charges.length - 2));

  return (
    <figure style={{ margin: 0 }}>
      <svg className="timeline" viewBox={`0 0 ${width} ${height + 16}`} role="img" aria-label={`Charge history: ${zombie.charges.length} charges from ${formatMonth(zombie.firstCharge)} to ${formatMonth(zombie.lastCharge)}`}>
        {zombie.charges.map((c, i) => {
          const h = Math.max(4, (Math.abs(c.amount) / max) * (height - 6));
          const x = 10 + ((days[i]! - first) / span) * (width - 20) - barWidth / 2;
          const after = changeOn !== undefined && c.date >= changeOn;
          return (
            <rect key={c.id} className={after ? "bar after" : "bar"} x={x} y={height - h} width={barWidth} height={h} rx={2}>
              <title>{`${c.date}: ${formatMoney(Math.abs(c.amount), currency)}`}</title>
            </rect>
          );
        })}
        <text className="axis" x={2} y={height + 13}>
          {formatMonth(zombie.firstCharge)}
        </text>
        <text className="axis" x={width - 2} y={height + 13} textAnchor="end">
          {formatMonth(zombie.lastCharge)}
        </text>
      </svg>
    </figure>
  );
}
