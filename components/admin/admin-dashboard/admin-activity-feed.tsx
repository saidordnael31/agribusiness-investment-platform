"use client";

import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  AdminSectionCard,
  AdminSecondaryButton,
  AdminActionButton,
  AdminStatusBadge,
  adminTokens,
} from "../ui";
import type { RecentActivity } from "./useAdminDashboard";

interface AdminActivityFeedProps {
  activities: RecentActivity[];
  filters: { type: string; dateFrom: string; dateTo: string };
  totalActivities: number;
  currentPage: number;
  totalPages: number;
  onFilterChange: (f: Partial<{ type: string; dateFrom: string; dateTo: string }>) => void;
  onPageChange: (p: number) => void;
  onClearFilters: () => void;
  onActivityAction: (id: string, action: "approve" | "reject") => void;
  formatCurrency: (v: number) => string;
}

export function AdminActivityFeed({
  activities,
  filters,
  totalActivities,
  currentPage,
  totalPages,
  onFilterChange,
  onPageChange,
  onClearFilters,
  onActivityAction,
  formatCurrency,
}: AdminActivityFeedProps) {
  return (
    <AdminSectionCard
      title="Atividade recente"
      description="Movimentações e eventos em tempo real"
      variant="card"
      action={
        <AdminStatusBadge tone="muted">{totalActivities} eventos</AdminStatusBadge>
      }
      noPadding
    >
      <div className="border-b border-white/[0.06] bg-[#141D19]/80 px-3 py-2.5 sm:px-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#6B7C74]">
            <Activity className="h-3.5 w-3.5" />
            Filtros
          </div>
          <Select
            value={filters.type}
            onValueChange={(v) => onFilterChange({ type: v })}
          >
            <SelectTrigger className={cn(adminTokens.input, "h-9 w-36 text-xs")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-white/[0.08] bg-[#161F1B] text-[#F3F5F4]">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="investment">Investimentos</SelectItem>
              <SelectItem value="pending_investment">Pendentes</SelectItem>
              <SelectItem value="active_investment_pending_admin">Aguardando Admin</SelectItem>
              <SelectItem value="withdrawal">Transações</SelectItem>
              <SelectItem value="user_created">Usuários</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
            className={cn(adminTokens.input, "h-9 w-32 text-xs")}
          />
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange({ dateTo: e.target.value })}
            className={cn(adminTokens.input, "h-9 w-32 text-xs")}
          />
          <AdminSecondaryButton size="sm" onClick={onClearFilters} className="ml-auto h-9 text-xs">
            Limpar
          </AdminSecondaryButton>
        </div>
      </div>

      <div className="max-h-[480px] overflow-y-auto px-2 py-2 sm:px-3">
        {activities.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#6B7C74]">
            Nenhuma atividade encontrada
          </p>
        ) : (
          <div className="space-y-1.5">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="group rounded-xl border border-transparent bg-white/[0.02] p-3.5 transition-all duration-200 hover:border-emerald-500/10 hover:bg-[#202C26] hover:shadow-[0_0_20px_rgba(16,185,129,0.06)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full ring-4 ring-[#161F1B]",
                        activity.color,
                      )}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-[#F3F5F4]">
                          {activity.title}
                        </p>
                        {activity.type === "pending_investment" && (
                          <AdminStatusBadge tone="warning">Pendente</AdminStatusBadge>
                        )}
                        {activity.type === "active_investment_pending_admin" && (
                          <AdminStatusBadge tone="warning">Admin</AdminStatusBadge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[#6B7C74]">
                        {activity.description}
                      </p>
                      {activity.relatedData?.amount && (
                        <p className="mt-1 text-xs font-semibold text-[#22C55E]">
                          {formatCurrency(activity.relatedData.amount)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-[10px] text-[#6B7C74]">
                      {activity.timestamp}
                    </span>
                    {activity.actions?.approve && (
                      <div className="flex gap-1 opacity-80 transition-opacity group-hover:opacity-100">
                        <AdminActionButton
                          tone="success"
                          onClick={() => onActivityAction(activity.id, "approve")}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Aprovar
                        </AdminActionButton>
                        {activity.actions.reject && (
                          <AdminActionButton
                            tone="danger"
                            onClick={() => onActivityAction(activity.id, "reject")}
                          >
                            <XCircle className="mr-1 h-3 w-3" />
                          </AdminActionButton>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3 sm:px-5">
          <span className="text-xs text-[#6B7C74]">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-1">
            <AdminSecondaryButton
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </AdminSecondaryButton>
            <AdminSecondaryButton
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </AdminSecondaryButton>
          </div>
        </div>
      )}
    </AdminSectionCard>
  );
}
