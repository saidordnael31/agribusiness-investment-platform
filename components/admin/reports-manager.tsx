"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart3,
  Download,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Calendar,
  FileText,
  PieChart,
  LineChart,
  Activity,
  AlertCircle,
  CheckCircle,
  Building2,
  Loader2,
  Clock,
  Building,
  User,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { COMMISSION_RATES } from "@/lib/commission-calculator"
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'

interface AnalyticsData {
  investments: {
    total: number
    growth: number
    seniorQuota: number
    subordinateQuota: number
    monthlyData: { month: string; value: number; growth: number }[]
    avgTicket: number
    retention: number
  }
  users: {
    total: number
    investors: number
    distributors: number
    offices: number
    advisors: number
    newThisMonth: number
    churnRate: number
    acquisitionCost: number
    monthlyGrowth: { month: string; investors: number; distributors: number }[]
  }
  commissions: {
    total: number
    advisors: number
    offices: number
    recurrent: number
    monthlyData: { month: string; total: number; recurrent: number }[]
    avgCommissionRate: number
  }
  campaigns: {
    active: number
    totalParticipants: number
    conversionRate: number
    totalImpact: number
    topCampaigns: { name: string; participants: number; impact: number; roi: number }[]
  }
  recurrence: {
    activeFlows: number
    monthlyRevenue: number
    projectedAnnual: number
    atRisk: number
    avgDuration: number
    churnImpact: number
  }
}

interface CustomReport {
  id: string
  name: string
  description: string
  type: "financial" | "operational" | "compliance" | "performance"
  frequency: "daily" | "weekly" | "monthly" | "quarterly"
  recipients: string[]
  lastGenerated: string
  isActive: boolean
}

interface CommissionData {
  id: string
  userId: string
  userName: string
  userEmail: string
  userType: 'investor' | 'distributor' | 'admin'
  investmentId: string
  investmentAmount: number
  commissionRate: number
  monthlyCommission: number
  totalCommission: number
  paymentDate: string
  nextPaymentDate: string
  status: 'pending' | 'paid' | 'overdue'
  monthsPassed: number
  remainingMonths: number
  profitability: string
  commitmentPeriod: number
  rentabilityType: 'monthly' | 'annual'
  resgateDays: number
  resgateMonths: number
  liquidityType: string
  investorRate: number
  officeRate: number
  advisorRate: number
  officeCommission: number
  advisorCommission: number
  advisorName?: string
  advisorEmail?: string
  officeName?: string
  officeEmail?: string
  investmentStartDate?: string
}

interface PeriodFilter {
  type: 'this_month' | 'next_month' | 'next_6_months' | 'custom'
  startDate: string
  endDate: string
}

export function ReportsManager() {
  const { toast } = useToast()
  const [selectedPeriod, setSelectedPeriod] = useState("all")
  const [isCustomReportOpen, setIsCustomReportOpen] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [detailedInvestments, setDetailedInvestments] = useState<any[]>([])
  
  // Estados para comissões
  const [commissions, setCommissions] = useState<CommissionData[]>([])
  const [filteredCommissions, setFilteredCommissions] = useState<CommissionData[]>([])
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>({
    type: 'this_month',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    fetchAnalyticsData()
  }, [selectedPeriod])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Calcular período baseado na seleção
      const now = new Date()
      let dateFrom: Date
      
      switch (selectedPeriod) {
        case "7d":
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case "30d":
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case "90d":
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case "6m":
          dateFrom = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
          break
        case "1y":
          dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
        default:
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }

      // Buscar dados de investimentos usando a API
      let investmentsResponse
      if (selectedPeriod === "all") {
        // Buscar TODOS os investimentos (ativos, pendentes e resgatados) - sem filtro de data
        investmentsResponse = await fetch(
          `/api/investments?limit=999999`
        )
      } else {
        // Buscar investimentos do período selecionado (apenas ativos)
        const dateFromStr = dateFrom.toISOString().split('T')[0]
        const dateToStr = new Date().toISOString().split('T')[0]
        
        investmentsResponse = await fetch(
          `/api/investments?date_from=${dateFromStr}&date_to=${dateToStr}&status=active&limit=999999`
        )
      }
      
      const investmentsData = await investmentsResponse.json()
      const investmentsWithProfiles = investmentsData.success ? investmentsData.data || [] : []

      // Validar se o usuário é admin antes de buscar dados
      const userStr = localStorage.getItem("user")
      if (!userStr) {
        console.error("[ReportsManager] Usuário não autenticado")
        return
      }

      const loggedUser = JSON.parse(userStr)
      if (!loggedUser.id) {
        console.error("[ReportsManager] ID do usuário não encontrado")
        return
      }

      const { validateAdminAccess } = await import("@/lib/client-permission-utils")
      const isAdmin = await validateAdminAccess(loggedUser.id)
      
      if (!isAdmin) {
        console.error("[ReportsManager] Acesso negado: apenas administradores podem acessar relatórios")
        toast({
          title: "Acesso negado",
          description: "Apenas administradores podem acessar esta funcionalidade",
          variant: "destructive",
        })
        return
      }

      // Buscar dados de usuários
      const { data: profiles } = await supabase.from("profiles").select("*")

      // Buscar dados de transações
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .gte("created_at", dateFrom.toISOString())

      // Buscar dados de campanhas (se a tabela existir)
      let campaigns: any[] = []
      try {
        const { data: campaignsData } = await supabase.from("promotional_campaigns").select("*")
        campaigns = campaignsData || []
      } catch (error) {
        console.log("Tabela promotional_campaigns não encontrada, usando dados simulados")
      }

      // Buscar dados de aprovações (se a tabela existir)
      let approvals: any[] = []
      try {
        const { data: approvalsData } = await supabase.from("transaction_approvals").select("*")
        approvals = approvalsData || []
      } catch (error) {
        console.log("Tabela transaction_approvals não encontrada, usando dados simulados")
      }

      // Buscar dados de contratos (se a tabela existir)
      let contracts: any[] = []
      try {
        const { data: contractsData } = await supabase.from("investor_contracts").select("*")
        contracts = contractsData || []
      } catch (error) {
        console.log("Tabela investor_contracts não encontrada")
      }

      // Buscar dados de comprovantes PIX (se a tabela existir)
      let pixReceipts: any[] = []
      try {
        const { data: receiptsData } = await supabase.from("pix_receipts").select("*")
        pixReceipts = receiptsData || []
      } catch (error) {
        console.log("Tabela pix_receipts não encontrada")
      }

      // Calcular métricas reais de investimentos
      const allInvestments = investmentsWithProfiles || []
      const activeInvestments = allInvestments.filter((inv: any) => inv.status === "active")
      const totalInvestments = activeInvestments.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)

      // Calcular métricas reais de usuários
      const totalUsers = profiles?.length || 0
      const investors = profiles?.filter(p => p.user_type === "investor").length || 0
      const distributors = profiles?.filter(p => p.user_type === "distributor").length || 0
      const offices = profiles?.filter(p => p.user_type === "escritorio").length || 0
      const advisors = profiles?.filter(p => p.user_type === "assessor").length || 0

      // Calcular usuários novos no período
      const newUsersThisPeriod = profiles?.filter(p => 
        new Date(p.created_at) >= dateFrom
      ).length || 0

      // Calcular métricas de transações
      const completedTransactions = transactions?.filter(tx => tx.status === "completed") || []
      const pendingTransactions: any[] = transactions?.filter(tx => tx.status === "pending") || []
      
      const totalTransactionVolume = completedTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0)
      const pendingTransactionVolume = pendingTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0)

      // Calcular comissões baseadas nos investimentos ativos
      const totalCommissions = totalInvestments * (COMMISSION_RATES.assessor + COMMISSION_RATES.escritorio) // Total (3% assessor + 1% escritório)
      const advisorCommissions = totalInvestments * COMMISSION_RATES.assessor // 3% para assessores
      const officeCommissions = totalInvestments * COMMISSION_RATES.escritorio // 1% para escritórios

      // Calcular métricas de campanhas
      const activeCampaigns = campaigns.filter(c => c.is_active).length
      const pendingApprovals = approvals.filter(a => a.status === "pending").length

      // Calcular métricas adicionais
      const totalContracts = contracts.length
      const activeContracts = contracts.filter(c => c.status === "active").length
      const totalPixReceipts = pixReceipts.length
      const pendingPixReceipts = pixReceipts.filter(r => r.status === "pending")

      // Gerar dados mensais baseados nos dados reais
      const monthlyData = generateRealMonthlyData(investmentsWithProfiles || [], dateFrom)
      const userGrowthData = generateRealUserGrowthData(profiles || [], dateFrom)
      const commissionData = generateRealCommissionData(transactions || [], dateFrom)

      // Calcular crescimento comparado ao período anterior
      const previousPeriodStart = new Date(dateFrom.getTime() - (now.getTime() - dateFrom.getTime()))
      const { data: previousInvestments } = await supabase
        .from("investments")
        .select("amount, status")
        .gte("created_at", previousPeriodStart.toISOString())
        .lt("created_at", dateFrom.toISOString())

      const previousTotal = previousInvestments?.filter(inv => inv.status === "active")
        .reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
      
      const growth = previousTotal > 0 ? ((totalInvestments - previousTotal) / previousTotal) * 100 : 0

      const calculatedData: AnalyticsData = {
        investments: {
          total: totalInvestments,
          growth: Math.round(growth * 10) / 10,
          seniorQuota: 0,
          subordinateQuota: 0,
          monthlyData,
          avgTicket: investors > 0 ? totalInvestments / investors : 0,
          retention: calculateRetentionRate(transactions || []),
        },
        users: {
          total: totalUsers,
          investors,
          distributors,
          offices,
          advisors,
          newThisMonth: newUsersThisPeriod,
          churnRate: calculateChurnRate(profiles || [], transactions || []),
          acquisitionCost: 125, // Valor fixo por enquanto
          monthlyGrowth: userGrowthData,
        },
        commissions: {
          total: totalCommissions,
          advisors: advisorCommissions,
          offices: officeCommissions,
          recurrent: totalCommissions,
          monthlyData: commissionData,
          avgCommissionRate: 4.0, // Taxa real de administração (3% + 1%)
        },
        campaigns: {
          active: activeCampaigns,
          totalParticipants: Math.floor(distributors * 0.6), // Estimativa baseada em distribuidores
          conversionRate: calculateConversionRate(investmentsWithProfiles || [], profiles || []),
          totalImpact: totalInvestments * 0.08, // 8% impacto estimado das campanhas
          topCampaigns: generateRealTopCampaigns(campaigns),
        },
        recurrence: {
          activeFlows: activeInvestments.length,
          monthlyRevenue: totalCommissions,
          projectedAnnual: totalCommissions * 12,
          atRisk: pendingTransactions.length + pendingPixReceipts.length,
          avgDuration: calculateAvgDuration(activeInvestments),
          churnImpact: -pendingTransactionVolume * 0.1, // 10% do volume pendente em risco
        },
      }

      setAnalyticsData(calculatedData)
      setDetailedInvestments(allInvestments)
      
      // Debug: verificar se os dados estão sendo carregados
      console.log("Investimentos carregados via API:", investmentsWithProfiles.length)
      console.log("Primeiro investimento:", investmentsWithProfiles[0])
      console.log("Resposta da API:", investmentsData)
    } catch (error) {
      console.error("Erro ao buscar dados de analytics:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de analytics. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Calcular datas baseadas no período selecionado para comissões
  const calculatePeriodDates = (type: string) => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0)
    const sixMonthsEnd = new Date(now.getFullYear(), now.getMonth() + 6, 0)

    switch (type) {
      case 'this_month':
        return {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: endOfMonth.toISOString().split('T')[0]
        }
      case 'next_month':
        return {
          startDate: nextMonthStart.toISOString().split('T')[0],
          endDate: nextMonthEnd.toISOString().split('T')[0]
        }
      case 'next_6_months':
        return {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: sixMonthsEnd.toISOString().split('T')[0]
        }
      default:
        return {
          startDate: '',
          endDate: ''
        }
    }
  }

  // Atualizar datas quando o período muda
  useEffect(() => {
    if (periodFilter.type !== 'custom') {
      const dates = calculatePeriodDates(periodFilter.type)
      setPeriodFilter(prev => ({
        ...prev,
        startDate: dates.startDate,
        endDate: dates.endDate
      }))
    }
  }, [periodFilter.type])

  // Buscar dados de comissões
  const fetchCommissionsData = async () => {
    try {
      const supabase = createClient()

      // Buscar investimentos ativos com dados de usuários usando a view
      const { data: investments, error: investmentsError } = await supabase
        .from("investments_with_profiles")
        .select(`
          id,
          user_id,
          amount,
          monthly_return_rate,
          payment_date,
          created_at,
          status,
          commitment_period,
          profitability_liquidity,
          full_name,
          email,
          user_type
        `)
        .eq("status", "active")

      if (investmentsError) throw investmentsError

      // Buscar informações de hierarquia (assessor e escritório) para cada investidor
      // Estrutura: Investidor (user_id) -> parent_id (assessor) -> office_id (escritório)
      const userIds = investments?.map((inv: any) => inv.user_id) || []
      let advisorMap = new Map<string, any>() // Mapa: investidor_user_id -> dados do assessor
      let officeMap = new Map<string, any>()  // Mapa: office_id -> dados do escritório

      if (userIds.length > 0) {
        // 1. Buscar perfis dos investidores para obter seus parent_id (que são os IDs dos assessores)
        const { data: investorProfiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, parent_id")
          .in("id", userIds)

        if (!profilesError && investorProfiles) {
          // Criar um mapa de user_id -> parent_id para acesso rápido
          const investorToParentMap = new Map()
          investorProfiles.forEach((profile: any) => {
            investorToParentMap.set(profile.id, profile.parent_id)
          })

          // 2. Extrair IDs únicos dos assessores (parent_id dos investidores)
          const advisorIds = investorProfiles
            .filter((p: any) => p.parent_id)
            .map((p: any) => p.parent_id)
            .filter((id: any, index: number, self: any[]) => self.indexOf(id) === index)

          if (advisorIds.length > 0) {
            // 3. Buscar dados completos dos assessores (incluindo office_id)
            const { data: advisors, error: advisorsError } = await supabase
              .from("profiles")
              .select("id, full_name, email, office_id")
              .in("id", advisorIds)

            if (!advisorsError && advisors) {
              // Mapear assessores por ID para acesso rápido
              const advisorByIdMap = new Map()
              advisors.forEach((advisor: any) => {
                advisorByIdMap.set(advisor.id, advisor)
              })

              // 4. Extrair IDs únicos dos escritórios (office_id dos assessores)
              const officeIds = advisors
                .filter((a: any) => a.office_id)
                .map((a: any) => a.office_id)
                .filter((id: any, index: number, self: any[]) => self.indexOf(id) === index)

              if (officeIds.length > 0) {
                // 5. Buscar dados dos escritórios pelo office_id
                const { data: offices, error: officesError } = await supabase
                  .from("profiles")
                  .select("id, full_name, email")
                  .in("id", officeIds)

                if (!officesError && offices) {
                  // Mapear escritórios por ID para acesso rápido
                  offices.forEach((office: any) => {
                    officeMap.set(office.id, office)
                  })
                }
              }

              // 6. Criar mapa final: investidor_user_id -> dados do assessor
              // Para cada user_id de investidor, buscar seu parent_id e depois o assessor
              investorProfiles.forEach((profile: any) => {
                const parentId = investorToParentMap.get(profile.id)
                if (parentId && advisorByIdMap.has(parentId)) {
                  // Mapear usando o user_id (id do perfil) como chave
                  advisorMap.set(profile.id, advisorByIdMap.get(parentId))
                }
              })
            }
          }
        }
      }

      // Processar dados de comissões - gerar uma entrada para cada mês de pagamento
      const processedCommissions: CommissionData[] = []
      
      investments.forEach((investment: any) => {
        const paymentDate = investment.payment_date ? new Date(investment.payment_date) : new Date(investment.created_at)
        const now = new Date()
        
        // Calcular taxas baseadas no prazo e liquidez
        const investmentCommitmentPeriod = investment.commitment_period || 12
        const investmentProfitabilityLiquidity = investment.profitability_liquidity || 'mensal'
        
        const rates = calculateCommissionRates(investmentCommitmentPeriod, investmentProfitabilityLiquidity)

        // Determinar taxa de comissão baseada no tipo de usuário
        let commissionRate = 0
        if (investment.user_type) {
          switch (investment.user_type) {
            case 'investor':
              commissionRate = rates.investor
              break
            case 'distributor':
              commissionRate = COMMISSION_RATES.assessor // Assessor sempre ganha 3%
              break
            case 'admin':
              commissionRate = COMMISSION_RATES.escritorio // Escritório sempre ganha 1%
              break
            default:
              commissionRate = rates.investor
          }
        } else {
          commissionRate = rates.investor // Default para investidor se perfil não encontrado
        }

        // Determinar tipo de liquidez usando função unificada
        const liquidityType = determineLiquidityType(investment.profitability_liquidity)
        const rentabilityType = liquidityType === 'mensal' ? 'monthly' : 'annual'
        
        // Calcular comissão baseada no tipo de usuário
        let monthlyCommission = 0
        let officeCommission = 0
        let advisorCommission = 0
        
        if (investment.user_type === 'investor') {
          // Para investidores, calcular comissão baseada na liquidez
          if (liquidityType === 'mensal') {
            // Para liquidez mensal, usar taxa da tabela
            const taxa = obterTaxa(investmentCommitmentPeriod, 'mensal')
            monthlyCommission = investment.amount * (taxa / 100)
          } else {
            // Para liquidez não-mensal, simular pelo período correto
            const periodMonths = getPeriodMonths(liquidityType)
            monthlyCommission = simularInvestimento(investment.amount, periodMonths, liquidityType, investmentCommitmentPeriod)
          }
        } else {
          // Para escritório e assessor, sempre mensal
          monthlyCommission = investment.amount * commissionRate
        }
        
        // Calcular comissões do escritório e assessor (sempre mensais)
        officeCommission = investment.amount * COMMISSION_RATES.escritorio // Escritório sempre 1%
        advisorCommission = investment.amount * COMMISSION_RATES.assessor // Assessor sempre 3%

        // Gerar uma entrada para cada mês do período de compromisso
        for (let month = 1; month <= investmentCommitmentPeriod; month++) {
          // Calcular data de vencimento para este mês baseada na data do investimento
          let dueDateForMonth: Date
          
          // Calcular data de vencimento usando uma abordagem mais segura
          dueDateForMonth = new Date(paymentDate)
          
          if (liquidityType === 'mensal') {
            // Para liquidez mensal, adicionar meses sequencialmente
            dueDateForMonth.setMonth(dueDateForMonth.getMonth() + month)
          } else if (liquidityType === 'semestral') {
            // Para liquidez semestral, adicionar 6 meses por vez
            dueDateForMonth.setMonth(dueDateForMonth.getMonth() + (month * 6))
          } else if (liquidityType === 'anual') {
            // Para liquidez anual, adicionar 12 meses por vez
            dueDateForMonth.setMonth(dueDateForMonth.getMonth() + (month * 12))
          } else if (liquidityType === 'bienal') {
            // Para liquidez bienal, adicionar 24 meses por vez
            dueDateForMonth.setMonth(dueDateForMonth.getMonth() + (month * 24))
          } else if (liquidityType === 'trienal') {
            // Para liquidez trienal, adicionar 36 meses por vez
            dueDateForMonth.setMonth(dueDateForMonth.getMonth() + (month * 36))
          } else {
            // Default para mensal
            dueDateForMonth.setMonth(dueDateForMonth.getMonth() + month)
          }

          // Determinar status da comissão baseado na data de vencimento
          let status: 'pending' | 'paid' | 'overdue' = 'pending'
          
          // Verificar se o pagamento já venceu baseado na data atual
          const today = new Date()
          today.setHours(0, 0, 0, 0) // Zerar horas para comparação apenas de data
          const dueDateOnly = new Date(dueDateForMonth)
          dueDateOnly.setHours(0, 0, 0, 0) // Zerar horas para comparação apenas de data
          
          
          // Verificar se o pagamento já venceu
          if (dueDateOnly < today) {
            // Se já venceu, considerar atrasado
            status = 'overdue'
          } else {
            // Se ainda não venceu (incluindo hoje), considerar pendente
            status = 'pending'
          }

          // Calcular próxima data de pagamento (próximo mês)
          let nextPaymentDate: Date
          if (liquidityType === 'mensal') {
            nextPaymentDate = new Date(dueDateForMonth.getFullYear(), dueDateForMonth.getMonth() + 1, dueDateForMonth.getDate())
          } else if (liquidityType === 'semestral') {
            nextPaymentDate = new Date(dueDateForMonth.getFullYear(), dueDateForMonth.getMonth() + 6, dueDateForMonth.getDate())
          } else if (liquidityType === 'anual') {
            nextPaymentDate = new Date(dueDateForMonth.getFullYear(), dueDateForMonth.getMonth() + 12, dueDateForMonth.getDate())
          } else if (liquidityType === 'bienal') {
            nextPaymentDate = new Date(dueDateForMonth.getFullYear(), dueDateForMonth.getMonth() + 24, dueDateForMonth.getDate())
          } else if (liquidityType === 'trienal') {
            nextPaymentDate = new Date(dueDateForMonth.getFullYear(), dueDateForMonth.getMonth() + 36, dueDateForMonth.getDate())
          } else {
            nextPaymentDate = new Date(dueDateForMonth.getFullYear(), dueDateForMonth.getMonth() + 1, dueDateForMonth.getDate())
          }

          // Buscar informações de assessor e escritório
          // 1. Pegar o user_id do investimento (investidor)
          // 2. Buscar o parent_id desse investidor no mapa advisorMap
          // 3. O parent_id é o ID do assessor
          // 4. Usar o office_id do assessor para buscar o escritório
          const advisorInfo = advisorMap.get(investment.user_id)
          const officeInfo = advisorInfo?.office_id ? officeMap.get(advisorInfo.office_id) : null
          
          // Debug: verificar se encontrou o assessor
          if (!advisorInfo && investment.user_type === 'investor') {
            console.log(`Assessor não encontrado para investidor ${investment.user_id} (${investment.full_name})`)
          }
          
          // Calcular tempo de investimento (em meses desde o início)
          const investmentStartDate = investment.payment_date ? new Date(investment.payment_date) : new Date(investment.created_at)
          const investmentTimeMonths = Math.max(1, month) // Meses desde o início do investimento

          // Calcular total pago: soma de todas as comissões (investidor + escritório + assessor)
          const totalCommissionPaid = monthlyCommission + officeCommission + advisorCommission

          processedCommissions.push({
            id: `${investment.id}-${month}`, // ID único para cada mês
            userId: investment.user_id,
            userName: investment.full_name || 'Usuário sem nome',
            userEmail: investment.email || '',
            userType: investment.user_type || 'investor',
            investmentId: investment.id,
            investmentAmount: investment.amount,
            commissionRate,
            monthlyCommission,
            totalCommission: totalCommissionPaid, // Total pago: investidor + escritório + assessor
            paymentDate: dueDateForMonth.toISOString(),
            nextPaymentDate: nextPaymentDate.toISOString(),
            status,
            monthsPassed: month,
            remainingMonths: Math.max(0, investmentCommitmentPeriod - month),
            profitability: investment.profitability_liquidity || 'N/A',
            commitmentPeriod: investmentCommitmentPeriod,
            rentabilityType,
            resgateDays: rates.resgateDays,
            resgateMonths: rates.resgateMonths,
            liquidityType: rates.liquidityType,
            investorRate: rates.investor,
            officeRate: COMMISSION_RATES.escritorio, // Escritório sempre ganha 1%
            advisorRate: COMMISSION_RATES.assessor, // Assessor sempre ganha 3%
            officeCommission, // Comissão mensal do escritório
            advisorCommission, // Comissão mensal do assessor
            advisorName: advisorInfo?.full_name || 'N/A',
            advisorEmail: advisorInfo?.email || 'N/A',
            officeName: officeInfo?.full_name || 'N/A',
            officeEmail: officeInfo?.email || 'N/A',
            investmentStartDate: investmentStartDate.toISOString()
          })
        }
      })

      setCommissions(processedCommissions)
    } catch (error) {
      console.error("Erro ao buscar dados de comissões:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar dados de comissões",
        variant: "destructive"
      })
    }
  }

  // Filtrar comissões baseado no período
  const filterCommissionsByPeriod = () => {
    let startDate: Date
    let endDate: Date

    if (periodFilter.type === 'custom' && periodFilter.startDate && periodFilter.endDate) {
      // Filtro customizado
      startDate = new Date(periodFilter.startDate)
      endDate = new Date(periodFilter.endDate)
    } else if (periodFilter.type === 'this_month') {
      // Este mês
      const now = new Date()
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    } else if (periodFilter.type === 'next_month') {
      // Próximo mês
      const now = new Date()
      startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0)
    } else if (periodFilter.type === 'next_6_months') {
      // Próximos 6 meses
      const now = new Date()
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 6, 0)
    } else {
      // Mostrar todas se não há filtro específico
      setFilteredCommissions(commissions)
      return
    }

    const filtered = commissions.filter(commission => {
      const paymentDate = new Date(commission.paymentDate)
      return paymentDate >= startDate && paymentDate <= endDate
    })

    setFilteredCommissions(filtered)
  }

  useEffect(() => {
    fetchCommissionsData()
  }, [])

  useEffect(() => {
    filterCommissionsByPeriod()
  }, [commissions, periodFilter])

  // Calcular totais das comissões
  const totalCommissions = filteredCommissions.reduce((sum, c) => sum + c.monthlyCommission, 0)
  const totalOfficeCommissions = filteredCommissions.reduce((sum, c) => sum + c.officeCommission, 0)
  const totalAdvisorCommissions = filteredCommissions.reduce((sum, c) => sum + c.advisorCommission, 0)
  const totalPaid = filteredCommissions.reduce((sum, c) => sum + c.totalCommission, 0)
  const pendingCommissions = filteredCommissions.filter(c => c.status === 'pending').length
  const overdueCommissions = filteredCommissions.filter(c => c.status === 'overdue').length

  // Agrupar por tipo de usuário
  const commissionsByType = filteredCommissions.reduce((acc, commission) => {
    if (!acc[commission.userType]) {
      acc[commission.userType] = []
    }
    acc[commission.userType].push(commission)
    return acc
  }, {} as Record<string, CommissionData[]>)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago'
      case 'overdue':
        return 'Atrasado'
      default:
        return 'Pendente'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default'
      case 'overdue':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  // Função unificada para determinar tipo de liquidez
  const determineLiquidityType = (profitabilityLiquidity: string) => {
    const liquidity = profitabilityLiquidity?.toLowerCase() || 'mensal'
    
    // Verificar se contém palavras-chave específicas
    if (liquidity.includes('semestral')) return 'semestral'
    if (liquidity.includes('anual') || liquidity.includes('yearly') || liquidity.includes('12')) return 'anual'
    if (liquidity.includes('bienal') || liquidity.includes('24')) return 'bienal'
    if (liquidity.includes('trienal') || liquidity.includes('36')) return 'trienal'
    return 'mensal'
  }

  // Função para obter período em meses baseado na liquidez
  const getPeriodMonths = (liquidityType: string) => {
    switch (liquidityType) {
      case 'semestral': return 6
      case 'anual': return 12
      case 'bienal': return 24
      case 'trienal': return 36
      default: return 12
    }
  }

  // Função para obter taxa baseada no prazo e liquidez
  const obterTaxa = (prazoMeses: number, liquidez: string) => {
    const taxas: { [key: number]: { [key: string]: number } } = {
      3: { mensal: 1.8 },
      6: { mensal: 1.9, semestral: 2.0 },
      12: { mensal: 2.1, semestral: 2.2, anual: 2.5 },
      24: { mensal: 2.3, semestral: 2.5, anual: 2.7, bienal: 3.0 },
      36: { mensal: 2.4, semestral: 2.6, anual: 3.0, bienal: 3.2, trienal: 3.5 },
    }

    const plano = taxas[prazoMeses]
    if (!plano) throw new Error("Prazo inválido.")
    
    const taxa = plano[liquidez]
    if (!taxa) throw new Error("Liquidez inválida para este prazo.")
    
    return taxa
  }

  // Função para simular investimento e calcular lucro total
  const simularInvestimento = (valorInicial: number, prazoMeses: number, liquidez: string, commitmentPeriod: number) => {
    const taxa = obterTaxa(commitmentPeriod, liquidez)
    let saldo = valorInicial
    
    for (let mes = 1; mes <= prazoMeses; mes++) {
      const rendimento = saldo * (taxa / 100)
      saldo += rendimento
    }

    const lucroTotal = saldo - valorInicial
    return lucroTotal
  }

  // Função para calcular taxas de comissão baseadas no prazo e liquidez
  const calculateCommissionRates = (commitmentPeriod: number, profitabilityLiquidity: string) => {
    // Determinar o prazo de resgate baseado no período de compromisso
    let resgateDays = 0
    let resgateMonths = 0
    if (commitmentPeriod <= 3) {
      resgateDays = 90
      resgateMonths = 3
    } else if (commitmentPeriod <= 6) {
      resgateDays = 180
      resgateMonths = 6
    } else if (commitmentPeriod <= 12) {
      resgateDays = 360
      resgateMonths = 12
    } else if (commitmentPeriod <= 24) {
      resgateDays = 720
      resgateMonths = 24
    } else {
      resgateDays = 1080
      resgateMonths = 36
    }

    // Determinar tipo de liquidez
    const liquidity = profitabilityLiquidity?.toLowerCase() || 'mensal'
    let liquidityType = 'mensal'
    if (liquidity.includes('semestral')) liquidityType = 'semestral'
    else if (liquidity.includes('anual') || liquidity.includes('yearly')) liquidityType = 'anual'
    else if (liquidity.includes('bienal')) liquidityType = 'bienal'
    else if (liquidity.includes('trienal')) liquidityType = 'trienal'

    // Taxas fixas para escritório e assessor (sempre 1% e 3%)
    const officeRate = COMMISSION_RATES.escritorio // 1%
    const advisorRate = COMMISSION_RATES.assessor // 3%
    
    // Calcular taxa do investidor baseada na liquidez
    let investorRate = 0
    if (liquidityType === 'mensal') {
      investorRate = obterTaxa(resgateMonths, 'mensal') / 100
    } else {
      // Para não-mensal, usar a taxa base do período
      investorRate = obterTaxa(resgateMonths, liquidityType) / 100
    }

    return {
      investor: investorRate,
      office: officeRate,
      advisor: advisorRate,
      resgateDays,
      resgateMonths,
      liquidityType
    }
  }

  // Função para exportar relatório de comissões em PDF
  const exportCommissionsPDF = () => {
    try {
      const doc = new jsPDF('landscape') // Usar orientação paisagem para melhor aproveitamento
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let yPosition = 15

      // Margens otimizadas para máximo aproveitamento
      const leftMargin = 10
      const rightMargin = 10
      const topMargin = 15
      const bottomMargin = 20
      const usableWidth = pageWidth - leftMargin - rightMargin
      const usableHeight = pageHeight - topMargin - bottomMargin

      // Cabeçalho compacto
      doc.setFillColor(248, 250, 252)
      doc.rect(0, 0, pageWidth, 45, 'F')
      
      // Título principal
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.text("Relatório de Comissões", pageWidth / 2, 20, { align: "center" })
      
      // Período e data em linha única
      doc.setFontSize(11)
      doc.setFont("helvetica", "normal")
      const periodText = periodFilter.type === 'custom' 
        ? `Período: ${formatDate(periodFilter.startDate)} - ${formatDate(periodFilter.endDate)}`
        : `Período: ${periodFilter.type === 'this_month' ? 'Deste mês' : 
                     periodFilter.type === 'next_month' ? 'Próximo mês' : 
                     'Próximos 6 meses'}`
      doc.text(periodText, leftMargin, 32)
      doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, pageWidth - rightMargin, 32, { align: "right" })
      
      yPosition = 55

      // Resumo geral compacto em linha horizontal
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Resumo Geral", leftMargin, yPosition)
      yPosition += 15

      // Cards do resumo otimizados para paisagem
      const cardWidth = (usableWidth - 20) / 3 // 3 cards com espaçamento
      const cardHeight = 30
      const cardSpacing = 10
      let cardX = leftMargin

      // Card Total Mensal
      doc.setFillColor(248, 250, 252)
      doc.rect(cardX, yPosition, cardWidth, cardHeight, 'F')
      doc.setDrawColor(200, 200, 200)
      doc.rect(cardX, yPosition, cardWidth, cardHeight, 'S')
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text("Total Mensal", cardX + 5, yPosition + 8)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(formatCurrency(totalCommissions), cardX + 5, yPosition + 20)
      cardX += cardWidth + cardSpacing


      // Card Pendentes
      doc.setFillColor(248, 250, 252)
      doc.rect(cardX, yPosition, cardWidth, cardHeight, 'F')
      doc.setDrawColor(200, 200, 200)
      doc.rect(cardX, yPosition, cardWidth, cardHeight, 'S')
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text("Pendentes", cardX + 5, yPosition + 8)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(pendingCommissions.toString(), cardX + 5, yPosition + 20)
      cardX += cardWidth + cardSpacing

      // Card Atrasadas
      doc.setFillColor(248, 250, 252)
      doc.rect(cardX, yPosition, cardWidth, cardHeight, 'F')
      doc.setDrawColor(200, 200, 200)
      doc.rect(cardX, yPosition, cardWidth, cardHeight, 'S')
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text("Atrasadas", cardX + 5, yPosition + 8)
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(overdueCommissions.toString(), cardX + 5, yPosition + 20)

      yPosition += cardHeight + 20

      // Tabela otimizada para paisagem
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Detalhamento das Comissões", leftMargin, yPosition)
      yPosition += 15

      // Cabeçalho da tabela
      doc.setFillColor(248, 250, 252)
      doc.rect(leftMargin, yPosition - 5, usableWidth, 12, 'F')
      doc.setDrawColor(200, 200, 200)
      doc.rect(leftMargin, yPosition - 5, usableWidth, 12, 'S')
      
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0, 0, 0)
      
      // Larguras otimizadas para orientação paisagem
      const tableHeaders = ["Usuário", "Investimento", "Taxa", "Prazo", "Liquidez", "Investidor", "Escritório", "Assessor", "Próximo Pag.", "Status"]
      const colWidths = [60, 30, 15, 15, 20, 25, 25, 25, 25, 20] // Ajustadas para paisagem
      let xPosition = leftMargin + 5

      tableHeaders.forEach((header, index) => {
        doc.text(header, xPosition, yPosition + 2)
        xPosition += colWidths[index]
      })
      yPosition += 12

      // Dados da tabela com fonte menor para mais dados
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      
      filteredCommissions.forEach((commission, index) => {
        if (yPosition > pageHeight - bottomMargin) {
          doc.addPage()
          yPosition = topMargin
          
          // Reimprimir cabeçalho da tabela em nova página
          doc.setFillColor(248, 250, 252)
          doc.rect(leftMargin, yPosition - 5, usableWidth, 12, 'F')
          doc.setDrawColor(200, 200, 200)
          doc.rect(leftMargin, yPosition - 5, usableWidth, 12, 'S')
          
          doc.setFontSize(9)
          doc.setFont("helvetica", "bold")
          doc.setTextColor(0, 0, 0)
          xPosition = leftMargin + 5
          tableHeaders.forEach((header, colIndex) => {
            doc.text(header, xPosition, yPosition + 2)
            xPosition += colWidths[colIndex]
          })
          yPosition += 12
          doc.setFont("helvetica", "normal")
          doc.setFontSize(8)
        }

        // Linha com fundo alternado
        if (index % 2 === 0) {
          doc.setFillColor(252, 252, 252)
          doc.rect(leftMargin, yPosition - 3, usableWidth, 8, 'F')
        }

        xPosition = leftMargin + 5
        const rowData = [
          commission.userName.length > 45 ? commission.userName.substring(0, 45) + "..." : commission.userName,
          formatCurrency(commission.investmentAmount),
          `${(commission.commissionRate * 100).toFixed(2)}%`,
          `${commission.resgateMonths}m`,
          commission.liquidityType,
          formatCurrency(commission.monthlyCommission),
          formatCurrency(commission.officeCommission),
          formatCurrency(commission.advisorCommission),
          formatDate(commission.nextPaymentDate),
          getStatusText(commission.status)
        ]

        rowData.forEach((data, colIndex) => {
          // Se for a coluna de status e for "Atrasado", usar cor vermelha
          if (colIndex === 9 && commission.status === 'overdue') {
            doc.setTextColor(220, 38, 38) // Vermelho
            doc.text(data, xPosition, yPosition + 2)
            doc.setTextColor(0, 0, 0) // Voltar ao preto
          } else {
            doc.text(data, xPosition, yPosition + 2)
          }
          xPosition += colWidths[colIndex]
        })
        yPosition += 8
      })

      // Rodapé otimizado
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        
        // Linha separadora sutil
        doc.setDrawColor(200, 200, 200)
        doc.line(leftMargin, pageHeight - bottomMargin + 5, pageWidth - rightMargin, pageHeight - bottomMargin + 5)
        
        // Informações do rodapé
        doc.setFontSize(7)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(100, 100, 100)
        doc.text(`Página ${i} de ${totalPages}`, pageWidth - rightMargin, pageHeight - 8, { align: "right" })
        doc.text(`Relatório gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, leftMargin, pageHeight - 8)
        doc.text("Plataforma de Investimentos Agronegócio", leftMargin, pageHeight - 3)
      }

      // Salvar arquivo
      const fileName = `relatorio_comissoes_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)

      toast({
        title: "Relatório Exportado",
        description: "Relatório de comissões exportado com sucesso!",
        variant: "default"
      })
    } catch (error) {
      console.error("Erro ao exportar PDF:", error)
      toast({
        title: "Erro na Exportação",
        description: "Erro ao exportar relatório em PDF",
        variant: "destructive"
      })
    }
  }

  // Função para exportar relatório de comissões em Excel
  const exportCommissionsExcel = () => {
    try {
      // Preparar dados para Excel
      const excelData = filteredCommissions.map(commission => {
        return {
          "ID Investimento": commission.investmentId,
          "Valor Investimento": commission.investmentAmount, // Valor numérico para formatação no Excel
          "Data Início Investimento": commission.investmentStartDate ? formatDate(commission.investmentStartDate) : 'N/A',
          "Investidor": commission.userName,
          "Email Investidor": commission.userEmail,
          "Assessor": commission.advisorName || 'N/A',
          "Email Assessor": commission.advisorEmail || 'N/A',
          "Escritório": commission.officeName || 'N/A',
          "Email Escritório": commission.officeEmail || 'N/A',
          "Comissão Mensal (Investidor)": commission.monthlyCommission, // Valor numérico para formatação no Excel
          "Comissão Escritório": commission.officeCommission, // Valor numérico para formatação no Excel
          "Comissão Assessor": commission.advisorCommission, // Valor numérico para formatação no Excel
          "Total Pago": commission.totalCommission, // Total: investidor + escritório + assessor (valor numérico)
          "Data Pagamento": formatDate(commission.paymentDate),
          "Próximo Pagamento": formatDate(commission.nextPaymentDate)
        }
      })

      // Criar workbook
      const wb = XLSX.utils.book_new()
      
      // Adicionar resumo com informações completas
      const periodText = periodFilter.type === 'custom' 
        ? `${formatDate(periodFilter.startDate)} - ${formatDate(periodFilter.endDate)}`
        : periodFilter.type === 'this_month' ? 'Deste mês' : 
          periodFilter.type === 'next_month' ? 'Próximo mês' : 
          'Próximos 6 meses'
      
      const summaryData = [
        ["RELATÓRIO DE COMISSÕES"],
        ["", ""],
        ["RESUMO GERAL"],
        ["Total Mensal (Investidor)", formatCurrency(totalCommissions)],
        ["Total Mensal Escritório", formatCurrency(totalOfficeCommissions)],
        ["Total Mensal Assessor", formatCurrency(totalAdvisorCommissions)],
        ["Total Pago", formatCurrency(totalPaid)],
        ["Pendentes", pendingCommissions],
        ["Atrasadas", overdueCommissions],
        ["", ""],
        ["PERÍODO"],
        ["Tipo", periodFilter.type === 'this_month' ? 'Deste mês' : 
                 periodFilter.type === 'next_month' ? 'Próximo mês' : 
                 periodFilter.type === 'next_6_months' ? 'Próximos 6 meses' : 'Personalizado'],
        ["Período", periodText],
        ["Data Início", formatDate(periodFilter.startDate)],
        ["Data Fim", formatDate(periodFilter.endDate)],
        ["", ""],
        ["INFORMAÇÕES DO RELATÓRIO"],
        ["Gerado em", new Date().toLocaleDateString("pt-BR") + " às " + new Date().toLocaleTimeString("pt-BR")],
        ["Plataforma", "Plataforma de Investimentos Agronegócio"]
      ]

      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData)
      XLSX.utils.book_append_sheet(wb, summaryWS, "Resumo")

      // Adicionar dados detalhados
      const dataWS = XLSX.utils.json_to_sheet(excelData)
      
      // Aplicar formatação monetária
      const range = XLSX.utils.decode_range(dataWS['!ref'] || 'A1')
      
      // Definir colunas que são valores monetários (começando do índice 0)
      // Coluna 1 = Valor Investimento, 9 = Comissão Mensal, 10 = Comissão Escritório, 
      // 11 = Comissão Assessor, 12 = Total Pago
      const currencyColumns = [1, 9, 10, 11, 12]
      
      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        // Formatação monetária para colunas de valores
        currencyColumns.forEach(colIndex => {
          const cell = XLSX.utils.encode_cell({ r: row, c: colIndex })
          if (dataWS[cell] && typeof dataWS[cell].v === 'number') {
            if (!dataWS[cell].s) dataWS[cell].s = {}
            dataWS[cell].s = {
              ...dataWS[cell].s,
              numFmt: '"R$"#,##0.00' // Formato de moeda brasileira
            }
          }
        })
      }
      
      // Aplicar formatação monetária no cabeçalho também (opcional, para valores no resumo)
      
      // Ajustar largura das colunas
      const colWidths = [
        { wch: 18 }, // ID Investimento
        { wch: 18 }, // Valor Investimento
        { wch: 20 }, // Data Início Investimento
        { wch: 25 }, // Investidor
        { wch: 30 }, // Email Investidor
        { wch: 25 }, // Assessor
        { wch: 30 }, // Email Assessor
        { wch: 25 }, // Escritório
        { wch: 30 }, // Email Escritório
        { wch: 20 }, // Comissão Mensal (Investidor)
        { wch: 15 }, // Comissão Escritório
        { wch: 15 }, // Comissão Assessor
        { wch: 15 }, // Total Pago
        { wch: 15 }, // Data Pagamento
        { wch: 15 }  // Próximo Pagamento
      ]
      dataWS['!cols'] = colWidths

      XLSX.utils.book_append_sheet(wb, dataWS, "Comissões Detalhadas")

      // Adicionar aba separada para pagamentos dos assessores (agrupado por mês e assessor)
      // Agrupar por mês e assessor, somando todos os pagamentos mensais
      const advisorPaymentsByMonth = new Map<string, Map<string, {
        advisorName: string
        advisorEmail: string
        totalCommission: number
        paymentCount: number
      }>>()

      filteredCommissions
        .filter(commission => commission.advisorName && commission.advisorName !== 'N/A')
        .forEach(commission => {
          const paymentDate = new Date(commission.paymentDate)
          const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`
          const monthName = paymentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
          
          if (!advisorPaymentsByMonth.has(monthKey)) {
            advisorPaymentsByMonth.set(monthKey, new Map())
          }
          
          const monthMap = advisorPaymentsByMonth.get(monthKey)!
          const advisorKey = commission.advisorEmail || commission.advisorName
          const existing = monthMap.get(advisorKey)
          
          if (existing) {
            existing.totalCommission += commission.advisorCommission
            existing.paymentCount += 1
          } else {
            monthMap.set(advisorKey, {
              advisorName: commission.advisorName,
              advisorEmail: commission.advisorEmail || 'N/A',
              totalCommission: commission.advisorCommission,
              paymentCount: 1
            })
          }
        })

      // Preparar dados organizados por mês
      const advisorPaymentsData: any[] = []
      const sortedAdvisorMonths = Array.from(advisorPaymentsByMonth.keys()).sort()
      
      sortedAdvisorMonths.forEach(monthKey => {
        const monthMap = advisorPaymentsByMonth.get(monthKey)!
        const paymentDate = new Date(monthKey + '-01')
        const monthName = paymentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        
        // Adicionar título do mês
        advisorPaymentsData.push({
          "Assessor": `----------- ${monthName.toUpperCase()} -----------`,
          "Email Assessor": "",
          "Total a Receber": "",
          "Quantidade de Pagamentos": ""
        })
        
        // Adicionar dados dos assessores desse mês
        let monthTotal = 0
        let monthPaymentCount = 0
        
        Array.from(monthMap.values())
          .sort((a, b) => a.advisorName.localeCompare(b.advisorName))
          .forEach(advisor => {
            monthTotal += advisor.totalCommission
            monthPaymentCount += advisor.paymentCount
            advisorPaymentsData.push({
              "Assessor": advisor.advisorName,
              "Email Assessor": advisor.advisorEmail,
              "Total a Receber": advisor.totalCommission,
              "Quantidade de Pagamentos": advisor.paymentCount
            })
          })
        
        // Adicionar linha de TOTAL do mês
        advisorPaymentsData.push({
          "Assessor": `TOTAL ${monthName.toUpperCase()}`,
          "Email Assessor": "",
          "Total a Receber": monthTotal,
          "Quantidade de Pagamentos": monthPaymentCount
        })
        
        // Linha em branco entre meses
        advisorPaymentsData.push({
          "Assessor": "",
          "Email Assessor": "",
          "Total a Receber": "",
          "Quantidade de Pagamentos": ""
        })
      })

      if (advisorPaymentsData.length > 0) {
        const advisorPaymentsWS = XLSX.utils.json_to_sheet(advisorPaymentsData)
        
        // Aplicar formatação monetária e estilo aos títulos dos meses
        const advisorRange = XLSX.utils.decode_range(advisorPaymentsWS['!ref'] || 'A1')
        
        for (let row = advisorRange.s.r; row <= advisorRange.e.r; row++) {
          const assessorCell = XLSX.utils.encode_cell({ r: row, c: 0 })
          const cellValue = advisorPaymentsWS[assessorCell]?.v
          
          // Formatação para títulos dos meses (linhas que contêm "-----------")
          if (typeof cellValue === 'string' && cellValue.includes('-----------')) {
            if (!advisorPaymentsWS[assessorCell].s) advisorPaymentsWS[assessorCell].s = {}
            advisorPaymentsWS[assessorCell].s = {
              font: { bold: true, sz: 12 },
              alignment: { horizontal: 'center' }
            }
          }
          
          // Formatação para linhas de TOTAL
          if (typeof cellValue === 'string' && cellValue.startsWith('TOTAL')) {
            if (!advisorPaymentsWS[assessorCell].s) advisorPaymentsWS[assessorCell].s = {}
            advisorPaymentsWS[assessorCell].s = {
              font: { bold: true, sz: 11 }
            }
            // Formatar também o total monetário
            const totalCell = XLSX.utils.encode_cell({ r: row, c: 2 })
            if (advisorPaymentsWS[totalCell] && typeof advisorPaymentsWS[totalCell].v === 'number') {
              if (!advisorPaymentsWS[totalCell].s) advisorPaymentsWS[totalCell].s = {}
              advisorPaymentsWS[totalCell].s = {
                ...advisorPaymentsWS[totalCell].s,
                numFmt: '"R$"#,##0.00',
                font: { bold: true }
              }
            }
          }
          
          // Formatação monetária para valores
          const totalCell = XLSX.utils.encode_cell({ r: row, c: 2 })
          if (advisorPaymentsWS[totalCell] && typeof advisorPaymentsWS[totalCell].v === 'number') {
            if (!advisorPaymentsWS[totalCell].s) advisorPaymentsWS[totalCell].s = {}
            advisorPaymentsWS[totalCell].s = {
              ...advisorPaymentsWS[totalCell].s,
              numFmt: '"R$"#,##0.00'
            }
          }
        }
        
        advisorPaymentsWS['!cols'] = [
          { wch: 25 }, // Assessor
          { wch: 30 }, // Email Assessor
          { wch: 20 }, // Total a Receber
          { wch: 20 }  // Quantidade de Pagamentos
        ]
        
        XLSX.utils.book_append_sheet(wb, advisorPaymentsWS, "Pagamentos Assessores")
      }

      // Adicionar aba separada para pagamentos dos escritórios (agrupado por mês e escritório)
      // Agrupar por mês e escritório, somando todos os pagamentos mensais
      const officePaymentsByMonth = new Map<string, Map<string, {
        officeName: string
        officeEmail: string
        totalCommission: number
        paymentCount: number
      }>>()

      filteredCommissions
        .filter(commission => commission.officeName && commission.officeName !== 'N/A')
        .forEach(commission => {
          const paymentDate = new Date(commission.paymentDate)
          const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`
          
          if (!officePaymentsByMonth.has(monthKey)) {
            officePaymentsByMonth.set(monthKey, new Map())
          }
          
          const monthMap = officePaymentsByMonth.get(monthKey)!
          const officeKey = commission.officeEmail || commission.officeName
          const existing = monthMap.get(officeKey)
          
          if (existing) {
            existing.totalCommission += commission.officeCommission
            existing.paymentCount += 1
          } else {
            monthMap.set(officeKey, {
              officeName: commission.officeName,
              officeEmail: commission.officeEmail || 'N/A',
              totalCommission: commission.officeCommission,
              paymentCount: 1
            })
          }
        })

      // Preparar dados organizados por mês
      const officePaymentsData: any[] = []
      const sortedOfficeMonths = Array.from(officePaymentsByMonth.keys()).sort()
      
      sortedOfficeMonths.forEach(monthKey => {
        const monthMap = officePaymentsByMonth.get(monthKey)!
        const paymentDate = new Date(monthKey + '-01')
        const monthName = paymentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        
        // Adicionar título do mês
        officePaymentsData.push({
          "Escritório": `----------- ${monthName.toUpperCase()} -----------`,
          "Email Escritório": "",
          "Total a Receber": "",
          "Quantidade de Pagamentos": ""
        })
        
        // Adicionar dados dos escritórios desse mês
        let monthTotal = 0
        let monthPaymentCount = 0
        
        Array.from(monthMap.values())
          .sort((a, b) => a.officeName.localeCompare(b.officeName))
          .forEach(office => {
            monthTotal += office.totalCommission
            monthPaymentCount += office.paymentCount
            officePaymentsData.push({
              "Escritório": office.officeName,
              "Email Escritório": office.officeEmail,
              "Total a Receber": office.totalCommission,
              "Quantidade de Pagamentos": office.paymentCount
            })
          })
        
        // Adicionar linha de TOTAL do mês
        officePaymentsData.push({
          "Escritório": `TOTAL ${monthName.toUpperCase()}`,
          "Email Escritório": "",
          "Total a Receber": monthTotal,
          "Quantidade de Pagamentos": monthPaymentCount
        })
        
        // Linha em branco entre meses
        officePaymentsData.push({
          "Escritório": "",
          "Email Escritório": "",
          "Total a Receber": "",
          "Quantidade de Pagamentos": ""
        })
      })

      if (officePaymentsData.length > 0) {
        const officePaymentsWS = XLSX.utils.json_to_sheet(officePaymentsData)
        
        // Aplicar formatação monetária e estilo aos títulos dos meses
        const officeRange = XLSX.utils.decode_range(officePaymentsWS['!ref'] || 'A1')
        
        for (let row = officeRange.s.r; row <= officeRange.e.r; row++) {
          const officeCell = XLSX.utils.encode_cell({ r: row, c: 0 })
          const cellValue = officePaymentsWS[officeCell]?.v
          
          // Formatação para títulos dos meses (linhas que contêm "-----------")
          if (typeof cellValue === 'string' && cellValue.includes('-----------')) {
            if (!officePaymentsWS[officeCell].s) officePaymentsWS[officeCell].s = {}
            officePaymentsWS[officeCell].s = {
              font: { bold: true, sz: 12 },
              alignment: { horizontal: 'center' }
            }
          }
          
          // Formatação para linhas de TOTAL
          if (typeof cellValue === 'string' && cellValue.startsWith('TOTAL')) {
            if (!officePaymentsWS[officeCell].s) officePaymentsWS[officeCell].s = {}
            officePaymentsWS[officeCell].s = {
              font: { bold: true, sz: 11 }
            }
            // Formatar também o total monetário
            const totalCell = XLSX.utils.encode_cell({ r: row, c: 2 })
            if (officePaymentsWS[totalCell] && typeof officePaymentsWS[totalCell].v === 'number') {
              if (!officePaymentsWS[totalCell].s) officePaymentsWS[totalCell].s = {}
              officePaymentsWS[totalCell].s = {
                ...officePaymentsWS[totalCell].s,
                numFmt: '"R$"#,##0.00',
                font: { bold: true }
              }
            }
          }
          
          // Formatação monetária para valores
          const totalCell = XLSX.utils.encode_cell({ r: row, c: 2 })
          if (officePaymentsWS[totalCell] && typeof officePaymentsWS[totalCell].v === 'number') {
            if (!officePaymentsWS[totalCell].s) officePaymentsWS[totalCell].s = {}
            officePaymentsWS[totalCell].s = {
              ...officePaymentsWS[totalCell].s,
              numFmt: '"R$"#,##0.00'
            }
          }
        }
        
        officePaymentsWS['!cols'] = [
          { wch: 25 }, // Escritório
          { wch: 30 }, // Email Escritório
          { wch: 20 }, // Total a Receber
          { wch: 20 }  // Quantidade de Pagamentos
        ]
        
        XLSX.utils.book_append_sheet(wb, officePaymentsWS, "Pagamentos Escritórios")
      }

      // Adicionar aba separada para pagamentos dos investidores (agrupado por mês e investidor)
      // Agrupar por mês e investidor, somando todos os pagamentos mensais
      const investorPaymentsByMonth = new Map<string, Map<string, {
        investorName: string
        investorEmail: string
        totalCommission: number
        paymentCount: number
        depositDate: string | null
      }>>()

      filteredCommissions
        .filter(commission => commission.userType === 'investor')
        .forEach(commission => {
          const paymentDate = new Date(commission.paymentDate)
          const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`
          
          if (!investorPaymentsByMonth.has(monthKey)) {
            investorPaymentsByMonth.set(monthKey, new Map())
          }
          
          const monthMap = investorPaymentsByMonth.get(monthKey)!
          const investorKey = commission.userEmail || commission.userName
          const existing = monthMap.get(investorKey)
          
          // Data de depósito (data de início do investimento)
          const depositDate = commission.investmentStartDate ? commission.investmentStartDate : null
          
          if (existing) {
            existing.totalCommission += commission.monthlyCommission
            existing.paymentCount += 1
            // Manter a data de depósito mais antiga se houver múltiplas comissões
            if (depositDate && (!existing.depositDate || depositDate < existing.depositDate)) {
              existing.depositDate = depositDate
            }
          } else {
            monthMap.set(investorKey, {
              investorName: commission.userName,
              investorEmail: commission.userEmail || 'N/A',
              totalCommission: commission.monthlyCommission,
              paymentCount: 1,
              depositDate: depositDate
            })
          }
        })

      // Preparar dados organizados por mês
      const investorPaymentsData: any[] = []
      const sortedInvestorMonths = Array.from(investorPaymentsByMonth.keys()).sort()
      
      sortedInvestorMonths.forEach(monthKey => {
        const monthMap = investorPaymentsByMonth.get(monthKey)!
        const paymentDate = new Date(monthKey + '-01')
        const monthName = paymentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        
        // Adicionar título do mês
        investorPaymentsData.push({
          "Investidor": `----------- ${monthName.toUpperCase()} -----------`,
          "Email Investidor": "",
          "Data de Depósito": "",
          "Total a Receber": "",
          "Quantidade de Pagamentos": ""
        })
        
        // Adicionar dados dos investidores desse mês
        let monthTotal = 0
        let monthPaymentCount = 0
        
        Array.from(monthMap.values())
          .sort((a, b) => a.investorName.localeCompare(b.investorName))
          .forEach(investor => {
            monthTotal += investor.totalCommission
            monthPaymentCount += investor.paymentCount
            investorPaymentsData.push({
              "Investidor": investor.investorName,
              "Email Investidor": investor.investorEmail,
              "Data de Depósito": investor.depositDate ? formatDate(investor.depositDate) : 'N/A',
              "Total a Receber": investor.totalCommission,
              "Quantidade de Pagamentos": investor.paymentCount
            })
          })
        
        // Adicionar linha de TOTAL do mês
        investorPaymentsData.push({
          "Investidor": `TOTAL ${monthName.toUpperCase()}`,
          "Email Investidor": "",
          "Data de Depósito": "",
          "Total a Receber": monthTotal,
          "Quantidade de Pagamentos": monthPaymentCount
        })
        
        // Linha em branco entre meses
        investorPaymentsData.push({
          "Investidor": "",
          "Email Investidor": "",
          "Data de Depósito": "",
          "Total a Receber": "",
          "Quantidade de Pagamentos": ""
        })
      })

      if (investorPaymentsData.length > 0) {
        const investorPaymentsWS = XLSX.utils.json_to_sheet(investorPaymentsData)
        
        // Aplicar formatação monetária e estilo aos títulos dos meses
        const investorRange = XLSX.utils.decode_range(investorPaymentsWS['!ref'] || 'A1')
        
        for (let row = investorRange.s.r; row <= investorRange.e.r; row++) {
          const investorCell = XLSX.utils.encode_cell({ r: row, c: 0 })
          const cellValue = investorPaymentsWS[investorCell]?.v
          
          // Formatação para títulos dos meses (linhas que contêm "-----------")
          if (typeof cellValue === 'string' && cellValue.includes('-----------')) {
            if (!investorPaymentsWS[investorCell].s) investorPaymentsWS[investorCell].s = {}
            investorPaymentsWS[investorCell].s = {
              font: { bold: true, sz: 12 },
              alignment: { horizontal: 'center' }
            }
          }
          
          // Formatação para linhas de TOTAL
          if (typeof cellValue === 'string' && cellValue.startsWith('TOTAL')) {
            if (!investorPaymentsWS[investorCell].s) investorPaymentsWS[investorCell].s = {}
            investorPaymentsWS[investorCell].s = {
              font: { bold: true, sz: 11 }
            }
            // Formatar também o total monetário (coluna 3 = Total a Receber)
            const totalCell = XLSX.utils.encode_cell({ r: row, c: 3 })
            if (investorPaymentsWS[totalCell] && typeof investorPaymentsWS[totalCell].v === 'number') {
              if (!investorPaymentsWS[totalCell].s) investorPaymentsWS[totalCell].s = {}
              investorPaymentsWS[totalCell].s = {
                ...investorPaymentsWS[totalCell].s,
                numFmt: '"R$"#,##0.00',
                font: { bold: true }
              }
            }
          }
          
          // Formatação monetária para valores (coluna 3 = Total a Receber)
          const totalCell = XLSX.utils.encode_cell({ r: row, c: 3 })
          if (investorPaymentsWS[totalCell] && typeof investorPaymentsWS[totalCell].v === 'number') {
            if (!investorPaymentsWS[totalCell].s) investorPaymentsWS[totalCell].s = {}
            investorPaymentsWS[totalCell].s = {
              ...investorPaymentsWS[totalCell].s,
              numFmt: '"R$"#,##0.00'
            }
          }
        }
        
        investorPaymentsWS['!cols'] = [
          { wch: 25 }, // Investidor
          { wch: 30 }, // Email Investidor
          { wch: 18 }, // Data de Depósito
          { wch: 20 }, // Total a Receber
          { wch: 20 }  // Quantidade de Pagamentos
        ]
        
        XLSX.utils.book_append_sheet(wb, investorPaymentsWS, "Pagamentos Investidores")
      }

      // Adicionar análise por tipo
      const typeAnalysis = Object.entries(commissionsByType).map(([type, commissions]) => {
        const totalAmount = commissions.reduce((sum, c) => sum + c.investmentAmount, 0)
        const totalCommission = commissions.reduce((sum, c) => sum + c.monthlyCommission, 0)
        const totalOfficeCommission = commissions.reduce((sum, c) => sum + c.officeCommission, 0)
        const totalAdvisorCommission = commissions.reduce((sum, c) => sum + c.advisorCommission, 0)
        // Total pago = soma de todas as comissões (investidor + escritório + assessor)
        const totalPaid = commissions.reduce((sum, c) => sum + c.totalCommission, 0)
        
        return {
          "Tipo": type === 'investor' ? 'Investidor' : 
                  type === 'distributor' ? 'Distribuidor' : 'Administrador',
          "Quantidade": commissions.length,
          "Total Investido": totalAmount,
          "Comissão Mensal": totalCommission,
          "Comissão Escritório": totalOfficeCommission,
          "Comissão Assessor": totalAdvisorCommission,
          "Total Pago": totalPaid,
          "Taxa Média (%)": commissions.length > 0 ? 
            (commissions.reduce((sum, c) => sum + c.commissionRate, 0) / commissions.length * 100).toFixed(1) : 0
        }
      })

      const analysisWS = XLSX.utils.json_to_sheet(typeAnalysis)
      
      // Aplicar formatação monetária na planilha de análise
      const analysisRange = XLSX.utils.decode_range(analysisWS['!ref'] || 'A1')
      // Colunas monetárias: 2 = Total Investido, 3 = Comissão Mensal, 4 = Comissão Escritório, 
      // 5 = Comissão Assessor, 6 = Total Pago
      const analysisCurrencyColumns = [2, 3, 4, 5, 6]
      
      for (let row = analysisRange.s.r + 1; row <= analysisRange.e.r; row++) {
        analysisCurrencyColumns.forEach(colIndex => {
          const cell = XLSX.utils.encode_cell({ r: row, c: colIndex })
          if (analysisWS[cell] && typeof analysisWS[cell].v === 'number') {
            if (!analysisWS[cell].s) analysisWS[cell].s = {}
            analysisWS[cell].s = {
              ...analysisWS[cell].s,
              numFmt: '"R$"#,##0.00' // Formato de moeda brasileira
            }
          }
        })
      }
      
      analysisWS['!cols'] = [
        { wch: 15 }, // Tipo
        { wch: 12 }, // Quantidade
        { wch: 15 }, // Total Investido
        { wch: 15 }, // Comissão Mensal
        { wch: 15 }, // Comissão Escritório
        { wch: 15 }, // Comissão Assessor
        { wch: 15 }, // Total Pago
        { wch: 15 }  // Taxa Média
      ]
      XLSX.utils.book_append_sheet(wb, analysisWS, "Análise por Tipo")

      // Salvar arquivo
      const fileName = `relatorio_comissoes_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast({
        title: "Relatório Exportado",
        description: "Relatório de comissões exportado em Excel com sucesso!",
        variant: "default"
      })
    } catch (error) {
      console.error("Erro ao exportar Excel:", error)
      toast({
        title: "Erro na Exportação",
        description: "Erro ao exportar relatório em Excel",
        variant: "destructive"
      })
    }
  }

  // Funções para gerar dados reais baseados nos dados do banco
  const generateRealMonthlyData = (investments: any[], dateFrom: Date) => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    const now = new Date()
    
    return months.slice(0, 6).map((month, index) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - index) + 1, 0)
      
      const monthInvestments = investments.filter(inv => {
        const invDate = inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at)
        return invDate >= monthStart && invDate <= monthEnd && inv.status === "active"
      })
      
      const value = monthInvestments.reduce((sum, inv) => sum + (inv.amount || 0), 0)
      
      // Calcular crescimento comparado ao mês anterior
      const prevMonthStart = new Date(monthStart.getTime() - 30 * 24 * 60 * 60 * 1000)
      const prevMonthEnd = new Date(monthEnd.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      const prevMonthInvestments = investments.filter(inv => {
        const invDate = inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at)
        return invDate >= prevMonthStart && invDate <= prevMonthEnd && inv.status === "active"
      })
      
      const prevValue = prevMonthInvestments.reduce((sum, inv) => sum + (inv.amount || 0), 0)
      const growth = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : 0
      
      return {
        month,
        value,
        growth: Math.round(growth * 10) / 10,
      }
    })
  }

  const generateRealUserGrowthData = (profiles: any[], dateFrom: Date) => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    const now = new Date()
    
    return months.slice(0, 6).map((month, index) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - index) + 1, 0)
      
      const monthUsers = profiles.filter(profile => {
        const userDate = new Date(profile.created_at)
        return userDate >= monthStart && userDate <= monthEnd
      })
      
      const investors = monthUsers.filter(p => p.user_type === "investor").length
      const distributors = monthUsers.filter(p => ["distributor", "assessor", "lider", "gestor", "escritorio"].includes(p.user_type)).length
      
      return {
        month,
        investors,
        distributors,
      }
    })
  }

  const generateRealCommissionData = (transactions: any[], dateFrom: Date) => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
    const now = new Date()
    
    return months.slice(0, 6).map((month, index) => {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - (5 - index) + 1, 0)
      
      const monthTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.created_at)
        return txDate >= monthStart && txDate <= monthEnd && tx.status === "completed"
      })
      
      const total = monthTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0) * 0.04 // 4% comissão total (3% + 1%)
      const recurrent = total
      
      return {
        month,
        total,
        recurrent,
      }
    })
  }

  const generateRealTopCampaigns = (campaigns: any[]) => {
    if (campaigns.length === 0) {
      // Retornar campanhas simuladas se não houver dados reais
      return [
        {
          name: "Promoção Ano Novo",
          participants: 45,
          impact: 250000,
          roi: 3.2,
        },
        {
          name: "Indicação Premiada",
          participants: 32,
          impact: 180000,
          roi: 2.8,
        },
        {
          name: "Meta 500K",
          participants: 28,
          impact: 150000,
          roi: 2.5,
        },
      ]
    }
    
    return campaigns.slice(0, 5).map((campaign, index) => ({
      name: campaign.name || `Campanha ${index + 1}`,
      participants: campaign.participants || Math.floor(Math.random() * 50) + 20,
      impact: campaign.impact || Math.floor(Math.random() * 300000) + 100000,
      roi: campaign.roi || Math.round((Math.random() * 4 + 2) * 10) / 10,
    }))
  }

  // Funções para calcular métricas reais
  const calculateRetentionRate = (transactions: any[]) => {
    const totalTransactions = transactions.length
    const completedTransactions = transactions.filter(tx => tx.status === "completed").length
    
    if (totalTransactions === 0) return 100
    
    return Math.round((completedTransactions / totalTransactions) * 100 * 10) / 10
  }

  const calculateChurnRate = (profiles: any[], transactions: any[]) => {
    const totalUsers = profiles.length
    const withdrawalTransactions = transactions.filter(tx => 
      tx.transaction_type === "withdrawal" && tx.status === "completed"
    ).length
    
    if (totalUsers === 0) return 0
    
    return Math.round((withdrawalTransactions / totalUsers) * 100 * 10) / 10
  }

  const calculateConversionRate = (investments: any[], profiles: any[]) => {
    const totalUsers = profiles.length
    const usersWithInvestments = new Set(investments.map(inv => inv.user_id)).size
    
    if (totalUsers === 0) return 0
    
    return Math.round((usersWithInvestments / totalUsers) * 100 * 10) / 10
  }

  const calculateAvgDuration = (investments: any[]) => {
    if (investments.length === 0) return 0
    
    const totalDuration = investments.reduce((sum, inv) => {
      const paymentDate = inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at)
      const now = new Date()
      const months = (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      return sum + months
    }, 0)
    
    return Math.round((totalDuration / investments.length) * 10) / 10
  }

  const [customReports, setCustomReports] = useState<CustomReport[]>([
    {
      id: "1",
      name: "Relatório Financeiro Mensal",
      description: "Análise completa de investimentos, comissões e performance financeira",
      type: "financial",
      frequency: "monthly",
      recipients: ["admin@akintec.com", "financeiro@akintec.com"],
      lastGenerated: "2025-01-27T08:00:00Z",
      isActive: true,
    },
    {
      id: "2",
      name: "Compliance e Auditoria",
      description: "Relatório de conformidade e métricas para auditoria",
      type: "compliance",
      frequency: "quarterly",
      recipients: ["compliance@akintec.com", "auditoria@akintec.com"],
      lastGenerated: "2025-01-01T08:00:00Z",
      isActive: true,
    },
    {
      id: "3",
      name: "Performance de Distribuidores",
      description: "Análise de performance e ranking de distribuidores",
      type: "performance",
      frequency: "weekly",
      recipients: ["admin@akintec.com"],
      lastGenerated: "2025-01-25T08:00:00Z",
      isActive: true,
    },
  ])

  const handleExportReport = (type: string, format: 'excel' | 'pdf') => {
    if (!analyticsData) {
      toast({
        title: "Erro",
        description: "Nenhum dado disponível para exportar.",
        variant: "destructive",
      })
      return
    }

    const currentDate = new Date().toISOString().split('T')[0]
    const fileName = `relatorio_${type}_${currentDate}`

    if (format === 'excel') {
      exportToExcel(type, fileName)
    } else {
      exportToPDF(type, fileName)
    }

    toast({
      title: "Relatório exportado!",
      description: `O relatório de ${type} foi baixado em formato ${format.toUpperCase()}.`,
    })
  }

  const exportToExcel = (type: string, fileName: string) => {
    if (!analyticsData) return

    const workbook = XLSX.utils.book_new()
    
    switch (type) {
      case "investments":
        // Calcular métricas detalhadas dos investimentos
        const totalValue = detailedInvestments.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)
        const approvedValue = detailedInvestments
          .filter((inv: any) => inv.status === "active")
          .reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)
        const pendingValue = detailedInvestments
          .filter((inv: any) => inv.status === "pending")
          .reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)

        // Encontrar maior investimento
        const biggestInvestment = detailedInvestments.length > 0 
          ? detailedInvestments.reduce((max: any, inv: any) => 
              (inv.amount || 0) > (max.amount || 0) ? inv : max
            )
          : null

        // Encontrar último investimento (mais recente)
        const lastInvestment = detailedInvestments.length > 0
          ? detailedInvestments.reduce((latest: any, inv: any) => 
              (inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at)) > (latest.payment_date ? new Date(latest.payment_date) : new Date(latest.created_at)) ? inv : latest
            )
          : null

        // Encontrar maior investimento ativo
        const biggestActiveInvestment = detailedInvestments.length > 0
          ? detailedInvestments
              .filter((inv: any) => inv.status === "active")
              .reduce((max: any, inv: any) => 
                (inv.amount || 0) > (max.amount || 0) ? inv : max, 
                detailedInvestments.filter((inv: any) => inv.status === "active")[0] || null
              )
          : null

        // Encontrar último investimento ativo (mais recente)
        const lastActiveInvestment = detailedInvestments.length > 0
          ? detailedInvestments
              .filter((inv: any) => inv.status === "active")
              .reduce((latest: any, inv: any) => 
                (inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at)) > (latest.payment_date ? new Date(latest.payment_date) : new Date(latest.created_at)) ? inv : latest,
                detailedInvestments.filter((inv: any) => inv.status === "active")[0] || null
              )
          : null

        // Planilha de resumo
        const investmentsSummary = [
          ["Métrica", "Valor"],
          ["Total Investido", formatCurrency(analyticsData.investments.total)],
          ["Crescimento (%)", `${analyticsData.investments.growth}%`],
          ["Ticket Médio", formatCurrency(analyticsData.investments.avgTicket)],
          ["Taxa de Retenção (%)", `${analyticsData.investments.retention}%`],
          ["", ""], // Linha em branco
          ["VALORES DETALHADOS", ""],
          ["Valor Total", formatCurrency(totalValue)],
          ["Valor Total Aprovado", formatCurrency(approvedValue)],
          ["Valor Total Pendente", formatCurrency(pendingValue)],
          ["", ""], // Linha em branco
          ["MAIOR INVESTIMENTO", ""],
          ["Investidor", biggestInvestment ? biggestInvestment.profiles?.full_name || "N/A" : "N/A"],
          ["Valor", biggestInvestment ? formatCurrency(biggestInvestment.amount || 0) : "N/A"],
          ["Status", biggestInvestment ? (biggestInvestment.status === "pending" ? "Pendente" : biggestInvestment.status === "active" ? "Ativo" : biggestInvestment.status === "withdrawn" ? "Resgatado" : biggestInvestment.status) : "N/A"],
          ["Data", biggestInvestment ? new Date(biggestInvestment.payment_date || biggestInvestment.created_at).toLocaleDateString("pt-BR") : "N/A"],
          ["Período", biggestInvestment ? (biggestInvestment.commitment_period ? `${biggestInvestment.commitment_period} meses` : "N/A") : "N/A"],
          ["Rentabilidade", biggestInvestment ? (biggestInvestment.profitability_liquidity || "N/A") : "N/A"],
          ["", ""], // Linha em branco
          ["ÚLTIMO INVESTIMENTO", ""],
          ["Investidor", lastInvestment ? lastInvestment.profiles?.full_name || "N/A" : "N/A"],
          ["Valor", lastInvestment ? formatCurrency(lastInvestment.amount || 0) : "N/A"],
          ["Status", lastInvestment ? (lastInvestment.status === "pending" ? "Pendente" : lastInvestment.status === "active" ? "Ativo" : lastInvestment.status === "withdrawn" ? "Resgatado" : lastInvestment.status) : "N/A"],
          ["Data", lastInvestment ? new Date(lastInvestment.payment_date || lastInvestment.created_at).toLocaleDateString("pt-BR") : "N/A"],
          ["Período", lastInvestment ? (lastInvestment.commitment_period ? `${lastInvestment.commitment_period} meses` : "N/A") : "N/A"],
          ["Rentabilidade", lastInvestment ? (lastInvestment.profitability_liquidity || "N/A") : "N/A"],
          ["", ""], // Linha em branco
          ["MAIOR INVESTIMENTO ATIVO", ""],
          ["Investidor", biggestActiveInvestment ? biggestActiveInvestment.profiles?.full_name || "N/A" : "N/A"],
          ["Valor", biggestActiveInvestment ? formatCurrency(biggestActiveInvestment.amount || 0) : "N/A"],
          ["Status", biggestActiveInvestment ? "Ativo" : "N/A"],
          ["Data", biggestActiveInvestment ? new Date(biggestActiveInvestment.payment_date || biggestActiveInvestment.created_at).toLocaleDateString("pt-BR") : "N/A"],
          ["Período", biggestActiveInvestment ? (biggestActiveInvestment.commitment_period ? `${biggestActiveInvestment.commitment_period} meses` : "N/A") : "N/A"],
          ["Rentabilidade", biggestActiveInvestment ? (biggestActiveInvestment.profitability_liquidity || "N/A") : "N/A"],
          ["", ""], // Linha em branco
          ["ÚLTIMO INVESTIMENTO ATIVO", ""],
          ["Investidor", lastActiveInvestment ? lastActiveInvestment.profiles?.full_name || "N/A" : "N/A"],
          ["Valor", lastActiveInvestment ? formatCurrency(lastActiveInvestment.amount || 0) : "N/A"],
          ["Status", lastActiveInvestment ? "Ativo" : "N/A"],
          ["Data", lastActiveInvestment ? new Date(lastActiveInvestment.payment_date || lastActiveInvestment.created_at).toLocaleDateString("pt-BR") : "N/A"],
          ["Período", lastActiveInvestment ? (lastActiveInvestment.commitment_period ? `${lastActiveInvestment.commitment_period} meses` : "N/A") : "N/A"],
          ["Rentabilidade", lastActiveInvestment ? (lastActiveInvestment.profitability_liquidity || "N/A") : "N/A"],
        ]
        const ws1 = XLSX.utils.aoa_to_sheet(investmentsSummary)
        XLSX.utils.book_append_sheet(workbook, ws1, "Resumo Investimentos")

        // Planilha de dados mensais
        const monthlyData = [
          ["Mês", "Valor", "Crescimento (%)"],
          ...analyticsData.investments.monthlyData.map(data => [
            data.month,
            data.value,
            `${data.growth}%`
          ])
        ]
        const ws2 = XLSX.utils.aoa_to_sheet(monthlyData)
        XLSX.utils.book_append_sheet(workbook, ws2, "Evolução Mensal")

        // Planilha detalhada com todos os investimentos
        const detailedInvestmentsData = [
          [
            "Nome do Investidor", 
            "Telefone",
            "Tipo de Usuário",
            "Valor Investido",
            "Status",
            "Data do Investimento",
            "Período (meses)",
            "Rentabilidade",
            "Data de Criação do Usuário"
          ],
          ...(detailedInvestments.length > 0 ? detailedInvestments.map((inv: any) => {
            const investmentDate = new Date(inv.payment_date || inv.created_at)
            const userCreatedDate = new Date(inv.profiles?.created_at || inv.created_at)
            
            return [
              inv.profiles?.full_name || "N/A",
              inv.profiles?.phone || "N/A",
              inv.profiles?.user_type || "N/A",
              formatCurrency(inv.amount || 0),
              inv.status === "pending" ? "Pendente" : 
              inv.status === "active" ? "Ativo" : 
              inv.status === "withdrawn" ? "Resgatado" : 
              inv.status || "N/A",
              investmentDate.toLocaleDateString("pt-BR"),
              inv.commitment_period ? `${inv.commitment_period} meses` : "N/A",
              inv.profitability_liquidity || "N/A",
              userCreatedDate.toLocaleDateString("pt-BR")
            ]
          }) : [["Nenhum investimento encontrado no período selecionado"]])
        ]
        const ws3 = XLSX.utils.aoa_to_sheet(detailedInvestmentsData)
        XLSX.utils.book_append_sheet(workbook, ws3, "Investimentos Detalhados")
        break

      case "users":
        const usersSummary = [
          ["Tipo de Usuário", "Quantidade"],
          ["Total de Usuários", analyticsData.users.total],
          ["Investidores", analyticsData.users.investors],
          ["Distribuidores", analyticsData.users.distributors],
          ["Escritórios", analyticsData.users.offices],
          ["Assessores", analyticsData.users.advisors],
          ["Novos Este Mês", analyticsData.users.newThisMonth],
          ["Taxa de Churn (%)", `${analyticsData.users.churnRate}%`],
        ]
        const ws4 = XLSX.utils.aoa_to_sheet(usersSummary)
        XLSX.utils.book_append_sheet(workbook, ws4, "Resumo Usuários")

        const userGrowthData = [
          ["Mês", "Investidores", "Distribuidores", "Total"],
          ...analyticsData.users.monthlyGrowth.map(data => [
            data.month,
            data.investors,
            data.distributors,
            data.investors + data.distributors
          ])
        ]
        const ws5 = XLSX.utils.aoa_to_sheet(userGrowthData)
        XLSX.utils.book_append_sheet(workbook, ws5, "Crescimento Mensal")
        break

      case "commissions":
        // Calcular comissões detalhadas por usuário (apenas investimentos ativos)
        const activeInvestmentsOnly = detailedInvestments.filter((inv: any) => inv.status === "active")
        const userCommissions = activeInvestmentsOnly.map((inv: any) => {
          const user = inv.profiles
          if (!user) return null
          
          const totalInvested = activeInvestmentsOnly
            .filter((i: any) => i.user_id === inv.user_id)
            .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
          
          const monthlyCommission = totalInvested * COMMISSION_RATES.investidor // 2% taxa de administração
          // Calcular próximo recebimento: 30 dias depois da data de pagamento
          const paymentDate = inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at)
          const nextPayment = new Date(paymentDate)
          nextPayment.setDate(paymentDate.getDate() + 30) // 30 dias depois do pagamento
          
          // Calcular período e rentabilidade do investimento
          const investmentPeriod = inv.commitment_period ? `${inv.commitment_period} meses` : "N/A"
          const profitability = inv.profitability_liquidity || "N/A"
          
          return {
            userId: inv.user_id,
            userName: user.full_name || "N/A",
            userEmail: user.email || "N/A",
            userType: user.user_type || "N/A",
            totalInvested,
            monthlyCommission,
            nextPaymentDate: nextPayment.toLocaleDateString("pt-BR"),
            investmentCount: activeInvestmentsOnly.filter((i: any) => i.user_id === inv.user_id).length,
            lastInvestmentDate: activeInvestmentsOnly
              .filter((i: any) => i.user_id === inv.user_id)
              .sort((a: any, b: any) => {
                const dateA = a.payment_date ? new Date(a.payment_date) : new Date(a.created_at)
                const dateB = b.payment_date ? new Date(b.payment_date) : new Date(b.created_at)
                return dateB.getTime() - dateA.getTime()
              })[0]?.payment_date || activeInvestmentsOnly
              .filter((i: any) => i.user_id === inv.user_id)
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at,
            investmentPeriod,
            profitability
          }
        }).filter(Boolean)

        // Remover duplicatas e ordenar por comissão mensal
        const uniqueUserCommissions = userCommissions.reduce((acc: any[], current: any) => {
          const existing = acc.find(item => item.userId === current.userId)
          if (!existing) {
            acc.push(current)
          }
          return acc
        }, []).sort((a: any, b: any) => b.monthlyCommission - a.monthlyCommission)

        const commissionsSummary = [
          ["Tipo de Comissão", "Valor"],
          ["Total", formatCurrency(analyticsData.commissions.total)],
          ["Assessores (3%)", formatCurrency(analyticsData.commissions.advisors)],
          ["Escritórios (1%)", formatCurrency(analyticsData.commissions.offices)],
          ["Recorrentes", formatCurrency(analyticsData.commissions.recurrent)],
          ["Taxa Média (%)", `${analyticsData.commissions.avgCommissionRate}%`],
          ["", ""], // Linha em branco
          ["TOTAL DE USUÁRIOS COM INVESTIMENTOS ATIVOS", ""],
          ["Total de Usuários Ativos", uniqueUserCommissions.length],
          ["Valor Total Investido Ativo", formatCurrency(uniqueUserCommissions.reduce((sum: number, u: any) => sum + u.totalInvested, 0))],
          ["Comissão Total Mensal", formatCurrency(uniqueUserCommissions.reduce((sum: number, u: any) => sum + u.monthlyCommission, 0))],
        ]
        const ws6 = XLSX.utils.aoa_to_sheet(commissionsSummary)
        XLSX.utils.book_append_sheet(workbook, ws6, "Resumo Comissões")

        // Criar 6 planilhas detalhadas para os próximos 6 meses
        const currentMonth = new Date().getMonth()
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
        
        for (let i = 1; i <= 6; i++) {
          const monthIndex = (currentMonth + i) % 12
          const monthName = months[monthIndex]
          const targetMonth = new Date()
          targetMonth.setMonth(currentMonth + i)
          
          // Filtrar usuários que recebem comissão no mês específico
          const monthUsers = uniqueUserCommissions.filter((user: any) => {
            const nextPaymentDate = new Date(user.nextPaymentDate.split('/').reverse().join('-'))
            return nextPaymentDate.getMonth() === targetMonth.getMonth() && nextPaymentDate.getFullYear() === targetMonth.getFullYear()
          })
          
          const monthDetailedData = [
            [
              "Nome do Usuário",
              "Email",
              "Tipo de Usuário",
              "Valor Investido",
              "Comissão Mensal",
              "Data de Recebimento",
              "Qtd. Investimentos Ativos",
              "Período",
              "Rentabilidade"
            ],
            ...monthUsers.map((user: any) => [
              user.userName,
              user.userEmail,
              user.userType,
              formatCurrency(user.totalInvested),
              formatCurrency(user.monthlyCommission),
              user.nextPaymentDate,
              user.investmentCount,
              user.investmentPeriod,
              user.profitability
            ])
          ]
          
          const ws = XLSX.utils.aoa_to_sheet(monthDetailedData)
          XLSX.utils.book_append_sheet(workbook, ws, `${monthName} Detalhado`)
        }

        // Planilha detalhada de comissões por usuário
        const detailedCommissionsData = [
          [
            "Nome do Usuário",
            "Email",
            "Tipo de Usuário",
            "Valor Investido",
            "Comissão Mensal",
            "Próximo Recebimento",
            "Qtd. Investimentos Ativos",
            "Período",
            "Rentabilidade",
            "Último Investimento Ativo"
          ],
          ...uniqueUserCommissions.map((user: any) => [
            user.userName,
            user.userEmail,
            user.userType,
            formatCurrency(user.totalInvested),
            formatCurrency(user.monthlyCommission),
            user.nextPaymentDate,
            user.investmentCount,
            user.investmentPeriod,
            user.profitability,
            user.lastInvestmentDate ? new Date(user.lastInvestmentDate).toLocaleDateString("pt-BR") : "N/A"
          ])
        ]
        const ws11 = XLSX.utils.aoa_to_sheet(detailedCommissionsData)
        XLSX.utils.book_append_sheet(workbook, ws11, "Todas as Comissões por Usuário")

        // Calcular comissões detalhadas por assessores
        const advisorCommissions = activeInvestmentsOnly.map((inv: any) => {
          const user = inv.profiles
          if (!user || user.user_type !== "assessor") return null
          
          const totalInvested = activeInvestmentsOnly
            .filter((i: any) => i.user_id === inv.user_id)
            .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
          
          const monthlyCommission = totalInvested * COMMISSION_RATES.assessor // 3% para assessores
          const paymentDate = inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at)
          const nextPayment = new Date(paymentDate)
          nextPayment.setDate(paymentDate.getDate() + 30)
          
          const investmentPeriod = inv.commitment_period ? `${inv.commitment_period} meses` : "N/A"
          const profitability = inv.profitability_liquidity || "N/A"
          
          return {
            userId: inv.user_id,
            userName: user.full_name || "N/A",
            userEmail: user.email || "N/A",
            totalInvested,
            monthlyCommission,
            nextPaymentDate: nextPayment.toLocaleDateString("pt-BR"),
            investmentCount: activeInvestmentsOnly.filter((i: any) => i.user_id === inv.user_id).length,
            lastInvestmentDate: activeInvestmentsOnly
              .filter((i: any) => i.user_id === inv.user_id)
              .sort((a: any, b: any) => {
                const dateA = a.payment_date ? new Date(a.payment_date) : new Date(a.created_at)
                const dateB = b.payment_date ? new Date(b.payment_date) : new Date(b.created_at)
                return dateB.getTime() - dateA.getTime()
              })[0]?.payment_date || activeInvestmentsOnly
              .filter((i: any) => i.user_id === inv.user_id)
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at,
            investmentPeriod,
            profitability
          }
        }).filter(Boolean)

        const uniqueAdvisorCommissions = advisorCommissions.reduce((acc: any[], current: any) => {
          const existing = acc.find(item => item.userId === current.userId)
          if (!existing) {
            acc.push(current)
          }
          return acc
        }, []).sort((a: any, b: any) => b.monthlyCommission - a.monthlyCommission)

        // Planilha detalhada de comissões por assessores
        const advisorDetailedData = [
          [
            "Nome do Assessor",
            "Email",
            "Valor Investido",
            "Comissão Mensal (3%)",
            "Próximo Recebimento",
            "Qtd. Investimentos Ativos",
            "Período",
            "Rentabilidade",
            "Último Investimento Ativo"
          ],
          ...uniqueAdvisorCommissions.map((advisor: any) => [
            advisor.userName,
            advisor.userEmail,
            formatCurrency(advisor.totalInvested),
            formatCurrency(advisor.monthlyCommission),
            advisor.nextPaymentDate,
            advisor.investmentCount,
            advisor.investmentPeriod,
            advisor.profitability,
            advisor.lastInvestmentDate ? new Date(advisor.lastInvestmentDate).toLocaleDateString("pt-BR") : "N/A"
          ])
        ]
        const ws12 = XLSX.utils.aoa_to_sheet(advisorDetailedData)
        XLSX.utils.book_append_sheet(workbook, ws12, "Comissões por Assessores")

        // Calcular comissões detalhadas por escritórios
        const officeCommissions = activeInvestmentsOnly.map((inv: any) => {
          const user = inv.profiles
          if (!user || user.user_type !== "escritorio") return null
          
          const totalInvested = activeInvestmentsOnly
            .filter((i: any) => i.user_id === inv.user_id)
            .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
          
          const monthlyCommission = totalInvested * COMMISSION_RATES.escritorio // 1% para escritórios
          const paymentDate = inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at)
          const nextPayment = new Date(paymentDate)
          nextPayment.setDate(paymentDate.getDate() + 30)
          
          const investmentPeriod = inv.commitment_period ? `${inv.commitment_period} meses` : "N/A"
          const profitability = inv.profitability_liquidity || "N/A"
          
          return {
            userId: inv.user_id,
            userName: user.full_name || "N/A",
            userEmail: user.email || "N/A",
            totalInvested,
            monthlyCommission,
            nextPaymentDate: nextPayment.toLocaleDateString("pt-BR"),
            investmentCount: activeInvestmentsOnly.filter((i: any) => i.user_id === inv.user_id).length,
            lastInvestmentDate: activeInvestmentsOnly
              .filter((i: any) => i.user_id === inv.user_id)
              .sort((a: any, b: any) => {
                const dateA = a.payment_date ? new Date(a.payment_date) : new Date(a.created_at)
                const dateB = b.payment_date ? new Date(b.payment_date) : new Date(b.created_at)
                return dateB.getTime() - dateA.getTime()
              })[0]?.payment_date || activeInvestmentsOnly
              .filter((i: any) => i.user_id === inv.user_id)
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at,
            investmentPeriod,
            profitability
          }
        }).filter(Boolean)

        const uniqueOfficeCommissions = officeCommissions.reduce((acc: any[], current: any) => {
          const existing = acc.find(item => item.userId === current.userId)
          if (!existing) {
            acc.push(current)
          }
          return acc
        }, []).sort((a: any, b: any) => b.monthlyCommission - a.monthlyCommission)

        // Planilha detalhada de comissões por escritórios
        const officeDetailedData = [
          [
            "Nome do Escritório",
            "Email",
            "Valor Investido",
            "Comissão Mensal (1%)",
            "Próximo Recebimento",
            "Qtd. Investimentos Ativos",
            "Período",
            "Rentabilidade",
            "Último Investimento Ativo"
          ],
          ...uniqueOfficeCommissions.map((office: any) => [
            office.userName,
            office.userEmail,
            formatCurrency(office.totalInvested),
            formatCurrency(office.monthlyCommission),
            office.nextPaymentDate,
            office.investmentCount,
            office.investmentPeriod,
            office.profitability,
            office.lastInvestmentDate ? new Date(office.lastInvestmentDate).toLocaleDateString("pt-BR") : "N/A"
          ])
        ]
        const ws13 = XLSX.utils.aoa_to_sheet(officeDetailedData)
        XLSX.utils.book_append_sheet(workbook, ws13, "Comissões por Escritórios")
        break

      default:
        // Dashboard completo
        const dashboardData = [
          ["Métrica", "Valor"],
          ["Total Investido", formatCurrency(analyticsData.investments.total)],
          ["Crescimento (%)", `${analyticsData.investments.growth}%`],
          ["Usuários Ativos", analyticsData.users.total],
          ["Receita Recorrente", formatCurrency(analyticsData.recurrence.monthlyRevenue)],
          ["Ticket Médio", formatCurrency(analyticsData.investments.avgTicket)],
          ["Fluxos em Risco", analyticsData.recurrence.atRisk],
          ["Contratos Ativos", analyticsData.recurrence.activeFlows],
          ["Duração Média (meses)", analyticsData.recurrence.avgDuration.toFixed(1)],
          ["Taxa de Churn (%)", `${analyticsData.users.churnRate}%`],
        ]
        const ws14 = XLSX.utils.aoa_to_sheet(dashboardData)
        XLSX.utils.book_append_sheet(workbook, ws14, "Dashboard Completo")
    }

    XLSX.writeFile(workbook, `${fileName}.xlsx`)
  }

  const exportToPDF = (type: string, fileName: string) => {
    if (!analyticsData) return

    const doc = new jsPDF('landscape') // Usar orientação paisagem para melhor aproveitamento
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPosition = 15

    // Margens otimizadas para máximo aproveitamento
    const leftMargin = 10
    const rightMargin = 10
    const topMargin = 15
    const bottomMargin = 20
    const usableWidth = pageWidth - leftMargin - rightMargin
    const usableHeight = pageHeight - topMargin - bottomMargin

    // Função para adicionar título
    const addTitle = (title: string) => {
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text(title, leftMargin, yPosition)
      yPosition += 12
    }

    // Função para adicionar subtítulo
    const addSubtitle = (subtitle: string) => {
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text(subtitle, leftMargin, yPosition)
      yPosition += 8
    }

    // Função para adicionar texto
    const addText = (text: string) => {
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text(text, leftMargin, yPosition)
      yPosition += 6
    }

    // Função para verificar nova página
    const checkNewPage = () => {
      if (yPosition > pageHeight - bottomMargin) {
        doc.addPage()
        yPosition = topMargin
      }
    }

    // Função para criar tabela otimizada
    const createSimpleTable = (headers: string[], rows: string[][]) => {
      // Larguras otimizadas para orientação paisagem
      const colWidths = headers.map((header, index) => {
        switch (header.toLowerCase()) {
          case 'investidor':
          case 'usuário':
            return 60 // Mais espaço para nomes
          case 'valor':
          case 'valor investido':
          case 'comissão mensal':
            return 35
          case 'status':
            return 25
          case 'data':
          case 'próximo recebimento':
            return 30
          case 'período':
            return 25
          case 'rentabilidade':
            return 30
          case 'qtd. investimentos ativos':
            return 30
          case 'email':
            return 45
          case 'tipo de usuário':
            return 30
          case 'total projetado':
          case 'recorrentes projetados':
            return 35
          default:
            return 35
        }
      })
      
      const totalWidth = colWidths.reduce((sum, width) => sum + width, 0)
      const startX = leftMargin
      
      // Cabeçalho da tabela
      doc.setFillColor(248, 250, 252) // Cinza claro
      doc.rect(startX, yPosition, usableWidth, 12, 'F')
      doc.setDrawColor(200, 200, 200)
      doc.rect(startX, yPosition, usableWidth, 12, 'S')
      
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      
      let currentX = startX + 5
      headers.forEach((header, index) => {
        // Truncar texto do cabeçalho se for muito longo
        const maxLength = Math.floor(colWidths[index] / 1.2)
        let truncatedHeader = header
        if (header.length > maxLength) {
          truncatedHeader = header.substring(0, maxLength - 3) + '...'
        }
        doc.text(truncatedHeader, currentX, yPosition + 8)
        currentX += colWidths[index]
      })
      
      yPosition += 12
      
      // Linhas da tabela
      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      
      rows.forEach((row, rowIndex) => {
        if (yPosition > pageHeight - bottomMargin) {
          doc.addPage()
          yPosition = topMargin
          
          // Reimprimir cabeçalho da tabela
          doc.setFillColor(248, 250, 252)
          doc.rect(startX, yPosition, usableWidth, 12, 'F')
          doc.setDrawColor(200, 200, 200)
          doc.rect(startX, yPosition, usableWidth, 12, 'S')
          
          doc.setFontSize(9)
          doc.setFont("helvetica", "bold")
          currentX = startX + 5
          headers.forEach((header, index) => {
            const maxLength = Math.floor(colWidths[index] / 1.2)
            let truncatedHeader = header
            if (header.length > maxLength) {
              truncatedHeader = header.substring(0, maxLength - 3) + '...'
            }
            doc.text(truncatedHeader, currentX, yPosition + 8)
            currentX += colWidths[index]
          })
          yPosition += 12
          doc.setFontSize(8)
          doc.setFont("helvetica", "normal")
        }
        
        // Linha com fundo alternado
        if (rowIndex % 2 === 0) {
          doc.setFillColor(252, 252, 252)
          doc.rect(startX, yPosition - 3, usableWidth, 8, 'F')
        }
        
        currentX = startX + 5
        row.forEach((cell, colIndex) => {
          // Truncar texto se for muito longo
          const maxLength = Math.floor(colWidths[colIndex] / 1.2)
          let truncatedCell = cell
          if (cell.length > maxLength) {
            truncatedCell = cell.substring(0, maxLength - 3) + '...'
          }
          
          doc.text(truncatedCell, currentX, yPosition + 5)
          currentX += colWidths[colIndex]
        })
        
        yPosition += 8
      })
      
      yPosition += 10
    }

    // Cabeçalho compacto
    doc.setFillColor(248, 250, 252)
    doc.rect(0, 0, pageWidth, 40, 'F')
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Relatório de Investimentos", pageWidth / 2, 20, { align: "center" })
    
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, leftMargin, 32)
    doc.text(`Período: ${selectedPeriod}`, pageWidth - rightMargin, 32, { align: "right" })
    
    yPosition = 50

    switch (type) {
      case "investments":
        // Calcular métricas detalhadas dos investimentos
        const totalValue = detailedInvestments.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)
        const approvedValue = detailedInvestments
          .filter((inv: any) => inv.status === "active")
          .reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)
        const pendingValue = detailedInvestments
          .filter((inv: any) => inv.status === "pending")
          .reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)

        // Encontrar maior investimento
        const biggestInvestment = detailedInvestments.length > 0 
          ? detailedInvestments.reduce((max: any, inv: any) => 
              (inv.amount || 0) > (max.amount || 0) ? inv : max
            )
          : null

        // Encontrar último investimento (mais recente)
        const lastInvestment = detailedInvestments.length > 0
          ? detailedInvestments.reduce((latest: any, inv: any) => 
              (inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at)) > (latest.payment_date ? new Date(latest.payment_date) : new Date(latest.created_at)) ? inv : latest
            )
          : null

        // Encontrar maior investimento ativo
        const biggestActiveInvestment = detailedInvestments.length > 0
          ? detailedInvestments
              .filter((inv: any) => inv.status === "active")
              .reduce((max: any, inv: any) => 
                (inv.amount || 0) > (max.amount || 0) ? inv : max, 
                detailedInvestments.filter((inv: any) => inv.status === "active")[0] || null
              )
          : null

        // Encontrar último investimento ativo (mais recente)
        const lastActiveInvestment = detailedInvestments.length > 0
          ? detailedInvestments
              .filter((inv: any) => inv.status === "active")
              .reduce((latest: any, inv: any) => 
                (inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at)) > (latest.payment_date ? new Date(latest.payment_date) : new Date(latest.created_at)) ? inv : latest,
                detailedInvestments.filter((inv: any) => inv.status === "active")[0] || null
              )
          : null

        addSubtitle("Resumo de Investimentos")
        addText(`Total Investido: ${formatCurrency(analyticsData.investments.total)}`)
        addText(`Crescimento: ${analyticsData.investments.growth}%`)
        addText(`Ticket Médio: ${formatCurrency(analyticsData.investments.avgTicket)}`)
        addText(`Taxa de Retenção: ${analyticsData.investments.retention}%`)
        
        yPosition += 5
        addSubtitle("Valores Detalhados")
        addText(`Valor Total: ${formatCurrency(totalValue)}`)
        addText(`Valor Total Aprovado: ${formatCurrency(approvedValue)}`)
        addText(`Valor Total Pendente: ${formatCurrency(pendingValue)}`)
        
        yPosition += 5
        addSubtitle("Maior Investimento")
        if (biggestInvestment) {
          addText(`Investidor: ${biggestInvestment.profiles?.full_name || "N/A"}`)
          addText(`Valor: ${formatCurrency(biggestInvestment.amount || 0)}`)
          addText(`Status: ${biggestInvestment.status === "pending" ? "Pendente" : biggestInvestment.status === "active" ? "Ativo" : biggestInvestment.status === "withdrawn" ? "Resgatado" : biggestInvestment.status}`)
          addText(`Data: ${new Date(biggestInvestment.payment_date || biggestInvestment.created_at).toLocaleDateString("pt-BR")}`)
          addText(`Período: ${biggestInvestment.commitment_period ? `${biggestInvestment.commitment_period} meses` : "N/A"}`)
          addText(`Rentabilidade: ${biggestInvestment.profitability_liquidity || "N/A"}`)
        } else {
          addText("Nenhum investimento encontrado")
        }
        
        yPosition += 5
        addSubtitle("Último Investimento")
        if (lastInvestment) {
          addText(`Investidor: ${lastInvestment.profiles?.full_name || "N/A"}`)
          addText(`Valor: ${formatCurrency(lastInvestment.amount || 0)}`)
          addText(`Status: ${lastInvestment.status === "pending" ? "Pendente" : lastInvestment.status === "active" ? "Ativo" : lastInvestment.status === "withdrawn" ? "Resgatado" : lastInvestment.status}`)
          addText(`Data: ${new Date(lastInvestment.payment_date || lastInvestment.created_at).toLocaleDateString("pt-BR")}`)
          addText(`Período: ${lastInvestment.commitment_period ? `${lastInvestment.commitment_period} meses` : "N/A"}`)
          addText(`Rentabilidade: ${lastInvestment.profitability_liquidity || "N/A"}`)
        } else {
          addText("Nenhum investimento encontrado")
        }
        
        checkNewPage()
        addSubtitle("Maior Investimento Ativo")
        if (biggestActiveInvestment) {
          addText(`Investidor: ${biggestActiveInvestment.profiles?.full_name || "N/A"}`)
          addText(`Valor: ${formatCurrency(biggestActiveInvestment.amount || 0)}`)
          addText(`Status: Ativo`)
          addText(`Data: ${new Date(biggestActiveInvestment.payment_date || biggestActiveInvestment.created_at).toLocaleDateString("pt-BR")}`)
          addText(`Período: ${biggestActiveInvestment.commitment_period ? `${biggestActiveInvestment.commitment_period} meses` : "N/A"}`)
          addText(`Rentabilidade: ${biggestActiveInvestment.profitability_liquidity || "N/A"}`)
        } else {
          addText("Nenhum investimento ativo encontrado")
        }
        
        checkNewPage()
        addSubtitle("Último Investimento Ativo")
        if (lastActiveInvestment) {
          addText(`Investidor: ${lastActiveInvestment.profiles?.full_name || "N/A"}`)
          addText(`Valor: ${formatCurrency(lastActiveInvestment.amount || 0)}`)
          addText(`Status: Ativo`)
          addText(`Data: ${new Date(lastActiveInvestment.payment_date || lastActiveInvestment.created_at).toLocaleDateString("pt-BR")}`)
          addText(`Período: ${lastActiveInvestment.commitment_period ? `${lastActiveInvestment.commitment_period} meses` : "N/A"}`)
          addText(`Rentabilidade: ${lastActiveInvestment.profitability_liquidity || "N/A"}`)
        } else {
          addText("Nenhum investimento ativo encontrado")
        }
        
        checkNewPage()
        addSubtitle("Evolução Mensal")
        
        const investmentsTableData = analyticsData.investments.monthlyData.map(data => [
          data.month,
          formatCurrency(data.value),
          `${data.growth}%`
        ])
        
        createSimpleTable(['Mês', 'Valor', 'Crescimento'], investmentsTableData)
        
        checkNewPage()
        addSubtitle("Investimentos Detalhados")
        
        const detailedInvestmentsData = detailedInvestments.length > 0 ? detailedInvestments.map(inv => {
          const investmentDate = new Date(inv.created_at)
          const userCreatedDate = new Date(inv.profiles?.created_at || inv.created_at)
          
          return [
            inv.profiles?.full_name || "N/A",
            formatCurrency(inv.amount || 0),
            inv.status === "pending" ? "Pendente" : 
            inv.status === "active" ? "Ativo" : 
            inv.status === "withdrawn" ? "Resgatado" : 
            inv.status || "N/A",
            investmentDate.toLocaleDateString("pt-BR"),
            inv.commitment_period ? `${inv.commitment_period} meses` : "N/A",
            inv.profitability_liquidity || "N/A"
          ]
        }) : [["Nenhum investimento encontrado no período selecionado"]]
        
        if (detailedInvestmentsData.length > 0) {
          createSimpleTable([
            'Investidor', 
            'Valor', 
            'Status', 
            'Data', 
            'Período',
            'Rentabilidade'
          ], detailedInvestmentsData)
        } else {
          addText("Nenhum investimento encontrado no período selecionado.")
        }
        break

      case "users":
        addSubtitle("Resumo de Usuários")
        addText(`Total de Usuários: ${analyticsData.users.total}`)
        addText(`Investidores: ${analyticsData.users.investors}`)
        addText(`Distribuidores: ${analyticsData.users.distributors}`)
        addText(`Escritórios: ${analyticsData.users.offices}`)
        addText(`Assessores: ${analyticsData.users.advisors}`)
        addText(`Novos Este Mês: ${analyticsData.users.newThisMonth}`)
        addText(`Taxa de Churn: ${analyticsData.users.churnRate}%`)
        
        checkNewPage()
        addSubtitle("Crescimento Mensal")
        
        const usersTableData = analyticsData.users.monthlyGrowth.map(data => [
          data.month,
          data.investors.toString(),
          data.distributors.toString(),
          (data.investors + data.distributors).toString()
        ])
        
        createSimpleTable(['Mês', 'Investidores', 'Distribuidores', 'Total'], usersTableData)
        break

      case "commissions":
        // Calcular comissões detalhadas por usuário (apenas investimentos ativos)
        const activeInvestmentsOnly = detailedInvestments.filter((inv: any) => inv.status === "active")
        const userCommissions = activeInvestmentsOnly.map((inv: any) => {
          const user = inv.profiles
          if (!user) return null
          
          const totalInvested = activeInvestmentsOnly
            .filter((i: any) => i.user_id === inv.user_id)
            .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
          
          const monthlyCommission = totalInvested * 0.02
          // Calcular próximo recebimento: 30 dias depois da data de pagamento
          const paymentDate = inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at)
          const nextPayment = new Date(paymentDate)
          nextPayment.setDate(paymentDate.getDate() + 30) // 30 dias depois do pagamento
          
          // Calcular período e rentabilidade do investimento
          const investmentPeriod = inv.commitment_period ? `${inv.commitment_period} meses` : "N/A"
          const profitability = inv.profitability_liquidity || "N/A"
          
          return {
            userId: inv.user_id,
            userName: user.full_name || "N/A",
            userEmail: user.email || "N/A",
            userType: user.user_type || "N/A",
            totalInvested,
            monthlyCommission,
            nextPaymentDate: nextPayment.toLocaleDateString("pt-BR"),
            investmentCount: activeInvestmentsOnly.filter((i: any) => i.user_id === inv.user_id).length,
            lastInvestmentDate: activeInvestmentsOnly
              .filter((i: any) => i.user_id === inv.user_id)
              .sort((a: any, b: any) => {
                const dateA = a.payment_date ? new Date(a.payment_date) : new Date(a.created_at)
                const dateB = b.payment_date ? new Date(b.payment_date) : new Date(b.created_at)
                return dateB.getTime() - dateA.getTime()
              })[0]?.payment_date || activeInvestmentsOnly
              .filter((i: any) => i.user_id === inv.user_id)
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at,
            investmentPeriod,
            profitability
          }
        }).filter(Boolean)

        const uniqueUserCommissions = userCommissions.reduce((acc: any[], current: any) => {
          const existing = acc.find(item => item.userId === current.userId)
          if (!existing) {
            acc.push(current)
          }
          return acc
        }, []).sort((a: any, b: any) => b.monthlyCommission - a.monthlyCommission)

        addSubtitle("Resumo de Comissões")
        addText(`Total: ${formatCurrency(analyticsData.commissions.total)}`)
        addText(`Assessores (3%): ${formatCurrency(analyticsData.commissions.advisors)}`)
        addText(`Escritórios (1%): ${formatCurrency(analyticsData.commissions.offices)}`)
        addText(`Recorrentes: ${formatCurrency(analyticsData.commissions.recurrent)}`)
        addText(`Taxa Média: ${analyticsData.commissions.avgCommissionRate}%`)
        
        yPosition += 5
        addSubtitle("Estatísticas de Usuários Ativos")
        addText(`Total de Usuários Ativos: ${uniqueUserCommissions.length}`)
        addText(`Valor Total Investido Ativo: ${formatCurrency(uniqueUserCommissions.reduce((sum: number, u: any) => sum + u.totalInvested, 0))}`)
        addText(`Comissão Total Mensal: ${formatCurrency(uniqueUserCommissions.reduce((sum: number, u: any) => sum + u.monthlyCommission, 0))}`)
        
        // Criar 6 tabelas detalhadas para os próximos 6 meses
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
        
        for (let i = 1; i <= 6; i++) {
          checkNewPage()
          const monthIndex = (currentMonth + i) % 12
          const monthName = months[monthIndex]
          const targetMonth = new Date()
          targetMonth.setMonth(currentMonth + i)
          
          addSubtitle(`Comissões de ${monthName} - Detalhadas`)
          
          // Filtrar usuários que recebem comissão no mês específico
          const monthUsers = uniqueUserCommissions.filter((user: any) => {
            const nextPaymentDate = new Date(user.nextPaymentDate.split('/').reverse().join('-'))
            return nextPaymentDate.getMonth() === targetMonth.getMonth() && nextPaymentDate.getFullYear() === targetMonth.getFullYear()
          })
          
          const monthTableData = monthUsers.map((user: any) => [
            user.userName,
            formatCurrency(user.totalInvested),
            formatCurrency(user.monthlyCommission),
            user.nextPaymentDate,
            user.investmentCount.toString(),
            user.investmentPeriod,
            user.profitability
          ])
          
          createSimpleTable([
            'Usuário', 
            'Valor Investido', 
            'Comissão Mensal', 
            'Data de Recebimento',
            'Qtd. Investimentos Ativos',
            'Período',
            'Rentabilidade'
          ], monthTableData)
        }
        
        checkNewPage()
        addSubtitle("Todas as Comissões por Usuário")
        
        const userCommissionsTableData = uniqueUserCommissions.map((user: any) => [
          user.userName,
          formatCurrency(user.totalInvested),
          formatCurrency(user.monthlyCommission),
          user.nextPaymentDate,
          user.investmentCount.toString(),
          user.investmentPeriod,
          user.profitability
        ])
        
        createSimpleTable([
          'Usuário', 
          'Valor Investido', 
          'Comissão Mensal', 
          'Próximo Recebimento',
          'Qtd. Investimentos Ativos',
          'Período',
          'Rentabilidade'
        ], userCommissionsTableData)

        // Calcular comissões detalhadas por assessores
        const advisorCommissions = activeInvestmentsOnly.map((inv: any) => {
          const user = inv.profiles
          if (!user || user.user_type !== "assessor") return null
          
          const totalInvested = activeInvestmentsOnly
            .filter((i: any) => i.user_id === inv.user_id)
            .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
          
          const monthlyCommission = totalInvested * COMMISSION_RATES.assessor // 3% para assessores
          const paymentDate = inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at)
          const nextPayment = new Date(paymentDate)
          nextPayment.setDate(paymentDate.getDate() + 30)
          
          const investmentPeriod = inv.commitment_period ? `${inv.commitment_period} meses` : "N/A"
          const profitability = inv.profitability_liquidity || "N/A"
          
          return {
            userId: inv.user_id,
            userName: user.full_name || "N/A",
            userEmail: user.email || "N/A",
            totalInvested,
            monthlyCommission,
            nextPaymentDate: nextPayment.toLocaleDateString("pt-BR"),
            investmentCount: activeInvestmentsOnly.filter((i: any) => i.user_id === inv.user_id).length,
            lastInvestmentDate: activeInvestmentsOnly
              .filter((i: any) => i.user_id === inv.user_id)
              .sort((a: any, b: any) => {
                const dateA = a.payment_date ? new Date(a.payment_date) : new Date(a.created_at)
                const dateB = b.payment_date ? new Date(b.payment_date) : new Date(b.created_at)
                return dateB.getTime() - dateA.getTime()
              })[0]?.payment_date || activeInvestmentsOnly
              .filter((i: any) => i.user_id === inv.user_id)
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at,
            investmentPeriod,
            profitability
          }
        }).filter(Boolean)

        const uniqueAdvisorCommissions = advisorCommissions.reduce((acc: any[], current: any) => {
          const existing = acc.find(item => item.userId === current.userId)
          if (!existing) {
            acc.push(current)
          }
          return acc
        }, []).sort((a: any, b: any) => b.monthlyCommission - a.monthlyCommission)

        checkNewPage()
        addSubtitle("Comissões Detalhadas por Assessores")
        
        const advisorTableData = uniqueAdvisorCommissions.map((advisor: any) => [
          advisor.userName,
          advisor.userEmail,
          formatCurrency(advisor.totalInvested),
          formatCurrency(advisor.monthlyCommission),
          advisor.nextPaymentDate,
          advisor.investmentCount.toString(),
          advisor.investmentPeriod,
          advisor.profitability
        ])
        
        createSimpleTable([
          'Assessor', 
          'Email',
          'Valor Investido', 
          'Comissão Mensal (3%)', 
          'Próximo Recebimento',
          'Qtd. Investimentos Ativos',
          'Período',
          'Rentabilidade'
        ], advisorTableData)

        // Calcular comissões detalhadas por escritórios
        const officeCommissions = activeInvestmentsOnly.map((inv: any) => {
          const user = inv.profiles
          if (!user || user.user_type !== "escritorio") return null
          
          const totalInvested = activeInvestmentsOnly
            .filter((i: any) => i.user_id === inv.user_id)
            .reduce((sum: number, i: any) => sum + (i.amount || 0), 0)
          
          const monthlyCommission = totalInvested * COMMISSION_RATES.escritorio // 1% para escritórios
          const paymentDate = inv.payment_date ? new Date(inv.payment_date) : new Date(inv.created_at)
          const nextPayment = new Date(paymentDate)
          nextPayment.setDate(paymentDate.getDate() + 30)
          
          const investmentPeriod = inv.commitment_period ? `${inv.commitment_period} meses` : "N/A"
          const profitability = inv.profitability_liquidity || "N/A"
          
          return {
            userId: inv.user_id,
            userName: user.full_name || "N/A",
            userEmail: user.email || "N/A",
            totalInvested,
            monthlyCommission,
            nextPaymentDate: nextPayment.toLocaleDateString("pt-BR"),
            investmentCount: activeInvestmentsOnly.filter((i: any) => i.user_id === inv.user_id).length,
            lastInvestmentDate: activeInvestmentsOnly
              .filter((i: any) => i.user_id === inv.user_id)
              .sort((a: any, b: any) => {
                const dateA = a.payment_date ? new Date(a.payment_date) : new Date(a.created_at)
                const dateB = b.payment_date ? new Date(b.payment_date) : new Date(b.created_at)
                return dateB.getTime() - dateA.getTime()
              })[0]?.payment_date || activeInvestmentsOnly
              .filter((i: any) => i.user_id === inv.user_id)
              .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at,
            investmentPeriod,
            profitability
          }
        }).filter(Boolean)

        const uniqueOfficeCommissions = officeCommissions.reduce((acc: any[], current: any) => {
          const existing = acc.find(item => item.userId === current.userId)
          if (!existing) {
            acc.push(current)
          }
          return acc
        }, []).sort((a: any, b: any) => b.monthlyCommission - a.monthlyCommission)

        checkNewPage()
        addSubtitle("Comissões Detalhadas por Escritórios")
        
        const officeTableData = uniqueOfficeCommissions.map((office: any) => [
          office.userName,
          office.userEmail,
          formatCurrency(office.totalInvested),
          formatCurrency(office.monthlyCommission),
          office.nextPaymentDate,
          office.investmentCount.toString(),
          office.investmentPeriod,
          office.profitability
        ])
        
        createSimpleTable([
          'Escritório', 
          'Email',
          'Valor Investido', 
          'Comissão Mensal (1%)', 
          'Próximo Recebimento',
          'Qtd. Investimentos Ativos',
          'Período',
          'Rentabilidade'
        ], officeTableData)
        break

      default:
        addSubtitle("Dashboard Completo")
        addText(`Total Investido: ${formatCurrency(analyticsData.investments.total)}`)
        addText(`Crescimento: ${analyticsData.investments.growth}%`)
        addText(`Usuários Ativos: ${analyticsData.users.total}`)
        addText(`Receita Recorrente: ${formatCurrency(analyticsData.recurrence.monthlyRevenue)}`)
        addText(`Ticket Médio: ${formatCurrency(analyticsData.investments.avgTicket)}`)
        addText(`Fluxos em Risco: ${analyticsData.recurrence.atRisk}`)
        addText(`Contratos Ativos: ${analyticsData.recurrence.activeFlows}`)
        addText(`Duração Média: ${analyticsData.recurrence.avgDuration.toFixed(1)} meses`)
        addText(`Taxa de Churn: ${analyticsData.users.churnRate}%`)
    }

    // Rodapé otimizado
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      
      // Linha separadora sutil
      doc.setDrawColor(200, 200, 200)
      doc.line(leftMargin, pageHeight - bottomMargin + 5, pageWidth - rightMargin, pageHeight - bottomMargin + 5)
      
      // Informações do rodapé
      doc.setFontSize(7)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - rightMargin, pageHeight - 8, { align: "right" })
      doc.text(`Relatório gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, leftMargin, pageHeight - 8)
      doc.text("Plataforma de Investimentos Agronegócio", leftMargin, pageHeight - 3)
    }

    doc.save(`${fileName}.pdf`)
  }

  const handleGenerateCustomReport = () => {
    toast({
      title: "Relatório personalizado criado!",
      description: "O novo relatório foi configurado e será gerado automaticamente.",
    })
    setIsCustomReportOpen(false)
  }

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "financial":
        return <DollarSign className="w-4 h-4" />
      case "operational":
        return <Activity className="w-4 h-4" />
      case "compliance":
        return <CheckCircle className="w-4 h-4" />
      case "performance":
        return <TrendingUp className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "destructive"
      case "weekly":
        return "default"
      case "monthly":
        return "secondary"
      case "quarterly":
        return "outline"
      default:
        return "secondary"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando dados de analytics...</span>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar dados</h3>
          <p className="text-muted-foreground mb-4">Não foi possível carregar os dados de analytics.</p>
          <Button onClick={fetchAnalyticsData}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Analytics e Relatórios Avançados
          </h2>
          <p className="text-muted-foreground">Dashboard completo de métricas e análises da plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">Todos os períodos</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="6m">Últimos 6 meses</option>
            <option value="1y">Último ano</option>
          </select>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchAnalyticsData}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Activity className="w-4 h-4" />
            )}
          </Button>
          <Dialog open={isCustomReportOpen} onOpenChange={setIsCustomReportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Relatório Personalizado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Relatório Personalizado</DialogTitle>
                <DialogDescription>Configure um relatório automático personalizado</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reportName">Nome do Relatório</Label>
                    <Input id="reportName" placeholder="Ex: Relatório Semanal de Vendas" />
                  </div>
                  <div>
                    <Label htmlFor="reportType">Tipo</Label>
                    <select id="reportType" className="w-full mt-1 px-3 py-2 border rounded-lg">
                      <option value="financial">Financeiro</option>
                      <option value="operational">Operacional</option>
                      <option value="compliance">Compliance</option>
                      <option value="performance">Performance</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="reportDescription">Descrição</Label>
                  <Input id="reportDescription" placeholder="Descreva o conteúdo do relatório" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reportFrequency">Frequência</Label>
                    <select id="reportFrequency" className="w-full mt-1 px-3 py-2 border rounded-lg">
                      <option value="daily">Diário</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                      <option value="quarterly">Trimestral</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="reportRecipients">Destinatários</Label>
                    <Input id="reportRecipients" placeholder="emails@exemplo.com" />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCustomReportOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleGenerateCustomReport}>Criar Relatório</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex gap-2">
          <Button 
            className="bg-orange-600 hover:bg-orange-700"
              onClick={() => handleExportReport("dashboard", "excel")}
          >
            <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleExportReport("dashboard", "pdf")}
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF
          </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.investments.total)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-600">+{analyticsData.investments.growth}%</span> vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.users.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+{analyticsData.users.newThisMonth} novos este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Recorrente</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.recurrence.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(analyticsData.recurrence.projectedAnnual)} projetado anual
            </p>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.investments.avgTicket)}</div>
            <p className="text-xs text-muted-foreground">{analyticsData.investments.retention}% retenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fluxos em Risco</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.recurrence.atRisk}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(analyticsData.recurrence.churnImpact)} impacto potencial
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.recurrence.activeFlows}</div>
            <p className="text-xs text-muted-foreground">Investimentos com contratos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comprovantes PIX</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.recurrence.atRisk}</div>
            <p className="text-xs text-muted-foreground">Pendentes de aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duração Média</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.recurrence.avgDuration.toFixed(1)}m</div>
            <p className="text-xs text-muted-foreground">Tempo médio de investimento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.users.churnRate}%</div>
            <p className="text-xs text-muted-foreground">Taxa de saída de usuários</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="investments">Investimentos</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="commissions">Comissões</TabsTrigger>
          <TabsTrigger value="custom">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Evolução de Investimentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.investments.monthlyData.map((data, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{data.month}</p>
                        <p className="text-sm text-muted-foreground">
                          <span className={data.growth > 0 ? "text-emerald-600" : "text-red-600"}>
                            {data.growth > 0 ? "+" : ""}
                            {data.growth}%
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(data.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Estrutura Hierárquica
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">Escritórios</p>
                      <p className="text-sm text-muted-foreground">Estruturas principais</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{analyticsData.users.offices}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(analyticsData.commissions.offices)} comissões
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Assessores</p>
                      <p className="text-sm text-muted-foreground">Força de vendas</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{analyticsData.users.advisors}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(analyticsData.commissions.advisors)} comissões
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="font-medium">Investidores</p>
                      <p className="text-sm text-muted-foreground">Base de clientes</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{analyticsData.users.investors}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(analyticsData.investments.avgTicket)} ticket médio
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </TabsContent>

        <TabsContent value="investments" className="space-y-6">
          {detailedInvestments.length === 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Nenhum investimento encontrado</p>
                    <p className="text-sm">Não há investimentos no período selecionado ({selectedPeriod}).</p>
                    <p className="text-xs mt-1">Total de investimentos carregados: {detailedInvestments.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo de Investimentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="font-medium">Total Investido</p>
                      <p className="text-sm text-muted-foreground">Valor total em investimentos ativos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">{formatCurrency(analyticsData.investments.total)}</p>
                      <Badge variant="secondary">{analyticsData.investments.growth}% crescimento</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Ticket Médio</p>
                      <p className="text-sm text-muted-foreground">Valor médio por investidor</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(analyticsData.investments.avgTicket)}</p>
                      <Badge variant="secondary">{analyticsData.investments.retention}% retenção</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => handleExportReport("investments", "excel")}
                >
                  <Download className="w-4 h-4 mr-2" />
                    Excel
                </Button>
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => handleExportReport("investments", "pdf")}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evolução Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.investments.monthlyData.map((data, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{data.month}</span>
                      <span className="font-medium">{formatCurrency(data.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-sm font-medium">Total Atual</span>
                    <span className="font-bold text-emerald-600">
                      {formatCurrency(analyticsData.investments.total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Investidores</p>
                      <p className="text-sm text-muted-foreground">71.5% do total</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{analyticsData.users.investors}</p>
                      <Badge variant="secondary">Ativos</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-medium">Distribuidores</p>
                      <p className="text-sm text-muted-foreground">28.5% do total</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{analyticsData.users.distributors}</p>
                      <Badge variant="secondary">Ativos</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">Escritórios</p>
                      <p className="text-sm text-muted-foreground">Estruturas principais</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{analyticsData.users.offices}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(analyticsData.commissions.offices)} comissões
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="font-medium">Assessores</p>
                      <p className="text-sm text-muted-foreground">Força de vendas</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{analyticsData.users.advisors}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(analyticsData.commissions.advisors)} comissões
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => handleExportReport("users", "excel")}
                >
                  <Download className="w-4 h-4 mr-2" />
                    Excel
                </Button>
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => handleExportReport("users", "pdf")}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Crescimento de Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.users.monthlyGrowth.map((growth, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{growth.month}</span>
                      <span className="font-medium">+{growth.investors + growth.distributors} usuários</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-sm font-medium">Total</span>
                    <span className="font-bold text-emerald-600">{analyticsData.users.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-6">
          {/* Filtros de Período */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Filtros de Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period">Período</Label>
                  <Select
                    value={periodFilter.type}
                    onValueChange={(value) => setPeriodFilter(prev => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this_month">Deste mês</SelectItem>
                      <SelectItem value="next_month">Próximo mês</SelectItem>
                      <SelectItem value="next_6_months">Próximos 6 meses</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={periodFilter.startDate}
                    onChange={(e) => setPeriodFilter(prev => ({ ...prev, startDate: e.target.value }))}
                    disabled={periodFilter.type !== 'custom'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Data de Fim</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={periodFilter.endDate}
                    onChange={(e) => setPeriodFilter(prev => ({ ...prev, endDate: e.target.value }))}
                    disabled={periodFilter.type !== 'custom'}
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={filterCommissionsByPeriod} className="w-full">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Aplicar Filtro
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botões de Exportação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Exportar Relatórios
              </CardTitle>
              <CardDescription>
                Exporte relatórios detalhados de comissões em PDF ou Excel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  onClick={exportCommissionsPDF}
                  className="flex-1"
                  variant="outline"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button
                  onClick={exportCommissionsExcel}
                  className="flex-1"
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Resumo das Comissões */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Mensal</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalCommissions)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>


            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                    <p className="text-2xl font-bold">{pendingCommissions}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Atrasadas</p>
                    <p className="text-2xl font-bold">{overdueCommissions}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs de Comissões */}
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">Todas ({filteredCommissions.length})</TabsTrigger>
              <TabsTrigger value="investors">Investidores ({commissionsByType.investor?.length || 0})</TabsTrigger>
              <TabsTrigger value="distributors">Distribuidores ({commissionsByType.distributor?.length || 0})</TabsTrigger>
              <TabsTrigger value="admins">Administradores ({commissionsByType.admin?.length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Todas as Comissões</CardTitle>
                      <CardDescription>
                        Lista completa de comissões no período selecionado
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={exportCommissionsPDF}
                        variant="outline"
                        size="sm"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button
                        onClick={exportCommissionsExcel}
                        variant="outline"
                        size="sm"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Excel
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredCommissions.length === 0 ? (
                    <div className="text-center py-8">
                      <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhuma comissão encontrada no período selecionado</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredCommissions.map((commission) => (
                        <div key={commission.id} className="p-4 border rounded-lg">
                          {/* Nome do investidor no topo */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(commission.status)}
                              <div>
                                <h3 className="font-semibold text-lg">{commission.userName}</h3>
                                <p className="text-sm text-muted-foreground">{commission.userEmail}</p>
                              </div>
                            </div>
                            <Badge variant={getStatusBadgeVariant(commission.status)}>
                              {getStatusText(commission.status)}
                            </Badge>
                          </div>

                          {/* Valores das comissões */}
                          <div className="flex justify-start gap-6 mb-4">
                            <div className="text-center">
                              <p className="font-semibold text-lg">{formatCurrency(commission.monthlyCommission)}</p>
                              <p className="text-xs text-muted-foreground">
                                {commission.userType === 'investor' 
                                  ? 'Investidor' 
                                  : 'Comissão mensal'}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-blue-600">{formatCurrency(commission.officeCommission)}</p>
                              <p className="text-xs text-muted-foreground">Escritório</p>
                              {commission.officeName && (
                                <p className="text-xs text-blue-500 font-medium">{commission.officeName}</p>
                              )}
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-green-600">{formatCurrency(commission.advisorCommission)}</p>
                              <p className="text-xs text-muted-foreground">Assessor</p>
                              {commission.advisorName && (
                                <p className="text-xs text-green-500 font-medium">{commission.advisorName}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Investimento</p>
                              <p className="text-muted-foreground">{formatCurrency(commission.investmentAmount)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Taxa Aplicada</p>
                              <p className="text-muted-foreground">{(commission.commissionRate * 100).toFixed(2)}%</p>
                            </div>
                            <div>
                              <p className="font-medium">Prazo Resgate</p>
                              <p className="text-muted-foreground">
                                {commission.resgateMonths && !isNaN(commission.resgateMonths) 
                                  ? `${commission.resgateMonths} meses` 
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Liquidez</p>
                              <p className="text-muted-foreground capitalize">{commission.liquidityType}</p>
                            </div>
                            <div>
                              <p className="font-medium">Próximo Pagamento</p>
                              <p className="text-muted-foreground">{formatDate(commission.nextPaymentDate)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Meses Restantes</p>
                              <p className="text-muted-foreground">{commission.remainingMonths}</p>
                            </div>
                            <div>
                              <p className="font-medium">Taxa Escritório</p>
                              <p className="text-muted-foreground">
                                {commission.officeRate && !isNaN(commission.officeRate) 
                                  ? `${(commission.officeRate * 100).toFixed(2)}%` 
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Taxa Assessor</p>
                              <p className="text-muted-foreground">
                                {commission.advisorRate && !isNaN(commission.advisorRate) 
                                  ? `${(commission.advisorRate * 100).toFixed(2)}%` 
                                  : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="investors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Comissões de Investidores
                  </CardTitle>
                  <CardDescription>
                    Comissões de 2% para investidores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {commissionsByType.investor?.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhuma comissão de investidor encontrada</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {commissionsByType.investor?.map((commission) => (
                        <div key={commission.id} className="p-4 border rounded-lg">
                          {/* Nome do investidor no topo */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(commission.status)}
                              <div>
                                <h3 className="font-semibold text-lg">{commission.userName}</h3>
                                <p className="text-sm text-muted-foreground">{commission.userEmail}</p>
                              </div>
                            </div>
                            <Badge variant={getStatusBadgeVariant(commission.status)}>
                              {getStatusText(commission.status)}
                            </Badge>
                          </div>

                          {/* Valores das comissões */}
                          <div className="flex justify-start gap-6 mb-4">
                            <div className="text-center">
                              <p className="font-semibold text-lg">{formatCurrency(commission.monthlyCommission)}</p>
                              <p className="text-xs text-muted-foreground">
                                {commission.userType === 'investor' 
                                  ? 'Investidor' 
                                  : 'Comissão mensal'}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-blue-600">{formatCurrency(commission.officeCommission)}</p>
                              <p className="text-xs text-muted-foreground">Escritório</p>
                              {commission.officeName && (
                                <p className="text-xs text-blue-500 font-medium">{commission.officeName}</p>
                              )}
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-green-600">{formatCurrency(commission.advisorCommission)}</p>
                              <p className="text-xs text-muted-foreground">Assessor</p>
                              {commission.advisorName && (
                                <p className="text-xs text-green-500 font-medium">{commission.advisorName}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Investimento</p>
                              <p className="text-muted-foreground">{formatCurrency(commission.investmentAmount)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Taxa Aplicada</p>
                              <p className="text-muted-foreground">{(commission.commissionRate * 100).toFixed(2)}%</p>
                            </div>
                            <div>
                              <p className="font-medium">Prazo Resgate</p>
                              <p className="text-muted-foreground">
                                {commission.resgateMonths && !isNaN(commission.resgateMonths) 
                                  ? `${commission.resgateMonths} meses` 
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Liquidez</p>
                              <p className="text-muted-foreground capitalize">{commission.liquidityType}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mt-2">
                            <div>
                              <p className="font-medium">Total Pago</p>
                              <p className="text-muted-foreground">{formatCurrency(commission.totalCommission)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Próximo Pagamento</p>
                              <p className="text-muted-foreground">{formatDate(commission.nextPaymentDate)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Meses Restantes</p>
                              <p className="text-muted-foreground">{commission.remainingMonths}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="distributors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Comissões de Distribuidores
                  </CardTitle>
                  <CardDescription>
                    Comissões de 3% para distribuidores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {commissionsByType.distributor?.length === 0 ? (
                    <div className="text-center py-8">
                      <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhuma comissão de distribuidor encontrada</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {commissionsByType.distributor?.map((commission) => (
                        <div key={commission.id} className="p-4 border rounded-lg">
                          {/* Nome do investidor no topo */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(commission.status)}
                              <div>
                                <h3 className="font-semibold text-lg">{commission.userName}</h3>
                                <p className="text-sm text-muted-foreground">{commission.userEmail}</p>
                              </div>
                            </div>
                            <Badge variant={getStatusBadgeVariant(commission.status)}>
                              {getStatusText(commission.status)}
                            </Badge>
                          </div>

                          {/* Valores das comissões */}
                          <div className="flex justify-start gap-6 mb-4">
                            <div className="text-center">
                              <p className="font-semibold text-lg">{formatCurrency(commission.monthlyCommission)}</p>
                              <p className="text-xs text-muted-foreground">
                                {commission.userType === 'investor' 
                                  ? 'Investidor' 
                                  : 'Comissão mensal'}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-blue-600">{formatCurrency(commission.officeCommission)}</p>
                              <p className="text-xs text-muted-foreground">Escritório</p>
                              {commission.officeName && (
                                <p className="text-xs text-blue-500 font-medium">{commission.officeName}</p>
                              )}
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-green-600">{formatCurrency(commission.advisorCommission)}</p>
                              <p className="text-xs text-muted-foreground">Assessor</p>
                              {commission.advisorName && (
                                <p className="text-xs text-green-500 font-medium">{commission.advisorName}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Investimento</p>
                              <p className="text-muted-foreground">{formatCurrency(commission.investmentAmount)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Taxa Aplicada</p>
                              <p className="text-muted-foreground">{(commission.commissionRate * 100).toFixed(2)}%</p>
                            </div>
                            <div>
                              <p className="font-medium">Prazo Resgate</p>
                              <p className="text-muted-foreground">
                                {commission.resgateMonths && !isNaN(commission.resgateMonths) 
                                  ? `${commission.resgateMonths} meses` 
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Liquidez</p>
                              <p className="text-muted-foreground capitalize">{commission.liquidityType}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mt-2">
                            <div>
                              <p className="font-medium">Total Pago</p>
                              <p className="text-muted-foreground">{formatCurrency(commission.totalCommission)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Próximo Pagamento</p>
                              <p className="text-muted-foreground">{formatDate(commission.nextPaymentDate)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Meses Restantes</p>
                              <p className="text-muted-foreground">{commission.remainingMonths}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admins" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Comissões de Administradores
                  </CardTitle>
                  <CardDescription>
                    Comissões de 1% para administradores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {commissionsByType.admin?.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Nenhuma comissão de administrador encontrada</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {commissionsByType.admin?.map((commission) => (
                        <div key={commission.id} className="p-4 border rounded-lg">
                          {/* Nome do investidor no topo */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(commission.status)}
                              <div>
                                <h3 className="font-semibold text-lg">{commission.userName}</h3>
                                <p className="text-sm text-muted-foreground">{commission.userEmail}</p>
                              </div>
                            </div>
                            <Badge variant={getStatusBadgeVariant(commission.status)}>
                              {getStatusText(commission.status)}
                            </Badge>
                          </div>

                          {/* Valores das comissões */}
                          <div className="flex justify-start gap-6 mb-4">
                            <div className="text-center">
                              <p className="font-semibold text-lg">{formatCurrency(commission.monthlyCommission)}</p>
                              <p className="text-xs text-muted-foreground">
                                {commission.userType === 'investor' 
                                  ? 'Investidor' 
                                  : 'Comissão mensal'}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-blue-600">{formatCurrency(commission.officeCommission)}</p>
                              <p className="text-xs text-muted-foreground">Escritório</p>
                              {commission.officeName && (
                                <p className="text-xs text-blue-500 font-medium">{commission.officeName}</p>
                              )}
                            </div>
                            <div className="text-center">
                              <p className="font-semibold text-green-600">{formatCurrency(commission.advisorCommission)}</p>
                              <p className="text-xs text-muted-foreground">Assessor</p>
                              {commission.advisorName && (
                                <p className="text-xs text-green-500 font-medium">{commission.advisorName}</p>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="font-medium">Investimento</p>
                              <p className="text-muted-foreground">{formatCurrency(commission.investmentAmount)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Taxa Aplicada</p>
                              <p className="text-muted-foreground">{(commission.commissionRate * 100).toFixed(2)}%</p>
                            </div>
                            <div>
                              <p className="font-medium">Prazo Resgate</p>
                              <p className="text-muted-foreground">
                                {commission.resgateMonths && !isNaN(commission.resgateMonths) 
                                  ? `${commission.resgateMonths} meses` 
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium">Liquidez</p>
                              <p className="text-muted-foreground capitalize">{commission.liquidityType}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mt-2">
                            <div>
                              <p className="font-medium">Total Pago</p>
                              <p className="text-muted-foreground">{formatCurrency(commission.totalCommission)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Próximo Pagamento</p>
                              <p className="text-muted-foreground">{formatDate(commission.nextPaymentDate)}</p>
                            </div>
                            <div>
                              <p className="font-medium">Meses Restantes</p>
                              <p className="text-muted-foreground">{commission.remainingMonths}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>


        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Personalizados</CardTitle>
              <CardDescription>Gerencie relatórios automáticos e personalizados</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Última Geração</TableHead>
                    <TableHead>Destinatários</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{report.name}</p>
                          <p className="text-sm text-muted-foreground">{report.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {getReportTypeIcon(report.type)}
                          {report.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getFrequencyColor(report.frequency)}>{report.frequency}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(report.lastGenerated).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-wrap gap-1">
                          {report.recipients.slice(0, 2).map((email, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {email.split("@")[0]}
                            </Badge>
                          ))}
                          {report.recipients.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{report.recipients.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.isActive ? "default" : "secondary"}>
                          {report.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleExportReport(report.type, "excel")}
                            title="Exportar Excel"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleExportReport(report.type, "pdf")}
                            title="Exportar PDF"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" title="Agendar">
                            <Calendar className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios Gerados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600">127</div>
                  <p className="text-sm text-muted-foreground">Este mês</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taxa de Abertura</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">89.3%</div>
                  <p className="text-sm text-muted-foreground">Emails abertos</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tempo Médio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">2.4s</div>
                  <p className="text-sm text-muted-foreground">Geração de relatório</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

