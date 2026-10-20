import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { displayName, loadEverything } from "@/lib/data";
import { computeStats, type RankedCaption } from "@/lib/stats";
import { hourLabel, WEEKDAYS } from "@/lib/time";
import { DailyColumns, Funnel, Heatmap, Kpi, pct, ScorePill, signed, SplitRows } from "@/app/components/charts";
import { VibeTag, vibeLabel } from "@/app/components/VibeTag";
import { Avatar } from "@/app/components/Avatar";

export const dynamic = "force-dynamic";

function Panel({ title, sub, children, className = "" }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`panel min-w-0 p-5 ${className}`}>
      <h2 className="panel-title">{title}</h2>
      {sub && <p className="panel-sub">{sub}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CaptionLine({ c, emphasis }: { c: RankedCaption; emphasis?: "up" | "split" }) {
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <Link href={`/captions/${c.id}`} className="block hover:underline">
        <p className="text-[15px] leading-snug">&ldquo;{c.text}&rdquo;</p>
      </Link>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
        <ScorePill up={c.up} down={c.down} />
        <VibeTag vibe={c.vibe ?? c.post?.vibe ?? null} size={16} />
        {emphasis === "split" && <span>{pct(c.up / c.votes)} up</span>}
      </div>
    </li>
  );
}

export default async function Dashboard() {
  const { supabase } = await requireAdmin();
  const data = await loadEverything(supabase);
  const s = computeStats(data);

  const funniest = s.byVibe.find((v) => v.votes > 0);
  const first = s.byPosition.find((p) => p.key === "1st");
  const rest = s.byPosition.filter((p) => p.key !== "1st");
  const restUp = rest.reduce((a, p) => a + p.up, 0);
  const restVotes = rest.reduce((a, p) => a + p.votes, 0);
  const restRate = restVotes ? restUp / restVotes : null;
  const photo = s.byMedium.find((m) => m.key === "With photo");
  const text = s.byMedium.find((m) => m.key === "Text only");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Live from Supabase. Times are New York time. Hover any bar or cell for exact numbers.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Riders (users)" value={s.totals.users.toLocaleString()} sub={`${s.funnel[1].n} finished onboarding`} />
        <Kpi label="Moments posted" value={s.totals.posts.toLocaleString()} sub={`${pct(s.totals.photoShare)} with a photo`} />
        <Kpi label="AI captions" value={s.totals.captions.toLocaleString()} sub={`${s.totals.votesPerCaption.toFixed(1)} votes per caption`} />
        <Kpi label="Votes cast" value={s.totals.votes.toLocaleString()} sub={`${pct(s.totals.upRate)} are upvotes`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Ridership, last 30 days" sub="Small multiples, each on its own scale." className="lg:col-span-2">
          <div className="space-y-5">
            <DailyColumns label="Votes" data={s.dailySeries.map((d) => ({ day: d.day, n: d.votes }))} color="#00933c" />
            <DailyColumns label="Posts" data={s.dailySeries.map((d) => ({ day: d.day, n: d.posts }))} color="#0039a6" height={48} />
            <DailyColumns label="New sign-ups" data={s.dailySeries.map((d) => ({ day: d.day, n: d.signups }))} color="#16181a" height={48} />
          </div>
        </Panel>

        <Panel title="From sign-in to regular" sub="How far each account gets.">
          <Funnel steps={s.funnel} />
        </Panel>
      </div>

      <Panel
        title="Rush hour"
        sub={
          s.peak.n > 0
            ? `Posts + votes by weekday and hour. Busiest slot: ${WEEKDAYS[s.peak.weekday]} around ${hourLabel(s.peak.hour)} (${s.peak.n} actions).`
            : "Posts + votes by weekday and hour."
        }
      >
        <Heatmap heat={s.heat} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Which subway voice is funniest?"
          sub={
            funniest
              ? `${vibeLabel(funniest.key)} leads with an average of ${signed(funniest.avgScore)} per caption. Bar = share of upvotes.`
              : "Average net score per caption, by vibe."
          }
        >
          <SplitRows rows={s.byVibe.map((g) => ({ ...g, label: <VibeTag vibe={g.key} /> }))} />
        </Panel>

        <Panel
          title="First-card bias"
          sub={
            first?.upRate != null && restRate != null
              ? `The 1st caption shown gets ${pct(first.upRate)} upvotes vs ${pct(restRate)} for the rest — ${
                  Math.abs(first.upRate - restRate) < 0.05 ? "people do read past the first card." : first.upRate > restRate ? "voters may be favoring whatever is on top." : "the first card actually does worse."
                }`
              : "Upvote share by the caption's position on the post."
          }
        >
          <SplitRows rows={s.byPosition.map((g) => ({ ...g, label: `${g.key} caption` }))} />
        </Panel>

        <Panel title="Model report card" sub="Every caption stores the Gemini model that wrote it.">
          <SplitRows rows={s.byModel.map((g) => ({ ...g, label: <span className="font-mono text-[13px]">{g.key}</span> }))} />
        </Panel>

        <Panel
          title="Photo vs text, and caption length"
          sub={
            photo && text
              ? `Captions on photo posts average ${signed(photo.avgScore)}, text-only ${signed(text.avgScore)}.`
              : "Does a photo or a shorter joke help?"
          }
        >
          <SplitRows rows={s.byMedium.map((g) => ({ ...g, label: g.key }))} />
          <div className="my-4 h-px bg-rule" />
          <SplitRows rows={s.byLength.map((g) => ({ ...g, label: `${g.key} characters` }))} />
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Hall of fame" sub="Highest net score.">
          {s.top.length ? (
            <ul className="divide-y">
              {s.top.map((c) => (
                <CaptionLine key={c.id} c={c} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No votes yet.</p>
          )}
        </Panel>
        <Panel title="Most divisive" sub="Lots of votes on both sides.">
          {s.divisive.length ? (
            <ul className="divide-y">
              {s.divisive.map((c) => (
                <CaptionLine key={c.id} c={c} emphasis="split" />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing split the room yet.</p>
          )}
        </Panel>
        <Panel title="Next stop: delete?" sub="Lowest net score. Candidates for review.">
          {s.bottom.length ? (
            <ul className="divide-y">
              {s.bottom.map((c) => (
                <CaptionLine key={c.id} c={c} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No votes yet.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="Most active voters" sub="All-time votes cast.">
          <VoterList rows={s.mostActive} />
        </Panel>
        <Panel title="Most generous" sub={`Highest upvote share (min. ${s.minVotes} votes).`}>
          <VoterList rows={s.generous} showRate />
        </Panel>
        <Panel
          title="Toughest critics"
          sub={`Lowest upvote share (min. ${s.minVotes} votes). ${s.selfVotes} vote${s.selfVotes === 1 ? " was" : "s were"} cast on the voter's own captions.`}
        >
          <VoterList rows={s.harsh} showRate />
        </Panel>
      </div>
    </div>
  );
}

function VoterList({
  rows,
  showRate,
}: {
  rows: { id: string; profile?: { first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null }; votes: number; upRate: number }[];
  showRate?: boolean;
}) {
  if (rows.length === 0) return <p className="text-sm text-muted">Not enough votes yet.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const name = displayName(r.profile);
        return (
          <li key={r.id} className="flex items-center justify-between gap-3 text-sm">
            <Link href={`/users?q=${encodeURIComponent(r.profile?.email ?? "")}`} className="flex min-w-0 items-center gap-2 hover:underline">
              <Avatar url={r.profile?.avatar_url ?? null} name={name} size={24} />
              <span className="truncate">{name}</span>
            </Link>
            <span className="num shrink-0 text-[13px] text-muted">
              {showRate ? `${pct(r.upRate)} up · ` : ""}
              {r.votes} votes
            </span>
          </li>
        );
      })}
    </ul>
  );
}
