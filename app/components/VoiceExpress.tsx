import { VIBES, isVibe } from "@/lib/vibes";
import { LineBullet } from "./LineBullet";

type Row = { key: string; up: number; down: number; votes: number; captions: number; upRate: number | null };

const STOPS = 8;

/** upvote share 0.35 → 16 s per trip, 0.85 → 4 s. Funnier voice, faster train. */
function secondsFor(rate: number) {
  const t = Math.min(1, Math.max(0, (rate - 0.35) / 0.5));
  return +(16 - t * 12).toFixed(2);
}

/**
 * One track per caption voice; each train loops left to right at a speed set
 * by that voice's upvote share. Pure CSS animation (globals.css: .voice-train),
 * paused for people who prefer reduced motion. Numbers are printed beside each
 * track, so the race is decoration, never the only way to read the data.
 */
export function VoiceExpress({ rows }: { rows: Row[] }) {
  const lanes = rows
    .filter((r) => r.votes > 0 && r.upRate !== null && isVibe(r.key))
    .sort((a, b) => (b.upRate ?? 0) - (a.upRate ?? 0));

  if (lanes.length === 0) return <p className="text-sm text-muted">No votes yet, so every train is still in the yard.</p>;

  return (
    <div>
      <div className="rounded-lg bg-sign px-4 py-3 font-mono text-[13px] text-[#ffb547] sm:text-[15px]">
        {lanes.slice(0, 2).map((r, i) => {
          const v = VIBES[r.key as keyof typeof VIBES];
          return (
            <p key={r.key} className="flex items-center gap-3 py-0.5">
              <LineBullet letter={v.bullet.letter} bg={v.bullet.bg} fg={v.bullet.fg} size={20} />
              <span className="min-w-0 flex-1 truncate">
                {v.label} {i === 0 ? "express" : "local"}
              </span>
              <span className="num shrink-0">{Math.round((r.upRate ?? 0) * 100)}% up</span>
            </p>
          );
        })}
      </div>

      <ul className="mt-4 space-y-3">
        {lanes.map((r, i) => {
          const v = VIBES[r.key as keyof typeof VIBES];
          const secs = secondsFor(r.upRate ?? 0);
          return (
            <li key={r.key} className="grid grid-cols-[minmax(0,7.5rem)_1fr] items-center gap-3 sm:grid-cols-[10rem_1fr_7rem]">
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <LineBullet letter={v.bullet.letter} bg={v.bullet.bg} fg={v.bullet.fg} size={20} />
                <span className="truncate">{v.label}</span>
              </span>

              <div className="relative h-7" title={`${v.label}: ${r.up} up / ${r.down} down — one trip every ${secs}s`}>
                {/* track */}
                <div className="absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full" style={{ background: v.bullet.bg, opacity: 0.85 }} />
                {/* stations */}
                {Array.from({ length: STOPS }, (_, s) => (
                  <span
                    key={s}
                    className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white"
                    style={{ left: `${(s / (STOPS - 1)) * 100}%`, borderColor: "#16181a" }}
                  />
                ))}
                {/* the train */}
                <span
                  className="voice-train absolute top-1/2 flex h-5 w-12 -translate-y-1/2 items-center justify-center gap-[3px] rounded-full border-2 border-ink"
                  style={{
                    background: v.bullet.bg,
                    animationDuration: `${secs}s`,
                    animationDelay: `-${(i * 1.7) % secs}s`,
                  }}
                >
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 rounded-[2px]" style={{ background: v.bullet.fg }} />
                  ))}
                </span>
              </div>

              <span className="num col-span-2 -mt-1 text-right text-[12px] text-muted sm:col-span-1 sm:mt-0">
                {Math.round((r.upRate ?? 0) * 100)}% up · {r.votes} votes
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
