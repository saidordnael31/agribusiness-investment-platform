"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Building2,
  Download,
  Search,
  Users,
  DollarSign,
  Calendar,
} from "lucide-react"
import * as XLSX from "xlsx"
import {
  calculateNewCommissionLogic,
  type NewCommissionCalculation,
  COMMISSION_RATES,
  getFifthBusinessDayOfMonth,
  getInvestorMonthlyRate,
  getInvestorMonthlyRateForExternalAdvisor,
  getInvestorMonthlyRateForIndividualAdvisor,
  getLiquidityCycleMonths,
  type LiquidityOption,
} from "@/lib/commission-calculator"
import { useToast } from "@/hooks/use-toast"

interface AdminCommissionDetail extends NewCommissionCalculation {
  investorEmail?: string
  advisorEmail?: string
  advisorRole?: string | null
  officeEmail?: string
  investorType?: "investor"
  advisorType?: "assessor" | "assessor_externo" | "assessor_individual" | null
  officeType?: "escritorio" | null
  /** Liquidez da rentabilidade do investimento (mensal, semestral, anual, bienal, trienal) */
  liquidity?: string
  /** Período de compromisso em meses (para cálculo do valor atual) */
  commitmentPeriod?: number
}

type PeriodFilter = "all" | "this_month" | "next_month" | "next_6_months"

export function AdminCommissionsDetail() {
  const { toast } = useToast()
  const [commissions, setCommissions] = useState<AdminCommissionDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "office" | "advisor" | "advisor_externo" | "investor">("all")
  const [selectedAdvisorFilter, setSelectedAdvisorFilter] = useState<string>("all")
  const [selectedOfficeFilter, setSelectedOfficeFilter] = useState<string>("all")
  /** "" seria "próximo"; Radix Select não permite value="", então usamos "__next__". */
  const [selectedPaymentDateKey, setSelectedPaymentDateKey] = useState<string>("__next__")

  useEffect(() => {
    fetchCommissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchCommissions = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Buscar todos os investimentos ativos
      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select("id, user_id, amount, payment_date, created_at, status, commitment_period, profitability_liquidity")
        .eq("status", "active")

      if (investmentsError) {
        throw investmentsError
      }

      if (!investments || investments.length === 0) {
        setCommissions([])
        return
      }

      const investorIds = investments.map((inv) => inv.user_id)

      // Perfis dos investidores (para achar assessor e escritório)
      const { data: investorProfiles, error: investorProfilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email, parent_id, office_id")
        .in("id", investorIds)

      if (investorProfilesError) {
        throw investorProfilesError
      }

      const investorById = new Map(
        (investorProfiles || []).map((p: any) => [p.id, p]),
      )

      // IDs de assessores a partir dos investidores
      const advisorIds = Array.from(
        new Set(
          (investorProfiles || [])
            .map((p: any) => p.parent_id)
            .filter((id: string | null) => !!id),
        ),
      )

      let advisors: any[] = []
      if (advisorIds.length > 0) {
        const { data: advisorsData, error: advisorsError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, office_id")
          .in("id", advisorIds)

        if (advisorsError) {
          throw advisorsError
        }
        advisors = advisorsData || []
      }

      const advisorById = new Map(
        advisors.map((a: any) => [a.id, a]),
      )

      // Para `assessor_individual`, a taxa recorrente depende do volume total da carteira ativa do assessor.
      // Vamos pré-calcular o total captado (soma dos investimentos ativos) por assessor.
      const totalActivePortfolioByAdvisorId = new Map<string, number>()
      for (const inv of investments) {
        const investor = investorById.get(inv.user_id)
        const advisorId = investor?.parent_id
        if (!advisorId) continue
        const current = totalActivePortfolioByAdvisorId.get(advisorId) || 0
        totalActivePortfolioByAdvisorId.set(advisorId, current + Number(inv.amount || 0))
      }

      // IDs de escritórios a partir dos assessores e investidores
      const officeIds = Array.from(
        new Set(
          [
            ...advisors.map((a: any) => a.office_id).filter((id: string | null) => !!id),
            ...(investorProfiles || [])
              .map((p: any) => p.office_id)
              .filter((id: string | null) => !!id),
          ],
        ),
      )

      let offices: any[] = []
      if (officeIds.length > 0) {
        const { data: officesData, error: officesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role")
          .in("id", officeIds)

        if (officesError) {
          throw officesError
        }
        offices = officesData || []
      }

      const officeById = new Map(
        offices.map((o: any) => [o.id, o]),
      )

      // Buscar comprovantes PIX
      const investmentIds = investments.map((inv) => inv.id)
      const { data: receipts } = await supabase
        .from("pix_receipts")
        .select("id, investment_id, file_name, file_url, status, created_at")
        .in("investment_id", investmentIds)

      const processed: AdminCommissionDetail[] = []

      for (const investment of investments) {
        const investor = investorById.get(investment.user_id)
        if (!investor) continue

        const advisor = investor.parent_id ? advisorById.get(investor.parent_id) : null

        let office = null
        if (advisor?.office_id) {
          office = officeById.get(advisor.office_id)
        } else if (investor.office_id) {
          office = officeById.get(investor.office_id)
        }

        const investmentPaymentDate = investment.payment_date || investment.created_at

        let baseCalc: NewCommissionCalculation

        try {
          if (advisor) {
            // 1) Calcular fluxo para assessor (sem D+60, pró‑rata)
            const totalActivePortfolio = totalActivePortfolioByAdvisorId.get(advisor.id) || 0
            const advisorCalc = calculateNewCommissionLogic({
              id: investment.id,
              user_id: investment.user_id,
              amount: Number(investment.amount),
              payment_date: investmentPaymentDate,
              commitment_period: investment.commitment_period || 12,
              liquidity: investment.profitability_liquidity,
              investorName: investor.full_name || "Investidor",
              advisorId: advisor.id,
              advisorName: advisor.full_name || "Assessor",
              advisorRole: advisor.role,
              totalActivePortfolio,
              isForAdvisor: true,
            })

            // 2) Calcular fluxo para escritório (sem D+60 também)
            let officeCommission = 0
            let officeId: string | undefined
            let officeName: string | undefined

            if (office) {
              const officeCalc = calculateNewCommissionLogic({
                id: investment.id,
                user_id: investment.user_id,
                amount: Number(investment.amount),
                payment_date: investmentPaymentDate,
                commitment_period: investment.commitment_period || 12,
                liquidity: investment.profitability_liquidity,
                investorName: investor.full_name || "Investidor",
                officeId: office.id,
                officeName: office.full_name || "Escritório",
              })
              officeCommission = officeCalc.officeCommission
              officeId = office.id
              officeName = office.full_name || "Escritório"
            }

            baseCalc = {
              ...advisorCalc,
              officeCommission,
              officeId,
              officeName,
            }
          } else if (office) {
            // Investidor direto do escritório (sem assessor)
            const officeCalc = calculateNewCommissionLogic({
              id: investment.id,
              user_id: investment.user_id,
              amount: Number(investment.amount),
              payment_date: investmentPaymentDate,
              commitment_period: investment.commitment_period || 12,
              liquidity: investment.profitability_liquidity,
              investorName: investor.full_name || "Investidor",
              officeId: office.id,
              officeName: office.full_name || "Escritório",
            })

            baseCalc = {
              ...officeCalc,
              advisorCommission: 0,
              advisorId: undefined,
              advisorName: undefined,
            }
          } else {
            // Sem assessor nem escritório: apenas comissão do investidor (D+60)
            const investorCalc = calculateNewCommissionLogic({
              id: investment.id,
              user_id: investment.user_id,
              amount: Number(investment.amount),
              payment_date: investmentPaymentDate,
              commitment_period: investment.commitment_period || 12,
              liquidity: investment.profitability_liquidity,
              investorName: investor.full_name || "Investidor",
            })

            baseCalc = {
              ...investorCalc,
              advisorCommission: 0,
              officeCommission: 0,
              advisorId: undefined,
              advisorName: undefined,
              officeId: undefined,
              officeName: undefined,
            }
          }
        } catch {
          continue
        }

        const investmentReceipts = (receipts || []).filter(
          (r) => r.investment_id === investment.id,
        )

        processed.push({
          ...baseCalc,
          investorEmail: investor.email || "",
          advisorEmail: advisor?.email || undefined,
          advisorRole: advisor?.role ?? null,
          officeEmail: office?.email || undefined,
          investorType: "investor",
          advisorType: advisor?.role ?? null,
          officeType: office ? "escritorio" : null,
          liquidity: investment.profitability_liquidity || "mensal",
          commitmentPeriod: investment.commitment_period ?? 12,
          pixReceipts: investmentReceipts.map((r) => ({
            id: r.id,
            file_name: r.file_name,
            file_url: r.file_url,
            status: r.status,
            created_at: r.created_at,
          })),
        })
      }

      // Ordenar por primeira data de pagamento
      processed.sort((a, b) => {
        const aDate = a.paymentDueDate.length > 0 ? a.paymentDueDate[0] : new Date(0)
        const bDate = b.paymentDueDate.length > 0 ? b.paymentDueDate[0] : new Date(0)
        return aDate.getTime() - bDate.getTime()
      })

      setCommissions(processed)
    } catch (error) {
      console.error("Erro ao carregar comissões do admin:", error)
      toast({
        title: "Erro ao carregar comissões",
        description: "Não foi possível carregar as comissões. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (date: Date | string) => {
    if (!date) return "N/A"

    if (typeof date === "string") {
      const dateOnly = date.split("T")[0]
      if (dateOnly) {
        const [year, month, day] = dateOnly.split("-")
        return `${day}/${month}/${year}`
      }
    }

    const d = date as Date
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, "0")
    const day = String(d.getUTCDate()).padStart(2, "0")
    return `${day}/${month}/${year}`
  }

  const getStatusBadge = (commission: AdminCommissionDetail) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const paymentDate = commission.paymentDueDate.length > 0 ? commission.paymentDueDate[0] : new Date()
    paymentDate.setHours(0, 0, 0, 0)

    if (paymentDate < today) {
      return <Badge variant="destructive">Vencida</Badge>
    }
    if (paymentDate.getTime() === today.getTime()) {
      return <Badge variant="default">Hoje</Badge>
    }
    return <Badge variant="secondary">Pendente</Badge>
  }

  /**
   * Calcula a próxima data de pagamento (5º dia útil/cutoff) considerando
   * todas as datas de paymentDueDate das comissões.
   * Usa sempre a data em UTC para evitar que meia-noite local mude o dia (ex.: 07/04 UTC → 06/04 BRT).
   */
  const nextPaymentDate = useMemo(() => {
    if (commissions.length === 0) return null

    const now = new Date()
    const todayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0,
    ))

    const uniqueDates = new Map<string, Date>()

    commissions.forEach((c) => {
      c.paymentDueDate.forEach((d) => {
        const dt = new Date(d)
        const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`
        if (!uniqueDates.has(key)) {
          uniqueDates.set(
            key,
            new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0)),
          )
        }
      })
    })

    const futureDates = Array.from(uniqueDates.values())
      .filter((d) => d.getTime() >= todayUTC.getTime())
      .sort((a, b) => a.getTime() - b.getTime())

    if (futureDates.length === 0) {
      return null
    }

    return futureDates[0]
  }, [commissions])

  /**
   * Lista de datas de pagamento disponíveis para seleção: uma entrada por mês (5º dia útil).
   * Chave = "YYYY-MM" para não duplicar o mesmo mês.
   * Datas normalizadas em UTC para que o dia do calendário seja o mesmo em qualquer fuso (ex.: 07/04).
   */
  const availablePaymentDates = useMemo(() => {
    const byMonthKey = new Map<string, Date>()
    const now = new Date()
    const startYear = now.getUTCFullYear()
    const startMonth = now.getUTCMonth() - 12
    for (let i = 0; i < 12 + 24; i++) {
      let y = startYear
      let m = startMonth + i
      while (m < 0) {
        m += 12
        y -= 1
      }
      while (m > 11) {
        m -= 12
        y += 1
      }
      const monthKey = `${y}-${String(m + 1).padStart(2, "0")}`
      if (byMonthKey.has(monthKey)) continue
      const fifth = getFifthBusinessDayOfMonth(y, m)
      const fifthUTC = new Date(Date.UTC(
        fifth.getUTCFullYear(),
        fifth.getUTCMonth(),
        fifth.getUTCDate(),
        0, 0, 0, 0,
      ))
      byMonthKey.set(monthKey, fifthUTC)
    }
    return Array.from(byMonthKey.entries())
      .map(([key, date]) => ({ key, date }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [])

  /** Data de pagamento em exibição: selecionada pelo usuário ou "próxima" por padrão. */
  const displayPaymentDate = useMemo(() => {
    if (selectedPaymentDateKey === "__next__") return nextPaymentDate
    const found = availablePaymentDates.find((p) => p.key === selectedPaymentDateKey)
    return found ? found.date : nextPaymentDate
  }, [selectedPaymentDateKey, availablePaymentDates, nextPaymentDate])

  /** Formata data para rótulo no select: "DD/MM/YYYY (5º dia útil de mês/ano)". Usa UTC para consistência. */
  const formatPaymentDateLabel = (date: Date) => {
    const monthYear = date.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
    return `${formatDate(date)} (5º dia útil de ${monthYear})`
  }

  /** Quando não há "próximo" pagamento, selecionar a data mais recente disponível. */
  const lastAvailableDateKey = availablePaymentDates[availablePaymentDates.length - 1]?.key
  useEffect(() => {
    if (commissions.length === 0 || nextPaymentDate || !lastAvailableDateKey) return
    if (selectedPaymentDateKey === "__next__") setSelectedPaymentDateKey(lastAvailableDateKey)
  }, [commissions.length, nextPaymentDate, lastAvailableDateKey, selectedPaymentDateKey])

  interface NextPaymentRow {
    commission: AdminCommissionDetail
    paymentIndex: number
    officeAmount: number
    advisorAmount: number
    investorAmount: number
  }

  const getAmountsForPaymentIndex = (
    commission: AdminCommissionDetail,
    paymentIndex: number,
  ): { officeAmount: number; advisorAmount: number; investorAmount: number } => {
    if (paymentIndex === 0) {
      return {
        officeAmount: commission.officeCommission || 0,
        advisorAmount: commission.advisorCommission || 0,
        investorAmount: commission.investorCommission || 0,
      }
    }

    if (
      Array.isArray(commission.monthlyBreakdown) &&
      commission.monthlyBreakdown.length > paymentIndex
    ) {
      const month = commission.monthlyBreakdown[paymentIndex]
      return {
        officeAmount: month.officeCommission,
        advisorAmount: month.advisorCommission,
        investorAmount: month.investorCommission,
      }
    }

    // Fallback: usar comissão mensal cheia
    const officeRate = COMMISSION_RATES.escritorio
    const advisorBaseRate =
      commission.advisorRole === "assessor_externo" ? 0.02 : COMMISSION_RATES.assessor
    const investorRate = COMMISSION_RATES.investidor

    return {
      officeAmount: commission.amount * officeRate,
      advisorAmount: commission.amount * advisorBaseRate,
      investorAmount: commission.amount * investorRate,
    }
  }

  /**
   * Linhas referentes à data de pagamento selecionada (ou próxima).
   * Comparação feita em UTC para que o dia do calendário seja consistente (ex.: 07/04 em todo lugar).
   */
  const rowsForSelectedDate: NextPaymentRow[] = useMemo(() => {
    if (!displayPaymentDate) return []

    const targetYear = displayPaymentDate.getUTCFullYear()
    const targetMonth = displayPaymentDate.getUTCMonth()
    const isMonthKey = selectedPaymentDateKey.length === 7 && selectedPaymentDateKey.indexOf("-") === 4 // "YYYY-MM"
    const targetKey = `${displayPaymentDate.getUTCFullYear()}-${String(displayPaymentDate.getUTCMonth() + 1).padStart(2, "0")}-${String(displayPaymentDate.getUTCDate()).padStart(2, "0")}`

    const rows: NextPaymentRow[] = []

    commissions.forEach((commission) => {
      commission.paymentDueDate.forEach((d, idx) => {
        const dt = new Date(d)
        const dtKey = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`
        const match = isMonthKey
          ? dt.getUTCFullYear() === targetYear && dt.getUTCMonth() === targetMonth
          : dtKey === targetKey
        if (match) {
          const amounts = getAmountsForPaymentIndex(commission, idx)
          rows.push({
            commission,
            paymentIndex: idx,
            ...amounts,
          })
        }
      })
    })

    return rows
  }, [commissions, displayPaymentDate, selectedPaymentDateKey])

  const advisorOptions = useMemo(() => {
    const map = new Map<string, string>()
    rowsForSelectedDate.forEach(({ commission }) => {
      if (commission.advisorId && commission.advisorName) {
        map.set(commission.advisorId, commission.advisorName)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [rowsForSelectedDate])

  const officeOptions = useMemo(() => {
    const map = new Map<string, string>()
    rowsForSelectedDate.forEach(({ commission }) => {
      if (commission.officeId && commission.officeName) {
        map.set(commission.officeId, commission.officeName)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [rowsForSelectedDate])

  /**
   * Filtros (texto + papel) aplicados SOBRE as linhas da data de pagamento selecionada.
   */
  const filteredRows: NextPaymentRow[] = useMemo(() => {
    let list = rowsForSelectedDate

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      list = list.filter(({ commission: c }) => {
        const advisor = (c.advisorName || "").toLowerCase()
        const office = (c.officeName || "").toLowerCase()
        const investor = (c.investorName || "").toLowerCase()
        const email = (c.investorEmail || "").toLowerCase()
        return (
          advisor.includes(term) ||
          office.includes(term) ||
          investor.includes(term) ||
          email.includes(term) ||
          c.investmentId.toLowerCase().includes(term)
        )
      })
    }

    if (roleFilter !== "all") {
      list = list.filter(({ commission: c }) => {
        if (roleFilter === "office") {
          return !!c.officeId
        }
        if (roleFilter === "advisor") {
          return c.advisorRole === "assessor" || c.advisorRole === "assessor_individual"
        }
        if (roleFilter === "advisor_externo") {
          return c.advisorRole === "assessor_externo"
        }
        // investor
        return true // sempre há investidor na linha
      })
    }

    if (selectedAdvisorFilter !== "all") {
      list = list.filter(({ commission: c }) => c.advisorId === selectedAdvisorFilter)
    }

    if (selectedOfficeFilter !== "all") {
      list = list.filter(({ commission: c }) => c.officeId === selectedOfficeFilter)
    }

    return list
  }, [rowsForSelectedDate, searchTerm, roleFilter, selectedAdvisorFilter, selectedOfficeFilter])

  const totalOffice = filteredRows.reduce((sum, r) => sum + r.officeAmount, 0)
  const totalAdvisor = filteredRows.reduce((sum, r) => sum + r.advisorAmount, 0)
  const totalInvestor = filteredRows.reduce((sum, r) => sum + r.investorAmount, 0)

  const nextCutoffDate = useMemo(() => {
    if (!displayPaymentDate) return null
    let year = displayPaymentDate.getFullYear()
    let month = displayPaymentDate.getMonth() - 1
    if (month < 0) {
      month = 11
      year -= 1
    }
    return new Date(year, month, 20)
  }, [displayPaymentDate])

  const getCommissionTooltip = (
    kind: "office" | "advisor" | "investor",
    commission: AdminCommissionDetail,
    paymentIndex: number,
    amount: number,
  ) => {
    const baseAmount = formatCurrency(commission.amount)

    let rate = 0
    let label = ""

    if (kind === "office") {
      rate = COMMISSION_RATES.escritorio
      label = "escritório (1% ao mês)"
    } else if (kind === "advisor") {
      const advisorRate =
        commission.advisorRole === "assessor_externo" ? 0.02 : COMMISSION_RATES.assessor
      rate = advisorRate
      label =
        commission.advisorRole === "assessor_externo"
          ? "assessor externo (2% ao mês)"
          : "assessor (3% ao mês)"
    } else {
      rate = COMMISSION_RATES.investidor
      label = "investidor (2% ao mês)"
    }

    const ratePct = (rate * 100).toFixed(2)

    if (paymentIndex === 0) {
      // Primeiro pagamento: pró-rata entre entrada e corte
      const start = formatDate(commission.paymentDate)
      const end = formatDate(
        typeof commission.commissionPeriod.endDate === "string"
          ? commission.commissionPeriod.endDate
          : commission.commissionPeriod.endDate,
      )
      return `Primeiro pagamento pró-rata de ${label}, calculado sobre ${baseAmount} com taxa de ${ratePct}% ao mês, considerando o período entre a data de entrada (${start}) e o corte (${end}). Valor neste pagamento: ${formatCurrency(
        amount,
      )}.`
    }

    // Demais pagamentos: mês cheio entre cortes
    const breakdown = Array.isArray(commission.monthlyBreakdown)
      ? commission.monthlyBreakdown[paymentIndex]
      : undefined

    const monthLabel = breakdown
      ? `${breakdown.month} de ${breakdown.year}`
      : `período ${paymentIndex + 1}`

    return `Pagamento recorrente de ${label}, mês cheio (${monthLabel}), calculado sobre ${baseAmount} com taxa de ${ratePct}% ao mês. Valor neste pagamento: ${formatCurrency(
      amount,
    )}.`
  }

  const calculateDaysSinceDeposit = (
    commission: AdminCommissionDetail,
    referenceDate: Date | null,
  ): string => {
    if (!referenceDate || !commission.paymentDate) return ""

    const deposit = new Date(commission.paymentDate)
    const target = new Date(referenceDate)
    deposit.setHours(0, 0, 0, 0)
    target.setHours(0, 0, 0, 0)

    const diffMs = target.getTime() - deposit.getTime()
    if (diffMs < 0) return "0"

    const days = Math.round(diffMs / (1000 * 60 * 60 * 24))
    return String(days)
  }

  const calculateProrataDays = (
    kind: "office" | "advisor" | "investor",
    row: NextPaymentRow,
  ): string => {
    const { commission, paymentIndex, officeAmount, advisorAmount, investorAmount } = row

    // Só faz sentido falar de pró-rata no primeiro pagamento (após D+60)
    if (paymentIndex !== 0) return ""

    let amount = 0
    let rate = 0

    if (kind === "office") {
      amount = officeAmount
      rate = COMMISSION_RATES.escritorio
    } else if (kind === "advisor") {
      amount = advisorAmount
      rate =
        commission.advisorRole === "assessor_externo" ? 0.02 : COMMISSION_RATES.assessor
    } else {
      amount = investorAmount
      rate = COMMISSION_RATES.investidor
    }

    if (!amount || amount <= 0 || !commission.amount || commission.amount <= 0 || rate <= 0) {
      return ""
    }

    const monthlyFull = commission.amount * rate
    if (monthlyFull <= 0) return ""

    // valor_prorata = (monthlyFull / 30) * dias  => dias ≈ valor_prorata * 30 / monthlyFull
    const days = Math.round((amount * 30) / monthlyFull)
    if (!isFinite(days) || days <= 0) return ""

    return String(days)
  }

  /** Retorna label curto para exibir abaixo da comissão: "x%/x dias". */
  const getCommissionRateAndProrataLabel = (
    kind: "office" | "advisor" | "investor",
    commission: AdminCommissionDetail,
    paymentIndex: number,
    row: NextPaymentRow,
  ): string => {
    let rate = 0
    if (kind === "office") {
      rate = COMMISSION_RATES.escritorio
    } else if (kind === "advisor") {
      rate = commission.advisorRole === "assessor_externo" ? 0.02 : COMMISSION_RATES.assessor
    } else {
      rate = COMMISSION_RATES.investidor
    }
    const pct = (rate * 100).toFixed(0)

    if (paymentIndex === 0) {
      const days = calculateProrataDays(kind, row)
      return days ? `${pct}%/${days} dias` : `${pct}%`
    }
    return `${pct}%/30 dias`
  }

  /** Retorna label da liquidez para exibir na comissão do investidor (Mensal, Semestral, Anual, etc.). */
  const getLiquidityLabel = (liquidity?: string): string => {
    if (!liquidity) return "Mensal"
    const raw = String(liquidity).toLowerCase()
    if (raw.includes("trienal")) return "Trienal"
    if (raw.includes("bienal")) return "Bienal"
    if (raw.includes("anual")) return "Anual"
    if (raw.includes("semestral")) return "Semestral"
    return "Mensal"
  }

  /** Normaliza string de liquidez para LiquidityOption (cálculo). */
  const toLiquidityOption = (liquidity?: string): LiquidityOption => {
    if (!liquidity) return "mensal"
    const raw = String(liquidity).toLowerCase()
    if (raw.includes("trienal")) return "trienal"
    if (raw.includes("bienal")) return "bienal"
    if (raw.includes("anual")) return "anual"
    if (raw.includes("semestral")) return "semestral"
    return "mensal"
  }

  /**
   * Valor atual do investimento na data de referência.
   * Mensal: não acumula (juros simples) → valor atual = valor investido.
   * Outras liquidezes: acumula no ciclo (semestral 6m, anual 12m, bienal 24m, trienal 36m); retira no fim do ciclo e recomeça.
   */
  const getCurrentValue = (
    commission: AdminCommissionDetail,
    referenceDate: Date | null,
  ): number => {
    const details = getCurrentValueDetails(commission, referenceDate)
    return details.currentValue
  }

  /**
   * Detalhes do valor acumulado para exibir no subtítulo: meses no ciclo e rendimento total.
   * Para liquidez mensal, mesesInCycle = 0 e totalRendimento = 0.
   */
  const getCurrentValueDetails = (
    commission: AdminCommissionDetail,
    referenceDate: Date | null,
  ): { currentValue: number; monthsInCycle: number; totalRendimento: number } => {
    const amount = Number(commission.amount)
    const fallback = { currentValue: amount, monthsInCycle: 0, totalRendimento: 0 }
    if (!amount || !commission.paymentDate) return fallback
    const ref = referenceDate ? new Date(referenceDate) : new Date()
    ref.setHours(0, 0, 0, 0)
    const start = new Date(commission.paymentDate)
    start.setHours(0, 0, 0, 0)
    if (ref.getTime() < start.getTime()) return fallback

    const liquidity = toLiquidityOption(commission.liquidity)
    if (liquidity === "mensal") return fallback

    const cycleMonths = getLiquidityCycleMonths(liquidity)
    const commitmentPeriod = commission.commitmentPeriod ?? 12
    const monthlyRate =
      commission.advisorRole === "assessor_individual"
        ? getInvestorMonthlyRateForIndividualAdvisor(commitmentPeriod, liquidity)
        : commission.advisorRole === "assessor_externo"
          ? getInvestorMonthlyRateForExternalAdvisor(commitmentPeriod, liquidity)
          : getInvestorMonthlyRate(commitmentPeriod, liquidity)
    if (!monthlyRate || monthlyRate <= 0) return fallback

    const monthsSinceStart = Math.floor(
      (ref.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30),
    )
    if (monthsSinceStart <= 0) return fallback

    const monthsInCurrentCycle = monthsSinceStart % cycleMonths
    const currentValue = amount * Math.pow(1 + monthlyRate, monthsInCurrentCycle)
    const totalRendimento = currentValue - amount
    return {
      currentValue,
      monthsInCycle: monthsInCurrentCycle,
      totalRendimento,
    }
  }

  const exportToExcel = () => {
    if (filteredRows.length === 0) {
      toast({
        title: "Nada para exportar",
        description: displayPaymentDate
          ? `Não há comissões na data ${formatDate(displayPaymentDate)} com os filtros atuais.`
          : "Não há comissões na data de pagamento selecionada com os filtros atuais.",
      })
      return
    }

    const workbook = XLSX.utils.book_new()
    const paymentDateStr = displayPaymentDate ? formatDate(displayPaymentDate) : "N/A"
    const cutoffStr = nextCutoffDate ? formatDate(nextCutoffDate) : "N/A"

    // --- ABA 1: RESUMO ---
    const summaryData = [
      ["RELATÓRIO DE COMISSÕES"],
      [""],
      ["Data do pagamento", paymentDateStr],
      ["Período de corte", cutoffStr],
      ["Total de lançamentos", filteredRows.length],
      [""],
      ["TOTAIS (data selecionada)"],
      ["Com. Escritório", formatCurrency(totalOffice)],
      ["Com. Assessor", formatCurrency(totalAdvisor)],
      ["Com. Investidor", formatCurrency(totalInvestor)],
      ["TOTAL GERAL", formatCurrency(totalOffice + totalAdvisor + totalInvestor)],
      [""],
      ["Gerado em", new Date().toLocaleString("pt-BR")],
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    summarySheet["!cols"] = [{ wch: 22 }, { wch: 28 }]
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo")

    // Ordenação padrão para todas as abas
    const sortRows = (a: NextPaymentRow, b: NextPaymentRow) => {
      const aOff = (a.commission.officeName || "").localeCompare(b.commission.officeName || "")
      if (aOff !== 0) return aOff
      const aAdv = (a.commission.advisorName || "").localeCompare(b.commission.advisorName || "")
      if (aAdv !== 0) return aAdv
      return (a.commission.investorName || "").localeCompare(b.commission.investorName || "")
    }
    const sortedRows = [...filteredRows].sort(sortRows)

    // --- ABA 2: COMISSÕES (dados completos, colunas em ordem lógica) ---
    const mainHeaders = [
      "Assessor",
      "Escritório",
      "Tipo Assessor",
      "Investidor",
      "Email Investidor",
      "Valor Investido",
      "Data Entrada",
      "Liquidez",
      "Valor Atual",
      "Meses no Ciclo",
      "Rendimento",
      "Período Corte",
      "Data Pagto",
      "Com. Escritório",
      "Escr. %/dias",
      "Com. Assessor",
      "Assess. %/dias",
      "Com. Investidor",
      "Inv. %/dias",
    ]
    const mainData: (string | number)[][] = [mainHeaders]
    for (const row of sortedRows) {
      const c = row.commission
      const d = getCurrentValueDetails(c, displayPaymentDate ?? null)
      const tipoAssessor =
        c.advisorRole === "assessor_externo" ? "Externo" : c.advisorRole === "assessor" ? "Interno" : "—"
      mainData.push([
        c.advisorName || "N/A",
        c.officeName || "N/A",
        tipoAssessor,
        c.investorName ?? "",
        c.investorEmail || "",
        Number(c.amount),
        formatDate(c.paymentDate),
        getLiquidityLabel(c.liquidity),
        Math.round(d.currentValue * 100) / 100,
        d.monthsInCycle,
        Math.round(d.totalRendimento * 100) / 100,
        cutoffStr,
        paymentDateStr,
        Math.round(row.officeAmount * 100) / 100,
        getCommissionRateAndProrataLabel("office", c, row.paymentIndex, row),
        Math.round(row.advisorAmount * 100) / 100,
        getCommissionRateAndProrataLabel("advisor", c, row.paymentIndex, row),
        Math.round(row.investorAmount * 100) / 100,
        getCommissionRateAndProrataLabel("investor", c, row.paymentIndex, row),
      ])
    }
    const mainSheet = XLSX.utils.aoa_to_sheet(mainData)
    mainSheet["!cols"] = [
      { wch: 20 }, { wch: 22 }, { wch: 10 }, { wch: 28 }, { wch: 30 },
      { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(workbook, mainSheet, "Comissões")

    // --- ABA 3: ESCRITÓRIOS (agrupado por assessor, com subtotais) ---
    const officeHeaders = [
      "Escritório",
      "Assessor",
      "Tipo",
      "Investidor",
      "Email",
      "Valor Investido",
      "Data Entrada",
      "Liquidez",
      "Valor Atual",
      "Meses Ciclo",
      "Rendimento",
      "Período Corte",
      "Data Pagto",
      "Com. Escritório",
      "%/dias",
    ]
    const officeSheetData: (string | number)[][] = []
    const officeRowsSorted = [...filteredRows].sort(sortRows)
    let currentAdvisorOffice: string | null = null
    let advisorOfficeSubtotal = 0
    for (const row of officeRowsSorted) {
      const { commission: c, officeAmount } = row
      const advisorLabel = c.advisorName || "Sem Assessor"
      const tipo = c.advisorRole === "assessor_externo" ? "Externo" : c.advisorRole === "assessor" ? "Interno" : "—"
      const d = getCurrentValueDetails(c, displayPaymentDate ?? null)
      if (advisorLabel !== currentAdvisorOffice) {
        if (currentAdvisorOffice !== null) {
          officeSheetData.push(["", "", "", "", "", "", "", "", "", "", "", "", "Subtotal", formatCurrency(advisorOfficeSubtotal)])
          officeSheetData.push([])
        }
        currentAdvisorOffice = advisorLabel
        advisorOfficeSubtotal = 0
        officeSheetData.push([`Assessor: ${advisorLabel}`])
        officeSheetData.push(officeHeaders)
      }
      advisorOfficeSubtotal += officeAmount
      officeSheetData.push([
        c.officeName || "N/A",
        advisorLabel,
        tipo,
        c.investorName ?? "",
        c.investorEmail || "",
        Number(c.amount),
        formatDate(c.paymentDate),
        getLiquidityLabel(c.liquidity),
        Math.round(d.currentValue * 100) / 100,
        d.monthsInCycle,
        Math.round(d.totalRendimento * 100) / 100,
        cutoffStr,
        paymentDateStr,
        Math.round(officeAmount * 100) / 100,
        getCommissionRateAndProrataLabel("office", c, row.paymentIndex, row),
      ])
    }
    if (currentAdvisorOffice !== null) {
      officeSheetData.push(["", "", "", "", "", "", "", "", "", "", "", "", "Subtotal", formatCurrency(advisorOfficeSubtotal)])
    }
    const officeSheet = XLSX.utils.aoa_to_sheet(officeSheetData)
    officeSheet["!cols"] = [
      { wch: 22 }, { wch: 20 }, { wch: 8 }, { wch: 28 }, { wch: 30 },
      { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(workbook, officeSheet, "Escritórios")

    // --- ABA 4: ASSESSORES (agrupado, com subtotais) ---
    const advisorHeaders = [
      "Assessor",
      "Escritório",
      "Tipo",
      "Investidor",
      "Email",
      "Valor Investido",
      "Data Entrada",
      "Liquidez",
      "Valor Atual",
      "Meses Ciclo",
      "Rendimento",
      "Período Corte",
      "Data Pagto",
      "Com. Assessor",
      "%/dias",
    ]
    const advisorSheetData: (string | number)[][] = []
    const advisorRowsSorted = [...filteredRows].sort(sortRows)
    let currentAdvisor: string | null = null
    let advisorSubtotal = 0
    for (const row of advisorRowsSorted) {
      const { commission: c, advisorAmount } = row
      const advisorLabel = c.advisorName || "Sem Assessor"
      const tipo = c.advisorRole === "assessor_externo" ? "Externo" : c.advisorRole === "assessor" ? "Interno" : "—"
      const d = getCurrentValueDetails(c, displayPaymentDate ?? null)
      if (advisorLabel !== currentAdvisor) {
        if (currentAdvisor !== null) {
          advisorSheetData.push(["", "", "", "", "", "", "", "", "", "", "", "", "Subtotal", formatCurrency(advisorSubtotal)])
          advisorSheetData.push([])
        }
        currentAdvisor = advisorLabel
        advisorSubtotal = 0
        advisorSheetData.push([`Assessor: ${advisorLabel}`])
        advisorSheetData.push(advisorHeaders)
      }
      advisorSubtotal += advisorAmount
      advisorSheetData.push([
        advisorLabel,
        c.officeName || "N/A",
        tipo,
        c.investorName ?? "",
        c.investorEmail || "",
        Number(c.amount),
        formatDate(c.paymentDate),
        getLiquidityLabel(c.liquidity),
        Math.round(d.currentValue * 100) / 100,
        d.monthsInCycle,
        Math.round(d.totalRendimento * 100) / 100,
        cutoffStr,
        paymentDateStr,
        Math.round(advisorAmount * 100) / 100,
        getCommissionRateAndProrataLabel("advisor", c, row.paymentIndex, row),
      ])
    }
    if (currentAdvisor !== null) {
      advisorSheetData.push(["", "", "", "", "", "", "", "", "", "", "", "", "Subtotal", formatCurrency(advisorSubtotal)])
    }
    const advisorSheet = XLSX.utils.aoa_to_sheet(advisorSheetData)
    advisorSheet["!cols"] = [
      { wch: 20 }, { wch: 22 }, { wch: 8 }, { wch: 28 }, { wch: 30 },
      { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(workbook, advisorSheet, "Assessores")

    // --- ABA 5: INVESTIDORES (lista completa por investidor) ---
    const investorHeaders = [
      "Investidor",
      "Email",
      "Escritório",
      "Assessor",
      "Tipo",
      "Liquidez",
      "Valor Investido",
      "Valor Atual",
      "Meses Ciclo",
      "Rendimento",
      "Data Entrada",
      "Período Corte",
      "Data Pagto",
      "Com. Investidor",
      "%/dias",
    ]
    const investorSheetData: (string | number)[][] = [investorHeaders]
    const investorRowsSorted = [...filteredRows].sort((a, b) =>
      (a.commission.investorName || "").localeCompare(b.commission.investorName || ""),
    )
    for (const row of investorRowsSorted) {
      const c = row.commission
      const d = getCurrentValueDetails(c, displayPaymentDate ?? null)
      const tipo = c.advisorRole === "assessor_externo" ? "Externo" : c.advisorRole === "assessor" ? "Interno" : "—"
      investorSheetData.push([
        c.investorName ?? "",
        c.investorEmail || "",
        c.officeName || "N/A",
        c.advisorName || "N/A",
        tipo,
        getLiquidityLabel(c.liquidity),
        Number(c.amount),
        Math.round(d.currentValue * 100) / 100,
        d.monthsInCycle,
        Math.round(d.totalRendimento * 100) / 100,
        formatDate(c.paymentDate),
        cutoffStr,
        paymentDateStr,
        Math.round(row.investorAmount * 100) / 100,
        getCommissionRateAndProrataLabel("investor", c, row.paymentIndex, row),
      ])
    }
    const investorSheet = XLSX.utils.aoa_to_sheet(investorSheetData)
    investorSheet["!cols"] = [
      { wch: 28 }, { wch: 30 }, { wch: 22 }, { wch: 20 }, { wch: 8 },
      { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
    ]
    XLSX.utils.book_append_sheet(workbook, investorSheet, "Investidores")

    const fileName = `comissoes_admin_${new Date().toISOString().split("T")[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)

    toast({
      title: "Excel exportado",
      description: "Relatório com Resumo, Comissões (completo), Escritórios, Assessores e Investidores.",
      variant: "default",
    })
  }

  const getStatusTextForExport = (commission: AdminCommissionDetail) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const paymentDate = commission.paymentDueDate.length > 0 ? commission.paymentDueDate[0] : new Date()
    paymentDate.setHours(0, 0, 0, 0)

    if (paymentDate < today) return "Vencida"
    if (paymentDate.getTime() === today.getTime()) return "Hoje"
    return "Pendente"
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Carregando comissões...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Data de Pagamento
                </CardTitle>
                <CardDescription>
                  Escolha uma data (5º dia útil do mês) para ver quanto e para quem pagar.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedPaymentDateKey}
                  onValueChange={setSelectedPaymentDateKey}
                >
                  <SelectTrigger className="w-[280px]">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Selecione a data de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {nextPaymentDate && (
                      <SelectItem value="__next__">
                        Próximo pagamento ({formatDate(nextPaymentDate)})
                      </SelectItem>
                    )}
                    {availablePaymentDates.map(({ key, date }) => (
                      <SelectItem key={key} value={key}>
                        {formatPaymentDateLabel(date)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={exportToExcel}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar Excel
                </Button>
              </div>
            </div>
            {displayPaymentDate ? (
              <p className="text-sm text-muted-foreground">
                {selectedPaymentDateKey === "__next__" ? "Próximo pagamento em " : "Pagamento em "}
                <span className="font-medium">
                  {formatPaymentDateLabel(displayPaymentDate)}
                </span>
                {filteredRows.length > 0 && ` • ${filteredRows.length} lançamento(s)`}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Não há datas de pagamento disponíveis para os investimentos atuais.
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-primary/5 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Total Escritórios (próxima data)</p>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(totalOffice)}
                </p>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-muted-foreground mb-1">
                Total Assessores (internos e externos) – próxima data
              </p>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" />
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalAdvisor)}
                </p>
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-muted-foreground mb-1">Total Investidores – próxima data</p>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-purple-600" />
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(totalInvestor)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por escritório, assessor, investidor, email ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select
              value={roleFilter}
              onValueChange={(value: any) => setRoleFilter(value)}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Tipo de usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Papéis</SelectItem>
                <SelectItem value="office">Escritórios</SelectItem>
                <SelectItem value="advisor">Assessores Internos</SelectItem>
                <SelectItem value="advisor_externo">Assessores Externos</SelectItem>
                <SelectItem value="investor">Investidores</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={selectedAdvisorFilter}
              onValueChange={(value: any) => setSelectedAdvisorFilter(value)}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Todos os Assessores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Assessores</SelectItem>
                {advisorOptions.map((advisor) => (
                  <SelectItem key={advisor.id} value={advisor.id}>
                    {advisor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedOfficeFilter}
              onValueChange={(value: any) => setSelectedOfficeFilter(value)}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Todos os Escritórios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Escritórios</SelectItem>
                {officeOptions.map((office) => (
                  <SelectItem key={office.id} value={office.id}>
                    {office.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessor / Escritório (tipo)</TableHead>
                  <TableHead className="max-w-[220px] w-max">Investidor</TableHead>
                  <TableHead>Valor / Entrada</TableHead>
                  <TableHead>Valor atual</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Com. Escritório</TableHead>
                  <TableHead>Com. Assessor</TableHead>
                  <TableHead>Com. Investidor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      Nenhuma comissão encontrada para a data de pagamento selecionada com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => {
                    const { commission, officeAmount, advisorAmount, investorAmount, paymentIndex } = row
                    return (
                    <TableRow key={`${commission.investmentId}-${paymentIndex}`}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-primary">
                            {commission.advisorName || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {commission.officeName || "N/A"}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {commission.advisorRole === "assessor_externo"
                              ? "Assessor Externo"
                              : commission.advisorRole === "assessor"
                                ? "Assessor Interno"
                                : "—"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[220px] w-max">
                        <div className="min-w-0 overflow-hidden">
                          <p className="font-medium truncate" title={commission.investorName}>
                            {commission.investorName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate" title={commission.investorEmail}>
                            {commission.investorEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{formatCurrency(commission.amount)}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(commission.paymentDate)}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">
                            {formatCurrency(getCurrentValue(commission, displayPaymentDate ?? null))}
                          </p>
                          {(() => {
                            const d = getCurrentValueDetails(commission, displayPaymentDate ?? null)
                            return (
                              <>
                                <p className="text-xs text-muted-foreground">
                                  {d.monthsInCycle > 0
                                    ? `${d.monthsInCycle} ${d.monthsInCycle === 1 ? "mês" : "meses"}`
                                    : "—"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(d.totalRendimento)}
                                </p>
                                <Badge variant="secondary" className="text-xs font-normal">
                                  {getLiquidityLabel(commission.liquidity)}
                                </Badge>
                              </>
                            )
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {nextCutoffDate ? formatDate(nextCutoffDate) : "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span
                            className="font-semibold text-primary"
                            title={getCommissionTooltip("office", commission, paymentIndex, officeAmount)}
                          >
                            {formatCurrency(officeAmount)}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {displayPaymentDate ? formatDate(displayPaymentDate) : "N/A"}
                          </p>
                          {(() => {
                            const label = getCommissionRateAndProrataLabel(
                              "office",
                              commission,
                              paymentIndex,
                              row,
                            )
                            return (
                              <p className="text-xs text-muted-foreground">
                                {label}
                              </p>
                            )
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span
                            className="font-semibold text-green-600"
                            title={getCommissionTooltip("advisor", commission, paymentIndex, advisorAmount)}
                          >
                            {formatCurrency(advisorAmount)}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {displayPaymentDate ? formatDate(displayPaymentDate) : "N/A"}
                          </p>
                          {(() => {
                            const label = getCommissionRateAndProrataLabel(
                              "advisor",
                              commission,
                              paymentIndex,
                              row,
                            )
                            return (
                              <p className="text-xs text-muted-foreground">
                                {label}
                              </p>
                            )
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span
                            className="font-semibold text-purple-600"
                            title={getCommissionTooltip("investor", commission, paymentIndex, investorAmount)}
                          >
                            {formatCurrency(investorAmount)}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {displayPaymentDate ? formatDate(displayPaymentDate) : "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getCommissionRateAndProrataLabel("investor", commission, paymentIndex, row)}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


