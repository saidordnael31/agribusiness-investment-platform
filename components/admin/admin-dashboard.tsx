"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, DollarSign, TrendingUp, Gift, Target, BarChart3, Shield, AlertCircle, Filter, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PromotionManager } from "./promotion-manager"
import { BonificationManager } from "./bonification-manager"
import { UserManager } from "./user-manager"
import { ReportsManager } from "./reports-manager"
import { AdminSettings } from "./admin-settings"
import { HierarchyManager } from "./hierarchy-manager"
import { RecurrenceCalculator } from "./recurrence-calculator"
import { NotificationSystem } from "./notification-system"
import AkintecManager from "./akintec-manager"
import { createClient } from "@/lib/supabase/client"

interface UserData {
  name: string
  email: string
  user_type: string
}

interface PlatformStats {
  totalUsers: number
  totalInvestors: number
  totalDistributors: number
  totalInvested: number
  monthlyRevenue: number
  activePromotions: number
  pendingApprovals: number
}

interface RecentActivity {
  id: string
  type: "investment" | "withdrawal" | "goal_achieved" | "pending_investment" | "user_created"
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
  }
}

export function AdminDashboard() {
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
  
  // Estados para filtros e paginação
  const [activityFilters, setActivityFilters] = useState({
    type: "all",
    dateFrom: "",
    dateTo: ""
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalActivities, setTotalActivities] = useState(0)
  const itemsPerPage = 10

  const fetchRecentActivities = async (page: number = 1, filters: typeof activityFilters = activityFilters) => {
    try {
      const activities: RecentActivity[] = []
      const limit = itemsPerPage
      const offset = (page - 1) * limit

      // Função para aplicar filtro de data
      const applyDateFilter = (dateStr: string) => {
        if (!filters.dateFrom && !filters.dateTo) return true
        const activityDate = new Date(dateStr)
        const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null
        const toDate = filters.dateTo ? new Date(filters.dateTo + "T23:59:59") : null
        
        if (fromDate && activityDate < fromDate) return false
        if (toDate && activityDate > toDate) return false
        return true
      }

      // Buscar investimentos pendentes usando a API (mesmo modelo das notificações)
      if (filters.type === "all" || filters.type === "pending_investment" || filters.type === "investment") {
        try {
          const investmentsResponse = await fetch('/api/investments?status=pending')
          const investmentsData = await investmentsResponse.json()

          if (investmentsData.success && investmentsData.data) {
            investmentsData.data
              .filter((inv: any) => applyDateFilter(inv.created_at))
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
      }


      // Buscar investimentos ativos (status active) usando a API
      if (filters.type === "all" || filters.type === "investment") {
        try {
          const activeResponse = await fetch('/api/investments?status=active')
          const activeData = await activeResponse.json()

          console.log("Investimentos ativos encontrados:", activeData)

          if (activeData.success && activeData.data) {
            activeData.data
              .filter((inv: any) => applyDateFilter(inv.updated_at || inv.created_at))
              .forEach((inv: any) => {
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
                    monthlyReturnRate: inv.monthly_return_rate
                  }
                })
              })
          }
        } catch (error) {
          console.error("Erro ao buscar investimentos ativos:", error)
        }
      }

      // Buscar transações pendentes e aprovadas
      if (filters.type === "all" || filters.type === "withdrawal") {
        try {
          const supabase = createClient()
          
          // Buscar transações pendentes
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
              .filter(tx => applyDateFilter(tx.created_at))
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

          // Buscar transações aprovadas recentes
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
              .filter(tx => applyDateFilter(tx.processed_at || tx.created_at))
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
      }

      // Buscar usuários criados recentemente
      if (filters.type === "all" || filters.type === "user_created") {
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
              .filter(user => applyDateFilter(user.created_at))
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
      }

      // Buscar metas atingidas recentes
      if (filters.type === "all" || filters.type === "goal_achieved") {
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
              .filter(goal => applyDateFilter(goal.achieved_at))
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
      }

      // Ordenar por timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      // Debug: log das atividades encontradas
      console.log("Atividades encontradas:", activities.length, activities)
      
      // Calcular paginação
      const totalItems = activities.length
      const totalPagesCount = Math.ceil(totalItems / itemsPerPage)
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

  // Funções para lidar com filtros e paginação
  const handleFilterChange = (newFilters: Partial<typeof activityFilters>) => {
    const updatedFilters = { ...activityFilters, ...newFilters }
    setActivityFilters(updatedFilters)
    setCurrentPage(1) // Reset para primeira página ao filtrar
    fetchRecentActivities(1, updatedFilters)
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchRecentActivities(newPage, activityFilters)
  }

  const clearFilters = () => {
    const clearedFilters = { type: "all", dateFrom: "", dateTo: "" }
    setActivityFilters(clearedFilters)
    setCurrentPage(1)
    fetchRecentActivities(1, clearedFilters)
  }

  // Função para processar ações de investimento (igual ao sistema de notificações)
  const processInvestmentAction = async (investmentId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/investments/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          investmentId,
          action,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar ação')
      }

      toast({
        title: "Ação realizada!",
        description: action === "approve" 
          ? "Investimento aprovado com sucesso." 
          : "Investimento rejeitado e removido com sucesso.",
      })

      // Recarregar as atividades
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
    // Extrair o ID real do investimento do ID da atividade
    const realId = activityId.replace(/^pending-inv-/, '')
    await processInvestmentAction(realId, action)
  }

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      setUser(JSON.parse(userStr))
    }

    fetchPlatformStats()
    fetchRecentActivities()
  }, [])

  if (!user || user.user_type !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Painel Administrativo</h1>
            <p className="text-muted-foreground">Bem-vindo, {user.name}</p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Administrador
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalInvestors} investidores, {stats.totalDistributors} distribuidores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalInvested)}</div>
            <p className="text-xs text-muted-foreground">Valor total em investimentos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">Taxa de administração</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendências</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Transações para aprovar</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 min-w-max">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Visão Geral</TabsTrigger>
            <TabsTrigger value="akintec" className="text-xs sm:text-sm">Akintec</TabsTrigger>
            <TabsTrigger value="hierarchy" className="text-xs sm:text-sm">Hierarquia</TabsTrigger>
            <TabsTrigger value="recurrence" className="text-xs sm:text-sm">Recorrência</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">Notificações</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">Configurações</TabsTrigger>
            <TabsTrigger value="promotions" className="text-xs sm:text-sm">Promoções</TabsTrigger>
            <TabsTrigger value="bonifications" className="text-xs sm:text-sm">Bonificações</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">Usuários</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">Relatórios</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Promoções Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">Promoção Ano Novo</p>
                      <p className="text-sm text-muted-foreground">+0.4% a.m. até 31/03</p>
                    </div>
                    <Badge variant="secondary">Ativa</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="font-medium">Indicação Premiada</p>
                      <p className="text-sm text-muted-foreground">+0.2% por indicação</p>
                    </div>
                    <Badge variant="secondary">Ativa</Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4 bg-transparent">
                  Gerenciar Promoções
                </Button>
              </CardContent>
            </Card>

          {user.email === "felipe@aethosconsultoria.com.br" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Metas de Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-medium">Meta R$ 500K</p>
                      <p className="text-sm text-muted-foreground">+1% adicional por 12 meses</p>
                    </div>
                    <Badge variant="secondary">23 atingiram</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Meta R$ 1M</p>
                      <p className="text-sm text-muted-foreground">+2% adicional por 12 meses</p>
                    </div>
                    <Badge variant="secondary">8 atingiram</Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4 bg-transparent">
                  Configurar Metas
                </Button>
              </CardContent>
            </Card>
          )}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Atividade Recente
                </CardTitle>
                <Badge variant="outline">
                  {totalActivities} atividades
                </Badge>
              </div>
              
              {/* Filtros */}
              <div className="flex flex-wrap gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <Label className="text-sm font-medium">Filtros:</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Tipo:</Label>
                  <Select 
                    value={activityFilters.type} 
                    onValueChange={(value) => handleFilterChange({ type: value })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="investment">Investimentos</SelectItem>
                      <SelectItem value="pending_investment">Investimentos Pendentes</SelectItem>
                      <SelectItem value="withdrawal">Transações</SelectItem>
                      <SelectItem value="user_created">Usuários</SelectItem>
                      <SelectItem value="goal_achieved">Metas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm">De:</Label>
                  <Input
                    type="date"
                    value={activityFilters.dateFrom}
                    onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
                    className="w-40"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm">Até:</Label>
                  <Input
                    type="date"
                    value={activityFilters.dateTo}
                    onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
                    className="w-40"
                  />
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearFilters}
                  className="ml-auto"
                >
                  Limpar Filtros
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 ${activity.color} rounded-full mt-2`}></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{activity.title}</p>
                              {activity.type === "investment" && activity.id.startsWith("active-inv-") && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                  ✓ Ativo
                                </Badge>
                              )}
                              {activity.type === "pending_investment" && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                                  ⏳ Pendente
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
                            
                            {/* Informações adicionais para investimentos pendentes */}
                            {activity.type === "pending_investment" && activity.relatedData && (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs bg-orange-50 p-3 rounded border border-orange-200">
                                <div>
                                  <span className="text-muted-foreground">Valor:</span>
                                  <span className="ml-1 font-medium">
                                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(activity.relatedData.amount || 0)}
                                  </span>
                                </div>
                                {activity.relatedData.quotaType && (
                                  <div>
                                    <span className="text-muted-foreground">Tipo:</span>
                                    <span className="ml-1 font-medium capitalize">{activity.relatedData.quotaType}</span>
                                  </div>
                                )}
                                {activity.relatedData.commitmentPeriod && (
                                  <div>
                                    <span className="text-muted-foreground">Período:</span>
                                    <span className="ml-1 font-medium">{activity.relatedData.commitmentPeriod} meses</span>
                                  </div>
                                )}
                                {activity.relatedData.monthlyReturnRate && (
                                  <div>
                                    <span className="text-muted-foreground">Taxa:</span>
                                    <span className="ml-1 font-medium text-emerald-600">
                                      {(activity.relatedData.monthlyReturnRate * 100).toFixed(2)}% a.m.
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Informações adicionais para investimentos ativos */}
                            {activity.type === "investment" && activity.id.startsWith("active-inv-") && (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs bg-green-50 p-3 rounded border border-green-200">
                                <div>
                                  <span className="text-muted-foreground">Status:</span>
                                  <span className="ml-1 font-medium text-green-700">✓ Ativo</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Valor:</span>
                                  <span className="ml-1 font-medium">
                                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(activity.relatedData?.amount || 0)}
                                  </span>
                                </div>
                                {activity.relatedData?.quotaType && (
                                  <div>
                                    <span className="text-muted-foreground">Tipo:</span>
                                    <span className="ml-1 font-medium capitalize">{activity.relatedData.quotaType}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-muted-foreground">Ação:</span>
                                  <span className="ml-1 font-medium text-green-600">Processado</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {activity.timestamp}
                          </span>
                          
                          {/* Botões de ação para investimentos pendentes */}
                          {activity.actions && activity.type === "pending_investment" && (
                            <div className="flex gap-1">
                              {activity.actions.approve && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-600 border-emerald-600 bg-transparent hover:bg-emerald-50"
                                  onClick={() => handleActivityAction(activity.id, "approve")}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Aprovar
                                </Button>
                              )}
                              {activity.actions.reject && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-600 bg-transparent hover:bg-red-50"
                                  onClick={() => handleActivityAction(activity.id, "reject")}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Rejeitar
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Controles de Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages} ({totalActivities} atividades)
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Anterior
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                            if (pageNum > totalPages) return null
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Próxima
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {activityFilters.type !== "all" || activityFilters.dateFrom || activityFilters.dateTo
                      ? "Nenhuma atividade encontrada com os filtros aplicados"
                      : "Nenhuma atividade recente encontrada"
                    }
                  </p>
                  {(activityFilters.type !== "all" || activityFilters.dateFrom || activityFilters.dateTo) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearFilters}
                      className="mt-2"
                    >
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="akintec">
          <AkintecManager />
        </TabsContent>

        <TabsContent value="hierarchy">
          <HierarchyManager />
        </TabsContent>

        <TabsContent value="recurrence">
          <RecurrenceCalculator />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSystem />
        </TabsContent>

        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>

        <TabsContent value="promotions">
          <PromotionManager />
        </TabsContent>

        <TabsContent value="bonifications">
          <BonificationManager />
        </TabsContent>

        <TabsContent value="users">
          <UserManager />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
