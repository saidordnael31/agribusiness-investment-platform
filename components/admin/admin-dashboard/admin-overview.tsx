"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Clock,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FintechMetricCard,
  FintechMetricGrid,
  AdminAreaChartPanel,
  AdminBarChartPanel,
  AdminDonutChart,
  AdminSectionCard,
  AdminStatusBadge,
  adminTokens,
} from "../ui";
import type { AdminAnalytics } from "./useAdminAnalytics";
import type { RecentActivity } from "./useAdminDashboard";
import { AdminActivityFeed } from "./admin-activity-feed";

interface AdminOverviewProps {
  stats: {
    totalUsers: number;
    totalInvestors: number;
    totalDistributors: number;
    totalInvested: number;
  };
  analytics: AdminAnalytics | null;
  analyticsLoading: boolean;
  formatCurrency: (v: number) => string;
  recentActivities: RecentActivity[];
  activityFilters: { type: string; dateFrom: string; dateTo: string };
  totalActivities: number;
  currentPage: number;
  totalPages: number;
  onFilterChange: (f: Partial<{ type: string; dateFrom: string; dateTo: string }>) => void;
  onPageChange: (p: number) => void;
  onClearFilters: () => void;
  onActivityAction: (id: string, action: "approve" | "reject") => void;
}

export function AdminOverview({
  stats,
  analytics,
  analyticsLoading,
  formatCurrency,
  recentActivities,
  activityFilters,
  totalActivities,
  currentPage,
  totalPages,
  onFilterChange,
  onPageChange,
  onClearFilters,
  onActivityAction,
}: AdminOverviewProps) {
  const barData =
    analytics?.volumeByMonth.map((m) => ({
      month: m.month,
      count: m.count,
    })) ?? [];

  return (
    <div className="space-y-5">
      <FintechMetricGrid>
        <FintechMetricCard
          label="Carteira ativa"
          value={formatCurrency(stats.totalInvested)}
          sublabel="Volume total investido"
          icon={Wallet}
          tone="forest"
          featured
          change={analytics?.volumeChange}
          changeLabel="vs. mês anterior"
          sparkline={analytics?.volumeSparkline}
          badge="AUM"
        />
        <FintechMetricCard
          label="Investidores"
          value={stats.totalInvestors.toLocaleString("pt-BR")}
          sublabel={`${stats.totalDistributors} na rede`}
          icon={Users}
          tone="emerald"
          surface="soft"
          sparkline={analytics?.investorSparkline}
          progress={
            stats.totalUsers > 0
              ? (stats.totalInvestors / stats.totalUsers) * 100
              : 0
          }
        />
        <FintechMetricCard
          label="Volume do mês"
          value={formatCurrency(analytics?.monthVolume ?? 0)}
          sublabel="Novos aportes ativos"
          icon={TrendingUp}
          tone="sky"
          surface="card"
          change={analytics?.volumeChange}
          changeLabel="tendência"
        />
        <FintechMetricCard
          label="Pendências"
          value={String(analytics?.pendingCount ?? 0)}
          sublabel="Aguardando aprovação"
          icon={Clock}
          tone="amber"
          surface="soft"
          badge={
            (analytics?.pendingCount ?? 0) > 0 ? "Ação" : undefined
          }
        />
      </FintechMetricGrid>

      <div className="grid gap-4 lg:grid-cols-12">
        <AdminSectionCard
          title="Evolução da carteira"
          description="Volume de investimentos ativos — últimos 6 meses"
          className="lg:col-span-8"
          variant="card"
          action={
            <Link
              href="/admin/rentabilidades"
              className={cn(
                adminTokens.secondaryBtn,
                "inline-flex h-8 items-center gap-1 px-3 text-xs",
              )}
            >
              Rentabilidades
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          }
        >
          {analyticsLoading ? (
            <div className="flex h-[220px] items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-600" />
            </div>
          ) : (
            <AdminAreaChartPanel
              data={analytics?.volumeByMonth ?? []}
              dataKey="volume"
              xKey="month"
              formatValue={(v) => formatCurrency(v)}
            />
          )}
        </AdminSectionCard>

        <AdminSectionCard
          title="Distribuição"
          description="Status dos investimentos"
          className="lg:col-span-4"
          variant="accent"
        >
          {analyticsLoading ? (
            <div className="flex h-[200px] items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-600" />
            </div>
          ) : (
            <>
              <AdminDonutChart data={analytics?.statusDistribution ?? []} />
              <div className="mt-4 space-y-2">
                {analytics?.statusDistribution.map((slice) => (
                  <div
                    key={slice.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: slice.color }}
                      />
                      <span className="text-[#A5B3AC]">{slice.name}</span>
                    </div>
                    <span className="font-medium tabular-nums text-[#F3F5F4]">
                      {slice.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </AdminSectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <AdminActivityFeed
            activities={recentActivities}
            filters={activityFilters}
            totalActivities={totalActivities}
            currentPage={currentPage}
            totalPages={totalPages}
            onFilterChange={onFilterChange}
            onPageChange={onPageChange}
            onClearFilters={onClearFilters}
            onActivityAction={onActivityAction}
            formatCurrency={formatCurrency}
          />
        </div>

        <AdminSectionCard
          title="Maiores posições"
          description="Investidores por volume ativo"
          className="lg:col-span-5"
          variant="section"
          noPadding
        >
          <div className="divide-y divide-white/[0.04]">
            {(analytics?.recentInvestors ?? []).length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[#6B7C74]">
                Nenhum investidor ativo encontrado
              </p>
            ) : (
              analytics?.recentInvestors.map((inv, idx) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#202C26]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-xs font-bold text-[#22C55E]">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[#F3F5F4]">
                      {inv.name}
                    </p>
                    <p className="truncate text-xs text-[#6B7C74]">
                      {inv.email || "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-[#22C55E]">
                      {formatCurrency(inv.amount)}
                    </p>
                    <AdminStatusBadge tone="success" className="mt-0.5 text-[9px]">
                      Ativo
                    </AdminStatusBadge>
                  </div>
                </div>
              ))
            )}
          </div>
        </AdminSectionCard>
      </div>

      <AdminSectionCard
        title="Aportes por mês"
        description="Quantidade de novos investimentos ativos"
        variant="muted"
      >
        <AdminBarChartPanel
          data={barData}
          dataKey="count"
          xKey="month"
          color="#10B981"
          height={160}
        />
      </AdminSectionCard>
    </div>
  );
}
