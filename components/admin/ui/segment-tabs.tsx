"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface SegmentTab {
  value: string;
  label: string;
  count?: number;
}

interface AdminSegmentTabsProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  tabs: SegmentTab[];
  children: React.ReactNode;
  className?: string;
}

export function AdminSegmentTabs({
  value,
  onValueChange,
  defaultValue,
  tabs,
  children,
  className,
}: AdminSegmentTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
      className={cn("space-y-4", className)}
    >
      <div className="border-b border-white/[0.06]">
        <TabsList className="h-auto w-full justify-start gap-0 rounded-none bg-transparent p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "relative rounded-none border-0 bg-transparent px-3 py-2.5 text-xs font-medium text-[#6B7C74] shadow-none sm:text-sm",
                "hover:text-[#A5B3AC]",
                "data-[state=active]:bg-transparent data-[state=active]:text-[#22C55E] data-[state=active]:shadow-none",
                "after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[2px] after:scale-x-0 after:rounded-full after:bg-gradient-to-r after:from-[#10B981] after:to-[#22C55E] after:shadow-[0_0_8px_rgba(16,185,129,0.5)] after:transition-transform after:duration-200",
                "data-[state=active]:after:scale-x-100",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 rounded border border-white/[0.06] bg-[#161F1B] px-1.5 py-0.5 text-[10px] font-semibold text-[#6B7C74]">
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
}

export function AdminSegmentPanel({
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
