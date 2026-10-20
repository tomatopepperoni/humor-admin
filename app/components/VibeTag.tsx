import { VIBES, isVibe } from "@/lib/vibes";
import { LineBullet } from "./LineBullet";

/** Bullet + name for a caption voice. Text always carries the identity, colour only decorates. */
export function VibeTag({ vibe, size = 18 }: { vibe: string | null; size?: number }) {
  if (!vibe || !isVibe(vibe)) {
    return <span className="text-muted">{vibe ?? "—"}</span>;
  }
  const v = VIBES[vibe];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <LineBullet letter={v.bullet.letter} bg={v.bullet.bg} fg={v.bullet.fg} size={size} />
      <span>{v.label}</span>
    </span>
  );
}

export function vibeLabel(vibe: string | null) {
  return vibe && isVibe(vibe) ? VIBES[vibe].label : vibe ?? "Unknown";
}
