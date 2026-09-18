import clsx from "clsx";

/**
 * Data-provenance / status pill (spec §2 "Principle 2 — Separate facts
 * from assumptions"). Always pairs a text label with color, never color
 * alone (spec §46, accessibility).
 */
export type BadgeTone = "verified" | "official" | "userInput" | "assumption" | "unverified" | "conflicting" | "estimated" | "stale" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  verified: "bg-positive-soft text-positive",
  official: "bg-accent-soft text-accent",
  userInput: "bg-surface-muted text-foreground",
  assumption: "bg-warning-soft text-warning",
  unverified: "bg-surface-muted text-muted",
  conflicting: "bg-negative-soft text-negative",
  estimated: "bg-warning-soft text-warning",
  stale: "bg-negative-soft text-negative",
  neutral: "bg-surface-muted text-muted",
};

const TONE_LABELS: Record<BadgeTone, string> = {
  verified: "VERIFIED",
  official: "OFFICIAL",
  userInput: "USER INPUT",
  assumption: "ASSUMPTION",
  unverified: "UNVERIFIED",
  conflicting: "CONFLICTING",
  estimated: "ESTIMATED",
  stale: "STALE",
  neutral: "",
};

export function Badge({
  tone,
  children,
  className,
}: {
  tone: BadgeTone;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children ?? TONE_LABELS[tone]}
    </span>
  );
}

const VERIFICATION_STATUS_TONE: Record<string, BadgeTone> = {
  VERIFIED: "verified",
  OFFICIAL: "official",
  USER_INPUT: "userInput",
  ASSUMPTION: "assumption",
  UNVERIFIED: "unverified",
  CONFLICTING: "conflicting",
  ESTIMATED: "estimated",
  STALE: "stale",
};

export function VerificationBadge({ status }: { status: string }) {
  const tone = VERIFICATION_STATUS_TONE[status] ?? "neutral";
  return <Badge tone={tone}>{status.replace(/_/g, " ")}</Badge>;
}
