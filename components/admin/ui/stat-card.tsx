import { cn } from "@/lib/utils";
import { adminTokens, statToneStyles, type AdminStatCardConfig } from "./tokens";

export function AdminStatCard({
  title,
  value,
  description,
  meta,
  icon: Icon,
  tone = "forest",
  className,
}: AdminStatCardConfig & { className?: string }) {
  const styles = statToneStyles[tone];

  return (
    <div
      className={cn(
        adminTokens.card,
        adminTokens.cardHover,
        "relative overflow-hidden p-5 sm:p-6",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b",
          styles.glow,
        )}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <div className="space-y-2">
            <p
              className={cn(
                "text-3xl font-semibold tracking-tight sm:text-4xl",
                styles.value,
              )}
            >
              {value}
            </p>
            <p className="text-sm leading-relaxed text-slate-500">{description}</p>
            {meta && (
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
                {meta}
              </p>
            )}
          </div>
        </div>

        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            styles.icon,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export function AdminStatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
