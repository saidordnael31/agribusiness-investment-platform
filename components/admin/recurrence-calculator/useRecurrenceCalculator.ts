"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils"
import { calculateNewCommissionLogic, getInvestmentCutoffPeriod, getFifthBusinessDayOfMonth, isBusinessDay, getCurrentCutoffDate, canInvestorEnterCurrentCutoff, COMMISSION_RATES } from "@/lib/commission-calculator"
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'

export interface RecurrenceCalculation {
  id: string
  investorName: string
  investorEmail: string
  advisorName: string
  advisorId: string
  officeName: string
  officeId: string
  investmentAmount: number
  baseCommissionRate: number
  bonusRate: number
  totalCommissionRate: number
  monthlyCommission: number
  advisorShare: number
  officeShare: number
  paymentDate: string
  nextPaymentDate?: string | null
  nextPaymentDetails?: {
    advisorAmount: number
    officeAmount: number
    investorAmount: number
    investorRate: number
    totalAmount: number
    daysCounted?: number
    officePercentage?: number
    advisorPercentage?: number
    investorPercentage?: number
    cutoffDate?: string
  }
  projectedEndDate?: string
  status: "active" | "paused" | "cancelled" | "at_risk"
  totalPaid: number
  projectedTotal: number
  remainingMonths: number
  commitmentPeriod: number
  profitabilityLiquidity?: string
  appliedBonuses: string[]
  riskFactors: string[]
}

export interface RecurrenceProjection {
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
  totalValue: number
  activeBonuses: string[]
  riskLevel: "low" | "medium" | "high"
}

export interface RecurrenceImpact {
  type: "withdrawal" | "bonus_expiry" | "campaign_end" | "performance_goal"
  description: string
  impactDate: string
  monthlyImpact: number
  totalImpact: number
  affectedRecurrences: number
}

// Função auxiliar para formatar payment_date corretamente, evitando problemas de timezone
const formatPaymentDate = (paymentDate: string | null | undefined): string => {
  if (!paymentDate) return "N/A"
  
  // Se for string no formato YYYY-MM-DD, extrair diretamente sem conversão de timezone
  if (typeof paymentDate === 'string' && paymentDate.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [datePart] = paymentDate.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    // Formatar diretamente sem passar por Date para evitar problemas de timezone
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
  }
  
  // Fallback: tentar parsear como Date e usar UTC
  const date = new Date(paymentDate)
  if (!isNaN(date.getTime())) {
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1
    const day = date.getUTCDate()
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
  }
  
  return "N/A"
}

const formatDateKey = (date: Date): string => {
  const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
  const year = normalizedDate.getFullYear()
  const month = String(normalizedDate.getMonth() + 1).padStart(2, '0')
  const day = String(normalizedDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeUtcDateToLocal = (date: Date): Date => {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
}

export function useRecurrenceCalculator() {
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
  const [filterOptions, setFilterOptions] = useState<{
    investors: { id: string; name: string }[]
    advisors: { id: string; name: string }[]
    offices: { id: string; name: string }[]
  }>({
    investors: [],
    advisors: [],
    offices: []
  })
  const [investorRate, setInvestorRate] = useState<number>(0)

  const fetchRecurrenceData = async () => {
    try {
      setLoading(true)

      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select("*")
        .eq("status", "active")

      if (investmentsError) {
        console.error("Erro ao buscar investimentos:", investmentsError)
        throw investmentsError
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, user_type, parent_id, office_id, hierarchy_level")

      if (profilesError) {
        console.error("Erro ao buscar perfis:", profilesError)
        throw profilesError
      }

      const profilesMap = new Map()
      const distributorsMap = new Map()
      
      profiles?.forEach((profile) => {
        profilesMap.set(profile.id, profile)
        if (profile.user_type === "distributor" || profile.user_type === "admin") {
          distributorsMap.set(profile.id, profile)
        }
      })

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const processedRecurrences: RecurrenceCalculation[] = (investments || [])
        .filter((investment: any) => {
          // Validar que payment_date existe e é uma data válida
          if (!investment.payment_date) return false
          const date = new Date(investment.payment_date)
          return !isNaN(date.getTime())
        })
        .map((investment: any): RecurrenceCalculation => {
        const investor = profilesMap.get(investment.user_id)
        let advisor: any = null
        let office = null

        if (investor?.parent_id) {
          advisor = distributorsMap.get(investor.parent_id)
        }
        if (investor?.office_id) {
          office = distributorsMap.get(investor.office_id)
        }

        // Usar a mesma lógica de cálculo que implementamos
        const paymentDateValue = investment.payment_date
        
        // Parse da data preservando o formato ISO (YYYY-MM-DD) para evitar problemas de timezone
        let depositDate: Date
        if (typeof paymentDateValue === 'string' && paymentDateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
          const [datePart] = paymentDateValue.split('T')
          const [year, month, day] = datePart.split('-').map(Number)
          depositDate = new Date(year, month - 1, day)
        } else {
          depositDate = new Date(paymentDateValue)
        }
        depositDate.setHours(0, 0, 0, 0)
        
        const commitmentPeriod = investment.commitment_period || 12
        const profitabilityLiquidity = investment.profitability_liquidity || "Mensal"
        const cutoffInfoForDeposit = getInvestmentCutoffPeriod(depositDate)
        const cutoffDateForDeposit = cutoffInfoForDeposit.cutoffDate
        
        // Calcular comissão usando a nova lógica
        let commissionCalc
        try {
          commissionCalc = calculateNewCommissionLogic({
            id: investment.id,
            user_id: investment.user_id,
            amount: Number(investment.amount),
            payment_date: depositDate,
            commitment_period: commitmentPeriod,
            investorName: investor?.full_name || "Investidor",
            advisorId: advisor?.id,
            advisorName: advisor?.full_name || "Assessor",
            advisorRole: advisor?.role,
            officeId: office?.id,
            officeName: office?.full_name || "Escritório",
            isForAdvisor: true, // Para calcular comissão do assessor
          })
        } catch (error) {
          console.error("Erro ao calcular comissão:", error)
          // Fallback para cálculo simples em caso de erro
          commissionCalc = null
        }
        
        // Se não conseguir calcular com a nova lógica, usar fallback
        let nextPaymentDateKey: string | null = null
        let nextPaymentIndex: number | null = null
        let paymentSchedule: Array<{ key: string; date: Date }> = []

        if (commissionCalc && Array.isArray(commissionCalc.paymentDueDate)) {
          paymentSchedule = commissionCalc.paymentDueDate
            .map(dateValue => {
              const parsedDate = new Date(dateValue)
              if (isNaN(parsedDate.getTime())) return null
              const normalized = normalizeUtcDateToLocal(parsedDate)
              return {
                key: formatDateKey(normalized),
                date: normalized,
              }
            })
            .filter((value): value is { key: string; date: Date } => Boolean(value))
            .sort((a, b) => a.date.getTime() - b.date.getTime())

          const upcomingPayment = paymentSchedule.find(entry => entry.date.getTime() >= today.getTime())
          if (upcomingPayment) {
            nextPaymentDateKey = upcomingPayment.key
            nextPaymentIndex = paymentSchedule.findIndex(entry => entry.key === upcomingPayment.key)
          }
        }

        const calculateProratedShare = (amount: number, ratePercent: number, days: number) => {
          if (days <= 0) return 0
          const dailyRate = (ratePercent / 100) / 30
          return amount * dailyRate * days
        }

        if (!commissionCalc) {
          const advisorRate = 3.0
          const officeRate = 1.0
          const totalCommissionRate = advisorRate + officeRate
          
          const baseAdvisorMonthly = (investment.amount * advisorRate) / 100
          const baseOfficeMonthly = (investment.amount * officeRate) / 100
          const monthlyCommission = baseAdvisorMonthly + baseOfficeMonthly

          const cutoffPeriod = getInvestmentCutoffPeriod(depositDate)
          const cutoffDate = cutoffPeriod.cutoffDate
          const depositUTC = new Date(Date.UTC(
            depositDate.getFullYear(),
            depositDate.getMonth(),
            depositDate.getDate(),
            0, 0, 0, 0
          ))
          const cutoffUTC = new Date(Date.UTC(
            cutoffDate.getFullYear(),
            cutoffDate.getMonth(),
            cutoffDate.getDate(),
            0, 0, 0, 0
          ))
          const diffDays = Math.max(0, Math.floor((cutoffUTC.getTime() - depositUTC.getTime()) / (1000 * 60 * 60 * 24)))
          const proratedAdvisor = calculateProratedShare(investment.amount, advisorRate, diffDays)
          const proratedOffice = calculateProratedShare(investment.amount, officeRate, diffDays)
          
          const now = new Date()
          now.setHours(0, 0, 0, 0)
          const yearsDiff = now.getFullYear() - depositDate.getFullYear()
          const monthsDiff = now.getMonth() - depositDate.getMonth()
          const daysDiff = now.getDate() - depositDate.getDate()
          let monthsPassed = yearsDiff * 12 + monthsDiff
          if (daysDiff < 0) monthsPassed -= 1
          monthsPassed = Math.max(0, monthsPassed)
          
          const totalPaid = monthlyCommission * monthsPassed
          const remainingMonths = Math.max(0, commitmentPeriod - monthsPassed)
          
          if (!nextPaymentDateKey) {
            const cutoffPeriod = getInvestmentCutoffPeriod(depositDate)
            let paymentDueYear = cutoffPeriod.cutoffDate.getFullYear()
            let paymentDueMonth = cutoffPeriod.cutoffDate.getMonth() + 1
            if (paymentDueMonth > 11) {
              paymentDueMonth = 0
              paymentDueYear += 1
            }
            const fallbackNextPayment = getFifthBusinessDayOfMonth(paymentDueYear, paymentDueMonth)
            nextPaymentDateKey = formatDateKey(fallbackNextPayment)
          }

          const nextPaymentDetails = {
            advisorAmount: proratedAdvisor,
            officeAmount: proratedOffice,
            investorAmount: 0,
            investorRate: 0,
            totalAmount: proratedAdvisor + proratedOffice,
            daysCounted: diffDays,
            officePercentage: investment.amount > 0 ? (proratedOffice / investment.amount) * 100 : 0,
            advisorPercentage: investment.amount > 0 ? (proratedAdvisor / investment.amount) * 100 : 0,
            investorPercentage: 0,
            cutoffDate: cutoffUTC.toISOString(),
          }

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
            advisorShare: baseAdvisorMonthly,
            officeShare: baseOfficeMonthly,
            paymentDate: paymentDateValue,
            nextPaymentDate: nextPaymentDateKey,
            nextPaymentDetails,
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
        }
        
        // Usar a comissão calculada pela nova lógica
        // Para o primeiro mês: usar advisorCommission (proporcional)
        // Para meses futuros: usar monthlyBreakdown (mensal completa)
        const advisorRate = 3.0
        const officeRate = 1.0
        const totalCommissionRate = advisorRate + officeRate
        
        // Comissão mensal completa (a partir do segundo mês)
        const monthlyAdvisorCommission = commissionCalc.amount * (advisorRate / 100)
        const monthlyOfficeCommission = commissionCalc.amount * (officeRate / 100)
        const monthlyCommission = monthlyAdvisorCommission + monthlyOfficeCommission
        
        // Para exibição: usar a comissão do primeiro mês (proporcional) ou mensal completa
        const advisorShare = commissionCalc.advisorCommission // Primeiro mês proporcional
        const officeShare = commissionCalc.officeCommission // Primeiro mês proporcional
        
        // Calcular total pago considerando primeiro mês proporcional e demais mensais
        const now = new Date()
        now.setHours(0, 0, 0, 0)
        
        // Verificar quantos meses já passaram desde o primeiro pagamento
        let monthsPassed = 0
        if (commissionCalc.paymentDueDate.length > 0) {
          const firstPaymentDate = new Date(commissionCalc.paymentDueDate[0])
          firstPaymentDate.setHours(0, 0, 0, 0)
          
          if (now >= firstPaymentDate) {
            // Contar quantos pagamentos já deveriam ter sido feitos
            monthsPassed = commissionCalc.paymentDueDate.filter(paymentDate => {
              const payment = new Date(paymentDate)
              payment.setHours(0, 0, 0, 0)
              return payment <= now
            }).length
          }
        }
        
        // Calcular total pago: primeiro mês proporcional + meses seguintes mensais completos
        let totalPaid = 0
        if (monthsPassed > 0) {
          // Primeiro mês: comissão proporcional
          totalPaid = advisorShare + officeShare
          // Meses seguintes: comissão mensal completa
          if (monthsPassed > 1) {
            totalPaid += monthlyCommission * (monthsPassed - 1)
          }
        }
        
        const remainingMonths = Math.max(0, commitmentPeriod - monthsPassed)

        // Calcular projectedTotal: primeiro mês proporcional + meses seguintes mensais completos
        const projectedTotal = advisorShare + officeShare + (monthlyCommission * (commitmentPeriod - 1))

        if (!nextPaymentDateKey && paymentSchedule.length > 0) {
          nextPaymentDateKey = paymentSchedule[paymentSchedule.length - 1].key
          nextPaymentIndex = paymentSchedule.length - 1
        }

        let nextPaymentDetails = {
          advisorAmount: advisorShare,
          officeAmount: officeShare,
          investorAmount: 0,
          investorRate: 0,
          totalAmount: advisorShare + officeShare,
          daysCounted: undefined as number | undefined,
          officePercentage: undefined as number | undefined,
          advisorPercentage: undefined as number | undefined,
          investorPercentage: undefined as number | undefined,
          cutoffDate: undefined as string | undefined,
        }

        if (commissionCalc && paymentSchedule.length > 0) {
          if (nextPaymentIndex === null) {
            nextPaymentIndex = paymentSchedule.findIndex(entry => entry.date.getTime() >= today.getTime())
          }

          if (nextPaymentIndex !== null && nextPaymentIndex >= 0) {
            let advisorAmount = advisorShare
            let officeAmount = officeShare
            let investorAmount = 0
            let daysCounted: number | undefined
            let officePercentage: number | undefined
            let advisorPercentage: number | undefined
            let investorPercentage: number | undefined
            let cutoffDateISO: string | undefined

            if (commissionCalc.monthlyBreakdown && commissionCalc.monthlyBreakdown[nextPaymentIndex]) {
              const monthData = commissionCalc.monthlyBreakdown[nextPaymentIndex]
              investorAmount = monthData.investorCommission
              const depositUTC = new Date(Date.UTC(
                depositDate.getFullYear(),
                depositDate.getMonth(),
                depositDate.getDate(),
                0, 0, 0, 0
              ))
              const cutoffUTC = new Date(Date.UTC(
                cutoffDateForDeposit.getFullYear(),
                cutoffDateForDeposit.getMonth(),
                cutoffDateForDeposit.getDate(),
                0, 0, 0, 0
              ))
              const diffMs = cutoffUTC.getTime() - depositUTC.getTime()
              const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
              daysCounted = diffDays
              advisorAmount = calculateProratedShare(commissionCalc.amount, advisorRate, diffDays)
              officeAmount = calculateProratedShare(commissionCalc.amount, officeRate, diffDays)
              officePercentage = commissionCalc.amount > 0 ? (officeAmount / commissionCalc.amount) * 100 : 0
              advisorPercentage = commissionCalc.amount > 0 ? (advisorAmount / commissionCalc.amount) * 100 : 0
              investorPercentage = commissionCalc.amount > 0 ? (investorAmount / commissionCalc.amount) * 100 : 0
              cutoffDateISO = cutoffUTC.toISOString()
            } else if (nextPaymentIndex > 0) {
              investorAmount = commissionCalc.amount * COMMISSION_RATES.investidor
              const nextDate = paymentSchedule[nextPaymentIndex]?.date
              if (nextDate) {
                const prevDate = paymentSchedule[nextPaymentIndex - 1]?.date
                if (prevDate) {
                  const diffMs = nextDate.getTime() - prevDate.getTime()
                  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
                  daysCounted = diffDays
                  advisorAmount = calculateProratedShare(commissionCalc.amount, advisorRate, diffDays)
                  officeAmount = calculateProratedShare(commissionCalc.amount, officeRate, diffDays)
                  officePercentage = commissionCalc.amount > 0 ? (officeAmount / commissionCalc.amount) * 100 : 0
                  advisorPercentage = commissionCalc.amount > 0 ? (advisorAmount / commissionCalc.amount) * 100 : 0
                  investorPercentage = commissionCalc.amount > 0 ? (investorAmount / commissionCalc.amount) * 100 : 0
                  cutoffDateISO = nextDate.toISOString()
                } else {
                  daysCounted = 30
                  advisorAmount = calculateProratedShare(commissionCalc.amount, advisorRate, 30)
                  officeAmount = calculateProratedShare(commissionCalc.amount, officeRate, 30)
                  officePercentage = commissionCalc.amount > 0 ? (officeAmount / commissionCalc.amount) * 100 : 0
                  advisorPercentage = commissionCalc.amount > 0 ? (advisorAmount / commissionCalc.amount) * 100 : 0
                  investorPercentage = commissionCalc.amount > 0 ? (investorAmount / commissionCalc.amount) * 100 : 0
                  cutoffDateISO = nextDate ? nextDate.toISOString() : cutoffDateForDeposit.toISOString()
                }
              } else {
                daysCounted = 30
                advisorAmount = calculateProratedShare(commissionCalc.amount, advisorRate, 30)
                officeAmount = calculateProratedShare(commissionCalc.amount, officeRate, 30)
                officePercentage = commissionCalc.amount > 0 ? (officeAmount / commissionCalc.amount) * 100 : 0
                advisorPercentage = commissionCalc.amount > 0 ? (advisorAmount / commissionCalc.amount) * 100 : 0
                investorPercentage = commissionCalc.amount > 0 ? (investorAmount / commissionCalc.amount) * 100 : 0
                cutoffDateISO = cutoffDateForDeposit.toISOString()
              }
            }

            const investorRate = commissionCalc.amount > 0 ? (investorAmount / commissionCalc.amount) * 100 : 0
            nextPaymentDetails = {
              advisorAmount,
              officeAmount,
              investorAmount,
              investorRate,
              totalAmount: advisorAmount + officeAmount,
              daysCounted,
              officePercentage,
              advisorPercentage,
              investorPercentage,
              cutoffDate: cutoffDateISO ?? cutoffDateForDeposit.toISOString(),
            }
          }
        }
        
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
          monthlyCommission, // Comissão mensal completa (a partir do segundo mês)
          advisorShare, // Comissão do primeiro mês (proporcional)
          officeShare, // Comissão do primeiro mês (proporcional)
          paymentDate: paymentDateValue, // Preservar payment_date exatamente como vem do banco
          nextPaymentDate: nextPaymentDateKey,
          nextPaymentDetails,
          projectedEndDate: undefined,
          status: "active" as const,
          totalPaid,
          projectedTotal,
          remainingMonths,
          commitmentPeriod,
          profitabilityLiquidity,
          appliedBonuses: [],
          riskFactors: [],
        }
      })

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
      setImpacts([])
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

  // Função para calcular o próximo quinto dia útil baseado no último corte
  // O corte é sempre dia 20, e o pagamento é no 5º dia útil do mês seguinte ao corte
  const getNextFifthBusinessDay = (): Date => {
    // Calcular o último corte (dia 20 do mês atual ou anterior)
    const lastCutoff = getCurrentCutoffDate()
    lastCutoff.setUTCHours(0, 0, 0, 0)
    
    // O próximo quinto dia útil é do mês seguinte ao último corte
    const cutoffYear = lastCutoff.getUTCFullYear()
    const cutoffMonth = lastCutoff.getUTCMonth()
    
    // Mês seguinte ao corte
    let nextMonth = cutoffMonth + 1
    let nextYear = cutoffYear
    if (nextMonth > 11) {
      nextMonth = 0
      nextYear += 1
    }
    
    // Calcular o 5º dia útil do mês seguinte ao corte
    return getFifthBusinessDayOfMonth(nextYear, nextMonth)
  }
  
  // Função para obter o último corte (dia 20)
  const getLastCutoffDate = (): Date => {
    return getCurrentCutoffDate()
  }

  const getFilteredRecurrences = () => {
    // Primeiro, filtrar por último corte (dia 20) - só investimentos depositados até o último corte
    const lastCutoff = getLastCutoffDate()
    // Normalizar para UTC meia-noite do dia 20
    const lastCutoffUTC = new Date(Date.UTC(
      lastCutoff.getUTCFullYear(),
      lastCutoff.getUTCMonth(),
      lastCutoff.getUTCDate(),
      23, 59, 59, 999
    ))
    
    let filtered = recurrences.filter(recurrence => {
      if (!recurrence.paymentDate) return false
      
      // Parse da data preservando o formato do banco (YYYY-MM-DD) para comparação correta
      let paymentDate: Date
      if (typeof recurrence.paymentDate === 'string' && recurrence.paymentDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        const [datePart] = recurrence.paymentDate.split('T')
        const [year, month, day] = datePart.split('-').map(Number)
        paymentDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
      } else {
        paymentDate = new Date(recurrence.paymentDate)
        paymentDate = new Date(Date.UTC(
          paymentDate.getUTCFullYear(),
          paymentDate.getUTCMonth(),
          paymentDate.getUTCDate(),
          0, 0, 0, 0
        ))
      }
      
      // Só incluir investimentos depositados até o último corte (dia 20)
      return paymentDate <= lastCutoffUTC
    })

    const upcomingFifthBusinessDayKey = formatDateKey(getNextFifthBusinessDay())

    filtered = filtered.filter(recurrence => {
      if (!recurrence.nextPaymentDate) return false
      return recurrence.nextPaymentDate === upcomingFifthBusinessDayKey
    })
    
    // Depois aplicar filtros adicionais (investidor, assessor, escritório)
    if (filterType === "all") {
      return filtered
    }
    
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

  const shouldShowAggregatedData = () => {
    return filterType !== "all" && !filterValue
  }

  const filteredRecurrences = getFilteredRecurrences()

  const calculateInvestorCommission = (recurrence: RecurrenceCalculation) => {
    // Verificar se o investimento completou 60 dias desde o depósito até o último corte
    if (!recurrence.paymentDate) return 0
    
    // Parse da data de pagamento
    let paymentDate: Date
    if (typeof recurrence.paymentDate === 'string' && recurrence.paymentDate.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [datePart] = recurrence.paymentDate.split('T')
      const [year, month, day] = datePart.split('-').map(Number)
      paymentDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
    } else {
      paymentDate = new Date(recurrence.paymentDate)
      paymentDate = new Date(Date.UTC(
        paymentDate.getUTCFullYear(),
        paymentDate.getUTCMonth(),
        paymentDate.getUTCDate(),
        0, 0, 0, 0
      ))
    }
    
    // Obter último corte
    const lastCutoff = getLastCutoffDate()
    
    // Verificar se completou 60 dias até o último corte
    const canEnterCutoff = canInvestorEnterCurrentCutoff(paymentDate, lastCutoff)
    
    // Se não completou 60 dias, comissão do investidor é zero
    if (!canEnterCutoff) {
      return 0
    }
    
    // Se completou 60 dias, calcular comissão normalmente
    const commitmentPeriod = recurrence.remainingMonths || 12
    const days = commitmentPeriod * 30
    
    let liquidity = "mensal"
    if (commitmentPeriod >= 24) liquidity = "anual"
    else if (commitmentPeriod >= 12) liquidity = "semestral"
    
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
      rate = 3.5
    }
    
    return (recurrence.investmentAmount * rate) / 100
  }

  const getTotalsByCategory = () => {
    const totals = {
      investors: new Map<string, { id: string; name: string; totalAmount: number; advisorCommission: number; officeCommission: number; investorCommission: number; totalCommission: number }>(),
      advisors: new Map<string, { id: string; name: string; totalAmount: number; totalCommission: number; count: number }>(),
      offices: new Map<string, { id: string; name: string; totalAmount: number; totalCommission: number; count: number }>()
    }

    const shouldCalculateInvestors = filterType === "all" || filterType === "investors"
    const shouldCalculateAdvisors = filterType === "all" || filterType === "advisors"
    const shouldCalculateOffices = filterType === "all" || filterType === "offices"

    filteredRecurrences.forEach(recurrence => {
      if (recurrence.status !== "active") {
        return
      }

      const nextDetails = recurrence.nextPaymentDetails
      const advisorAmount = nextDetails?.advisorAmount ?? recurrence.advisorShare
      const officeAmount = nextDetails?.officeAmount ?? recurrence.officeShare
      const investorAmount = nextDetails?.investorAmount ?? calculateInvestorCommission(recurrence)
      const totalCommissionForNextPayment = advisorAmount + officeAmount + investorAmount

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
        investorTotal.advisorCommission += advisorAmount
        investorTotal.officeCommission += officeAmount
        investorTotal.investorCommission += investorAmount
        investorTotal.totalCommission += totalCommissionForNextPayment
      }

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
        advisorTotal.totalCommission += advisorAmount
        advisorTotal.count += 1
      }

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
        officeTotal.totalCommission += officeAmount
        officeTotal.count += 1
      }
    })

    return totals
  }

  const totalsByCategory = getTotalsByCategory()

  const totalActiveRecurrences = filteredRecurrences.filter((r) => r.status === "active").length
  const totalMonthlyCommissions = filteredRecurrences
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + (r.nextPaymentDetails?.totalAmount ?? (r.advisorShare + r.officeShare)), 0)
  const totalAdvisorShare = filteredRecurrences
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + (r.nextPaymentDetails?.advisorAmount ?? r.advisorShare), 0)
  const totalOfficeShare = filteredRecurrences
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + (r.nextPaymentDetails?.officeAmount ?? r.officeShare), 0)
  const atRiskRecurrences = filteredRecurrences.filter((r) => r.status === "at_risk").length

  const calculateInvestorRate = (recurrence: RecurrenceCalculation) => {
    const commitmentPeriod = recurrence.commitmentPeriod || 12
    const days = commitmentPeriod * 30
    
    const liquidity = recurrence.profitabilityLiquidity?.toLowerCase() || "mensal"
    
    let calculatedInvestorRate = 0
    
    if (days <= 90) {
      calculatedInvestorRate = 1.8
    } else if (days <= 180) {
      if (liquidity === "mensal") calculatedInvestorRate = 1.9
      else if (liquidity === "semestral") calculatedInvestorRate = 2.0
      else calculatedInvestorRate = 1.9
    } else if (days <= 360) {
      if (liquidity === "mensal") calculatedInvestorRate = 2.1
      else if (liquidity === "semestral") calculatedInvestorRate = 2.2
      else if (liquidity === "anual") calculatedInvestorRate = 2.5
      else calculatedInvestorRate = 2.1
    } else if (days <= 720) {
      if (liquidity === "mensal") calculatedInvestorRate = 2.3
      else if (liquidity === "semestral") calculatedInvestorRate = 2.5
      else if (liquidity === "anual") calculatedInvestorRate = 2.7
      else if (liquidity === "bienal") calculatedInvestorRate = 3.0
      else calculatedInvestorRate = 2.3
    } else if (days <= 1080) {
      if (liquidity === "mensal") calculatedInvestorRate = 2.4
      else if (liquidity === "semestral") calculatedInvestorRate = 2.6
      else if (liquidity === "bienal") calculatedInvestorRate = 3.2
      else if (liquidity === "trienal") calculatedInvestorRate = 3.5
      else calculatedInvestorRate = 2.4
    } else {
      calculatedInvestorRate = 3.5
    }
    
    return calculatedInvestorRate
  }

  useEffect(() => {
    if (selectedRecurrence) {
      const rate = calculateInvestorRate(selectedRecurrence)
      setInvestorRate(rate)
    }
  }, [selectedRecurrence])

  const generateProjection = (recurrence: RecurrenceCalculation) => {
    const projections: RecurrenceProjection[] = []
    let cumulativeAdvisor = 0
    let cumulativeOffice = 0
    let cumulativeInvestor = 0
    let cumulativeTotal = 0

    const calculatedInvestorRate = calculateInvestorRate(recurrence)
    setInvestorRate(calculatedInvestorRate)
    
    const liquidity = recurrence.profitabilityLiquidity?.toLowerCase() || "mensal"
    
    // Recalcular comissão usando a nova lógica para ter acesso ao monthlyBreakdown
    let commissionCalc = null
    try {
      const paymentDate = new Date(recurrence.paymentDate)
      if (typeof recurrence.paymentDate === 'string' && recurrence.paymentDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        const [datePart] = recurrence.paymentDate.split('T')
        const [year, month, day] = datePart.split('-').map(Number)
        paymentDate.setFullYear(year, month - 1, day)
      }
      paymentDate.setHours(0, 0, 0, 0)
      
      commissionCalc = calculateNewCommissionLogic({
        id: recurrence.id,
        user_id: "", // Não precisamos do user_id para projeção
        amount: recurrence.investmentAmount,
        payment_date: paymentDate,
        commitment_period: recurrence.commitmentPeriod,
        investorName: recurrence.investorName,
        advisorId: recurrence.advisorId,
        advisorName: recurrence.advisorName,
        officeId: recurrence.officeId,
        officeName: recurrence.officeName,
        isForAdvisor: true,
      })
    } catch (error) {
      console.error("Erro ao calcular comissão para projeção:", error)
    }
    
    // Se tiver monthlyBreakdown, usar os dados corretos
    // Caso contrário, usar lógica de fallback
    const hasMonthlyBreakdown = commissionCalc && commissionCalc.monthlyBreakdown && commissionCalc.monthlyBreakdown.length > 0
    
    let accumulationPeriod = 1
    if (liquidity === "semestral") accumulationPeriod = 6
    else if (liquidity === "anual") accumulationPeriod = 12
    else if (liquidity === "bienal") accumulationPeriod = 24
    else if (liquidity === "trienal") accumulationPeriod = 36
    
    const monthlyRate = calculatedInvestorRate / 12
    let totalInvestmentValue = recurrence.investmentAmount
    let accumulatedCommission = 0

    // Usar o número de meses do commitmentPeriod ou 12 para projeção
    const monthsToProject = Math.min(recurrence.commitmentPeriod || 12, 12)
    
    for (let month = 1; month <= monthsToProject; month++) {
      // Determinar data de pagamento: usar paymentDueDate se disponível, senão calcular
      let paymentDate: Date
      if (commissionCalc && commissionCalc.paymentDueDate.length >= month) {
        paymentDate = new Date(commissionCalc.paymentDueDate[month - 1])
      } else {
        paymentDate = new Date()
        paymentDate.setMonth(paymentDate.getMonth() + month)
      }

      // Buscar comissões do monthlyBreakdown se disponível
      let advisorCommission: number
      let officeCommission: number
      
      if (hasMonthlyBreakdown && commissionCalc && commissionCalc.monthlyBreakdown.length >= month) {
        // Usar comissão do monthlyBreakdown
        const monthData = commissionCalc.monthlyBreakdown[month - 1]
        advisorCommission = monthData.advisorCommission
        officeCommission = monthData.officeCommission
      } else {
        // Fallback: usar comissão mensal completa (3% assessor, 1% escritório)
        advisorCommission = (recurrence.investmentAmount * recurrence.baseCommissionRate) / 100
        officeCommission = (recurrence.investmentAmount * recurrence.bonusRate) / 100
      }
      
      // Calcular comissão do investidor (verificar D+60 para o primeiro mês)
      let monthlyGain = 0
      let investorCommission = 0
      
      // Verificar se o investimento completou 60 dias até o último corte (para o primeiro mês)
      let canInvestorReceiveCommission = true
      if (month === 1 && recurrence.paymentDate) {
        let paymentDate: Date
        if (typeof recurrence.paymentDate === 'string' && recurrence.paymentDate.match(/^\d{4}-\d{2}-\d{2}/)) {
          const [datePart] = recurrence.paymentDate.split('T')
          const [year, month, day] = datePart.split('-').map(Number)
          paymentDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
        } else {
          paymentDate = new Date(recurrence.paymentDate)
          paymentDate = new Date(Date.UTC(
            paymentDate.getUTCFullYear(),
            paymentDate.getUTCMonth(),
            paymentDate.getUTCDate(),
            0, 0, 0, 0
          ))
        }
        
        const lastCutoff = getLastCutoffDate()
        canInvestorReceiveCommission = canInvestorEnterCurrentCutoff(paymentDate, lastCutoff)
      }
      
      // Se não completou 60 dias no primeiro mês, comissão do investidor é zero
      if (!canInvestorReceiveCommission && month === 1) {
        investorCommission = 0
      } else {
        // Calcular comissão normalmente
        if (liquidity === "mensal") {
          const monthlySimpleRate = calculatedInvestorRate / 100
          monthlyGain = recurrence.investmentAmount * monthlySimpleRate
          totalInvestmentValue = recurrence.investmentAmount
          
          investorCommission = monthlyGain
        } else {
          const compoundRate = 1 + (calculatedInvestorRate / 100)
          
          const previousMonthValue = totalInvestmentValue
          
          const rawValue = previousMonthValue * compoundRate
          totalInvestmentValue = Math.round(rawValue * 100) / 100
          
          monthlyGain = Math.round((totalInvestmentValue - previousMonthValue) * 100) / 100
          
          investorCommission = monthlyGain
          
          accumulatedCommission += monthlyGain
          
          accumulatedCommission = accumulatedCommission * compoundRate
        }
      }
      
      const totalCommission = advisorCommission + officeCommission + investorCommission

      cumulativeAdvisor += advisorCommission
      cumulativeOffice += officeCommission
      cumulativeInvestor += investorCommission
      cumulativeTotal += totalCommission

      let riskLevel: "low" | "medium" | "high" = "low"
      if (recurrence.riskFactors.length > 0) riskLevel = "medium"
      if (recurrence.riskFactors.length > 2) riskLevel = "high"

      projections.push({
        month,
        date: paymentDate.toISOString().split("T")[0],
        advisorCommission,
        officeCommission,
        investorCommission,
        totalCommission,
        cumulativeAdvisor,
        cumulativeOffice,
        cumulativeInvestor,
        cumulativeTotal,
        totalValue: totalInvestmentValue,
        activeBonuses: recurrence.bonusRate > 0 ? recurrence.appliedBonuses : [],
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

  const getStatusColor = (status: string): "destructive" | "default" | "secondary" | "outline" => {
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

  // Funções de exportação (Excel e PDF) - mantendo a mesma lógica
  const exportToExcel = (type: string) => {
    const workbook = XLSX.utils.book_new()
    const fileName = `recorrencias-${type}-${new Date().toISOString().split('T')[0]}`
    const lastCutoff = getLastCutoffDate()
    const nextPaymentDate = getNextFifthBusinessDay()
    const lastCutoffFormatted = lastCutoff.toLocaleDateString("pt-BR", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric" 
    })
    const nextPaymentDateFormatted = nextPaymentDate.toLocaleDateString("pt-BR", { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    })

    switch (type) {
      case "recurrences": {
        const summaryData = [
          ["Resumo de Recorrências"],
          ["", ""],
          ["⚠️ ATENÇÃO: PRÓXIMO PAGAMENTO ⚠️", ""],
          ["Último corte (dia 20)", lastCutoffFormatted],
          ["A ser pago em", nextPaymentDateFormatted],
          ["Valor Total", formatCurrency(totalMonthlyCommissions)],
          ["", ""],
          ["Recorrências Ativas", totalActiveRecurrences],
          ["Comissões Mensais Totais", formatCurrency(totalMonthlyCommissions)],
          ["Participação Assessores (3%)", formatCurrency(totalAdvisorShare)],
          ["Participação Escritórios (1%)", formatCurrency(totalOfficeShare)],
          ["Recorrências em Risco", atRiskRecurrences],
          [""],
        ]
        const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(workbook, ws1, "Resumo")

        const recurrencesData = [
          [
            "Investidor",
            "Email",
            "Assessor",
            "Escritório",
            "Valor Investido",
            "Data de Entrada do Investimento",
            "Data da Corte",
            "Dias até o Corte",
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
          ...filteredRecurrences.map(r => {
            // Calcular data de corte e dias até o corte
            let cutoffDateStr = "N/A"
            let daysUntilCutoff = "N/A"
            
            if (r.paymentDate) {
              try {
                // Parse da data de pagamento
                let paymentDate: Date
                if (typeof r.paymentDate === 'string' && r.paymentDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                  const [datePart] = r.paymentDate.split('T')
                  const [year, month, day] = datePart.split('-').map(Number)
                  paymentDate = new Date(year, month - 1, day)
                } else {
                  paymentDate = new Date(r.paymentDate)
                }
                paymentDate.setHours(0, 0, 0, 0)
                
                // Calcular período de corte
                const cutoffPeriod = getInvestmentCutoffPeriod(paymentDate)
                cutoffDateStr = formatPaymentDate(cutoffPeriod.cutoffDate.toISOString())
                
                // Calcular dias até o corte (do dia seguinte ao depósito até o corte, inclusive)
                // Exemplo: depósito dia 13, corte dia 20 = 7 dias (14, 15, 16, 17, 18, 19, 20)
                const cutoffDate = new Date(cutoffPeriod.cutoffDate)
                cutoffDate.setHours(0, 0, 0, 0)
                
                // Dia seguinte ao depósito
                const nextDayAfterDeposit = new Date(paymentDate)
                nextDayAfterDeposit.setDate(nextDayAfterDeposit.getDate() + 1)
                nextDayAfterDeposit.setHours(0, 0, 0, 0)
                
                // Calcular diferença em dias (do dia seguinte ao depósito até o corte, inclusive)
                const diffTime = cutoffDate.getTime() - nextDayAfterDeposit.getTime()
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 para incluir o dia do corte
                
                daysUntilCutoff = `${diffDays} dia(s)`
              } catch (error) {
                console.error("Erro ao calcular data de corte:", error)
              }
            }
            
            return [
              r.investorName,
              r.investorEmail,
              r.advisorName,
              r.officeName,
              formatCurrency(r.investmentAmount),
              formatPaymentDate(r.paymentDate),
              cutoffDateStr,
              daysUntilCutoff,
              formatCurrency(r.monthlyCommission),
              formatCurrency(r.advisorShare),
              formatCurrency(r.officeShare),
              formatCurrency(r.totalPaid),
              formatCurrency(r.projectedTotal),
              r.remainingMonths,
              `${r.commitmentPeriod} meses`,
              r.profitabilityLiquidity || "Mensal",
              formatPaymentDate(r.paymentDate)
            ]
          })
        ]
        const ws2 = XLSX.utils.aoa_to_sheet(recurrencesData)
        XLSX.utils.book_append_sheet(workbook, ws2, "Todos os Investimentos")

        const allInvestorsTotals = new Map<string, { name: string; totalAmount: number; advisorCommission: number; officeCommission: number; investorCommission: number; totalCommission: number; count: number }>()
        const allAdvisorsTotals = new Map<string, { name: string; totalAmount: number; totalCommission: number; count: number; investors: Set<string> }>()
        const allOfficesTotals = new Map<string, { name: string; totalAmount: number; totalCommission: number; count: number; advisors: Set<string> }>()

        filteredRecurrences.forEach(r => {
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

        // Aba resumo de investidores
        const recurrInvestorsSummaryData = [
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
        const wsRecurrInvestorsSummary = XLSX.utils.aoa_to_sheet(recurrInvestorsSummaryData)
        XLSX.utils.book_append_sheet(workbook, wsRecurrInvestorsSummary, "Resumo Investidores")

        // Aba detalhada de investidores
        const recurrInvestorsDetailData = [
          [
            "Investidor",
            "Email",
            "Assessor",
            "Escritório",
            "Valor Investido",
            "Data de Entrada do Investimento",
            "Data da Corte",
            "Dias até o Corte",
            "Comissão Mensal",
            "Assessor (3%)",
            "Escritório (1%)",
            "Total Pago",
            "Projeção Total",
            "Meses Restantes",
            "Período",
            "Liquidez"
          ],
          ...filteredRecurrences.map(r => {
            // Calcular data de corte e dias até o corte
            let cutoffDateStr = "N/A"
            let daysUntilCutoff = "N/A"
            
            if (r.paymentDate) {
              try {
                // Parse da data de pagamento
                let paymentDate: Date
                if (typeof r.paymentDate === 'string' && r.paymentDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                  const [datePart] = r.paymentDate.split('T')
                  const [year, month, day] = datePart.split('-').map(Number)
                  paymentDate = new Date(year, month - 1, day)
                } else {
                  paymentDate = new Date(r.paymentDate)
                }
                paymentDate.setHours(0, 0, 0, 0)
                
                // Calcular período de corte
                const cutoffPeriod = getInvestmentCutoffPeriod(paymentDate)
                cutoffDateStr = formatPaymentDate(cutoffPeriod.cutoffDate.toISOString())
                
                // Calcular dias até o corte (do dia seguinte ao depósito até o corte, inclusive)
                // Exemplo: depósito dia 13, corte dia 20 = 7 dias (14, 15, 16, 17, 18, 19, 20)
                const cutoffDate = new Date(cutoffPeriod.cutoffDate)
                cutoffDate.setHours(0, 0, 0, 0)
                
                // Dia seguinte ao depósito
                const nextDayAfterDeposit = new Date(paymentDate)
                nextDayAfterDeposit.setDate(nextDayAfterDeposit.getDate() + 1)
                nextDayAfterDeposit.setHours(0, 0, 0, 0)
                
                // Calcular diferença em dias (do dia seguinte ao depósito até o corte, inclusive)
                const diffTime = cutoffDate.getTime() - nextDayAfterDeposit.getTime()
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1 // +1 para incluir o dia do corte
                
                daysUntilCutoff = `${diffDays} dia(s)`
              } catch (error) {
                console.error("Erro ao calcular data de corte:", error)
              }
            }
            
            return [
              r.investorName,
              r.investorEmail,
              r.advisorName,
              r.officeName,
              formatCurrency(r.investmentAmount),
              formatPaymentDate(r.paymentDate),
              cutoffDateStr,
              daysUntilCutoff,
              formatCurrency(r.monthlyCommission),
              formatCurrency(r.advisorShare),
              formatCurrency(r.officeShare),
              formatCurrency(r.totalPaid),
              formatCurrency(r.projectedTotal),
              r.remainingMonths,
              `${r.commitmentPeriod} meses`,
              r.profitabilityLiquidity || "Mensal"
            ]
          })
        ]
        const wsRecurrInvestorsDetail = XLSX.utils.aoa_to_sheet(recurrInvestorsDetailData)
        XLSX.utils.book_append_sheet(workbook, wsRecurrInvestorsDetail, "Investidores")

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
      }

      case "totals": {
        const totalsSummaryData = [
          ["Resumo de Totais"],
          ["", ""],
          ["⚠️ ATENÇÃO: PRÓXIMO PAGAMENTO ⚠️", ""],
          ["Último corte (dia 20)", lastCutoffFormatted],
          ["A ser pago em", nextPaymentDateFormatted],
          ["Valor Total", formatCurrency(totalMonthlyCommissions)],
          ["", ""],
          ["Total de Investimentos", filteredRecurrences.length],
          [""],
        ]
        const wsTotalsSummary = XLSX.utils.aoa_to_sheet(totalsSummaryData)
        XLSX.utils.book_append_sheet(workbook, wsTotalsSummary, "Resumo")

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
      }

      case "projection": {
        if (!selectedRecurrence || projections.length === 0) {
          toast({
            title: "Nenhuma projeção selecionada",
            description: "Por favor, visualize uma projeção antes de exportar.",
            variant: "destructive",
          })
          return
        }

        const projectionSummary = [
          ["Projeção de Recorrência"],
          ["", ""],
          ["⚠️ ATENÇÃO: PRÓXIMO PAGAMENTO ⚠️", ""],
          ["Último corte (dia 20)", lastCutoffFormatted],
          ["A ser pago em", nextPaymentDateFormatted],
          ["Valor Total", formatCurrency(totalMonthlyCommissions)],
          ["", ""],
          ["Investidor", selectedRecurrence.investorName],
          ["Valor Investido", formatCurrency(selectedRecurrence.investmentAmount)],
          ["Período", `${selectedRecurrence.commitmentPeriod} meses`],
          ["Liquidez", selectedRecurrence.profitabilityLiquidity || "Mensal"],
          ["Taxa Investidor", `${investorRate}%`],
          ["Data do Depósito", formatPaymentDate(selectedRecurrence.paymentDate)],
          [""],
        ]
        const ws6 = XLSX.utils.aoa_to_sheet(projectionSummary)
        XLSX.utils.book_append_sheet(workbook, ws6, "Resumo")

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
      }

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
    const lastCutoff = getLastCutoffDate()
    const nextPaymentDate = getNextFifthBusinessDay()
    const lastCutoffFormatted = lastCutoff.toLocaleDateString("pt-BR", { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric" 
    })
    const nextPaymentDateFormatted = nextPaymentDate.toLocaleDateString("pt-BR", { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    })

    const checkNewPage = (additionalHeight: number = 10) => {
      if (yPosition + additionalHeight > pageHeight - bottomMargin) {
        doc.addPage()
        yPosition = topMargin
      }
    }

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

      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")

      rows.forEach((row, rowIndex) => {
        if (yPosition > pageHeight - bottomMargin) {
          doc.addPage()
          yPosition = topMargin

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

    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("Relatório de Recorrências", leftMargin, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, leftMargin, yPosition)
    yPosition += 15

    switch (type) {
      case "recurrences": {
        // Destaque para próximo pagamento
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(0, 128, 0) // Verde
        doc.text("⚠️ ATENÇÃO: PRÓXIMO PAGAMENTO ⚠️", leftMargin, yPosition)
        yPosition += 8
        
        doc.setFontSize(11)
        doc.text(`Último corte (dia 20): ${lastCutoffFormatted}`, leftMargin, yPosition)
        yPosition += 8
        
        doc.setFontSize(12)
        doc.text(`A ser pago em: ${nextPaymentDateFormatted}`, leftMargin, yPosition)
        yPosition += 8
        
        doc.setFontSize(14)
        doc.text(`Valor Total: ${formatCurrency(totalMonthlyCommissions)}`, leftMargin, yPosition)
        yPosition += 12
        
        doc.setTextColor(0, 0, 0) // Preto
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
        yPosition += 15

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
            formatPaymentDate(r.paymentDate)
          ])

          createSimpleTable(
            ["Investidor", "Valor Investido", "Comissão Mensal", "Assessor (3%)", "Escritório (1%)", "Data do Depósito"],
            tableData
          )
        }

        const allInvestorsTotals = new Map<string, { name: string; totalAmount: number; advisorCommission: number; officeCommission: number; investorCommission: number; totalCommission: number; count: number }>()
        const allAdvisorsTotals = new Map<string, { name: string; totalAmount: number; totalCommission: number; count: number; investors: Set<string> }>()
        const allOfficesTotals = new Map<string, { name: string; totalAmount: number; totalCommission: number; count: number; advisors: Set<string> }>()

        filteredRecurrences.forEach(r => {
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
              formatPaymentDate(r.paymentDate)
            ])

            createSimpleTable(
              ["Investidor", "Valor Investido", "Comissão Mensal", "Assessor (3%)", "Escritório (1%)", "Data do Depósito"],
              advisorTableData
            )
          })
        }

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
              formatPaymentDate(r.paymentDate)
            ])

            createSimpleTable(
              ["Investidor", "Assessor", "Valor Investido", "Comissão Mensal", "Assessor (3%)", "Escritório (1%)", "Data do Depósito"],
              officeTableData
            )
          })
        }
        break
      }

      case "totals": {
        // Destaque para próximo pagamento
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(0, 128, 0) // Verde
        doc.text("⚠️ ATENÇÃO: PRÓXIMO PAGAMENTO ⚠️", leftMargin, yPosition)
        yPosition += 8
        
        doc.setFontSize(11)
        doc.text(`Último corte (dia 20): ${lastCutoffFormatted}`, leftMargin, yPosition)
        yPosition += 8
        
        doc.setFontSize(12)
        doc.text(`A ser pago em: ${nextPaymentDateFormatted}`, leftMargin, yPosition)
        yPosition += 8
        
        doc.setFontSize(14)
        doc.text(`Valor Total: ${formatCurrency(totalMonthlyCommissions)}`, leftMargin, yPosition)
        yPosition += 12
        
        doc.setTextColor(0, 0, 0) // Preto
        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.text(`Total de Investimentos: ${filteredRecurrences.length}`, leftMargin, yPosition)
        yPosition += 12

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
      }

      case "projection": {
        if (!selectedRecurrence || projections.length === 0) {
          toast({
            title: "Nenhuma projeção selecionada",
            description: "Por favor, visualize uma projeção antes de exportar.",
            variant: "destructive",
          })
          return
        }

        // Destaque para próximo pagamento
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(0, 128, 0) // Verde
        doc.text("⚠️ ATENÇÃO: PRÓXIMO PAGAMENTO ⚠️", leftMargin, yPosition)
        yPosition += 8
        
        doc.setFontSize(11)
        doc.text(`Último corte (dia 20): ${lastCutoffFormatted}`, leftMargin, yPosition)
        yPosition += 8
        
        doc.setFontSize(12)
        doc.text(`A ser pago em: ${nextPaymentDateFormatted}`, leftMargin, yPosition)
        yPosition += 8
        
        doc.setFontSize(14)
        doc.text(`Valor Total: ${formatCurrency(totalMonthlyCommissions)}`, leftMargin, yPosition)
        yPosition += 12
        
        doc.setTextColor(0, 0, 0) // Preto
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
      }

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

  const handleFilterTypeChange = (value: "all" | "investors" | "advisors" | "offices") => {
    setFilterType(value)
    setFilterValue("")
  }

  // Calcular último corte, próximo quinto dia útil e valor total a ser pago
  const lastCutoffDate = getLastCutoffDate()
  const nextFifthBusinessDay = getNextFifthBusinessDay()
  const totalToBePaid = totalMonthlyCommissions

  return {
    // Estados
    recurrences,
    projections,
    impacts,
    selectedRecurrence,
    isProjectionOpen,
    loading,
    filterType,
    filterValue,
    filterOptions,
    investorRate,
    
    // Dados calculados
    filteredRecurrences,
    totalsByCategory,
    totalActiveRecurrences,
    totalMonthlyCommissions,
    totalAdvisorShare,
    totalOfficeShare,
    atRiskRecurrences,
    lastCutoffDate,
    nextFifthBusinessDay,
    totalToBePaid,
    
    // Funções
    setFilterType: handleFilterTypeChange,
    setFilterValue,
    setSelectedRecurrence,
    setIsProjectionOpen,
    fetchRecurrenceData,
    recalculateAll,
    handleViewProjection,
    shouldShowAggregatedData,
    calculateInvestorCommission,
    calculateInvestorRate,
    exportToExcel,
    exportToPDF,
    getStatusColor,
    getStatusLabel,
    getRiskLevelColor,
    formatCurrency,
  }
}

