import { cn } from "@/lib/utils";

type SeverityLevel = "alert" | "emergency" | "info" | "warn";

const LEVEL_CLASSES: Record<SeverityLevel, { bg: string; dot: string; text: string }> = {
  info: {
    dot: "bg-info",
    bg: "bg-info/10",
    text: "text-info",
  },
  warn: {
    dot: "bg-warn",
    bg: "bg-warn/10",
    text: "text-warn",
  },
  alert: {
    dot: "bg-alert",
    bg: "bg-alert/10",
    text: "text-alert",
  },
  emergency: {
    dot: "bg-emergency",
    bg: "bg-emergency/10",
    text: "text-emergency",
  },
};

interface SeverityPillProps {
  className?: string;
  label: string;
  level: SeverityLevel;
}

function SeverityPill({ level, label, className }: Readonly<SeverityPillProps>) {
  const c = LEVEL_CLASSES[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5",
        "font-mono font-semibold text-[11px] uppercase tracking-wide",
        c.bg,
        c.text,
        className,
      )}
    >
      <span className={cn("size-1 rounded-full", c.dot)} aria-hidden />
      {label}
    </span>
  );
}

export type { SeverityLevel };
export { SeverityPill };
