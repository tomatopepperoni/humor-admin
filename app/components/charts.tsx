/**
 * Small server-rendered charts (no chart library). Every mark carries a native
 * tooltip (<title>), and every value is also printed as text, so nothing
 * depends on colour alone.
 */
import { fmtDayKey, hourLabel, WEEKDAYS } from "@/lib/time";

export function pct(x: number | null, digits = 0) {
  return x === null ? "—" : `${(x * 100).toFixed(digits)}%`;
}

export function signed(n: number, digits = 2) {
  const s = n.toFixed(digits);
  return n > 0 ? `+${s}` : s;
}

export function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panel p-4">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="num mt-1 text-[28px] font-bold leading-none tracking-tight">{value}</p>
      {sub && <p className="mt-1.5 text-[12px] text-muted">{sub}</p>}
    </div>
  );
}

/** Daily column chart, one series. */
export function DailyColumns({
  data,
  label,
  color = "#16181a",
  height = 72,
}: {
  data: { day: string; n: number }[];
  label: string;
  color?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.n));
  const total = data.reduce((s, d) => s + d.n, 0);
  const w = 100 / data.length;
  return (
    <figure>
      <figcaption className="flex items-baseline justify-between text-[13px]">
        <span className="font-medium">{label}</span>
        <span className="num text-muted">{total.toLocaleString()} in 30 days</span>
      </figcaption>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="mt-2 block w-full" style={{ height }} role="img" aria-label={`${label} per day, last 30 days`}>
        <line x1="0" x2="100" y1={height - 0.5} y2={height - 0.5} stroke="#d3d7d5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => {
          const h = (d.n / max) * (height - 4);
          return (
            <g key={d.day}>
              {/* full-height hit target */}
              <rect x={i * w} y={0} width={w} height={height} fill="transparent">
                <title>{`${fmtDayKey(d.day)}: ${d.n} ${label.toLowerCase()}`}</title>
              </rect>
              {d.n > 0 && (
                <rect x={i * w + w * 0.15} y={height - h} width={w * 0.7} height={h} rx="0.6" fill={color} pointerEvents="none" />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{fmtDayKey(data[0].day)}</span>
        <span>Today</span>
      </div>
    </figure>
  );
}

/** Sequential single-hue ramp (light -> A-line blue). */
function ramp(t: number) {
  if (t <= 0) return "#f1f3f2";
  const from = [222, 231, 247];
  const to = [0, 57, 166];
  const k = 0.15 + 0.85 * t;
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * k));
  return `rgb(${c.join(",")})`;
}

export function Heatmap({ heat }: { heat: number[][] }) {
  const max = Math.max(1, ...heat.flat());
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[560px] table-fixed border-separate" style={{ borderSpacing: 2 }}>
        <caption className="sr-only">Actions by weekday and hour, New York time</caption>
        <thead>
          <tr>
            <th className="w-10" />
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h} scope="col" className="overflow-visible whitespace-nowrap text-left text-[10px] font-normal text-muted">
                {h % 3 === 0 ? hourLabel(h) : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {heat.map((row, w) => (
            <tr key={w}>
              <th scope="row" className="pr-1 text-left text-[11px] font-normal text-muted">
                {WEEKDAYS[w]}
              </th>
              {row.map((n, h) => (
                <td
                  key={h}
                  title={`${WEEKDAYS[w]} ${hourLabel(h)}: ${n} action${n === 1 ? "" : "s"}`}
                  className="h-5 rounded-[3px]"
                  style={{ background: ramp(n / max) }}
                >
                  <span className="sr-only">{n}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-muted">
        <span>0</span>
        {[0.15, 0.35, 0.55, 0.75, 1].map((t) => (
          <span key={t} className="inline-block h-2.5 w-5 rounded-[2px]" style={{ background: ramp(t) }} />
        ))}
        <span className="num">{max}</span>
      </div>
    </div>
  );
}

/**
 * Up/down split bar per row: green share = upvotes, grey = downvotes, with the
 * counts and average score as text.
 */
export function SplitRows({
  rows,
}: {
  rows: { key: string; label: React.ReactNode; up: number; down: number; captions: number; avgScore: number }[];
}) {
  if (rows.length === 0) return <p className="text-sm text-muted">No votes yet.</p>;
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const total = r.up + r.down;
        const upShare = total ? r.up / total : 0;
        return (
          <li key={r.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{r.label}</span>
              <span className="num shrink-0 text-[13px] text-muted">
                {total ? pct(upShare) : "—"} up · avg {signed(r.avgScore)} · {r.captions} cap.
              </span>
            </div>
            <div
              className="mt-1.5 flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-paper"
              title={`${r.up} up / ${r.down} down`}
            >
              {r.up > 0 && <span className="h-full rounded-l-full bg-go" style={{ width: `${upShare * 100}%` }} />}
              {r.down > 0 && <span className="h-full flex-1 rounded-r-full bg-hold/50" />}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Funnel({ steps }: { steps: { label: string; n: number }[] }) {
  const max = Math.max(1, steps[0]?.n ?? 1);
  return (
    <ol className="space-y-2.5">
      {steps.map((s, i) => (
        <li key={s.label}>
          <div className="flex items-baseline justify-between text-sm">
            <span>{s.label}</span>
            <span className="num text-[13px] text-muted">
              {s.n}
              {i > 0 && steps[0].n > 0 && ` · ${pct(s.n / steps[0].n)}`}
            </span>
          </div>
          <div className="mt-1 h-2.5 rounded-full bg-paper">
            <div className="h-full rounded-full bg-ink" style={{ width: `${(s.n / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ScorePill({ up, down }: { up: number; down: number }) {
  const score = up - down;
  return (
    <span className="num inline-flex items-center gap-2 whitespace-nowrap text-[13px]">
      <span className={`font-semibold ${score > 0 ? "text-go" : score < 0 ? "text-stop" : "text-muted"}`}>
        {score > 0 ? `+${score}` : score}
      </span>
      <span className="text-muted">
        ▲{up} ▼{down}
      </span>
    </span>
  );
}
