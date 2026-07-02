"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { adminTokens } from "./tokens";

const chartTooltipStyle = {
  contentStyle: {
    background: "rgba(22,31,27,0.96)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(16,185,129,0.08)",
    fontSize: "12px",
    color: "#F3F5F4",
  },
  labelStyle: { color: "#A5B3AC" },
  itemStyle: { color: "#22C55E" },
};

const axisTick = { fontSize: 11, fill: "#6B7C74" };
const gridStroke = "rgba(255,255,255,0.04)";

export function AdminSparkline({
  data,
  dataKey = "value",
  color = "#22C55E",
  className,
  height = 40,
}: {
  data: { value: number }[];
  dataKey?: string;
  color?: string;
  className?: string;
  height?: number;
}) {
  const uid = useId().replace(/:/g, "");
  if (!data.length) return null;

  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      <div
        className={cn(adminTokens.chartGlow, "inset-x-2 bottom-0 top-1/2")}
        aria-hidden
      />
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${uid})`}
            dot={false}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdminAreaChartPanel({
  data,
  dataKey,
  xKey,
  color = "#22C55E",
  height = 220,
  formatValue,
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  xKey: string;
  color?: string;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const uid = useId().replace(/:/g, "");

  return (
    <div className="relative w-full" style={{ height }}>
      <div
        className={cn(
          adminTokens.chartGlow,
          "inset-x-8 bottom-2 top-1/4 opacity-90",
        )}
        aria-hidden
      />
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`area-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="50%" stopColor={color} stopOpacity={0.08} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`stroke-${uid}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridStroke}
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            dy={8}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={axisTick}
            width={56}
            tickFormatter={(v) =>
              formatValue ? formatValue(v) : `${(v / 1000).toFixed(0)}k`
            }
          />
          <Tooltip
            {...chartTooltipStyle}
            formatter={(value: number) => [
              formatValue ? formatValue(value) : value.toLocaleString("pt-BR"),
              "Volume",
            ]}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={`url(#stroke-${uid})`}
            strokeWidth={2}
            fill={`url(#area-${uid})`}
            style={{ filter: "drop-shadow(0 0 6px rgba(16,185,129,0.4))" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdminBarChartPanel({
  data,
  dataKey,
  xKey,
  color = "#10B981",
  height = 180,
}: {
  data: Record<string, string | number>[];
  dataKey: string;
  xKey: string;
  color?: string;
  height?: number;
}) {
  const uid = useId().replace(/:/g, "");

  return (
    <div className="relative w-full" style={{ height }}>
      <div
        className={cn(adminTokens.chartGlow, "inset-x-4 bottom-0 top-1/2 opacity-70")}
        aria-hidden
      />
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`bar-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.95} />
              <stop offset="100%" stopColor={color} stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={gridStroke}
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            axisLine={false}
            tickLine={false}
            tick={axisTick}
          />
          <YAxis hide />
          <Tooltip {...chartTooltipStyle} />
          <Bar
            dataKey={dataKey}
            fill={`url(#bar-${uid})`}
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
            style={{ filter: "drop-shadow(0 0 4px rgba(16,185,129,0.3))" }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdminDonutChart({
  data,
  height = 200,
  innerRadius = 52,
  outerRadius = 72,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative" style={{ height }}>
      <div
        className={cn(
          adminTokens.chartGlow,
          "left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2",
        )}
        aria-hidden
      />
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.color}
                fillOpacity={0.9}
                style={{ filter: `drop-shadow(0 0 4px ${entry.color}40)` }}
              />
            ))}
          </Pie>
          <Tooltip {...chartTooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[#6B7C74]">
          Total
        </span>
        <span className="text-lg font-semibold tabular-nums text-[#F3F5F4] drop-shadow-[0_0_16px_rgba(16,185,129,0.3)]">
          {total.toLocaleString("pt-BR")}
        </span>
      </div>
    </div>
  );
}
