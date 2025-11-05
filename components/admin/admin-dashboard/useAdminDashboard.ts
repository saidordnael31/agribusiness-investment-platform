"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

export interface UserData {
  name: string
  email: string
  user_type: string
}

export interface PlatformStats {
  totalUsers: number
  totalInvestors: number
  totalDistributors: number
  totalInvested: number
  monthlyRevenue: number
  activePromotions: number
  pendingApprovals: number
}

export interface RecentActivity {
  id: string
  type: "investment" | "withdrawal" | "goal_achieved" | "pending_investment" | "user_created" | "active_investment_pending_admin"
  title: string
  description: string
  timestamp: string
  color: string
  actions?: {
    approve?: boolean
    reject?: boolean
  }
  relatedData?: {
    investmentId?: string
    amount?: number
    quotaType?: string
    commitmentPeriod?: number
    monthlyReturnRate?: number
    approvedByAdmin?: boolean
  }
}

interface ActivityFilters {
  type: string
  dateFrom: string
  dateTo: string
}

interface SelectedInvestment {
  id: string
  amount: number
  investorName: string
}

const ITEMS_PER_PAGE = 10

export function useAdminDashboard() {
  const { toast } = useToast()
  const [user, setUser] = useState<UserData | null>(null)
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalInvestors: 0,
    totalDistributors: 0,
    totalInvested: 0,
    monthlyRevenue: 0,
    activePromotions: 0,
    pendingApprovals: 0,
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [activityFilters, setActivityFilters] = useState<ActivityFilters>({
    type: "all",
    dateFrom: "",
    dateTo: ""
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalActivities, setTotalActivities] = useState(0)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [selectedInvestment, setSelectedInvestment] = useState<SelectedInvestment | null>(null)

  const applyDateFilter = (dateStr: string, filters: ActivityFilters): boolean => {
    if (!filters.dateFrom && !filters.dateTo) return true
    const activityDate = new Date(dateStr)
    const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null
    const toDate = filters.dateTo ? new Date(filters.dateTo + "T23:59:59") : null
    
    if (fromDate && activityDate < fromDate) return false
    if (toDate && activityDate > toDate) return false
    return true
  }

  const fetchPendingInvestments = async (filters: ActivityFilters): Promise<RecentActivity[]> => {
    const activities: RecentActivity[] = []
    
    if (filters.type !== "all" && filters.type !== "pending_investment" && filters.type !== "investment") {
      return activities
    }

    try {
      const investmentsResponse = await fetch('/api/investments?status=pending')
      const investmentsData = await investmentsResponse.json()

      if (investmentsData.success && investmentsData.data) {
        investmentsData.data
          .filter((inv: any) => applyDateFilter(inv.created_at, filters))
          .forEach((inv: any) => {
            const investorName = inv.profiles?.full_name || `Investidor ${inv.user_id?.slice(0, 8) || 'N/A'}`
            activities.push({
              id: `pending-inv-${inv.id}`,
              type: "pending_investment",
              title: `Investimento pendente - ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(inv.amount)}`,
              description: `${investorName} - ${inv.quota_type || 'Tipo não especificado'} - Aguardando aprovação`,
              timestamp: new Date(inv.created_at).toLocaleString("pt-BR"),
              color: "bg-orange-500",
              actions: {
                approve: true,
                reject: true
              },
              relatedData: {
                investmentId: inv.id,
                amount: inv.amount,
                quotaType: inv.quota_type,
                commitmentPeriod: inv.commitment_period,
                monthlyReturnRate: inv.monthly_return_rate
              }
            })
          })
      }
    } catch (error) {
      console.error("Erro ao buscar investimentos pendentes:", error)
    }

    return activities
  }

  const fetchActiveInvestments = async (filters: ActivityFilters): Promise<RecentActivity[]> => {
    const activities: RecentActivity[] = []
    
    if (filters.type !== "all" && filters.type !== "investment" && filters.type !== "active_investment_pending_admin") {
      return activities
    }

    try {
      const activeResponse = await fetch('/api/investments?status=active')
      const activeData = await activeResponse.json()

      if (activeData.success && activeData.data) {
        activeData.data
          .filter((inv: any) => applyDateFilter(inv.updated_at || inv.created_at, filters))
          .forEach((inv: any) => {
            const isApprovedByAdmin = inv.approved_by_admin === true
            
            if (!isApprovedByAdmin) {
              if (filters.type === "all" || filters.type === "active_investment_pending_admin") {
                activities.push({
                  id: `active-pending-admin-${inv.id}`,
                  type: "active_investment_pending_admin",
                  title: `Investimento ativo - Aguardando aprovação do admin - ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(inv.amount)}`,
                  description: `${inv.profiles?.full_name || "Usuário"} - ${inv.quota_type || 'Tipo não especificado'} - Aprovado pelo assessor, aguardando admin`,
                  timestamp: new Date(inv.updated_at || inv.created_at).toLocaleString("pt-BR"),
                  color: "bg-yellow-500",
                  actions: {
                    approve: true,
                    reject: true
                  },
                  relatedData: {
                    investmentId: inv.id,
                    amount: inv.amount,
                    quotaType: inv.quota_type,
                    commitmentPeriod: inv.commitment_period,
                    monthlyReturnRate: inv.monthly_return_rate,
                    approvedByAdmin: false
                  }
                })
              }
            } else {
              if (filters.type === "all" || filters.type === "investment") {
                activities.push({
                  id: `active-inv-${inv.id}`,
                  type: "investment",
                  title: `Investimento ativo - ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(inv.amount)}`,
                  description: `${inv.profiles?.full_name || "Usuário"} - ${inv.quota_type || 'Tipo não especificado'} - Investimento ativo`,
                  timestamp: new Date(inv.updated_at || inv.created_at).toLocaleString("pt-BR"),
                  color: "bg-green-500",
                  relatedData: {
                    investmentId: inv.id,
                    amount: inv.amount,
                    quotaType: inv.quota_type,
                    commitmentPeriod: inv.commitment_period,
                    monthlyReturnRate: inv.monthly_return_rate,
                    approvedByAdmin: true
                  }
                })
              }
            }
          })
      }
    } catch (error) {
      console.error("Erro ao buscar investimentos ativos:", error)
    }

    return activities
  }

  const fetchTransactions = async (filters: ActivityFilters): Promise<RecentActivity[]> => {
    const activities: RecentActivity[] = []
    
    if (filters.type !== "all" && filters.type !== "withdrawal") {
      return activities
    }

    try {
      const supabase = createClient()
      
      const { data: pendingTransactions, error: pendingError } = await supabase
        .from("transactions")
        .select(`
          id,
          amount,
          transaction_type,
          status,
          created_at,
          user_id,
          profiles!inner(full_name)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false })

      if (!pendingError && pendingTransactions) {
        pendingTransactions
          .filter(tx => applyDateFilter(tx.created_at, filters))
          .forEach((tx) => {
            const transactionType = tx.transaction_type === 'withdrawal' ? 'Resgate' : 'Depósito'
            activities.push({
              id: `pending-tx-${tx.id}`,
              type: "withdrawal",
              title: `${transactionType} pendente - ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(tx.amount)}`,
              description: `${(tx.profiles as any)?.full_name || "Usuário"} - Aguardando aprovação`,
              timestamp: new Date(tx.created_at).toLocaleString("pt-BR"),
              color: "bg-yellow-500",
            })
          })
      }

      const { data: approvedTransactions, error: approvedError } = await supabase
        .from("transactions")
        .select(`
          id,
          amount,
          transaction_type,
          status,
          created_at,
          processed_at,
          user_id,
          profiles!inner(full_name)
        `)
        .eq("status", "completed")
        .order("processed_at", { ascending: false })

      if (!approvedError && approvedTransactions) {
        approvedTransactions
          .filter(tx => applyDateFilter(tx.processed_at || tx.created_at, filters))
          .forEach((tx) => {
            const transactionType = tx.transaction_type === 'withdrawal' ? 'Resgate' : 'Depósito'
            activities.push({
              id: `approved-tx-${tx.id}`,
              type: "withdrawal",
              title: `${transactionType} aprovado - ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(tx.amount)}`,
              description: `${(tx.profiles as any)?.full_name || "Usuário"} - Processado`,
              timestamp: new Date(tx.processed_at || tx.created_at).toLocaleString("pt-BR"),
              color: "bg-blue-500",
            })
          })
      }
    } catch (error) {
      console.error("Erro ao buscar transações:", error)
    }

    return activities
  }

  const fetchNewUsers = async (filters: ActivityFilters): Promise<RecentActivity[]> => {
    const activities: RecentActivity[] = []
    
    if (filters.type !== "all" && filters.type !== "user_created") {
      return activities
    }

    try {
      const supabase = createClient()
      const { data: newUsers, error: newUsersError } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          user_type,
          created_at,
          parent_id,
          parent:parent_id(full_name)
        `)
        .order("created_at", { ascending: false })

      if (!newUsersError && newUsers) {
        newUsers
          .filter(user => applyDateFilter(user.created_at, filters))
          .forEach((user) => {
            const userTypeLabel = user.user_type === "investor" ? "Investidor" : 
                                 user.user_type === "distributor" ? "Distribuidor" :
                                 user.user_type === "assessor" ? "Assessor" :
                                 user.user_type === "lider" ? "Líder" :
                                 user.user_type === "gestor" ? "Gestor" :
                                 user.user_type === "escritorio" ? "Escritório" : "Usuário"
            
            const createdBy = (user.parent as any)?.full_name || "Sistema"
            
            activities.push({
              id: `user-${user.id}`,
              type: "user_created",
              title: `${userTypeLabel} ${user.full_name} foi criado`,
              description: `Criado por ${createdBy}`,
              timestamp: new Date(user.created_at).toLocaleString("pt-BR"),
              color: "bg-indigo-500",
            })
          })
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error)
    }

    return activities
  }

  const fetchGoals = async (filters: ActivityFilters): Promise<RecentActivity[]> => {
    const activities: RecentActivity[] = []
    
    if (filters.type !== "all" && filters.type !== "goal_achieved") {
      return activities
    }

    try {
      const supabase = createClient()
      const { data: goals, error: goalsError } = await supabase
        .from("performance_goals")
        .select(`
          id,
          target_amount,
          achieved_at,
          profiles!inner(full_name)
        `)
        .not("achieved_at", "is", null)
        .order("achieved_at", { ascending: false })

      if (!goalsError && goals) {
        goals
          .filter(goal => applyDateFilter(goal.achieved_at, filters))
          .forEach((goal) => {
            activities.push({
              id: `goal-${goal.id}`,
              type: "goal_achieved",
              title: "Meta atingida por distribuidor",
              description: `${(goal.profiles as any)?.full_name || "Usuário"} - ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(goal.target_amount)} captados`,
              timestamp: new Date(goal.achieved_at).toLocaleString("pt-BR"),
              color: "bg-purple-500",
            })
          })
      }
    } catch (error) {
      console.error("Erro ao buscar metas:", error)
    }

    return activities
  }

  const fetchRecentActivities = async (page: number = 1, filters: ActivityFilters = activityFilters) => {
    try {
      const limit = ITEMS_PER_PAGE
      const offset = (page - 1) * limit

      const [
        pendingInvestments,
        activeInvestments,
        transactions,
        newUsers,
        goals
      ] = await Promise.all([
        fetchPendingInvestments(filters),
        fetchActiveInvestments(filters),
        fetchTransactions(filters),
        fetchNewUsers(filters),
        fetchGoals(filters)
      ])

      const activities: RecentActivity[] = [
        ...pendingInvestments,
        ...activeInvestments,
        ...transactions,
        ...newUsers,
        ...goals
      ]

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      const totalItems = activities.length
      const totalPagesCount = Math.ceil(totalItems / ITEMS_PER_PAGE)
      const paginatedActivities = activities.slice(offset, offset + limit)
      
      setTotalActivities(totalItems)
      setTotalPages(totalPagesCount)
      setRecentActivities(paginatedActivities)
    } catch (error) {
      console.error("Erro ao buscar atividades recentes:", error)
    }
  }

  const fetchPlatformStats = async () => {
    try {
      const supabase = createClient()

      const { data: profiles, error: profilesError } = await supabase.from("profiles").select("user_type")

      if (profilesError) {
        console.error("Erro ao buscar profiles:", profilesError)
        return
      }

      const totalUsers = profiles?.length || 0
      const totalInvestors = profiles?.filter((p) => p.user_type === "investor").length || 0
      const totalDistributors =
        profiles?.filter((p) => ["distributor", "assessor", "lider", "gestor", "escritorio"].includes(p.user_type))
          .length || 0

      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select("amount")
        .eq("status", "active")

      if (investmentsError) {
        console.error("Erro ao buscar investimentos:", investmentsError)
      }

      const totalInvested = investments?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
      const monthlyRevenue = totalInvested * 0.02

      const { data: campaigns, error: campaignsError } = await supabase
        .from("promotional_campaigns")
        .select("id")
        .eq("is_active", true)

      if (campaignsError) {
        console.error("Erro ao buscar campanhas:", campaignsError)
      }

      const activePromotions = campaigns?.length || 0

      const { data: approvals, error: approvalsError } = await supabase
        .from("transaction_approvals")
        .select("id")
        .eq("status", "pending")

      if (approvalsError) {
        console.error("Erro ao buscar aprovações:", approvalsError)
      }

      const pendingApprovals = approvals?.length || 0

      setStats({
        totalUsers,
        totalInvestors,
        totalDistributors,
        totalInvested,
        monthlyRevenue,
        activePromotions,
        pendingApprovals,
      })
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: Partial<ActivityFilters>) => {
    const updatedFilters = { ...activityFilters, ...newFilters }
    setActivityFilters(updatedFilters)
    setCurrentPage(1)
    fetchRecentActivities(1, updatedFilters)
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchRecentActivities(newPage, activityFilters)
  }

  const clearFilters = () => {
    const clearedFilters: ActivityFilters = { type: "all", dateFrom: "", dateTo: "" }
    setActivityFilters(clearedFilters)
    setCurrentPage(1)
    fetchRecentActivities(1, clearedFilters)
  }

  const processInvestmentAction = async (investmentId: string, action: 'approve' | 'reject') => {
    if (action === 'approve') {
      const activity = recentActivities.find(a => a.relatedData?.investmentId === investmentId)
      if (activity) {
        setSelectedInvestment({
          id: investmentId,
          amount: activity.relatedData?.amount || 0,
          investorName: activity.description.split(' - ')[0] || 'Investidor'
        })
        setApproveModalOpen(true)
      }
      return
    }

    try {
      const response = await fetch('/api/investments/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          investmentId,
          action: 'reject',
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar ação')
      }

      toast({
        title: "Investimento rejeitado!",
        description: "O investimento foi rejeitado e removido com sucesso.",
      })

      fetchRecentActivities(currentPage, activityFilters)
    } catch (error) {
      console.error('Error processing investment action:', error)
      toast({
        title: "Erro",
        description: "Erro ao processar a ação. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  const handleActivityAction = async (activityId: string, action: 'approve' | 'reject') => {
    let realId = activityId.replace(/^pending-inv-/, '')
    realId = realId.replace(/^active-pending-admin-/, '')
    await processInvestmentAction(realId, action)
  }

  const handleApprovalSuccess = () => {
    fetchRecentActivities(currentPage, activityFilters)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const closeApprovalModal = () => {
    setApproveModalOpen(false)
    setSelectedInvestment(null)
  }

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      setUser(JSON.parse(userStr))
    }

    fetchPlatformStats()
    fetchRecentActivities()
  }, [])

  return {
    user,
    stats,
    recentActivities,
    loading,
    activityFilters,
    currentPage,
    totalPages,
    totalActivities,
    approveModalOpen,
    selectedInvestment,
    handleFilterChange,
    handlePageChange,
    clearFilters,
    handleActivityAction,
    handleApprovalSuccess,
    closeApprovalModal,
    formatCurrency,
  }
}


