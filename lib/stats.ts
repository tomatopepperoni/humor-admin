import "server-only";
import { tallyVotes, type Caption, type Post, type Profile, type Tally, type Vote } from "@/lib/data";
import { lastDaysNY, nyParts } from "@/lib/time";

type Data = { profiles: Profile[]; posts: Post[]; captions: Caption[]; votes: Vote[] };

export type Group = {
  key: string;
  captions: number;
  votes: number;
  up: number;
  down: number;
  /** share of votes that are upvotes, 0..1 (null when no votes) */
  upRate: number | null;
  /** mean net score per caption */
  avgScore: number;
};

function group<T extends string>(captions: Caption[], tallies: Map<string, Tally>, keyOf: (c: Caption) => T | null) {
  const m = new Map<string, { captions: number; up: number; down: number; score: number }>();
  for (const c of captions) {
    const k = keyOf(c);
    if (k === null) continue;
    const t = tallies.get(c.id);
    const g = m.get(k) ?? { captions: 0, up: 0, down: 0, score: 0 };
    g.captions++;
    g.up += t?.up ?? 0;
    g.down += t?.down ?? 0;
    g.score += t?.score ?? 0;
    m.set(k, g);
  }
  return [...m].map(
    ([key, g]): Group => ({
      key,
      captions: g.captions,
      votes: g.up + g.down,
      up: g.up,
      down: g.down,
      upRate: g.up + g.down > 0 ? g.up / (g.up + g.down) : null,
      avgScore: g.captions ? g.score / g.captions : 0,
    })
  );
}

export type RankedCaption = Caption & Tally & { votes: number; post?: Post };

export function computeStats({ profiles, posts, captions, votes }: Data) {
  const tallies = tallyVotes(votes);
  const postById = new Map(posts.map((p) => [p.id, p]));
  const captionById = new Map(captions.map((c) => [c.id, c]));

  // ---- headline numbers ---------------------------------------------------
  const ups = votes.filter((v) => v.value === 1).length;
  const totals = {
    users: profiles.length,
    posts: posts.length,
    captions: captions.length,
    votes: votes.length,
    upRate: votes.length ? ups / votes.length : null,
    photoShare: posts.length ? posts.filter((p) => p.image_url).length / posts.length : null,
    votesPerCaption: captions.length ? votes.length / captions.length : 0,
  };

  // ---- last 30 days, per NY day -------------------------------------------
  const days = lastDaysNY(30);
  const daily = new Map(days.map((d) => [d, { votes: 0, posts: 0, signups: 0 }]));
  for (const v of votes) {
    const r = daily.get(nyParts(v.created_at).day);
    if (r) r.votes++;
  }
  for (const p of posts) {
    const r = daily.get(nyParts(p.created_at).day);
    if (r) r.posts++;
  }
  for (const p of profiles) {
    const r = daily.get(nyParts(p.created_at).day);
    if (r) r.signups++;
  }
  const dailySeries = days.map((d) => ({ day: d, ...daily.get(d)! }));

  // ---- rush hour: weekday x hour heatmap of every action -------------------
  const heat: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const at of [...votes.map((v) => v.created_at), ...posts.map((p) => p.created_at)]) {
    const { weekday, hour } = nyParts(at);
    if (weekday >= 0) heat[weekday][hour]++;
  }
  let peak = { weekday: 0, hour: 0, n: 0 };
  heat.forEach((row, w) =>
    row.forEach((n, h) => {
      if (n > peak.n) peak = { weekday: w, hour: h, n };
    })
  );

  // ---- which subway voice is funniest -------------------------------------
  const vibeOf = (c: Caption) => c.vibe ?? postById.get(c.post_id)?.vibe ?? null;
  const byVibe = group(captions, tallies, vibeOf).sort((a, b) => b.avgScore - a.avgScore);

  // ---- first-caption bias: are people just upvoting the top card? ---------
  const byPosition = group(captions, tallies, (c) => (c.position >= 3 ? "4th+" : ["1st", "2nd", "3rd"][c.position]))
    .sort((a, b) => a.key.localeCompare(b.key));

  // ---- which Gemini model writes the funniest -----------------------------
  const byModel = group(captions, tallies, (c) => c.model).sort((a, b) => b.captions - a.captions);

  // ---- photo vs text-only posts -------------------------------------------
  const byMedium = group(captions, tallies, (c) => {
    const p = postById.get(c.post_id);
    if (!p) return null;
    return p.image_url ? "With photo" : "Text only";
  });

  // ---- does length matter? ------------------------------------------------
  const LENGTHS = ["Under 60", "60–89", "90–119", "120+"];
  const byLength = group(captions, tallies, (c) => {
    const n = c.text.length;
    return n < 60 ? LENGTHS[0] : n < 90 ? LENGTHS[1] : n < 120 ? LENGTHS[2] : LENGTHS[3];
  }).sort((a, b) => LENGTHS.indexOf(a.key) - LENGTHS.indexOf(b.key));

  // ---- hall of fame / shame / most divisive -------------------------------
  const ranked: RankedCaption[] = captions.map((c) => {
    const t = tallies.get(c.id) ?? { up: 0, down: 0, score: 0 };
    return { ...c, ...t, votes: t.up + t.down, post: postById.get(c.post_id) };
  });
  const voted = ranked.filter((c) => c.votes > 0);
  const top = [...voted].sort((a, b) => b.score - a.score || b.up - a.up).slice(0, 5);
  const bottom = [...voted].sort((a, b) => a.score - b.score || b.down - a.down).slice(0, 3);
  // Divisive = lots of votes on both sides: the smaller side, tie-broken by total.
  const divisive = voted
    .filter((c) => c.up > 0 && c.down > 0)
    .sort((a, b) => Math.min(b.up, b.down) - Math.min(a.up, a.down) || b.votes - a.votes)
    .slice(0, 3);

  // ---- voter personalities ------------------------------------------------
  const voterMap = new Map<string, { up: number; down: number; self: number }>();
  let selfVotes = 0;
  for (const v of votes) {
    const r = voterMap.get(v.user_id) ?? { up: 0, down: 0, self: 0 };
    if (v.value === 1) r.up++;
    else r.down++;
    if (captionById.get(v.caption_id)?.user_id === v.user_id) {
      r.self++;
      selfVotes++;
    }
    voterMap.set(v.user_id, r);
  }
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const voters = [...voterMap].map(([id, r]) => ({
    profile: profileById.get(id),
    id,
    votes: r.up + r.down,
    up: r.up,
    down: r.down,
    upRate: r.up / (r.up + r.down),
    self: r.self,
  }));
  const MIN_VOTES = 5;
  const regulars = voters.filter((v) => v.votes >= MIN_VOTES);
  const generous = [...regulars].sort((a, b) => b.upRate - a.upRate || b.votes - a.votes).slice(0, 3);
  const harsh = [...regulars].sort((a, b) => a.upRate - b.upRate || b.votes - a.votes).slice(0, 3);
  const mostActive = [...voters].sort((a, b) => b.votes - a.votes).slice(0, 5);

  // ---- funnel: who actually uses the app ----------------------------------
  const posters = new Set(posts.map((p) => p.user_id));
  const voterIds = new Set(votes.map((v) => v.user_id));
  const funnel = [
    { label: "Signed in with Google", n: profiles.length },
    { label: "Finished onboarding", n: profiles.filter((p) => p.first_name && p.last_name).length },
    { label: "Voted at least once", n: profiles.filter((p) => voterIds.has(p.id)).length },
    { label: "Posted a moment", n: profiles.filter((p) => posters.has(p.id)).length },
    {
      label: "Did both",
      n: profiles.filter((p) => posters.has(p.id) && voterIds.has(p.id)).length,
    },
  ];

  return {
    totals,
    dailySeries,
    heat,
    peak,
    byVibe,
    byPosition,
    byModel,
    byMedium,
    byLength,
    top,
    bottom,
    divisive,
    generous,
    harsh,
    mostActive,
    minVotes: MIN_VOTES,
    selfVotes,
    funnel,
  };
}

export type Stats = ReturnType<typeof computeStats>;
