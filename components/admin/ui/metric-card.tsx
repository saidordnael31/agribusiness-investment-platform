import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  adminTokens,
  metricSurfaceStyles,
  statToneStyles,
  type AdminStatTone,
  type MetricSurface,
} from "./tokens";
import { AdminSparkline } from "./charts";

export interface FintechMetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: LucideIcon;
  tone?: AdminStatTone;
  change?: number;
  changeLabel?: string;
  sparkline?: { value: number }[];
  progress?: number;
  featured?: boolean;
  surface?: MetricSurface;
  badge?: string;
  className?: string;
}

export function FintechMetricCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "forest",
  change,
  changeLabel,
  sparkline,
  progress,
  featured = false,
  surface,
  badge,
  className,
}: FintechMetricCardProps) {
  const styles = statToneStyles[tone];
  const isPositive = change !== undefined && change >= 0;
  const resolvedSurface: MetricSurface =
    surface ?? (featured ? "featured" : "card");

  return (
    <div
      className={cn(
        metricSurfaceStyles[resolvedSurface],
        adminTokens.cardHover,
        "relative overflow-hidden p-3.5 sm:p-4",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br opacity-80 blur-2xl",
          styles.glow,
        )}
      />
      {resolvedSurface === "featured" && (
        <div
          className="pointer-events-none absolute bottom-0 left-1/4 h-20 w-1/2 rounded-full bg-emerald-500/[0.1] blur-2xl"
          aria-hidden
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            styles.icon,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        {badge && (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#22C55E]">
            {badge}
          </span>
        )}
      </div>

      <div className="relative mt-3 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7C74]">
          {label}
        </p>
        <p
          className={cn(
            "text-xl font-semibold tracking-tight tabular-nums sm:text-2xl",
            styles.value,
            resolvedSurface === "featured" &&
              "drop-shadow-[0_0_24px_rgba(16,185,129,0.25)]",
          )}
        >
          {value}
        </p>
        {sublabel && (
          <p className="text-[11px] text-[#A5B3AC]">{sublabel}</p>
        )}
      </div>

      {(change !== undefined || changeLabel) && (
        <div className="relative mt-2.5 flex items-center gap-1.5">
          {change !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                isPositive
                  ? "border border-emerald-500/20 bg-emerald-500/10 text-[#22C55E]"
                  : "border border-red-500/20 bg-red-500/10 text-red-400",
              )}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
          {changeLabel && (
            <span className="text-[11px] text-[#6B7C74]">{changeLabel}</span>
          )}
        </div>
      )}

      {progress !== undefined && (
        <div className="relative mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#22C55E] shadow-[0_0_8px_rgba(16,185,129,0.4)] transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {sparkline && sparkline.length > 1 && (
        <div className="relative mt-2.5 -mx-1">
          <AdminSparkline data={sparkline} color={styles.spark} height={32} />
        </div>
      )}
    </div>
  );
}

export function FintechMetricGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
