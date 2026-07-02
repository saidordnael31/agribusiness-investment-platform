import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const badgeBase =
  "rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide";

export function AdminStatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?:
    | "neutral"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "muted";
  className?: string;
}) {
  const tones = {
    neutral: "border-white/10 bg-white/5 text-[#A5B3AC]",
    success: "border-emerald-500/25 bg-emerald-500/10 text-[#22C55E]",
    warning: "border-amber-500/25 bg-amber-500/10 text-amber-400",
    danger: "border-red-500/25 bg-red-500/10 text-red-400",
    info: "border-sky-500/25 bg-sky-500/10 text-sky-400",
    muted: "border-white/[0.06] bg-[#161F1B] text-[#6B7C74]",
  };

  return (
    <Badge
      variant="outline"
      className={cn(badgeBase, tones[tone], className)}
    >
      {children}
    </Badge>
  );
}
