"use client"

import { CardDescription } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Calculator,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Eye,
  RefreshCw,
  Users,
  Building2,
  Loader2,
  Download,
  FileText,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'

interface RecurrenceCalculation {
  id: string
  investorName: string
  investorEmail: string
  advisorName: string
  advisorId: string
  officeName: string
  officeId: string
  investmentAmount: number
  baseCommissionRate: number // Taxa base por role
  bonusRate: number // bonificações aplicadas
  totalCommissionRate: number
  monthlyCommission: number
  advisorShare: number // 70%
  officeShare: number // 30%
  startDate: string
  paymentDate: string
  projectedEndDate?: string
  status: "active" | "paused" | "cancelled" | "at_risk"
  totalPaid: number
  projectedTotal: number
  remainingMonths: number
  commitmentPeriod: number // Período de compromisso original
  profitabilityLiquidity?: string // Liquidez: Mensal, Semestral, Anual, Bienal, Trienal
  appliedBonuses: string[]
  riskFactors: string[]
}

interface RecurrenceProjection {
  month: number
  date: string
  advisorCommission: number
  officeCommission: number
  investorCommission: number
  totalCommission: number
  cumulativeAdvisor: number
  cumulativeOffice: number
  cumulativeInvestor: number
  cumulativeTotal: number
  totalValue: number // Valor do investimento com juros compostos
  activeBonuses: string[]
  riskLevel: "low" | "medium" | "high"
}

interface RecurrenceImpact {
  type: "withdrawal" | "bonus_expiry" | "campaign_end" | "performance_goal"
  description: string
  impactDate: string
  monthlyImpact: number
  totalImpact: number
  affectedRecurrences: number
}

export function RecurrenceCalculator() {
  const { toast } = useToast()
  const supabase = createClient()

  const [recurrences, setRecurrences] = useState<RecurrenceCalculation[]>([])
  const [projections, setProjections] = useState<RecurrenceProjection[]>([])
  const [impacts, setImpacts] = useState<RecurrenceImpact[]>([])
  const [selectedRecurrence, setSelectedRecurrence] = useState<RecurrenceCalculation | null>(null)
  const [isProjectionOpen, setIsProjectionOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<"all" | "investors" | "advisors" | "offices">("all")
  const [filterValue, setFilterValue] = useState<string>("")
  const [dateFilter, setDateFilter] = useState<string>("")
  const [filterOptions, setFilterOptions] = useState<{
    investors: { id: string; name: string }[]
    advisors: { id: string; name: string }[]
    offices: { id: string; name: string }[]
  }>({
    investors: [],
    advisors: [],
    offices: []
  })

  const fetchRecurrenceData = async () => {
    try {
      setLoading(true)

      // Buscar investimentos ativos
      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select("*")
        .eq("status", "active")

      if (investmentsError) {
        console.error("Erro ao buscar investimentos:", investmentsError)
        throw investmentsError
      }

      // Buscar todos os perfis
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, user_type, parent_id, office_id, hierarchy_level")

      if (profilesError) {
        console.error("Erro ao buscar perfis:", profilesError)
        throw profilesError
      }

      // Criar mapas para facilitar busca
      const profilesMap = new Map()
      const distributorsMap = new Map()
      
      profiles?.forEach((profile) => {
        profilesMap.set(profile.id, profile)
        if (profile.user_type === "distributor" || profile.user_type === "admin") {
          distributorsMap.set(profile.id, profile)
        }
      })

      // Calcular recorrências (apenas investimentos com payment_date)
      const processedRecurrences: RecurrenceCalculation[] = (investments || [])
        .filter((investment: any) => investment.payment_date) // Filtrar apenas investimentos com payment_date
        .map((investment: any): RecurrenceCalculation => {
        const investor = profilesMap.get(investment.user_id)
        let advisor = null
        let office = null

        // Encontrar assessor e escritório
        if (investor?.parent_id) {
          advisor = distributorsMap.get(investor.parent_id)
        }
        if (investor?.office_id) {
          office = distributorsMap.get(investor.office_id)
        }

        // Taxas de comissão: Assessor 3%, Escritório 1%
        const advisorRate = 3.0
        const officeRate = 1.0
        const totalCommissionRate = advisorRate + officeRate // 4% total
        
        const monthlyCommission = (investment.amount * totalCommissionRate) / 100
        const advisorShare = (investment.amount * advisorRate) / 100
        const officeShare = (investment.amount * officeRate) / 100

        // Calcular meses passados baseado na data de pagamento (usar apenas payment_date)
        const startDate = new Date(investment.payment_date)
        const now = new Date()
        const monthsPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
        const totalPaid = monthlyCommission * Math.max(0, monthsPassed)

        // Período de compromisso
        const commitmentPeriod = investment.commitment_period || 12
        const remainingMonths = Math.max(0, commitmentPeriod - monthsPassed)
        const profitabilityLiquidity = investment.profitability_liquidity || "Mensal"

        return {
          id: investment.id,
          investorName: investor?.full_name || "Investidor",
          investorEmail: investor?.email || "",
          advisorName: advisor?.full_name || "Assessor",
          advisorId: advisor?.id || "",
          officeName: office?.full_name || "Escritório",
          officeId: office?.id || "",
          investmentAmount: investment.amount,
          baseCommissionRate: advisorRate,
          bonusRate: officeRate,
          totalCommissionRate,
          monthlyCommission,
          advisorShare,
          officeShare,
          startDate: investment.payment_date,
          paymentDate: investment.payment_date,
          projectedEndDate: undefined,
          status: "active" as const,
          totalPaid,
          projectedTotal: monthlyCommission * commitmentPeriod,
          remainingMonths,
          commitmentPeriod,
          profitabilityLiquidity,
          appliedBonuses: [],
          riskFactors: [],
        }
      })

      console.log("Investimentos encontrados:", investments?.length || 0)
      console.log("Perfis encontrados:", profiles?.length || 0)
      console.log("Recorrências processadas:", processedRecurrences.length)
      
      // Preparar opções de filtro
      const investors = processedRecurrences
        .map(r => ({ id: r.investorName, name: r.investorName }))
        .filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        )
      
      const advisors = processedRecurrences
        .map(r => ({ id: r.advisorId, name: r.advisorName }))
        .filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id) && item.id
        )
      
      const offices = processedRecurrences
        .map(r => ({ id: r.officeId, name: r.officeName }))
        .filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id) && item.id
        )
      
      setFilterOptions({
        investors,
        advisors,
        offices
      })
      
      setRecurrences(processedRecurrences)
      setImpacts([]) // Por enquanto sem impactos
    } catch (error) {
      console.error("Erro ao buscar dados de recorrência:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de recorrência.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecurrenceData()
  }, [])

  // Função para filtrar recorrências
  const getFilteredRecurrences = () => {
    let filtered = recurrences
    
    // Aplicar filtro de data primeiro (valores que entraram até a data, usando apenas payment_date)
    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filterDate.setHours(23, 59, 59, 999) // Incluir todo o dia
      filtered = filtered.filter(recurrence => {
        // Usar apenas payment_date (data de depósito/pagamento)
        if (!recurrence.paymentDate) return false // Se não tem payment_date, não incluir
        const dateToCompare = new Date(recurrence.paymentDate)
        return dateToCompare <= filterDate
      })
    }
    
    // Aplicar filtro de tipo (investors, advisors, offices)
    if (filterType === "all") {
      return filtered
    }
    
    // Se não tem valor específico selecionado, retorna todos
    if (!filterValue) {
      return filtered
    }
    
    return filtered.filter(recurrence => {
      switch (filterType) {
        case "investors":
          return recurrence.investorName === filterValue
        case "advisors":
          return recurrence.advisorId === filterValue
        case "offices":
          return recurrence.officeId === filterValue
        default:
          return true
      }
    })
  }

  // Função para determinar se deve mostrar dados agregados ou individuais
  const shouldShowAggregatedData = () => {
    return filterType !== "all" && !filterValue
  }

  const filteredRecurrences = getFilteredRecurrences()

  // Função para calcular comissão do investidor baseada no prazo e liquidez
  const calculateInvestorCommission = (recurrence: RecurrenceCalculation) => {
    const commitmentPeriod = recurrence.remainingMonths || 12 // meses
    const days = commitmentPeriod * 30 // converter para dias
    
    // Determinar liquidez baseada no período (assumindo liquidez mensal como padrão)
    let liquidity = "mensal"
    if (commitmentPeriod >= 24) liquidity = "anual"
    else if (commitmentPeriod >= 12) liquidity = "semestral"
    
    // Calcular taxa baseada nas regras
    let rate = 0
    
    if (days <= 90) {
      rate = liquidity === "mensal" ? 1.8 : 1.8
    } else if (days <= 180) {
      rate = liquidity === "mensal" ? 1.9 : 2.0
    } else if (days <= 360) {
      if (liquidity === "mensal") rate = 2.1
      else if (liquidity === "semestral") rate = 2.2
      else if (liquidity === "anual") rate = 2.5
    } else if (days <= 720) {
      if (liquidity === "mensal") rate = 2.3
      else if (liquidity === "semestral") rate = 2.5
      else if (liquidity === "anual") rate = 2.7
      else if (liquidity === "bienal") rate = 3.0
    } else if (days <= 1080) {
      if (liquidity === "mensal") rate = 2.4
      else if (liquidity === "semestral") rate = 2.6
      else if (liquidity === "bienal") rate = 3.2
      else if (liquidity === "trienal") rate = 3.5
    } else {
      // Mais de 3 anos
      rate = 3.5
    }
    
    return (recurrence.investmentAmount * rate) / 100
  }

  // Calcular totais por categoria
  const getTotalsByCategory = () => {
    const totals = {
      investors: new Map<string, { id: string; name: string; totalAmount: number; advisorCommission: number; officeCommission: number; investorCommission: number; totalCommission: number }>(),
      advisors: new Map<string, { id: string; name: string; totalAmount: number; totalCommission: number; count: number }>(),
      offices: new Map<string, { id: string; name: string; totalAmount: number; totalCommission: number; count: number }>()
    }

    // Se há um filtro específico ativo, só calcula para a categoria filtrada
    const shouldCalculateInvestors = filterType === "all" || filterType === "investors"
    const shouldCalculateAdvisors = filterType === "all" || filterType === "advisors"
    const shouldCalculateOffices = filterType === "all" || filterType === "offices"

    filteredRecurrences.forEach(recurrence => {
      // Totais por investidor
      if (shouldCalculateInvestors) {
        const investorKey = recurrence.investorName
        if (!totals.investors.has(investorKey)) {
          totals.investors.set(investorKey, {
            id: recurrence.investorName,
            name: recurrence.investorName,
            totalAmount: 0,
            advisorCommission: 0,
            officeCommission: 0,
            investorCommission: 0,
            totalCommission: 0
          })
        }
        const investorTotal = totals.investors.get(investorKey)!
        investorTotal.totalAmount += recurrence.investmentAmount
        investorTotal.advisorCommission += recurrence.advisorShare
        investorTotal.officeCommission += recurrence.officeShare
        
        // Calcular comissão do investidor baseada no prazo de resgate e liquidez
        const investorCommission = calculateInvestorCommission(recurrence)
        investorTotal.investorCommission += investorCommission
        investorTotal.totalCommission += recurrence.monthlyCommission
      }

      // Totais por assessor
      if (shouldCalculateAdvisors && recurrence.advisorId) {
        const advisorKey = recurrence.advisorId
        if (!totals.advisors.has(advisorKey)) {
          totals.advisors.set(advisorKey, {
            id: recurrence.advisorId,
            name: recurrence.advisorName,
            totalAmount: 0,
            totalCommission: 0,
            count: 0
          })
        }
        const advisorTotal = totals.advisors.get(advisorKey)!
        advisorTotal.totalAmount += recurrence.investmentAmount
        advisorTotal.totalCommission += recurrence.advisorShare
        advisorTotal.count += 1
      }

      // Totais por escritório
      if (shouldCalculateOffices && recurrence.officeId) {
        const officeKey = recurrence.officeId
        if (!totals.offices.has(officeKey)) {
          totals.offices.set(officeKey, {
            id: recurrence.officeId,
            name: recurrence.officeName,
            totalAmount: 0,
            totalCommission: 0,
            count: 0
          })
        }
        const officeTotal = totals.offices.get(officeKey)!
        officeTotal.totalAmount += recurrence.investmentAmount
        officeTotal.totalCommission += recurrence.officeShare
        officeTotal.count += 1
      }
    })

    return totals
  }

  const totalsByCategory = getTotalsByCategory()

  const totalActiveRecurrences = filteredRecurrences.filter((r) => r.status === "active").length
  const totalMonthlyCommissions = filteredRecurrences
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + r.monthlyCommission, 0)
  const totalAdvisorShare = filteredRecurrences.filter((r) => r.status === "active").reduce((sum, r) => sum + r.advisorShare, 0)
  const totalOfficeShare = filteredRecurrences.filter((r) => r.status === "active").reduce((sum, r) => sum + r.officeShare, 0)
  const atRiskRecurrences = filteredRecurrences.filter((r) => r.status === "at_risk").length

  const [investorRate, setInvestorRate] = useState<number>(0)

  // Calcular taxa do investidor quando selectedRecurrence mudar
  useEffect(() => {
    if (selectedRecurrence) {
      const rate = calculateInvestorRate(selectedRecurrence)
      console.log('Calculando taxa do investidor:', {
        remainingMonths: selectedRecurrence.remainingMonths,
        rate: rate
      })
      setInvestorRate(rate)
    }
  }, [selectedRecurrence])

  // Função para calcular taxa do investidor
  const calculateInvestorRate = (recurrence: RecurrenceCalculation) => {
    const commitmentPeriod = recurrence.commitmentPeriod || 12
    const days = commitmentPeriod * 30
    
    // Usar a liquidez real do investimento
    const liquidity = recurrence.profitabilityLiquidity?.toLowerCase() || "mensal"
    
    let calculatedInvestorRate = 0
    
    if (days <= 90) {
      // D+90 (liquidez mensal): 1,8%
      calculatedInvestorRate = 1.8
    } else if (days <= 180) {
      // D+180 (liquidez mensal): 1,9% | D+180 (liquidez semestral): 2,0%
      if (liquidity === "mensal") calculatedInvestorRate = 1.9
      else if (liquidity === "semestral") calculatedInvestorRate = 2.0
      else calculatedInvestorRate = 1.9 // padrão mensal
    } else if (days <= 360) {
      // D+360 (liquidez mensal): 2,1% | D+360 (liquidez semestral): 2,2% | D+360 (liquidez anual): 2,5%
      if (liquidity === "mensal") calculatedInvestorRate = 2.1
      else if (liquidity === "semestral") calculatedInvestorRate = 2.2
      else if (liquidity === "anual") calculatedInvestorRate = 2.5
      else calculatedInvestorRate = 2.1 // padrão mensal
    } else if (days <= 720) {
      // D+720 (liquidez mensal): 2,3% | D+720 (semestral): 2,5% | D+720 (anual): 2,7% | D+720 (bienal): 3%
      if (liquidity === "mensal") calculatedInvestorRate = 2.3
      else if (liquidity === "semestral") calculatedInvestorRate = 2.5
      else if (liquidity === "anual") calculatedInvestorRate = 2.7
      else if (liquidity === "bienal") calculatedInvestorRate = 3.0
      else calculatedInvestorRate = 2.3 // padrão mensal
    } else if (days <= 1080) {
      // D+1080 (liquidez mensal): 2,4% | D+1080 (liquidez semestral): 2,6% | D+1080 (liquidez bienal): 3,2% | D+1080 (liquidez trienal): 3,5%
      if (liquidity === "mensal") calculatedInvestorRate = 2.4
      else if (liquidity === "semestral") calculatedInvestorRate = 2.6
      else if (liquidity === "bienal") calculatedInvestorRate = 3.2
      else if (liquidity === "trienal") calculatedInvestorRate = 3.5
      else calculatedInvestorRate = 2.4 // padrão mensal
    } else {
      // Mais de 3 anos
      calculatedInvestorRate = 3.5
    }
    
    console.log('Taxa calculada:', {
      commitmentPeriod,
      days,
      liquidity,
      calculatedInvestorRate
    })
    
    return calculatedInvestorRate
  }

  const generateProjection = (recurrence: RecurrenceCalculation) => {
    const projections: RecurrenceProjection[] = []
    let cumulativeAdvisor = 0
    let cumulativeOffice = 0
    let cumulativeInvestor = 0
    let cumulativeTotal = 0

    // Calcular taxa do investidor
    const calculatedInvestorRate = calculateInvestorRate(recurrence)
    setInvestorRate(calculatedInvestorRate)
    
    // Obter liquidez do investimento
    const liquidity = recurrence.profitabilityLiquidity?.toLowerCase() || "mensal"
    
    // Determinar período de acumulação baseado na liquidez
    let accumulationPeriod = 1 // meses
    if (liquidity === "semestral") accumulationPeriod = 6
    else if (liquidity === "anual") accumulationPeriod = 12
    else if (liquidity === "bienal") accumulationPeriod = 24
    else if (liquidity === "trienal") accumulationPeriod = 36
    
    // Calcular taxa mensal (taxa anual / 12)
    const monthlyRate = calculatedInvestorRate / 12
    
    // Comissão mensal base (sem juros compostos)
    const baseMonthlyCommission = (recurrence.investmentAmount * monthlyRate) / 100
    
    // Acumular comissões para aplicar juros compostos quando necessário
    let accumulatedCommission = 0
    
    // Valor total do investimento (será calculado no loop)
    let totalInvestmentValue = recurrence.investmentAmount
    
    console.log('Gerando projeção:', {
      investmentAmount: recurrence.investmentAmount,
      calculatedInvestorRate,
      commitmentPeriod: recurrence.commitmentPeriod,
      liquidity,
      accumulationPeriod,
      baseMonthlyCommission
    })

    for (let month = 1; month <= 12; month++) {
      const date = new Date()
      date.setMonth(date.getMonth() + month)

      let currentBonusRate = recurrence.bonusRate
      if (month > 3) currentBonusRate = Math.max(0, currentBonusRate - 0.1)

      const advisorCommission = (recurrence.investmentAmount * recurrence.baseCommissionRate) / 100
      const officeCommission = (recurrence.investmentAmount * recurrence.bonusRate) / 100
      
      // Calcular valor total do investimento baseado na liquidez
      let monthlyGain = 0
      let investorCommission = 0
      
      if (liquidity === "mensal") {
        // Liquidez mensal: juros SIMPLES (não acumula, retira todo mês)
        // Como os juros são retirados mensalmente, o valor do investimento permanece constante
        const monthlySimpleRate = calculatedInvestorRate / 100 // 0,035 para 3,5%
        monthlyGain = recurrence.investmentAmount * monthlySimpleRate // Valor fixo por mês (ex: R$ 175,00)
        totalInvestmentValue = recurrence.investmentAmount // Valor permanece constante, pois juros são retirados
        
        // Comissão: retira todo mês (não acumula)
        investorCommission = monthlyGain
      } else {
        // Outras liquidezes: juros COMPOSTOS (acumula até o período de vencimento)
        // Valor cresce exponencialmente multiplicando o valor anterior por (1 + taxa/100)
        const compoundRate = 1 + (calculatedInvestorRate / 100) // 1,035 para 3,5%
        
        // Usar o valor acumulado do mês anterior (ou valor inicial no primeiro mês)
        const previousMonthValue = totalInvestmentValue
        
        // Calcular valor total: multiplicar valor anterior por taxa de juros
        // Arredondar para 2 casas decimais
        const rawValue = previousMonthValue * compoundRate
        // Usar arredondamento padrão para 2 casas decimais
        totalInvestmentValue = Math.round(rawValue * 100) / 100
        
        // Calcular juros do mês (diferença entre valor atual e valor anterior)
        // Arredondar também para 2 casas decimais
        monthlyGain = Math.round((totalInvestmentValue - previousMonthValue) * 100) / 100
        
        // Mostrar os juros mensais gerados (mesmo que não sejam pagos ainda)
        // Para liquidez não-mensal, os juros são gerados mensalmente mas só são pagos no período de vencimento
        investorCommission = monthlyGain
        
        // Acumular os juros mensais para pagamento no período de vencimento
        accumulatedCommission += monthlyGain
        
        // Aplicar juros compostos sobre o valor acumulado (taxa mensal)
        accumulatedCommission = accumulatedCommission * compoundRate
      }
      
      const monthlyCommission = advisorCommission + officeCommission + investorCommission

      cumulativeAdvisor += advisorCommission
      cumulativeOffice += officeCommission
      cumulativeInvestor += investorCommission
      cumulativeTotal += monthlyCommission

      let riskLevel: "low" | "medium" | "high" = "low"
      if (recurrence.riskFactors.length > 0) riskLevel = "medium"
      if (recurrence.riskFactors.length > 2) riskLevel = "high"

      projections.push({
        month,
        date: date.toISOString().split("T")[0],
        advisorCommission,
        officeCommission,
        investorCommission,
        totalCommission: monthlyCommission,
        cumulativeAdvisor,
        cumulativeOffice,
        cumulativeInvestor,
        cumulativeTotal,
        totalValue: totalInvestmentValue,
        activeBonuses: currentBonusRate > 0 ? recurrence.appliedBonuses : [],
        riskLevel,
      })
    }

    setProjections(projections)
  }

  const handleViewProjection = (recurrence: RecurrenceCalculation) => {
    setSelectedRecurrence(recurrence)
    generateProjection(recurrence)
    setIsProjectionOpen(true)
  }

  const recalculateAll = () => {
    fetchRecurrenceData()
    toast({
      title: "Recálculo realizado!",
      description: "Todas as projeções foram atualizadas com os dados mais recentes.",
    })
  }

  const exportToExcel = (type: string) => {
    const workbook = XLSX.utils.book_new()
    const fileName = `recorrencias-${type}-${new Date().toISOString().split('T')[0]}`

    switch (type) {
      case "recurrences":
        // Planilha de resumo (usando dados filtrados)
        const summaryData = [
          ["Resumo de Recorrências"],
          ["Recorrências Ativas", totalActiveRecurrences],
          ["Comissões Mensais Totais", formatCurrency(totalMonthlyCommissions)],
          ["Participação Assessores (3%)", formatCurrency(totalAdvisorShare)],
          ["Participação Escritórios (1%)", formatCurrency(totalOfficeShare)],
          ["Recorrências em Risco", atRiskRecurrences],
          dateFilter ? ["Filtro de Data", `Valores até ${new Date(dateFilter).toLocaleDateString("pt-BR")}`] : [],
          [""],
        ]
        const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(workbook, ws1, "Resumo")

        // Planilha detalhada de recorrências (todos)
        const recurrencesData = [
          [
            "Investidor",
            "Email",
            "Assessor",
            "Escritório",
            "Valor Investido",
            "Comissão Mensal",
            "Assessor (3%)",
            "Escritório (1%)",
            "Total Pago",
            "Projeção Total",
            "Meses Restantes",
            "Período",
            "Liquidez",
            "Data do Depósito"
          ],
          ...filteredRecurrences.map(r => [
            r.investorName,
            r.investorEmail,
            r.advisorName,
            r.officeName,
            formatCurrency(r.investmentAmount),
            formatCurrency(r.monthlyCommission),
            formatCurrency(r.advisorShare),
            formatCurrency(r.officeShare),
            formatCurrency(r.totalPaid),
            formatCurrency(r.projectedTotal),
            r.remainingMonths,
            `${r.commitmentPeriod} meses`,
            r.profitabilityLiquidity || "Mensal",
            r.paymentDate ? new Date(r.paymentDate).toLocaleDateString("pt-BR") : "N/A"
          ])
        ]
        const ws2 = XLSX.utils.aoa_to_sheet(recurrencesData)
        XLSX.utils.book_append_sheet(workbook, ws2, "Todos os Investimentos")

        // Calcular totais usando as recorrências filtradas (incluindo filtro de data)
        const allInvestorsTotals = new Map<string, { name: string; totalAmount: number; advisorCommission: number; officeCommission: number; investorCommission: number; totalCommission: number; count: number }>()
        const allAdvisorsTotals = new Map<string, { name: string; totalAmount: number; totalCommission: number; count: number; investors: Set<string> }>()
        const allOfficesTotals = new Map<string, { name: string; totalAmount: number; totalCommission: number; count: number; advisors: Set<string> }>()

        filteredRecurrences.forEach(r => {
          // Totais por investidor
          if (!allInvestorsTotals.has(r.investorName)) {
            allInvestorsTotals.set(r.investorName, {
              name: r.investorName,
              totalAmount: 0,
              advisorCommission: 0,
              officeCommission: 0,
              investorCommission: 0,
              totalCommission: 0,
              count: 0
            })
          }
          const investorTotal = allInvestorsTotals.get(r.investorName)!
          investorTotal.totalAmount += r.investmentAmount
          investorTotal.advisorCommission += r.advisorShare
          investorTotal.officeCommission += r.officeShare
          const investorComm = calculateInvestorCommission(r)
          investorTotal.investorCommission += investorComm
          investorTotal.totalCommission += r.monthlyCommission
          investorTotal.count += 1

          // Totais por assessor
          if (r.advisorId) {
            if (!allAdvisorsTotals.has(r.advisorId)) {
              allAdvisorsTotals.set(r.advisorId, {
                name: r.advisorName,
                totalAmount: 0,
                totalCommission: 0,
                count: 0,
                investors: new Set()
              })
            }
            const advisorTotal = allAdvisorsTotals.get(r.advisorId)!
            advisorTotal.totalAmount += r.investmentAmount
            advisorTotal.totalCommission += r.advisorShare
            advisorTotal.count += 1
            advisorTotal.investors.add(r.investorName)
          }

          // Totais por escritório
          if (r.officeId) {
            if (!allOfficesTotals.has(r.officeId)) {
              allOfficesTotals.set(r.officeId, {
                name: r.officeName,
                totalAmount: 0,
                totalCommission: 0,
                count: 0,
                advisors: new Set()
              })
            }
            const officeTotal = allOfficesTotals.get(r.officeId)!
            officeTotal.totalAmount += r.investmentAmount
            officeTotal.totalCommission += r.officeShare
            officeTotal.count += 1
            if (r.advisorId) {
              officeTotal.advisors.add(r.advisorId)
            }
          }
        })

        // Aba: Por Investidores (dados agregados)
        const recurrInvestorsData = [
          ["Investidor", "Total Investido", "Comissão Assessor (3%)", "Comissão Escritório (1%)", "Comissão Investidor", "Total Comissões", "Nº Investimentos"],
          ...Array.from(allInvestorsTotals.values()).map(inv => [
            inv.name,
            formatCurrency(inv.totalAmount),
            formatCurrency(inv.advisorCommission),
            formatCurrency(inv.officeCommission),
            formatCurrency(inv.investorCommission),
            formatCurrency(inv.totalCommission),
            inv.count
          ])
        ]
        const wsRecurrInvestors = XLSX.utils.aoa_to_sheet(recurrInvestorsData)
        XLSX.utils.book_append_sheet(workbook, wsRecurrInvestors, "Investidores")

        // Aba: Por Assessores (dados agregados)
        const recurrAdvisorsData = [
          ["Assessor", "Total Investido", "Comissão Mensal (3%)", "Nº Investidores", "Nº Investimentos"],
          ...Array.from(allAdvisorsTotals.values()).map(adv => [
            adv.name,
            formatCurrency(adv.totalAmount),
            formatCurrency(adv.totalCommission),
            adv.investors.size,
            adv.count
          ])
        ]
        const wsRecurrAdvisors = XLSX.utils.aoa_to_sheet(recurrAdvisorsData)
        XLSX.utils.book_append_sheet(workbook, wsRecurrAdvisors, "Assessores")

        // Aba: Por Escritórios (dados agregados)
        const recurrOfficesData = [
          ["Escritório", "Total Investido", "Comissão Mensal (1%)", "Nº Assessores", "Nº Investimentos"],
          ...Array.from(allOfficesTotals.values()).map(off => [
            off.name,
            formatCurrency(off.totalAmount),
            formatCurrency(off.totalCommission),
            off.advisors.size,
            off.count
          ])
        ]
        const wsRecurrOffices = XLSX.utils.aoa_to_sheet(recurrOfficesData)
        XLSX.utils.book_append_sheet(workbook, wsRecurrOffices, "Escritórios")
        break

      case "totals":
        // Resumo (usando dados filtrados)
        const totalsSummaryData = [
          ["Resumo de Totais"],
          ["Total de Investimentos", filteredRecurrences.length],
          dateFilter ? ["Filtro de Data", `Valores até ${new Date(dateFilter).toLocaleDateString("pt-BR")}`] : [],
          [""],
        ]
        const wsTotalsSummary = XLSX.utils.aoa_to_sheet(totalsSummaryData)
        XLSX.utils.book_append_sheet(workbook, wsTotalsSummary, "Resumo")

        // Totais por Investidores (usando dados filtrados)
        const investorsData = [
          ["Investidor", "Total Investido", "Comissão Assessor (3%)", "Comissão Escritório (1%)", "Comissão Investidor", "Total Comissões", "Nº Investimentos"],
          ...Array.from(totalsByCategory.investors.values()).map(inv => [
            inv.name,
            formatCurrency(inv.totalAmount),
            formatCurrency(inv.advisorCommission),
            formatCurrency(inv.officeCommission),
            formatCurrency(inv.investorCommission),
            formatCurrency(inv.totalCommission),
            filteredRecurrences.filter(r => r.investorName === inv.name).length
          ])
        ]
        const ws3 = XLSX.utils.aoa_to_sheet(investorsData)
        XLSX.utils.book_append_sheet(workbook, ws3, "Por Investidores")

        // Totais por Assessores (usando dados filtrados)
        const advisorsData = [
          ["Assessor", "Total Investido", "Comissão Mensal (3%)", "Nº Investidores", "Nº Investimentos"],
          ...Array.from(totalsByCategory.advisors.values()).map(adv => [
            adv.name,
            formatCurrency(adv.totalAmount),
            formatCurrency(adv.totalCommission),
            filteredRecurrences.filter(r => r.advisorId === adv.id).length,
            adv.count
          ])
        ]
        const ws4 = XLSX.utils.aoa_to_sheet(advisorsData)
        XLSX.utils.book_append_sheet(workbook, ws4, "Por Assessores")

        // Totais por Escritórios (usando dados filtrados)
        const officesData = [
          ["Escritório", "Total Investido", "Comissão Mensal (1%)", "Nº Assessores", "Nº Investimentos"],
          ...Array.from(totalsByCategory.offices.values()).map(off => [
            off.name,
            formatCurrency(off.totalAmount),
            formatCurrency(off.totalCommission),
            filteredRecurrences.filter(r => r.officeId === off.id).length,
            off.count
          ])
        ]
        const ws5 = XLSX.utils.aoa_to_sheet(officesData)
        XLSX.utils.book_append_sheet(workbook, ws5, "Por Escritórios")
        break

      case "projection":
        if (!selectedRecurrence || projections.length === 0) {
          toast({
            title: "Nenhuma projeção selecionada",
            description: "Por favor, visualize uma projeção antes de exportar.",
            variant: "destructive",
          })
          return
        }

        // Resumo da projeção
        const projectionSummary = [
          ["Projeção de Recorrência"],
          ["Investidor", selectedRecurrence.investorName],
          ["Valor Investido", formatCurrency(selectedRecurrence.investmentAmount)],
          ["Período", `${selectedRecurrence.commitmentPeriod} meses`],
          ["Liquidez", selectedRecurrence.profitabilityLiquidity || "Mensal"],
          ["Taxa Investidor", `${investorRate}%`],
          ["Data do Depósito", selectedRecurrence.paymentDate ? new Date(selectedRecurrence.paymentDate).toLocaleDateString("pt-BR") : "N/A"],
          [""],
        ]
        const ws6 = XLSX.utils.aoa_to_sheet(projectionSummary)
        XLSX.utils.book_append_sheet(workbook, ws6, "Resumo")

        // Projeção mensal
        const projectionData = [
          ["Mês", "Data", "Valor Total", "Investidor", "Assessor (3%)", "Escritório (1%)", "Total Comissão", "Acumulado Investidor", "Acumulado Assessor", "Acumulado Escritório", "Total Acumulado"],
          ...projections.map(proj => [
            proj.month,
            new Date(proj.date).toLocaleDateString("pt-BR"),
            formatCurrency(proj.totalValue),
            formatCurrency(proj.investorCommission),
            formatCurrency(proj.advisorCommission),
            formatCurrency(proj.officeCommission),
            formatCurrency(proj.totalCommission),
            formatCurrency(proj.cumulativeInvestor),
            formatCurrency(proj.cumulativeAdvisor),
            formatCurrency(proj.cumulativeOffice),
            formatCurrency(proj.cumulativeTotal)
          ])
        ]
        const ws7 = XLSX.utils.aoa_to_sheet(projectionData)
        XLSX.utils.book_append_sheet(workbook, ws7, "Projeção Mensal")
        break

      default:
        toast({
          title: "Tipo de exportação inválido",
          variant: "destructive",
        })
        return
    }

    XLSX.writeFile(workbook, `${fileName}.xlsx`)
    toast({
      title: "Exportação concluída!",
      description: `Dados exportados para ${fileName}.xlsx`,
    })
  }

  const exportToPDF = (type: string) => {
    const doc = new jsPDF('landscape')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    let yPosition = 15
    const leftMargin = 10
    const rightMargin = 10
    const topMargin = 15
    const bottomMargin = 20
    const usableWidth = pageWidth - leftMargin - rightMargin

    // Função para adicionar nova página se necessário
    const checkNewPage = (additionalHeight: number = 10) => {
      if (yPosition + additionalHeight > pageHeight - bottomMargin) {
        doc.addPage()
        yPosition = topMargin
      }
    }

    // Função para criar tabela manualmente
    const createSimpleTable = (headers: string[], rows: string[][]) => {
      const colWidths = headers.map((header) => {
        const headerLower = header.toLowerCase()
        if (headerLower.includes('investidor') || headerLower.includes('assessor') || headerLower.includes('escritório')) {
          return 50
        }
        if (headerLower.includes('valor') || headerLower.includes('comissão') || headerLower.includes('total')) {
          return 35
        }
        if (headerLower.includes('status')) {
          return 25
        }
        if (headerLower.includes('data') || headerLower.includes('mês')) {
          return 25
        }
        return 30
      })

      const startX = leftMargin
      const tableWidth = colWidths.reduce((sum, width) => sum + width, 0)

      // Cabeçalho da tabela
      doc.setFillColor(248, 250, 252)
      doc.rect(startX, yPosition, tableWidth, 12, 'F')
      doc.setDrawColor(200, 200, 200)
      doc.rect(startX, yPosition, tableWidth, 12, 'S')

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")

      let currentX = startX + 5
      headers.forEach((header, index) => {
        const maxLength = Math.floor(colWidths[index] / 1.5)
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

          // Reimprimir cabeçalho
          doc.setFillColor(248, 250, 252)
          doc.rect(startX, yPosition, tableWidth, 12, 'F')
          doc.setDrawColor(200, 200, 200)
          doc.rect(startX, yPosition, tableWidth, 12, 'S')

          doc.setFontSize(9)
          doc.setFont("helvetica", "bold")
          currentX = startX + 5
          headers.forEach((header, index) => {
            const maxLength = Math.floor(colWidths[index] / 1.5)
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
          doc.rect(startX, yPosition - 3, tableWidth, 8, 'F')
        }

        currentX = startX + 5
        row.forEach((cell, colIndex) => {
          const maxLength = Math.floor(colWidths[colIndex] / 1.5)
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

    // Título
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("Relatório de Recorrências", leftMargin, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, leftMargin, yPosition)
    yPosition += 15

    switch (type) {
      case "recurrences":
        // Resumo (usando dados filtrados)
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("Resumo", leftMargin, yPosition)
        yPosition += 8

        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.text(`Recorrências Ativas: ${totalActiveRecurrences}`, leftMargin, yPosition)
        yPosition += 6
        doc.text(`Comissões Mensais: ${formatCurrency(totalMonthlyCommissions)}`, leftMargin, yPosition)
        yPosition += 6
        doc.text(`Assessores (3%): ${formatCurrency(totalAdvisorShare)}`, leftMargin, yPosition)
        yPosition += 6
        doc.text(`Escritórios (1%): ${formatCurrency(totalOfficeShare)}`, leftMargin, yPosition)
        yPosition += 6
        doc.text(`Em Risco: ${atRiskRecurrences}`, leftMargin, yPosition)
        if (dateFilter) {
          yPosition += 6
          doc.text(`Filtro de Data: Valores até ${new Date(dateFilter).toLocaleDateString("pt-BR")}`, leftMargin, yPosition)
        }
        yPosition += 15

        // Tabela de todas as recorrências
        checkNewPage(50)
        if (filteredRecurrences.length > 0) {
          doc.setFontSize(12)
          doc.setFont("helvetica", "bold")
          doc.text("Todos os Investimentos", leftMargin, yPosition)
          yPosition += 10

          const tableData = filteredRecurrences.map(r => [
            r.investorName,
            formatCurrency(r.investmentAmount),
            formatCurrency(r.monthlyCommission),
            formatCurrency(r.advisorShare),
            formatCurrency(r.officeShare),
            r.paymentDate ? new Date(r.paymentDate).toLocaleDateString("pt-BR") : "N/A"
          ])

          createSimpleTable(
            ["Investidor", "Valor Investido", "Comissão Mensal", "Assessor (3%)", "Escritório (1%)", "Data do Depósito"],
            tableData
          )
        }

        // Calcular totais usando as recorrências filtradas (incluindo filtro de data)
        const allInvestorsTotals = new Map<string, { name: string; totalAmount: number; advisorCommission: number; officeCommission: number; investorCommission: number; totalCommission: number; count: number }>()
        const allAdvisorsTotals = new Map<string, { name: string; totalAmount: number; totalCommission: number; count: number; investors: Set<string> }>()
        const allOfficesTotals = new Map<string, { name: string; totalAmount: number; totalCommission: number; count: number; advisors: Set<string> }>()

        filteredRecurrences.forEach(r => {
          // Totais por investidor
          if (!allInvestorsTotals.has(r.investorName)) {
            allInvestorsTotals.set(r.investorName, {
              name: r.investorName,
              totalAmount: 0,
              advisorCommission: 0,
              officeCommission: 0,
              investorCommission: 0,
              totalCommission: 0,
              count: 0
            })
          }
          const investorTotal = allInvestorsTotals.get(r.investorName)!
          investorTotal.totalAmount += r.investmentAmount
          investorTotal.advisorCommission += r.advisorShare
          investorTotal.officeCommission += r.officeShare
          const investorComm = calculateInvestorCommission(r)
          investorTotal.investorCommission += investorComm
          investorTotal.totalCommission += r.monthlyCommission
          investorTotal.count += 1

          // Totais por assessor
          if (r.advisorId) {
            if (!allAdvisorsTotals.has(r.advisorId)) {
              allAdvisorsTotals.set(r.advisorId, {
                name: r.advisorName,
                totalAmount: 0,
                totalCommission: 0,
                count: 0,
                investors: new Set()
              })
            }
            const advisorTotal = allAdvisorsTotals.get(r.advisorId)!
            advisorTotal.totalAmount += r.investmentAmount
            advisorTotal.totalCommission += r.advisorShare
            advisorTotal.count += 1
            advisorTotal.investors.add(r.investorName)
          }

          // Totais por escritório
          if (r.officeId) {
            if (!allOfficesTotals.has(r.officeId)) {
              allOfficesTotals.set(r.officeId, {
                name: r.officeName,
                totalAmount: 0,
                totalCommission: 0,
                count: 0,
                advisors: new Set()
              })
            }
            const officeTotal = allOfficesTotals.get(r.officeId)!
            officeTotal.totalAmount += r.investmentAmount
            officeTotal.totalCommission += r.officeShare
            officeTotal.count += 1
            if (r.advisorId) {
              officeTotal.advisors.add(r.advisorId)
            }
          }
        })

        // Seção: Por Investidores (dados agregados)
        if (allInvestorsTotals.size > 0) {
          checkNewPage(50)
          doc.setFontSize(14)
          doc.setFont("helvetica", "bold")
          doc.text("Por Investidores", leftMargin, yPosition)
          yPosition += 15

          const investorsTableData = Array.from(allInvestorsTotals.values()).map(inv => [
            inv.name,
            formatCurrency(inv.totalAmount),
            formatCurrency(inv.advisorCommission),
            formatCurrency(inv.officeCommission),
            formatCurrency(inv.investorCommission),
            formatCurrency(inv.totalCommission),
            inv.count.toString()
          ])

          createSimpleTable(
            ["Investidor", "Total Investido", "Assessor (3%)", "Escritório (1%)", "Investidor", "Total", "Investimentos"],
            investorsTableData
          )
        }

        // Seção: Por Assessores (dados agregados)
        if (allAdvisorsTotals.size > 0) {
          checkNewPage(50)
          doc.setFontSize(14)
          doc.setFont("helvetica", "bold")
          doc.text("Por Assessores", leftMargin, yPosition)
          yPosition += 15

          const advisorsTableData = Array.from(allAdvisorsTotals.values()).map(adv => [
            adv.name,
            formatCurrency(adv.totalAmount),
            formatCurrency(adv.totalCommission),
            adv.investors.size.toString(),
            adv.count.toString()
          ])

          createSimpleTable(
            ["Assessor", "Total Investido", "Comissão (3%)", "Nº Investidores", "Nº Investimentos"],
            advisorsTableData
          )
        }

        // Seção: Por Escritórios (dados agregados)
        if (allOfficesTotals.size > 0) {
          checkNewPage(50)
          doc.setFontSize(14)
          doc.setFont("helvetica", "bold")
          doc.text("Por Escritórios", leftMargin, yPosition)
          yPosition += 15

          const officesTableData = Array.from(allOfficesTotals.values()).map(off => [
            off.name,
            formatCurrency(off.totalAmount),
            formatCurrency(off.totalCommission),
            off.advisors.size.toString(),
            off.count.toString()
          ])

          createSimpleTable(
            ["Escritório", "Total Investido", "Comissão (1%)", "Nº Assessores", "Nº Investimentos"],
            officesTableData
          )
        }

        // Seção: Investimentos por Assessor (detalhado)
        const advisorsGrouped = new Map<string, RecurrenceCalculation[]>()
        filteredRecurrences.forEach(r => {
          if (r.advisorId) {
            const key = r.advisorId
            if (!advisorsGrouped.has(key)) {
              advisorsGrouped.set(key, [])
            }
            advisorsGrouped.get(key)!.push(r)
          }
        })

        if (advisorsGrouped.size > 0) {
          checkNewPage(50)
          doc.setFontSize(14)
          doc.setFont("helvetica", "bold")
          doc.text("Investimentos por Assessor", leftMargin, yPosition)
          yPosition += 15

          Array.from(advisorsGrouped.entries()).forEach(([advisorId, advisorRecurrences]) => {
            const advisorName = advisorRecurrences[0]?.advisorName || "Assessor"
            checkNewPage(40)
            doc.setFontSize(11)
            doc.setFont("helvetica", "bold")
            doc.text(`Assessor: ${advisorName}`, leftMargin, yPosition)
            yPosition += 10

            const advisorTableData = advisorRecurrences.map(r => [
              r.investorName,
              formatCurrency(r.investmentAmount),
              formatCurrency(r.monthlyCommission),
              formatCurrency(r.advisorShare),
              formatCurrency(r.officeShare),
              r.paymentDate ? new Date(r.paymentDate).toLocaleDateString("pt-BR") : "N/A"
            ])

            createSimpleTable(
              ["Investidor", "Valor Investido", "Comissão Mensal", "Assessor (3%)", "Escritório (1%)", "Data do Depósito"],
              advisorTableData
            )
          })
        }

        // Seção: Investimentos por Escritório (detalhado)
        const officesGrouped = new Map<string, RecurrenceCalculation[]>()
        filteredRecurrences.forEach(r => {
          if (r.officeId) {
            const key = r.officeId
            if (!officesGrouped.has(key)) {
              officesGrouped.set(key, [])
            }
            officesGrouped.get(key)!.push(r)
          }
        })

        if (officesGrouped.size > 0) {
          checkNewPage(50)
          doc.setFontSize(14)
          doc.setFont("helvetica", "bold")
          doc.text("Investimentos por Escritório", leftMargin, yPosition)
          yPosition += 15

          Array.from(officesGrouped.entries()).forEach(([officeId, officeRecurrences]) => {
            const officeName = officeRecurrences[0]?.officeName || "Escritório"
            checkNewPage(40)
            doc.setFontSize(11)
            doc.setFont("helvetica", "bold")
            doc.text(`Escritório: ${officeName}`, leftMargin, yPosition)
            yPosition += 10

            const officeTableData = officeRecurrences.map(r => [
              r.investorName,
              r.advisorName,
              formatCurrency(r.investmentAmount),
              formatCurrency(r.monthlyCommission),
              formatCurrency(r.advisorShare),
              formatCurrency(r.officeShare),
              r.paymentDate ? new Date(r.paymentDate).toLocaleDateString("pt-BR") : "N/A"
            ])

            createSimpleTable(
              ["Investidor", "Assessor", "Valor Investido", "Comissão Mensal", "Assessor (3%)", "Escritório (1%)", "Data do Depósito"],
              officeTableData
            )
          })
        }
        break

      case "totals":
        // Resumo (usando dados filtrados)
        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        if (dateFilter) {
          doc.text(`Filtro de Data: Valores até ${new Date(dateFilter).toLocaleDateString("pt-BR")}`, leftMargin, yPosition)
          yPosition += 8
        }
        doc.text(`Total de Investimentos: ${filteredRecurrences.length}`, leftMargin, yPosition)
        yPosition += 12

        // Totais por Investidores (usando dados filtrados)
        checkNewPage(30)
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("Totais por Investidores", leftMargin, yPosition)
        yPosition += 10

        const investorsTableData = Array.from(totalsByCategory.investors.values()).map(inv => [
          inv.name,
          formatCurrency(inv.totalAmount),
          formatCurrency(inv.advisorCommission),
          formatCurrency(inv.officeCommission),
          formatCurrency(inv.investorCommission),
          formatCurrency(inv.totalCommission)
        ])

        createSimpleTable(
          ["Investidor", "Total Investido", "Assessor (3%)", "Escritório (1%)", "Investidor", "Total"],
          investorsTableData
        )

        // Totais por Assessores (usando dados filtrados)
        checkNewPage(30)
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("Totais por Assessores", leftMargin, yPosition)
        yPosition += 10

        const advisorsTableData = Array.from(totalsByCategory.advisors.values()).map(adv => [
          adv.name,
          formatCurrency(adv.totalAmount),
          formatCurrency(adv.totalCommission),
          adv.count.toString()
        ])

        createSimpleTable(
          ["Assessor", "Total Investido", "Comissão (3%)", "Investimentos"],
          advisorsTableData
        )

        // Totais por Escritórios (usando dados filtrados)
        checkNewPage(30)
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("Totais por Escritórios", leftMargin, yPosition)
        yPosition += 10

        const officesTableData = Array.from(totalsByCategory.offices.values()).map(off => [
          off.name,
          formatCurrency(off.totalAmount),
          formatCurrency(off.totalCommission),
          off.count.toString()
        ])

        createSimpleTable(
          ["Escritório", "Total Investido", "Comissão (1%)", "Investimentos"],
          officesTableData
        )
        break

      case "projection":
        if (!selectedRecurrence || projections.length === 0) {
          toast({
            title: "Nenhuma projeção selecionada",
            description: "Por favor, visualize uma projeção antes de exportar.",
            variant: "destructive",
          })
          return
        }

        // Resumo
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("Projeção de Recorrência", leftMargin, yPosition)
        yPosition += 10

        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.text(`Investidor: ${selectedRecurrence.investorName}`, leftMargin, yPosition)
        yPosition += 6
        doc.text(`Valor Investido: ${formatCurrency(selectedRecurrence.investmentAmount)}`, leftMargin, yPosition)
        yPosition += 6
        doc.text(`Período: ${selectedRecurrence.commitmentPeriod} meses`, leftMargin, yPosition)
        yPosition += 6
        doc.text(`Liquidez: ${selectedRecurrence.profitabilityLiquidity || "Mensal"}`, leftMargin, yPosition)
        yPosition += 6
        doc.text(`Taxa Investidor: ${investorRate}%`, leftMargin, yPosition)
        yPosition += 15

        // Tabela de projeção
        checkNewPage(50)
        const projectionTableData = projections.map(proj => [
          proj.month.toString(),
          new Date(proj.date).toLocaleDateString("pt-BR"),
          formatCurrency(proj.totalValue),
          formatCurrency(proj.investorCommission),
          formatCurrency(proj.advisorCommission),
          formatCurrency(proj.officeCommission),
          formatCurrency(proj.totalCommission)
        ])

        createSimpleTable(
          ["Mês", "Data", "Valor Total", "Investidor", "Assessor (3%)", "Escritório (1%)", "Total Comissão"],
          projectionTableData
        )
        break

      default:
        toast({
          title: "Tipo de exportação inválido",
          variant: "destructive",
        })
        return
    }

    const fileName = `recorrencias-${type}-${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
    toast({
      title: "Exportação concluída!",
      description: `Dados exportados para ${fileName}`,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "at_risk":
        return "destructive"
      case "paused":
        return "secondary"
      case "cancelled":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo"
      case "at_risk":
        return "Em Risco"
      case "paused":
        return "Pausado"
      case "cancelled":
        return "Cancelado"
      default:
        return status
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-emerald-600"
      case "medium":
        return "text-yellow-600"
      case "high":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando dados de recorrência...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            Sistema de Cálculo de Recorrência
          </h2>
          <p className="text-muted-foreground">Monitore e projete comissões recorrentes mensais</p>
        </div>
        <Button onClick={recalculateAll} className="bg-orange-600 hover:bg-orange-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Recalcular Tudo
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recorrências Ativas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveRecurrences}</div>
            <p className="text-xs text-muted-foreground">{atRiskRecurrences} em risco</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Mensais</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthlyCommissions)}</div>
            <p className="text-xs text-muted-foreground">Total recorrente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessores (3%)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAdvisorShare)}</div>
            <p className="text-xs text-muted-foreground">Participação mensal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escritórios (1%)</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOfficeShare)}</div>
            <p className="text-xs text-muted-foreground">Participação mensal</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recurrences" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recurrences">Recorrências Ativas</TabsTrigger>
          <TabsTrigger value="totals">Totais por Categoria</TabsTrigger>
          <TabsTrigger value="impacts">Impactos Futuros</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="recurrences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comissões Recorrentes</CardTitle>
              <CardDescription>
                Monitore todas as comissões recorrentes ativas e suas projeções
                {filterType !== "all" && (
                  <span className="ml-2 text-sm font-medium">
                    ({filteredRecurrences.length} de {recurrences.length} recorrências)
                    {!filterValue ? (
                      <span className="text-blue-600"> - Mostrando todos os {filterType === "investors" ? "investidores" : filterType === "advisors" ? "assessores" : "escritórios"}</span>
                    ) : (
                      <span className="text-green-600"> - Investimentos do {filterType === "investors" ? "investidor" : filterType === "advisors" ? "assessor" : "escritório"} selecionado</span>
                    )}
                  </span>
                )}
              </CardDescription>
              
              {/* Controles de Filtro e Exportação */}
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Select value={filterType} onValueChange={(value: "all" | "investors" | "advisors" | "offices") => {
                      setFilterType(value)
                      setFilterValue("")
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de filtro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Ver Todos</SelectItem>
                        <SelectItem value="investors">Ver Por Investidores</SelectItem>
                        <SelectItem value="advisors">Ver Por Assessores</SelectItem>
                        <SelectItem value="offices">Ver Por Escritórios</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {filterType !== "all" && (
                    <div className="flex-1">
                      <Select value={filterValue} onValueChange={setFilterValue}>
                        <SelectTrigger>
                          <SelectValue placeholder={`Selecione ${filterType === "investors" ? "investidor" : filterType === "advisors" ? "assessor" : "escritório"}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {filterType === "investors" && filterOptions.investors.map(option => (
                            <SelectItem key={option.id} value={option.name}>{option.name}</SelectItem>
                          ))}
                          {filterType === "advisors" && filterOptions.advisors.map(option => (
                            <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                          ))}
                          {filterType === "offices" && filterOptions.offices.map(option => (
                            <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex-1">
                    <Input
                      type="date"
                      placeholder="Valores até"
                      value={dateFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {dateFilter && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setDateFilter("")}
                      className="whitespace-nowrap"
                    >
                      Limpar Data
                    </Button>
                  )}
                </div>

                {filteredRecurrences.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportToExcel("recurrences")}>
                      <Download className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportToPDF("recurrences")}>
                      <FileText className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredRecurrences.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {recurrences.length === 0 
                      ? "Nenhuma recorrência ativa encontrada."
                      : "Nenhuma recorrência encontrada com o filtro aplicado."
                    }
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {recurrences.length === 0 
                      ? "As recorrências aparecerão aqui quando houver investimentos ativos na plataforma."
                      : "Tente alterar o filtro para ver mais resultados."
                    }
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {shouldShowAggregatedData() ? (
                        // Cabeçalhos para dados agregados
                        filterType === "investors" ? (
                          <>
                            <TableHead>Investidor</TableHead>
                            <TableHead>Total Investido</TableHead>
                            <TableHead>Comissão Assessor (3%)</TableHead>
                            <TableHead>Comissão Escritório (1%)</TableHead>
                            <TableHead>Comissão Investidor</TableHead>
                            <TableHead>Investimentos</TableHead>
                            <TableHead>Ações</TableHead>
                          </>
                        ) : filterType === "advisors" ? (
                          <>
                            <TableHead>Assessor</TableHead>
                            <TableHead>Total Investido</TableHead>
                            <TableHead>Comissão Mensal (3%)</TableHead>
                            <TableHead>Investidores</TableHead>
                            <TableHead>Investimentos</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ações</TableHead>
                          </>
                        ) : filterType === "offices" ? (
                          <>
                            <TableHead>Escritório</TableHead>
                            <TableHead>Total Investido</TableHead>
                            <TableHead>Comissão Mensal (1%)</TableHead>
                            <TableHead>Assessores</TableHead>
                            <TableHead>Investimentos</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ações</TableHead>
                          </>
                        ) : null
                      ) : (
                        // Cabeçalho para dados individuais (investimentos)
                        <>
                      <TableHead>Investidor</TableHead>
                      <TableHead>Assessor/Escritório</TableHead>
                      <TableHead>Investimento</TableHead>
                      <TableHead>Comissão Mensal</TableHead>
                          <TableHead>Divisão (3%/1%)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shouldShowAggregatedData() ? (
                      // Mostrar dados agregados (quando "Ver Por" mas sem seleção específica)
                      filterType === "investors" ? (
                        Array.from(totalsByCategory.investors.values()).map((investor, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{investor.name}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{formatCurrency(investor.totalAmount)}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-emerald-600">{formatCurrency(investor.advisorCommission)}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-orange-600">{formatCurrency(investor.officeCommission)}</p>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-blue-600">{formatCurrency(investor.investorCommission)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(() => {
                                    const commitmentPeriod = 12 // meses padrão
                                    const days = commitmentPeriod * 30
                                    let liquidity = "mensal"
                                    if (commitmentPeriod >= 24) liquidity = "anual"
                                    else if (commitmentPeriod >= 12) liquidity = "semestral"
                                    
                                    let rate = 0
                                    if (days <= 90) rate = 1.8
                                    else if (days <= 180) rate = liquidity === "mensal" ? 1.9 : 2.0
                                    else if (days <= 360) {
                                      if (liquidity === "mensal") rate = 2.1
                                      else if (liquidity === "semestral") rate = 2.2
                                      else if (liquidity === "anual") rate = 2.5
                                    } else if (days <= 720) {
                                      if (liquidity === "mensal") rate = 2.3
                                      else if (liquidity === "semestral") rate = 2.5
                                      else if (liquidity === "anual") rate = 2.7
                                      else if (liquidity === "bienal") rate = 3.0
                                    } else if (days <= 1080) {
                                      if (liquidity === "mensal") rate = 2.4
                                      else if (liquidity === "semestral") rate = 2.6
                                      else if (liquidity === "bienal") rate = 3.2
                                      else if (liquidity === "trienal") rate = 3.5
                                    } else rate = 3.5
                                    
                                    return `${rate}% a.m.`
                                  })()}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {filteredRecurrences.filter(r => r.investorName === investor.name).length} investimento(s)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setFilterType("investors")
                                setFilterValue(investor.name)
                              }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filterType === "advisors" ? (
                        Array.from(totalsByCategory.advisors.values()).map((advisor, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{advisor.name}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{formatCurrency(advisor.totalAmount)}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-emerald-600">{formatCurrency(advisor.totalCommission)}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {filteredRecurrences.filter(r => r.advisorId === advisor.id).length} investidor(es)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {advisor.count} investimento(s)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default">Ativo</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setFilterType("advisors")
                                setFilterValue(advisor.id)
                              }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filterType === "offices" ? (
                        Array.from(totalsByCategory.offices.values()).map((office, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{office.name}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{formatCurrency(office.totalAmount)}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-orange-600">{formatCurrency(office.totalCommission)}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {filteredRecurrences.filter(r => r.officeId === office.id).length} assessor(es)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {office.count} investimento(s)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default">Ativo</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setFilterType("offices")
                                setFilterValue(office.id)
                              }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : null
                    ) : (
                      // Mostrar dados individuais (quando "Ver Todos" ou item específico selecionado)
                      filteredRecurrences.map((recurrence) => (
                      <TableRow key={recurrence.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{recurrence.investorName}</p>
                            <p className="text-sm text-muted-foreground">{recurrence.investorEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{recurrence.advisorName}</p>
                            <p className="text-sm text-muted-foreground">{recurrence.officeName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{formatCurrency(recurrence.investmentAmount)}</p>
                          <p className="text-sm text-muted-foreground">
                            Depósito: {recurrence.paymentDate ? new Date(recurrence.paymentDate).toLocaleDateString("pt-BR") : "N/A"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{formatCurrency(recurrence.monthlyCommission)}</p>
                          <p className="text-sm text-muted-foreground">Pago: {formatCurrency(recurrence.totalPaid)}</p>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm">
                                <span className="text-emerald-600">Assessor: {formatCurrency(recurrence.advisorShare)}</span>
                            </p>
                            <p className="text-sm">
                                <span className="text-orange-600">Escritório: {formatCurrency(recurrence.officeShare)}</span>
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(recurrence.status)}>{getStatusLabel(recurrence.status)}</Badge>
                          {recurrence.riskFactors.length > 0 && (
                            <div className="mt-1">
                              <Badge variant="outline" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {recurrence.riskFactors.length} alertas
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleViewProjection(recurrence)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="totals" className="space-y-6">
          <div className="flex justify-end mb-4">
            {Array.from(totalsByCategory.investors.values()).length > 0 || 
             Array.from(totalsByCategory.advisors.values()).length > 0 || 
             Array.from(totalsByCategory.offices.values()).length > 0 ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToExcel("totals")}>
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF("totals")}>
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            ) : null}
          </div>
          <div className={`grid grid-cols-1 ${filterType === "all" ? "lg:grid-cols-3" : "lg:grid-cols-1"} gap-6`}>
            {/* Totais por Investidores */}
            {(filterType === "all" || filterType === "investors") && (
            <Card>
              <CardHeader>
                <CardTitle>Totais por Investidores</CardTitle>
                <CardDescription>Valores investidos e comissões por investidor</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from(totalsByCategory.investors.values()).map((investor, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{investor.name}</h3>
                        <Badge variant="outline">{formatCurrency(investor.totalAmount)}</Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Assessor (3%):</span>
                          <span className="font-medium text-emerald-600">
                            {formatCurrency(investor.advisorCommission)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Escritório (1%):</span>
                          <span className="font-medium text-orange-600">
                            {formatCurrency(investor.officeCommission)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Investidor (varia):</span>
                          <span className="font-medium text-blue-600">
                            {formatCurrency(investor.investorCommission)}
                          </span>
                        </div>
                        <div className="border-t pt-1">
                          <div className="flex justify-between font-semibold">
                            <span>Total Comissões:</span>
                            <span>{formatCurrency(investor.totalCommission)}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Baseado no prazo e liquidez do investimento
                        </div>
                      </div>
                    </div>
                  ))}
                  {Array.from(totalsByCategory.investors.values()).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">Nenhum investidor encontrado</p>
                  )}
                </div>
              </CardContent>
            </Card>
            )}

            {/* Totais por Assessores */}
            {(filterType === "all" || filterType === "advisors") && (
            <Card>
              <CardHeader>
                <CardTitle>Totais por Assessores</CardTitle>
                <CardDescription>Comissões e investimentos por assessor</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from(totalsByCategory.advisors.values()).map((advisor, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{advisor.name}</h3>
                        <Badge variant="outline">{advisor.count} investimento(s)</Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Investido:</span>
                          <span className="font-medium">{formatCurrency(advisor.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Comissão Mensal (3%):</span>
                          <span className="font-medium text-emerald-600">
                            {formatCurrency(advisor.totalCommission)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(advisor.totalAmount)} × 3% = {formatCurrency(advisor.totalCommission)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {Array.from(totalsByCategory.advisors.values()).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">Nenhum assessor encontrado</p>
                  )}
                </div>
              </CardContent>
            </Card>
            )}

            {/* Totais por Escritórios */}
            {(filterType === "all" || filterType === "offices") && (
            <Card>
              <CardHeader>
                <CardTitle>Totais por Escritórios</CardTitle>
                <CardDescription>Comissões e investimentos por escritório</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from(totalsByCategory.offices.values()).map((office, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{office.name}</h3>
                        <Badge variant="outline">{office.count} investimento(s)</Badge>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Investido:</span>
                          <span className="font-medium">{formatCurrency(office.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Comissão Mensal (1%):</span>
                          <span className="font-medium text-orange-600">
                            {formatCurrency(office.totalCommission)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(office.totalAmount)} × 1% = {formatCurrency(office.totalCommission)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {Array.from(totalsByCategory.offices.values()).length === 0 && (
                    <p className="text-muted-foreground text-center py-4">Nenhum escritório encontrado</p>
                  )}
                </div>
              </CardContent>
            </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="impacts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Impactos Futuros na Recorrência</CardTitle>
              <CardDescription>Eventos que afetarão as comissões recorrentes nos próximos meses</CardDescription>
            </CardHeader>
            <CardContent>
              {impacts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum impacto futuro identificado.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Impactos como resgates pendentes e campanhas expirando aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {impacts.map((impact, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              impact.type === "withdrawal"
                                ? "bg-red-500"
                                : impact.type === "bonus_expiry"
                                  ? "bg-yellow-500"
                                  : impact.type === "campaign_end"
                                    ? "bg-orange-500"
                                    : "bg-blue-500"
                            }`}
                          ></div>
                          <h3 className="font-semibold">{impact.description}</h3>
                        </div>
                        <Badge variant="outline">{new Date(impact.impactDate).toLocaleDateString("pt-BR")}</Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Impacto Mensal</p>
                          <p
                            className={`font-medium ${impact.monthlyImpact < 0 ? "text-red-600" : "text-emerald-600"}`}
                          >
                            {formatCurrency(impact.monthlyImpact)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Impacto Total</p>
                          <p className={`font-medium ${impact.totalImpact < 0 ? "text-red-600" : "text-emerald-600"}`}>
                            {formatCurrency(impact.totalImpact)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Recorrências Afetadas</p>
                          <p className="font-medium">{impact.affectedRecurrences}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["active", "at_risk", "paused", "cancelled"].map((status) => {
                    const count = filteredRecurrences.filter((r) => r.status === status).length
                    const percentage = filteredRecurrences.length > 0 ? (count / filteredRecurrences.length) * 100 : 0

                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
                          <span className="text-sm">{count} recorrências</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Projeção de 12 Meses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receita Atual (mensal)</span>
                    <span className="font-medium">{formatCurrency(totalMonthlyCommissions)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projeção 12 meses</span>
                    <span className="font-medium">{formatCurrency(totalMonthlyCommissions * 12)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impacto de riscos</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(impacts.reduce((sum, i) => sum + i.totalImpact, 0))}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Projeção Líquida</span>
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(
                          totalMonthlyCommissions * 12 + impacts.reduce((sum, i) => sum + i.totalImpact, 0),
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isProjectionOpen} onOpenChange={setIsProjectionOpen}>
        <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[95vh] sm:!max-w-[95vw]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Projeção de Recorrência - {selectedRecurrence?.investorName}</DialogTitle>
                <DialogDescription>Projeção detalhada dos próximos 12 meses de comissões</DialogDescription>
              </div>
              {projections.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportToExcel("projection")}>
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportToPDF("projection")}>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedRecurrence && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Investimento</p>
                  <p className="font-semibold">{formatCurrency(selectedRecurrence.investmentAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data do Depósito</p>
                  <p className="font-semibold">{selectedRecurrence.paymentDate ? new Date(selectedRecurrence.paymentDate).toLocaleDateString("pt-BR") : "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Período</p>
                  <p className="font-semibold">{selectedRecurrence.commitmentPeriod} meses</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Liquidez</p>
                  <p className="font-semibold">{selectedRecurrence.profitabilityLiquidity || "Mensal"}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                  <Table className="w-full">
                    <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                        <TableHead className="w-16 text-center">Mês</TableHead>
                        <TableHead className="w-32 text-center">Data</TableHead>
                        <TableHead className="w-32 text-center">Valor Total</TableHead>
                        <TableHead className="w-32 text-center">Investidor ({investorRate || 2.0}%)</TableHead>
                        <TableHead className="w-32 text-center">Assessor (3%)</TableHead>
                        <TableHead className="w-32 text-center">Escritório (1%)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projections.map((projection) => (
                      <TableRow key={projection.month}>
                          <TableCell className="font-medium text-center">{projection.month}</TableCell>
                          <TableCell className="text-center text-sm">
                            {new Date(projection.date).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-purple-600 font-medium text-center">
                            {formatCurrency(projection.totalValue)}
                          </TableCell>
                          <TableCell className="text-blue-600 font-medium text-center">
                            {formatCurrency(projection.investorCommission)}
                          </TableCell>
                          <TableCell className="text-emerald-600 font-medium text-center">
                          {formatCurrency(projection.advisorCommission)}
                        </TableCell>
                          <TableCell className="text-orange-600 font-medium text-center">
                            {formatCurrency(projection.officeCommission)}
                          </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
