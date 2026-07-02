import { cn } from "@/lib/utils";
import { adminTokens } from "./tokens";

interface AdminSectionCardProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
  variant?: "card" | "section" | "muted" | "accent";
}

const variantStyles = {
  card: adminTokens.card,
  section: adminTokens.section,
  muted: adminTokens.sectionMuted,
  accent:
    "rounded-xl border border-emerald-500/[0.1] bg-gradient-to-br from-[#1A2520] via-[#181F1C] to-[#141D19] shadow-[0_0_0_1px_rgba(16,185,129,0.05)_inset,0_8px_32px_rgba(16,185,129,0.06)]",
} as const;

export function AdminSectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  noPadding = false,
  variant = "card",
}: AdminSectionCardProps) {
  return (
    <section className={cn(variantStyles[variant], "relative overflow-hidden", className)}>
      {(variant === "card" || variant === "accent") && (
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-500/[0.06] blur-3xl"
          aria-hidden
        />
      )}

      {(title || description || action) && (
        <div className="relative flex flex-col gap-2 border-b border-white/[0.06] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <div className="space-y-0.5">
            {title && (
              <h2 className="text-sm font-semibold tracking-tight text-[#F3F5F4]">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-[#6B7C74]">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}

      <div
        className={cn(
          "relative",
          !noPadding && "px-3 py-3 sm:px-4 sm:py-4",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}
