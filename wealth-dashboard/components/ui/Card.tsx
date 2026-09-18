import clsx from "clsx";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-[var(--radius)] border border-border bg-surface p-5 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const toneClass =
    tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-foreground";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      <span className={clsx("mono text-2xl font-semibold", toneClass)}>{value}</span>
      {sub && <span className="text-xs text-muted-2">{sub}</span>}
    </div>
  );
}
