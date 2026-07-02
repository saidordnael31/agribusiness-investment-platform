"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface AdminPillTab {
  value: string;
  label: string;
  count?: number;
}

interface AdminPillTabsProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  tabs: AdminPillTab[];
  children: React.ReactNode;
  className?: string;
}

export function AdminPillTabs({
  value,
  onValueChange,
  defaultValue,
  tabs,
  children,
  className,
}: AdminPillTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
      className={cn("space-y-4", className)}
    >
      <div className="overflow-x-auto pb-0.5">
        <TabsList className="inline-flex h-auto min-w-full gap-1 rounded-xl border border-white/[0.06] bg-[#111A17] p-1 sm:min-w-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "rounded-lg px-3.5 py-2 text-xs font-medium text-[#6B7C74] shadow-none transition-all duration-200 sm:text-sm",
                "hover:text-[#A5B3AC]",
                "data-[state=active]:border data-[state=active]:border-emerald-500/15",
                "data-[state=active]:bg-[#1A2520] data-[state=active]:text-[#22C55E]",
                "data-[state=active]:shadow-[0_0_16px_rgba(16,185,129,0.08)]",
                "data-[state=active]:[&_.pill-count]:border-emerald-500/20",
                "data-[state=active]:[&_.pill-count]:bg-emerald-500/10",
                "data-[state=active]:[&_.pill-count]:text-[#22C55E]",
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                {tab.label}
                {tab.count !== undefined && (
                  <span className="pill-count rounded-md border border-white/[0.06] bg-[#161F1B] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-[#6B7C74]">
                    {tab.count}
                  </span>
                )}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
}

export function AdminPillTabPanel({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsContent value={value} className={cn("mt-0 space-y-4", className)}>
      {children}
    </TabsContent>
  );
}
