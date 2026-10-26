"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Grouped admin navigation. Desktop: a sticky sidebar. Phones/tablets: one
 * horizontally scrolling row (same links, group names as small labels).
 */
export const NAV_GROUPS: { label: string; links: { href: string; label: string }[] }[] = [
  {
    label: "Overview",
    links: [{ href: "/", label: "Dashboard" }],
  },
  {
    label: "Community",
    links: [
      { href: "/users", label: "Users" },
      { href: "/captions", label: "Captions" },
      { href: "/votes", label: "Votes" },
      { href: "/images", label: "Images" },
    ],
  },
  {
    label: "Observability",
    links: [
      { href: "/requests", label: "Generation requests" },
      { href: "/responses", label: "LLM responses" },
      { href: "/media", label: "AI generated media" },
    ],
  },
  {
    label: "Generation",
    links: [
      { href: "/chains", label: "Prompt chains" },
      { href: "/mix", label: "Prompt chain mix" },
      { href: "/terms", label: "Terms" },
      { href: "/examples", label: "Generation examples" },
      { href: "/models", label: "LLM models" },
      { href: "/providers", label: "LLM providers" },
    ],
  },
  {
    label: "Access",
    links: [
      { href: "/domains", label: "Signup domains" },
      { href: "/whitelist", label: "Whitelisted e-mails" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="sticky top-6 space-y-5">
      {NAV_GROUPS.map((g) => (
        <div key={g.label}>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.label}</p>
          <ul className="mt-1.5 space-y-0.5">
            {g.links.map((l) => {
              const active = isActive(pathname, l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                      active ? "bg-sign font-semibold text-white" : "text-ink/80 hover:bg-card hover:text-ink"
                    }`}
                  >
                    {active && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-metro" />}
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="-mb-px flex items-center gap-1 overflow-x-auto lg:hidden">
      {NAV_GROUPS.map((g, gi) => (
        <div key={g.label} className="flex shrink-0 items-center gap-1">
          {gi > 0 && <span aria-hidden="true" className="mx-1 h-4 w-px bg-white/25" />}
          {g.links.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-2.5 py-2.5 text-sm font-medium transition-colors ${
                  active ? "border-metro text-white" : "border-transparent text-white/65 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
