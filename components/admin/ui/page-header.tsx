import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { adminTokens } from "./tokens";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  backHref,
  backLabel = "Voltar",
  badge,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={cn("mb-8 space-y-5", className)}>
      {backHref && (
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={cn(
            adminTokens.outlineBtn,
            "h-9 px-3 text-slate-600 shadow-none",
          )}
        >
          <Link href={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      )}

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1
              className={cn(
                adminTokens.title,
                "text-3xl font-semibold sm:text-4xl",
              )}
            >
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className={cn(adminTokens.subtitle, "max-w-3xl text-base")}>
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}
