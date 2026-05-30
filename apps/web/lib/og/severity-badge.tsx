const COLORS: Record<string, { bg: string; fg: string }> = {
  emergency: { bg: "#fde8e8", fg: "#c0152b" },
  alert: { bg: "#fef3e2", fg: "#b45309" },
  warn: { bg: "#fefce8", fg: "#854d0e" },
  info: { bg: "#e0f2fe", fg: "#0369a1" },
};

export function SeverityBadge({ level }: Readonly<{ level: string }>) {
  const c = COLORS[level] ?? COLORS.info ?? { bg: "#e0f2fe", fg: "#0369a1" };
  return (
    <div
      style={{
        background: c.bg,
        color: c.fg,
        borderRadius: 6,
        padding: "4px 12px",
        fontSize: 16,
        fontFamily: "monospace",
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {level}
    </div>
  );
}
