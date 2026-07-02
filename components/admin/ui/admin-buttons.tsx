import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { adminTokens } from "./tokens";

export function AdminPrimaryButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button className={cn(adminTokens.primaryBtn, "h-11 px-5", className)} {...props} />
  );
}

export function AdminSecondaryButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      className={cn(adminTokens.secondaryBtn, "h-11 px-5", className)}
      {...props}
    />
  );
}

export function AdminGhostButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "h-9 rounded-xl px-3 text-[#A5B3AC] transition-all duration-200 hover:bg-white/[0.05] hover:text-[#F3F5F4]",
        className,
      )}
      {...props}
    />
  );
}

export function AdminActionButton({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<typeof Button> & {
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral:
      "border-white/[0.08] text-[#A5B3AC] hover:bg-white/[0.05] hover:text-[#F3F5F4]",
    success:
      "border-emerald-500/20 bg-emerald-500/10 text-[#22C55E] hover:bg-emerald-500/15",
    warning:
      "border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/15",
    danger:
      "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/15",
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        "h-8 rounded-lg px-3 text-xs font-medium transition-all duration-200 active:scale-[0.98]",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
