/* eslint-disable @next/next/no-img-element */
export function Avatar({ url, name, size = 28 }: { url: string | null; name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full border object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </span>
  );
}
