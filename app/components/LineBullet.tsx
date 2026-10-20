/** A round NYC subway line bullet. */
export function LineBullet({
  letter,
  bg,
  fg = "#ffffff",
  size = 22,
  title,
}: {
  letter: string;
  bg: string;
  fg?: string;
  size?: number;
  title?: string;
}) {
  return (
    <span
      title={title}
      aria-hidden={title ? undefined : true}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold leading-none"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.58 }}
    >
      {letter}
    </span>
  );
}
