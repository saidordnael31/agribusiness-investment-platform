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
} from "lucide-react"
import * as XLSX from "xlsx"
import {
  calculateNewCommissionLogic,
  type NewCommissionCalculation,
  COMMISSION_RATES,
} from "@/lib/commission-calculator"
import { useToast } from "@/hooks/use-toast"

interface AdminCommissionDetail extends NewCommissionCalculation {
  investorEmail?: string
  advisorEmail?: string
  advisorRole?: string | null
  officeEmail?: string
  investorType?: "investor"
  advisorType?: "assessor" | "assessor_externo" | null
  officeType?: "escritorio" | null
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
   */
  const nextPaymentDate = useMemo(() => {
    if (commissions.length === 0) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const uniqueDates = new Map<string, Date>()

    commissions.forEach((c) => {
      c.paymentDueDate.forEach((d) => {
        const dt = new Date(d)
        dt.setHours(0, 0, 0, 0)
        const key = dt.toISOString().split("T")[0]
        if (!uniqueDates.has(key)) {
          uniqueDates.set(key, dt)
        }
      })
    })

    const futureDates = Array.from(uniqueDates.values())
      .filter((d) => d >= today)
      .sort((a, b) => a.getTime() - b.getTime())

    if (futureDates.length === 0) {
      return null
    }

    return futureDates[0]
  }, [commissions])

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
   * Linhas referentes APENAS à próxima data de pagamento.
   */
  const rowsForNextPayment: NextPaymentRow[] = useMemo(() => {
    if (!nextPaymentDate) return []

    const targetStr = nextPaymentDate.toISOString().split("T")[0]

    const rows: NextPaymentRow[] = []

    commissions.forEach((commission) => {
      commission.paymentDueDate.forEach((d, idx) => {
        const dt = new Date(d)
        dt.setHours(0, 0, 0, 0)
        const key = dt.toISOString().split("T")[0]

        if (key === targetStr) {
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
  }, [commissions, nextPaymentDate])

  const advisorOptions = useMemo(() => {
    const map = new Map<string, string>()
    rowsForNextPayment.forEach(({ commission }) => {
      if (commission.advisorId && commission.advisorName) {
        map.set(commission.advisorId, commission.advisorName)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [rowsForNextPayment])

  const officeOptions = useMemo(() => {
    const map = new Map<string, string>()
    rowsForNextPayment.forEach(({ commission }) => {
      if (commission.officeId && commission.officeName) {
        map.set(commission.officeId, commission.officeName)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [rowsForNextPayment])

  /**
   * Filtros (texto + papel) aplicados SOBRE as linhas da próxima data de pagamento.
   */
  const filteredRows: NextPaymentRow[] = useMemo(() => {
    let list = rowsForNextPayment

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
          return c.advisorRole === "assessor"
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
  }, [rowsForNextPayment, searchTerm, roleFilter, selectedAdvisorFilter, selectedOfficeFilter])

  const totalOffice = filteredRows.reduce((sum, r) => sum + r.officeAmount, 0)
  const totalAdvisor = filteredRows.reduce((sum, r) => sum + r.advisorAmount, 0)
  const totalInvestor = filteredRows.reduce((sum, r) => sum + r.investorAmount, 0)

  const nextCutoffDate = useMemo(() => {
    if (!nextPaymentDate) return null
    let year = nextPaymentDate.getFullYear()
    let month = nextPaymentDate.getMonth() - 1
    if (month < 0) {
      month = 11
      year -= 1
    }
    return new Date(year, month, 20)
  }, [nextPaymentDate])

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

  const exportToExcel = () => {
    if (filteredRows.length === 0) {
      toast({
        title: "Nada para exportar",
        description: "Não há comissões na próxima data de pagamento com os filtros atuais.",
      })
      return
    }

    const workbook = XLSX.utils.book_new()

    // --- ABA 1: ESCRITÓRIOS ---
    const officeHeaders = [
      "Escritório",
      "Assessor",
      "Investidor",
      "Email Investidor",
      "Valor Investido",
      "Data do Depósito",
      "Próximo Pagamento (5º dia útil)",
      "Dias desde o depósito",
      "Dias pró-rata (D+60)",
      "Período de Corte",
      "Comissão Escritório",
    ]

    const officeSheetData: any[][] = []

    const officeRowsSorted = [...filteredRows].sort((a, b) => {
      const aAdv = (a.commission.advisorName || "").localeCompare(b.commission.advisorName || "")
      if (aAdv !== 0) return aAdv
      const aOff = (a.commission.officeName || "").localeCompare(b.commission.officeName || "")
      if (aOff !== 0) return aOff
      return (a.commission.investorName || "").localeCompare(b.commission.investorName || "")
    })

    let currentAdvisorOffice: string | null = null
    let advisorOfficeSubtotal = 0

    for (const row of officeRowsSorted) {
      const { commission: c, officeAmount } = row
      const advisorLabel = c.advisorName || "Sem Assessor"

      if (advisorLabel !== currentAdvisorOffice) {
        // fecha subtotal anterior
        if (currentAdvisorOffice !== null) {
          officeSheetData.push([
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "Subtotal Escritório por Assessor",
            formatCurrency(advisorOfficeSubtotal),
          ])
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
        c.investorName,
        c.investorEmail || "",
        formatCurrency(c.amount),
        formatDate(c.paymentDate),
        nextPaymentDate ? formatDate(nextPaymentDate) : "",
        calculateDaysSinceDeposit(c, nextPaymentDate),
        calculateProrataDays("office", row),
        nextCutoffDate ? formatDate(nextCutoffDate) : "",
        formatCurrency(officeAmount),
      ])
    }

    if (currentAdvisorOffice !== null) {
      officeSheetData.push([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Subtotal Escritório por Assessor",
        formatCurrency(advisorOfficeSubtotal),
      ])
    }

    const officeSheet = XLSX.utils.aoa_to_sheet(officeSheetData)
    XLSX.utils.book_append_sheet(workbook, officeSheet, "Escritórios")

    // --- ABA 2: ASSESSORES ---
    const advisorHeaders = [
      "Assessor",
      "Escritório",
      "Investidor",
      "Email Investidor",
      "Valor Investido",
      "Data do Depósito",
      "Próximo Pagamento (5º dia útil)",
      "Dias desde o depósito",
      "Dias pró-rata (D+60)",
      "Período de Corte",
      "Comissão Assessor",
    ]

    const advisorSheetData: any[][] = []

    const advisorRowsSorted = [...filteredRows].sort((a, b) => {
      const aAdv = (a.commission.advisorName || "").localeCompare(b.commission.advisorName || "")
      if (aAdv !== 0) return aAdv
      return (a.commission.investorName || "").localeCompare(b.commission.investorName || "")
    })

    let currentAdvisor: string | null = null
    let advisorSubtotal = 0

    for (const row of advisorRowsSorted) {
      const { commission: c, advisorAmount } = row
      const advisorLabel = c.advisorName || "Sem Assessor"

      if (advisorLabel !== currentAdvisor) {
        if (currentAdvisor !== null) {
          advisorSheetData.push([
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "Subtotal Assessor",
            formatCurrency(advisorSubtotal),
          ])
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
        c.investorName,
        c.investorEmail || "",
        formatCurrency(c.amount),
        formatDate(c.paymentDate),
        nextPaymentDate ? formatDate(nextPaymentDate) : "",
        calculateDaysSinceDeposit(c, nextPaymentDate),
        calculateProrataDays("advisor", row),
        nextCutoffDate ? formatDate(nextCutoffDate) : "",
        formatCurrency(advisorAmount),
      ])
    }

    if (currentAdvisor !== null) {
      advisorSheetData.push([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Subtotal Assessor",
        formatCurrency(advisorSubtotal),
      ])
    }

    const advisorSheet = XLSX.utils.aoa_to_sheet(advisorSheetData)
    XLSX.utils.book_append_sheet(workbook, advisorSheet, "Assessores")

    // --- ABA 3: INVESTIDORES ---
    const investorHeaders = [
      "Investidor",
      "Email Investidor",
      "Escritório",
      "Assessor",
      "Valor Investido",
      "Data do Depósito",
      "Próximo Pagamento (5º dia útil)",
      "Dias desde o depósito",
      "Dias pró-rata (D+60)",
      "Período de Corte",
      "Comissão Investidor",
    ]

    const investorSheetData: any[][] = [investorHeaders]

    const investorRowsSorted = [...filteredRows].sort((a, b) =>
      (a.commission.investorName || "").localeCompare(b.commission.investorName || ""),
    )

    for (const row of investorRowsSorted) {
      const { commission: c, investorAmount } = row

      investorSheetData.push([
        c.investorName,
        c.investorEmail || "",
        c.officeName || "N/A",
        c.advisorName || "N/A",
        formatCurrency(c.amount),
        formatDate(c.paymentDate),
        nextPaymentDate ? formatDate(nextPaymentDate) : "",
        calculateDaysSinceDeposit(c, nextPaymentDate),
        calculateProrataDays("investor", row),
        nextCutoffDate ? formatDate(nextCutoffDate) : "",
        formatCurrency(investorAmount),
      ])
    }

    const investorSheet = XLSX.utils.aoa_to_sheet(investorSheetData)
    XLSX.utils.book_append_sheet(workbook, investorSheet, "Investidores")
    const fileName = `comissoes_admin_${new Date().toISOString().split("T")[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Próxima Data de Pagamento
              </CardTitle>
              <CardDescription>
                Saiba exatamente quanto e para quem você vai pagar na próxima data de pagamento (5º dia útil / corte).
              </CardDescription>
              {nextPaymentDate && (
                <p className="text-sm text-muted-foreground mt-1">
                  Próximo pagamento em{" "}
                  <span className="font-medium">
                    {formatDate(nextPaymentDate)}
                  </span>
                  {filteredRows.length > 0 && ` • ${filteredRows.length} lançamento(s)`}
                </p>
              )}
              {!nextPaymentDate && (
                <p className="text-sm text-muted-foreground mt-1">
                  Não há datas futuras de pagamento encontradas para os investimentos atuais.
                </p>
              )}
            </div>
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
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
                  <TableHead>Escritório</TableHead>
                  <TableHead>Assessor</TableHead>
                  <TableHead>Tipo Assessor</TableHead>
                  <TableHead>Investidor</TableHead>
                  <TableHead>Valor Investido</TableHead>
                  <TableHead>Data Entrada</TableHead>
                  <TableHead>Próximo Pagamento</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Comissão Escritório</TableHead>
                  <TableHead>Comissão Assessor</TableHead>
                  <TableHead>Comissão Investidor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground">
                      Nenhuma comissão encontrada para a próxima data de pagamento com os filtros atuais.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map(({ commission, officeAmount, advisorAmount, investorAmount, paymentIndex }) => (
                    <TableRow key={`${commission.investmentId}-${paymentIndex}`}>
                      <TableCell>
                        <p className="font-medium">{commission.officeName || "N/A"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{commission.advisorName || "N/A"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {commission.advisorRole === "assessor_externo"
                            ? "Assessor Externo"
                            : commission.advisorRole === "assessor"
                              ? "Assessor Interno"
                              : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{commission.investorName}</p>
                          <p className="text-xs text-muted-foreground">
                            {commission.investorEmail}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(commission.amount)}</TableCell>
                      <TableCell>{formatDate(commission.paymentDate)}</TableCell>
                      <TableCell>
                        {nextPaymentDate ? formatDate(nextPaymentDate) : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {nextCutoffDate ? formatDate(nextCutoffDate) : "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className="font-semibold text-primary"
                          title={getCommissionTooltip("office", commission, paymentIndex, officeAmount)}
                        >
                          {formatCurrency(officeAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="font-semibold text-green-600"
                          title={getCommissionTooltip("advisor", commission, paymentIndex, advisorAmount)}
                        >
                          {formatCurrency(advisorAmount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="font-semibold text-purple-600"
                          title={getCommissionTooltip("investor", commission, paymentIndex, investorAmount)}
                        >
                          {formatCurrency(investorAmount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


