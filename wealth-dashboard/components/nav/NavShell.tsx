"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "◧" },
  { href: "/investments", label: "Investments", icon: "▲" },
  { href: "/savings", label: "Savings", icon: "◎" },
  { href: "/benchmark", label: "Benchmark", icon: "≈" },
  { href: "/projections", label: "Projections", icon: "↗" },
  { href: "/research", label: "Research", icon: "◔" },
  { href: "/career", label: "Career", icon: "◆" },
  { href: "/reports", label: "Reports", icon: "▤" },
  { href: "/settings", label: "Settings", icon: "⚙" },
] as const;

export function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
        <div className="px-5 py-6">
          <div className="text-sm font-bold uppercase tracking-widest text-blue-900">EK WEALTH</div>
          <div className="text-xs text-muted-2">& Career Dashboard</div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-surface-muted hover:text-foreground"
                )}
              >
                <span aria-hidden className="w-4 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-5 py-4 text-[11px] leading-relaxed text-muted-2">
          Personal tracking &amp; analytical tool.
          <br />
          Not investment advice.
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <div className="text-sm font-bold uppercase tracking-widest text-blue-900">EK WEALTH</div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-border bg-surface py-1.5 md:hidden">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[10px] font-medium",
                active ? "text-accent" : "text-muted-2"
              )}
            >
              <span aria-hidden className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
