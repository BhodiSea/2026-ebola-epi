import { cn } from "@/lib/utils";

interface SkeletonChartProps {
  className?: string;
  height?: number;
  width?: number;
}

function SkeletonChart({ width = 480, height = 240, className }: Readonly<SkeletonChartProps>) {
  return (
    <div
      className={cn("animate-pulse overflow-hidden rounded-md bg-surface-2", className)}
      style={{ width, height }}
      role="status"
      aria-label="Loading chart"
    >
      <div
        className="h-full w-[200%] -translate-x-full animate-[shimmer_1.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-fg/[0.04] to-transparent"
        aria-hidden
      />
    </div>
  );
}

export { SkeletonChart };
