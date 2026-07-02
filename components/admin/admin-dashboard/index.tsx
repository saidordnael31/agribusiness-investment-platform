"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Shield, TrendingUp, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { UserManager } from "../user-manager"
import { AdminSettings } from "../admin-settings"
import { NotificationSystem } from "../notification-system"
import { ApproveInvestmentModal } from "../approve-investment-modal"
import { AdminApproveInvestmentModal } from "../admin-approve-investment-modal"
import { InvestmentsManager } from "../investments-manager"
import { AdminCommissionsDetail } from "../admin-commissions-detail"
import { useAdminDashboard } from "./useAdminDashboard"
import { useAdminAnalytics } from "./useAdminAnalytics"
import { AdminContractsManager } from "../admin-contracts-manager"
import { ClientsWithoutInvestments } from "../clients-without-investments"
import { AdminOverview } from "./admin-overview"
import {
  AdminShell,
  AdminWorkspace,
  AdminFintechNavbar,
  type AdminNavTab,
  AdminHero,
  AdminSegmentTabs,
  AdminSegmentPanel,
  FintechMetricCard,
  adminTokens,
} from "../ui"

const DASHBOARD_TABS = [
  { value: "overview", label: "Visão Geral" },
  { value: "investments", label: "Investimentos" },
  { value: "clients-without-investments", label: "Sem Investimentos" },
  { value: "contracts", label: "Contratos" },
  { value: "commissions", label: "Comissões" },
  { value: "notifications", label: "Notificações" },
  { value: "settings", label: "Configurações" },
  { value: "users", label: "Usuários" },
] as const

const VALID_TAB_IDS = DASHBOARD_TABS.map((t) => t.value)

function readTabFromHash(): string {
  if (typeof window === "undefined") return "overview"
  const hash = window.location.hash.replace("#", "")
  return VALID_TAB_IDS.includes(hash as (typeof VALID_TAB_IDS)[number]) ? hash : "overview"
}

export function AdminDashboard() {
  const {
    user,
    stats,
    recentActivities,
    loading,
    activityFilters,
    currentPage,
    totalPages,
    totalActivities,
    approveModalOpen,
    adminApproveModalOpen,
    selectedInvestment,
    handleFilterChange,
    handlePageChange,
    clearFilters,
    handleActivityAction,
    handleApprovalSuccess,
    closeApprovalModal,
    formatCurrency,
  } = useAdminDashboard()

  const { analytics, loading: analyticsLoading } = useAdminAnalytics()

  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    setActiveTab(readTabFromHash())

    const onHashChange = () => setActiveTab(readTabFromHash())
    window.addEventListener("hashchange", onHashChange)
    return () => window.removeEventListener("hashchange", onHashChange)
  }, [])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    window.history.replaceState(null, "", `#${value}`)
  }

  const handleNavTabNavigate = (tab: AdminNavTab) => {
    handleTabChange(tab)
  }

  if (!user || user.user_type !== "admin") {
    return (
      <AdminShell>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="rounded-2xl border border-white/[0.08] bg-[#161F1B] p-10 text-center shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <Shield className="mx-auto mb-4 h-10 w-10 text-[#6B7C74]" />
            <h3 className="font-semibold text-[#F3F5F4]">Acesso negado</h3>
            <p className="mt-1 text-sm text-[#6B7C74]">Sem permissão para esta área.</p>
          </div>
        </div>
      </AdminShell>
    )
  }

  const dashboardNav = (
    <AdminFintechNavbar
      userName={user.name}
      activeTab={activeTab}
      onTabNavigate={handleNavTabNavigate}
    />
  )

  if (loading) {
    return (
      <AdminShell nav={dashboardNav}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-600" />
        </div>
      </AdminShell>
    )
  }

  const heroSide = (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <FintechMetricCard
        label="Carteira"
        value={formatCurrency(stats.totalInvested)}
        icon={TrendingUp}
        tone="forest"
        surface="featured"
        sparkline={analytics?.volumeSparkline}
        className="p-3! sm:p-4!"
      />
      <FintechMetricCard
        label="Investidores"
        value={stats.totalInvestors.toLocaleString("pt-BR")}
        sublabel={`${stats.totalUsers} usuários`}
        icon={Users}
        tone="emerald"
        surface="soft"
        className="p-3! sm:p-4!"
      />
    </div>
  )

  return (
    <AdminShell nav={dashboardNav}>
      <AdminHero
        userName={user.name}
        title="Painel Administrativo"
        description="Visão consolidada da carteira, investidores e operações da plataforma Agrinvest."
        sideContent={heroSide}
        actions={
          <Link
            href="/admin/rentabilidades"
            className={cn(
              adminTokens.secondaryBtn,
              "inline-flex h-11 items-center px-5",
            )}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Rentabilidades
          </Link>
        }
      />

      <AdminWorkspace>
      <AdminSegmentTabs
        value={activeTab}
        onValueChange={handleTabChange}
        tabs={[...DASHBOARD_TABS]}
      >
        <AdminSegmentPanel value="overview">
          <AdminOverview
            stats={stats}
            analytics={analytics}
            analyticsLoading={analyticsLoading}
            formatCurrency={formatCurrency}
            recentActivities={recentActivities}
            activityFilters={activityFilters}
            totalActivities={totalActivities}
            currentPage={currentPage}
            totalPages={totalPages}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onClearFilters={clearFilters}
            onActivityAction={handleActivityAction}
          />
        </AdminSegmentPanel>

        <AdminSegmentPanel value="investments">
          <InvestmentsManager />
        </AdminSegmentPanel>

        <AdminSegmentPanel value="clients-without-investments">
          <ClientsWithoutInvestments />
        </AdminSegmentPanel>

        <AdminSegmentPanel value="contracts">
          <AdminContractsManager />
        </AdminSegmentPanel>

        <AdminSegmentPanel value="commissions">
          <AdminCommissionsDetail />
        </AdminSegmentPanel>

        <AdminSegmentPanel value="notifications">
          <NotificationSystem />
        </AdminSegmentPanel>

        <AdminSegmentPanel value="settings">
          <AdminSettings />
        </AdminSegmentPanel>

        <AdminSegmentPanel value="users">
          <UserManager />
        </AdminSegmentPanel>
      </AdminSegmentTabs>
      </AdminWorkspace>

      {selectedInvestment && (
        <ApproveInvestmentModal
          isOpen={approveModalOpen}
          onClose={closeApprovalModal}
          investmentId={selectedInvestment.id}
          investmentAmount={selectedInvestment.amount}
          investorName={selectedInvestment.investorName}
          onSuccess={handleApprovalSuccess}
        />
      )}

      {selectedInvestment && (
        <AdminApproveInvestmentModal
          isOpen={adminApproveModalOpen}
          onClose={closeApprovalModal}
          investmentId={selectedInvestment.id}
          investmentAmount={selectedInvestment.amount}
          investorName={selectedInvestment.investorName}
          onSuccess={handleApprovalSuccess}
        />
      )}
    </AdminShell>
  )
}
