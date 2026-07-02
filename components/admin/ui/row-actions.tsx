"use client";

import type { LucideIcon } from "lucide-react";
import { Loader2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { adminTokens } from "./tokens";

export interface AdminRowAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: "default" | "success" | "warning" | "danger";
  separatorBefore?: boolean;
}

const toneClasses: Record<NonNullable<AdminRowAction["tone"]>, string> = {
  default: "text-[#A5B3AC] focus:text-[#F3F5F4] focus:bg-white/[0.05]",
  success: "text-[#22C55E] focus:text-[#22C55E] focus:bg-emerald-500/10",
  warning: "text-amber-400 focus:text-amber-400 focus:bg-amber-500/10",
  danger: "text-red-400 focus:text-red-400 focus:bg-red-500/10",
};

export function AdminRowActions({
  actions,
  className,
}: {
  actions: AdminRowAction[];
  className?: string;
}) {
  const visible = actions.filter((a) => !a.disabled || a.loading);
  if (visible.length === 0) return <span className="text-[#6B7C74]">—</span>;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-md p-0",
          "text-[#6B7C74] opacity-50 transition-all duration-150 outline-none",
          "hover:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100",
          "hover:bg-white/[0.05] hover:text-[#22C55E]",
          "focus-visible:ring-2 focus-visible:ring-emerald-500/20",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">Ações</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(adminTokens.popover, "min-w-[180px]")}
        onClick={(e) => e.stopPropagation()}
      >
        {actions.map((action) => (
          <div key={action.id}>
            {action.separatorBefore && (
              <DropdownMenuSeparator className="bg-white/[0.06]" />
            )}
            <DropdownMenuItem
              disabled={action.disabled || action.loading}
              onClick={action.onClick}
              className={cn(
                "cursor-pointer rounded-lg text-xs font-medium",
                toneClasses[action.tone ?? "default"],
              )}
            >
              {action.loading ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : action.icon ? (
                <action.icon className="mr-2 h-3.5 w-3.5" />
              ) : null}
              {action.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
