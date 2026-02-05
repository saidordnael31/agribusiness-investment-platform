"use client"

import { useState, useEffect, useCallback } from "react"
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
  calculateNewCommissionLogic,
  getFirstEligibleCutoff,
  getLiquidityCycleMonths,
  getNextPaymentIndex,
  type NewCommissionCalculation,
} from "@/lib/commission-calculator"
import { useToast } from "@/hooks/use-toast"
import { Download, Search, Eye, Calendar, DollarSign, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
import { getFifthBusinessDayOfMonth } from "@/lib/commission-calculator"
import * as XLSX from "xlsx"
import { getUserTypeFromId } from "@/lib/user-type-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CommissionDetail extends NewCommissionCalculation {
  investorEmail?: string
  commitmentPeriod?: number
  investorRentabilityBreakdown?: {
    mensal: number
    payoutStartDays: number
    diasNoPrimeiroPeriodo: number
    proRataFracao: number
    valorProRataPrimeiro: number
    totalDiasRentabilidade: number
    valorTotal: number
  }
  advisorName?: string // Nome do assessor (para escritórios)
  advisorId?: string // ID do assessor (para escritórios)
  liquidity?: string // Liquidez do investimento (Mensal, Semestral, Anual, etc.)
  pixReceipts?: Array<{
    id: string
    file_name: string
    file_path: string
    status: string
    created_at: string
  }>
  // Propriedades adicionais para comissões agrupadas por data
  monthlyCommissionForDate?: number
  paymentDateIndex?: number
}

type RawItem = { investment: any; investorProfile: any }
type RawData = {
  items: RawItem[]
  receipts: any[]
  advisorsMap: Map<string, { id: string; name: string; user_type_id?: number; user_type?: string }>
  profile: any
  user: any
  userTypeSlug: string
  effectiveIsOffice: boolean
  effectiveIsAdvisor: boolean
}

/** Valor mensal da rentabilidade (para exibição quando liquidez é mensal) */
function calcInvestorRentabilityMensal(c: CommissionDetail): number {
  const rate = c.investorRate ?? 0.02
  return c.amount * rate
}

/** Calcula a rentabilidade total do investidor (igual ao modal: inclui acumulado D+60 na 1ª comissão) */
function calcInvestorRentabilityTotal(c: CommissionDetail): number {
  const b = c.investorRentabilityBreakdown
  const fromBreakdown = b?.valorTotal
  if (fromBreakdown != null && fromBreakdown > 0) return fromBreakdown
  const rate = c.investorRate ?? 0.02
  const amount = c.amount
  const cp = c.commitmentPeriod || 12
  const liq = (c.liquidity || "mensal").toString().toLowerCase()
  const cycleMonths = getLiquidityCycleMonths(
    (liq === "semestral" || liq === "anual" || liq === "bienal" || liq === "trienal" ? liq : "mensal") as "mensal" | "semestral" | "anual" | "bienal" | "trienal"
  )
  const usaComposto = cycleMonths > 1
  const mensalSimples = amount * rate
  let total = 0
  if (usaComposto) {
    const numCiclos = Math.ceil(cp / cycleMonths)
    for (let ciclo = 0; ciclo < numCiclos; ciclo++) {
      const inicioMes = ciclo * cycleMonths + 1
      const fimMes = Math.min((ciclo + 1) * cycleMonths, cp)
      let saldo = amount
      for (let i = inicioMes; i <= fimMes; i++) {
        const valor = saldo * rate
        saldo += valor
        total += valor
      }
    }
  } else {
    for (let i = 1; i <= cp; i++) {
      total += mensalSimples
    }
  }
  return total
}

export function AdvisorCommissionsDetail() {
  const { toast } = useToast()
  const [rawData, setRawData] = useState<RawData | null>(null)
  const [commissionsCache, setCommissionsCache] = useState<Map<string, CommissionDetail>>(new Map())
  const [pageCommissions, setPageCommissions] = useState<CommissionDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [advisorFilter, setAdvisorFilter] = useState<string>("all")
  const [selectedCommission, setSelectedCommission] = useState<CommissionDetail | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [chartView, setChartView] = useState<"table" | "chart">("table")
  const [selectedPaymentDate, setSelectedPaymentDate] = useState<{ date: string; commissions: CommissionDetail[] } | null>(null)
  const [paymentDetailModalOpen, setPaymentDetailModalOpen] = useState(false)
  const [userRole, setUserRole] = useState<"assessor" | "escritorio" | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [openCiclo, setOpenCiclo] = useState<number | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const ITEMS_PER_PAGE = 5

  useEffect(() => {
    fetchRawData()
  }, [])

  // Reset accordion quando modal fechar ou comissão mudar
  useEffect(() => {
    if (!detailModalOpen || !selectedCommission) {
      setOpenCiclo(null)
    }
  }, [detailModalOpen, selectedCommission])

  const fetchRawData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Buscar usuário logado
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        })
        return
      }

      // Buscar perfil do usuário para confirmar que é assessor ou escritório
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, user_type_id, office_id, full_name")
        .eq("id", user.id)
        .single()

      if (!profile || !profile.user_type_id) {
        toast({
          title: "Erro",
          description: "Perfil não encontrado ou sem tipo de usuário",
          variant: "destructive",
        })
        return
      }

      // Buscar tipo de usuário da tabela user_types
      const userType = await getUserTypeFromId(profile.user_type_id)
      if (!userType || !userType.user_type) {
        toast({
          title: "Erro",
          description: "Tipo de usuário não encontrado",
          variant: "destructive",
        })
        return
      }

      // Verificar se é assessor, escritório ou distribuidor
      const userTypeSlug = userType.user_type
      const isOffice = userTypeSlug === "office"
      const isAdvisor = userTypeSlug === "advisor"
      const isDistributor = userTypeSlug === "distributor"

      if (!isOffice && !isAdvisor && !isDistributor) {
        toast({
          title: "Erro",
          description: "Este recurso é apenas para assessores, escritórios e distribuidores",
          variant: "destructive",
        })
        return
      }

      // Armazenar o role do usuário para exibição
      setUserRole(isOffice ? "escritorio" : "assessor")
      
      // Se for distribuidor, tratar como assessor para os cálculos
      const effectiveIsAdvisor = isAdvisor || isDistributor
      const effectiveIsOffice = isOffice

      // Buscar investimentos dos clientes
      // Se for escritório: buscar por office_id (e também por assessores)
      // Se for assessor: buscar por parent_id
      let investorProfiles: any[] = []

      // Buscar assessores do escritório (se for escritório) para mapear investidores
      let advisorsMap = new Map<string, { id: string; name: string }>()
      
      // Buscar user_type_id de "investor" (necessário para ambos os casos)
      const { data: investorUserTypes, error: investorUserTypeError } = await supabase
        .from("user_types")
        .select("id")
        .eq("user_type", "investor")
        .limit(1)
      
      if (investorUserTypeError) {
        console.error("Erro ao buscar user_type 'investor':", investorUserTypeError)
        toast({
          title: "Erro",
          description: `Erro ao buscar tipo de usuário: ${investorUserTypeError.message}`,
          variant: "destructive",
        })
        return
      }
      
      if (!investorUserTypes || investorUserTypes.length === 0) {
        toast({
          title: "Erro",
          description: "Tipo de usuário 'investor' não encontrado",
          variant: "destructive",
        })
        return
      }
      
      const investorUserType = investorUserTypes[0]
      
      if (effectiveIsOffice) {
        // Buscar assessores: office_id ou parent_id (mesma lógica do dashboard)
        const { data: officeProfile } = await supabase
          .from("profiles")
          .select("user_type_id")
          .eq("id", user.id)
          .single()

        let advisorTypeIds: number[] = []
        if (officeProfile?.user_type_id) {
          const { data: relations } = await supabase.rpc(
            "get_user_type_relations_all",
            { p_user_type_id: officeProfile.user_type_id }
          )
          const advisorRels = (relations || []).filter(
            (r: any) => r.role === "parent" && (r.child_user_type === "advisor" || r.child_user_type === "assessor")
          )
          advisorTypeIds = [...new Set(advisorRels.map((r: any) => r.child_user_type_id))]
        }
        if (advisorTypeIds.length === 0) {
          const { data: def } = await supabase
            .from("user_types")
            .select("id")
            .eq("user_type", "advisor")
            .limit(1)
            .single()
          if (def) advisorTypeIds = [def.id]
        }

        const [officeAdvisors, parentAdvisors] = await Promise.all([
          supabase.from("profiles").select("id, full_name, user_type_id").in("user_type_id", advisorTypeIds).eq("office_id", user.id),
          supabase.from("profiles").select("id, full_name, user_type_id").in("user_type_id", advisorTypeIds).eq("parent_id", user.id),
        ])
        const advisors = [...(officeAdvisors.data || []), ...(parentAdvisors.data || [])]
        const uniqueAdvisors = advisors.filter((a, i, self) => self.findIndex((x: any) => x.id === a.id) === i)
        for (const advisor of uniqueAdvisors) {
          let user_type: string | undefined
          if (advisor.user_type_id) {
            const ut = await getUserTypeFromId(advisor.user_type_id)
            user_type = ut?.user_type || ut?.name
          }
          advisorsMap.set(advisor.id, {
            id: advisor.id,
            name: advisor.full_name || "Assessor",
            user_type_id: advisor.user_type_id,
            user_type,
          })
        }
        const advisorIds = uniqueAdvisors.map((a: any) => a.id)

        // Investidores: office_id, parent_id (assessores), parent_id = escritório
        const [byOffice, byAdvisors, byParentOffice] = await Promise.all([
          supabase.from("profiles").select("id, full_name, email, parent_id, user_type_id")
            .eq("office_id", user.id).eq("user_type_id", investorUserType.id),
          advisorIds.length > 0
            ? supabase.from("profiles").select("id, full_name, email, parent_id, user_type_id")
                .in("parent_id", advisorIds).eq("user_type_id", investorUserType.id)
            : { data: [] },
          supabase.from("profiles").select("id, full_name, email, parent_id, user_type_id")
            .eq("parent_id", user.id).eq("user_type_id", investorUserType.id),
        ])
        let allInvestors = [
          ...(byOffice.data || []),
          ...(byAdvisors.data || []),
          ...(byParentOffice.data || []),
        ]
        // Fallback user_type legado
        if (allInvestors.length === 0) {
          const [legOffice, legParent] = await Promise.all([
            supabase.from("profiles").select("id, full_name, email, parent_id, user_type_id")
              .eq("office_id", user.id).eq("user_type", "investor"),
            supabase.from("profiles").select("id, full_name, email, parent_id, user_type_id")
              .eq("parent_id", user.id).eq("user_type", "investor"),
          ])
          const legByAdv = advisorIds.length > 0
            ? await supabase.from("profiles").select("id, full_name, email, parent_id, user_type_id")
                .in("parent_id", advisorIds).eq("user_type", "investor")
            : { data: [] }
          allInvestors = [
            ...(legOffice.data || []),
            ...(legParent.data || []),
            ...(legByAdv.data || []),
          ]
        }
        investorProfiles = allInvestors.filter((p, i, self) => self.findIndex(x => x.id === p.id) === i)
      } else {
        // Assessor (interno ou externo): buscar investidores por parent_id
        const { data: investorsByParent } = await supabase
          .from("profiles")
          .select("id, full_name, email, user_type_id")
          .eq("parent_id", user.id)
          .eq("user_type_id", investorUserType.id)

        if (investorsByParent) {
          investorProfiles = investorsByParent
        }
      }

      if (!investorProfiles || investorProfiles.length === 0) {
        setRawData(null)
        setPageCommissions([])
        setLoading(false)
        return
      }

      const investorIds = investorProfiles.map((p) => p.id)

      if (investorIds.length === 0) {
        setRawData(null)
        setPageCommissions([])
        setLoading(false)
        return
      }

      // Dados já filtrados por office_id/parent_id - evita N+1 de validateUserAccess
      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select("id, user_id, amount, payment_date, created_at, status, commitment_period, profitability_liquidity")
        .in("user_id", investorIds)
        .eq("status", "active")
      
      if (investmentsError) {
        toast({
          title: "Erro",
          description: "Erro ao buscar investimentos",
          variant: "destructive",
        })
        setLoading(false)
        return
      }
      
      // Processar TODOS os investimentos ativos (não filtrar por data)
      // A data de corte (20/10/2024) será usada apenas na lógica de cálculo, não para filtrar investimentos
      const investmentsToProcess = investments?.filter(inv => {
        // Apenas garantir que tenha uma data (payment_date ou created_at)
        const dateToCheck = inv.payment_date || inv.created_at;
        return !!dateToCheck;
      }) || [];

      if (!investmentsToProcess || investmentsToProcess.length === 0) {
        setRawData(null)
        setPageCommissions([])
        setLoading(false)
        return
      }

      // Montar itens brutos (investment + investorProfile), ordenados por payment_date desc
      const items: RawItem[] = investmentsToProcess
        .map((inv) => ({ investment: inv, investorProfile: investorProfiles.find((p) => p.id === inv.user_id) }))
        .filter((x) => x.investorProfile)
        .sort((a, b) => {
          const da = a.investment.payment_date || a.investment.created_at
          const db = b.investment.payment_date || b.investment.created_at
          return new Date(db || 0).getTime() - new Date(da || 0).getTime()
        })

      const investmentIds = investmentsToProcess.map((inv) => inv.id)
      const { data: receipts } = await supabase
        .from("pix_receipts")
        .select("id, transaction_id, file_name, file_path, status, created_at")
        .in("transaction_id", investmentIds)

      setRawData({
        items,
        receipts: receipts || [],
        advisorsMap,
        profile,
        user,
        userTypeSlug,
        effectiveIsOffice,
        effectiveIsAdvisor,
      })
      setCommissionsCache(new Map())
      setPageCommissions([])
      setCurrentPage(1)
    } catch (error) {
      console.error("Erro ao buscar comissões:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar comissões",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatLiquidity = useCallback((liquidity: string | null | undefined): string => {
    if (!liquidity) return "N/A"
    const m: Record<string, string> = {
      "Mensal": "Mensal", "mensal": "Mensal", "monthly": "Mensal",
      "Semestral": "Semestral", "semestral": "Semestral", "semiannual": "Semestral",
      "Anual": "Anual", "anual": "Anual", "annual": "Anual",
      "Bienal": "Bienal", "bienal": "Bienal", "biennial": "Bienal",
      "Trienal": "Trienal", "trienal": "Trienal", "triennial": "Trienal",
    }
    return m[liquidity] || liquidity
  }, [])

  // Carregar comissões da página atual sob demanda
  useEffect(() => {
    if (!rawData) return
    const rd = rawData
    const term = searchTerm.toLowerCase()
    const advisorOk = (x: RawItem) =>
      advisorFilter === "all" || x.investorProfile?.parent_id === advisorFilter
    const searchOk = (x: RawItem) =>
      !term ||
      x.investorProfile?.full_name?.toLowerCase().includes(term) ||
      x.investorProfile?.email?.toLowerCase().includes(term) ||
      x.investment.id?.includes(term)
    const filtered = rd.items.filter((x) => advisorOk(x) && searchOk(x))
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    const pageItems = filtered.slice(start, start + ITEMS_PER_PAGE)
    if (pageItems.length === 0) {
      setPageCommissions([])
      return
    }
    const toDateOnly = (d: string | Date | null | undefined): string | undefined => {
      if (!d) return undefined
      const s = typeof d === "string" ? d : new Date(d).toISOString()
      return s.split("T")[0] || undefined
    }
    const processOne = async (x: RawItem): Promise<CommissionDetail | null> => {
      const { investment, investorProfile } = x
      const invDate = investment.payment_date || investment.created_at
      if (!invDate) return null
      const paymentDate = toDateOnly(invDate) || invDate
      const investorUserTypeId = investorProfile?.user_type_id || null
      let calc: any
      try {
        if (rd.effectiveIsOffice) {
          const adv = investorProfile?.parent_id ? rd.advisorsMap.get(investorProfile.parent_id) : undefined
          const res = await calculateNewCommissionLogic({
            id: investment.id, user_id: investment.user_id, amount: Number(investment.amount),
            payment_date: paymentDate, commitment_period: investment.commitment_period || 12,
            liquidity: investment.profitability_liquidity, investorName: investorProfile?.full_name || "Investidor",
            investorUserTypeId, officeId: rd.user.id, officeName: rd.profile?.full_name || "Escritório",
            advisorId: adv?.id, advisorName: adv?.name,
            advisorUserTypeId: adv?.user_type_id ?? null,
            advisorRole: adv?.user_type?.toLowerCase().includes("externo") ? "assessor_externo" : undefined,
          })
          calc = { ...res, advisorId: adv?.id, advisorName: adv?.name, monthlyBreakdown: res.monthlyBreakdown }
        } else {
          calc = await calculateNewCommissionLogic({
            id: investment.id, user_id: investment.user_id, amount: Number(investment.amount),
            payment_date: paymentDate, commitment_period: investment.commitment_period || 12,
            liquidity: investment.profitability_liquidity, investorName: investorProfile?.full_name || "Investidor",
            investorUserTypeId, advisorId: rd.user.id, advisorName: rd.profile?.full_name || "Assessor",
            advisorRole: rd.userTypeSlug, advisorUserTypeId: rd.profile?.user_type_id || null, isForAdvisor: true,
          })
        }
      } catch (e) {
        console.error("Erro ao calcular comissão:", e)
        return null
      }
      const recs = (rd.receipts || []).filter((r: any) => r.transaction_id === investment.id)
      let adv: { id?: string; name?: string } = {}
      if (rd.effectiveIsOffice && investorProfile?.parent_id) {
        const a = rd.advisorsMap.get(investorProfile.parent_id)
        if (a) adv = { id: a.id, name: a.name }
      }
      return {
        ...calc,
        investorEmail: investorProfile?.email,
        liquidity: formatLiquidity(investment.profitability_liquidity),
        commitmentPeriod: investment.commitment_period || 12,
        ...(rd.effectiveIsOffice ? { advisorId: adv.id, advisorName: adv.name || "N/A" } : {}),
        pixReceipts: recs.map((r: any) => ({ id: r.id, file_name: r.file_name, file_path: r.file_path, status: r.status, created_at: r.created_at })),
      }
    }

    let cancelled = false
    setPageLoading(true)
    Promise.all(pageItems.map((x) => processOne(x))).then((results) => {
      if (cancelled) return
      const valid = results.filter((r): r is CommissionDetail => r != null)
      setCommissionsCache((prev) => {
        const next = new Map(prev)
        valid.forEach((c) => next.set(c.investmentId, c))
        return next
      })
      setPageCommissions(valid)
      setPageLoading(false)
    })
    return () => { cancelled = true }
  }, [rawData, currentPage, searchTerm, advisorFilter, formatLiquidity])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (date: Date | string) => {
    if (!date) return "N/A"
    
    // Se for string ISO, extrair a parte da data antes de converter
    if (typeof date === "string") {
      // Formato ISO: "2025-12-02T00:00:00.000Z" ou "2025-12-02"
      const dateOnly = date.split("T")[0]
      if (dateOnly) {
        const [year, month, day] = dateOnly.split("-")
        return `${day}/${month}/${year}`
      }
    }
    
    // Se for objeto Date, usar métodos UTC para evitar problema de fuso horário
    const d = date as Date
    const year = d.getUTCFullYear()
    const month = String(d.getUTCMonth() + 1).padStart(2, "0")
    const day = String(d.getUTCDate()).padStart(2, "0")
    
    return `${day}/${month}/${year}`
  }

  // Calcula informações de pró-rata com base na comissão efetivamente paga
  // forAdvisor: quando true e escritório, usa taxa/valor do assessor (para exibir comissão do assessor)
  const getProrataInfo = (commission: CommissionDetail, forAdvisor = false) => {
    if (!commission.paymentDate || !commission.commissionPeriod) return null

    // Usar a taxa real do banco (assessor ou escritório)
    let monthlyRate: number
    if (forAdvisor && userRole === "escritorio") {
      monthlyRate = commission.advisorRate ?? 0.03
    } else {
      monthlyRate = userRole === "escritorio"
        ? (commission.officeRate || 0.01)
        : (commission.advisorRate || 0.03)
    }
    const dailyRate = monthlyRate / 30
    const amount = commission.amount
    if (!amount || amount <= 0) return null

    // Quando vier de \"Próximos Recebimentos\", teremos contexto extra:
    const ctx: { monthlyCommissionForDate?: number; paymentDateIndex?: number } =
      (commission as any)

    // Determinar qual período explicar:
    // 1) Se veio de Próximos Recebimentos, usamos o índice informado (paymentDateIndex)
    // 2) Caso contrário, usamos o próximo pagamento futuro (ou o último, se todos já passaram)
    let periodIndex = ctx.paymentDateIndex
    if (periodIndex === undefined || periodIndex === null) {
      const dueDates = commission.paymentDueDate || []
      periodIndex = dueDates.length === 0 ? 0 : getNextPaymentIndex(dueDates)
    }

    // Determinar a comissão específica deste período:
    // 1) Se veio de Próximos Recebimentos, usar monthlyCommissionForDate (só para office/advisor principal)
    // 2) Senão, se for um período futuro (periodIndex > 0), usar o valor do monthlyBreakdown
    // 3) Caso contrário, usar advisorCommission/officeCommission (primeiro período)
    const useOffice = userRole === "escritorio" && !forAdvisor
    let commissionForThisPeriod: number
    if (forAdvisor && userRole === "escritorio") {
      // Sempre usar advisorCommission para seção do assessor
      if (periodIndex > 0 && commission.monthlyBreakdown?.length > periodIndex) {
        commissionForThisPeriod = commission.monthlyBreakdown[periodIndex].advisorCommission ?? 0
      } else {
        commissionForThisPeriod = commission.advisorCommission ?? 0
      }
    } else if (ctx.monthlyCommissionForDate !== undefined && ctx.monthlyCommissionForDate !== null) {
      commissionForThisPeriod = ctx.monthlyCommissionForDate
    } else if (
      periodIndex > 0 &&
      Array.isArray(commission.monthlyBreakdown) &&
      commission.monthlyBreakdown.length > periodIndex
    ) {
      const entry = commission.monthlyBreakdown[periodIndex]
      commissionForThisPeriod = useOffice ? (entry.officeCommission ?? entry.advisorCommission) : entry.advisorCommission
    } else {
      commissionForThisPeriod = useOffice ? (commission.officeCommission ?? commission.advisorCommission) : commission.advisorCommission
    }

    if (!commissionForThisPeriod || commissionForThisPeriod <= 0) return null

    let days: number
    let startLabel: string
    let endLabel: string

    if (periodIndex === 0) {
      // PRIMEIRO PERÍODO: pró-rata entre depósito e primeiro corte
      const basePerDay = amount * dailyRate
      const inferredDays = basePerDay > 0 ? commissionForThisPeriod / basePerDay : 0
      days = Math.max(0, Math.round(inferredDays))

      startLabel = formatDate(commission.paymentDate)
      endLabel =
        typeof commission.commissionPeriod.endDate === "string"
          ? formatDate(commission.commissionPeriod.endDate)
          : formatDate(commission.commissionPeriod.endDate)
    } else {
      // PERÍODOS SEGUINTES: sempre 30 dias (mês cheio entre cortes)
      days = 30

      // Descobrir o corte atual e o anterior a partir da data de pagamento (usar UTC para consistência)
      const paymentForThis = commission.paymentDueDate[periodIndex]
      const paymentDate = new Date(paymentForThis)
      const year = paymentDate.getUTCFullYear()
      const month = paymentDate.getUTCMonth()

      // Corte atual é dia 20 do mês anterior ao pagamento
      let cutoffMonth = month - 1
      let cutoffYear = year
      if (cutoffMonth < 0) {
        cutoffMonth = 11
        cutoffYear -= 1
      }
      const currentCutoff = new Date(Date.UTC(cutoffYear, cutoffMonth, 20, 0, 0, 0, 0))

      // Corte anterior é dia 20 do mês anterior ao cutoff atual
      let prevMonth = cutoffMonth - 1
      let prevYear = cutoffYear
      if (prevMonth < 0) {
        prevMonth = 11
        prevYear -= 1
      }
      const previousCutoff = new Date(Date.UTC(prevYear, prevMonth, 20, 0, 0, 0, 0))

      startLabel = formatDate(previousCutoff)
      endLabel = formatDate(currentCutoff)
    }

    const theoreticalFullMonth = amount * monthlyRate
    const fractionOfMonth = days / 30

    return {
      startLabel,
      endLabel,
      days,
      fractionOfMonth,
      theoreticalFullMonth,
      prorataCommission: commissionForThisPeriod,
    }
  }

  // Retorna { valor, dataPagamento } da comissão do investidor no próximo recebimento (igual ao modal)
  const getNextInvestorRentabilityInfo = (commission: CommissionDetail): { valor: number; dataPagamento: Date | null } => {
    if (!commission.monthlyBreakdown || commission.monthlyBreakdown.length === 0) {
      const liq = (commission.liquidity || "mensal").toString().toLowerCase()
      const isMensal = liq === "mensal"
      const nextDate = getNextPaymentDateForCommission(commission)
      return {
        valor: isMensal ? calcInvestorRentabilityMensal(commission) : calcInvestorRentabilityTotal(commission),
        dataPagamento: nextDate,
      }
    }
    const nextDate = getNextPaymentDateForCommission(commission)
    if (!commission.paymentDueDate || commission.paymentDueDate.length === 0) {
      const firstWithValueIdx = commission.monthlyBreakdown.findIndex((m) => (m.investorCommission ?? 0) > 0)
      const valor = firstWithValueIdx >= 0
        ? (commission.monthlyBreakdown[firstWithValueIdx].investorCommission ?? 0)
        : calcInvestorRentabilityMensal(commission)
      const dataPagamento = firstWithValueIdx >= 0 && commission.paymentDueDate?.[firstWithValueIdx]
        ? new Date(commission.paymentDueDate[firstWithValueIdx])
        : nextDate
      return { valor, dataPagamento }
    }
    const paymentIndex = nextDate
      ? commission.paymentDueDate.findIndex((pd) => {
          const d = new Date(pd)
          return d.getTime() === nextDate.getTime() || (
            d.getUTCFullYear() === nextDate.getUTCFullYear() &&
            d.getUTCMonth() === nextDate.getUTCMonth() &&
            d.getUTCDate() === nextDate.getUTCDate()
          )
        })
      : -1
    if (paymentIndex >= 0 && commission.monthlyBreakdown.length > paymentIndex) {
      const valor = commission.monthlyBreakdown[paymentIndex].investorCommission ?? 0
      if (valor > 0) {
        return {
          valor,
          dataPagamento: new Date(commission.paymentDueDate[paymentIndex]),
        }
      }
    }
    const firstWithValueIdx = commission.monthlyBreakdown.findIndex((m) => (m.investorCommission ?? 0) > 0)
    const valor = firstWithValueIdx >= 0
      ? (commission.monthlyBreakdown[firstWithValueIdx].investorCommission ?? 0)
      : 0
    const dataPagamento = firstWithValueIdx >= 0 && commission.paymentDueDate[firstWithValueIdx]
      ? new Date(commission.paymentDueDate[firstWithValueIdx])
      : null
    return { valor, dataPagamento }
  }

  // Retorna a próxima data de pagamento futura (ou de hoje) para uma comissão específica
  const getNextPaymentDateForCommission = (commission: CommissionDetail): Date | null => {
    if (!commission.paymentDueDate || commission.paymentDueDate.length === 0) {
      return null
    }

    // Normalizar \"hoje\" para UTC (mesma base usada em paymentDueDate)
    const today = new Date()
    const todayUTC = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      0, 0, 0, 0
    ))

    // paymentDueDate já vem normalizado em UTC (00:00), então só precisamos clonar
    const normalizedDates = commission.paymentDueDate.map((d) => new Date(d))

    const futureOrToday = normalizedDates.filter((d) => d >= todayUTC)

    if (futureOrToday.length === 0) {
      // Se todas as datas são passadas, retornar a última (já para histórico)
      return normalizedDates[normalizedDates.length - 1]
    }

    futureOrToday.sort((a, b) => a.getTime() - b.getTime())
    return futureOrToday[0]
  }

  const isPaymentDateFutureOrToday = (dataPagamento: Date | string | undefined) => {
    if (!dataPagamento) return true
    const d = new Date(dataPagamento)
    const today = new Date()
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0))
    d.setUTCHours(0, 0, 0, 0)
    return d >= todayUTC
  }

  // Reset página ao buscar ou filtrar assessor
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, advisorFilter])

  // Para cards "Próximo pagamento" etc: usar comissões já carregadas no cache
  const cachedCommissions = Array.from(commissionsCache.values())
  const advisorFilterOk = (c: CommissionDetail) =>
    advisorFilter === "all" || c.advisorId === advisorFilter
  const searchFilterOk = (c: CommissionDetail) => {
    const t = searchTerm.toLowerCase()
    return !t || c.investorName?.toLowerCase().includes(t) || c.investorEmail?.toLowerCase().includes(t) || c.investmentId?.includes(t)
  }
  const filteredCommissions = cachedCommissions.filter((c) => advisorFilterOk(c) && searchFilterOk(c))

  const advisorRawOk = (x: RawItem) =>
    advisorFilter === "all" || x.investorProfile?.parent_id === advisorFilter
  const searchRawOk = (x: RawItem) => {
    const t = searchTerm.toLowerCase()
    return !t ||
      x.investorProfile?.full_name?.toLowerCase().includes(t) ||
      x.investorProfile?.email?.toLowerCase().includes(t) ||
      x.investment?.id?.includes(t)
  }
  const filteredRawCount = rawData
    ? rawData.items.filter((x) => advisorRawOk(x) && searchRawOk(x)).length
    : 0
  const totalPages = Math.max(1, Math.ceil(filteredRawCount / ITEMS_PER_PAGE))
  const clampedPage = Math.min(currentPage, totalPages)
  const paginatedCommissions = pageCommissions

  // Calcular próximo quinto dia útil e total a receber
  const getNextPaymentInfo = () => {
    // IMPORTANTE: Usar UTC para evitar problemas de fuso horário
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    
    // Listar todas as datas de pagamento únicas das comissões
    // IMPORTANTE: Usar UTC para evitar problemas de fuso horário
    const paymentDates = new Map<string, Date>()
    filteredCommissions.forEach((c) => {
      // Agora paymentDueDate é um array, então iterar sobre todas as datas
      c.paymentDueDate.forEach((paymentDate) => {
        // Extrair ano, mês e dia usando métodos UTC
        const year = paymentDate.getUTCFullYear()
        const month = paymentDate.getUTCMonth()
        const day = paymentDate.getUTCDate()
        const paymentDateUTC = new Date(Date.UTC(year, month, day, 0, 0, 0, 0))
        const paymentStr = paymentDateUTC.toISOString().split("T")[0]
        if (!paymentDates.has(paymentStr)) {
          paymentDates.set(paymentStr, paymentDateUTC)
        }
      })
    })
    
    // Encontrar a próxima data de pagamento (mais próxima de hoje ou futura)
    const sortedDates = Array.from(paymentDates.values())
      .filter(d => d >= today)
      .sort((a, b) => a.getTime() - b.getTime())
    
    // Se não houver datas futuras, usar a mais recente (mesmo que passada)
    const nextFifthDay = sortedDates.length > 0 
      ? sortedDates[0] 
      : Array.from(paymentDates.values()).sort((a, b) => b.getTime() - a.getTime())[0]
    
    if (!nextFifthDay) {
      return {
        date: today,
        dateFormatted: formatDate(today),
        total: 0,
        count: 0,
      }
    }
    
    // Filtrar comissões que serão pagas nesse próximo quinto dia útil
    // IMPORTANTE: nextFifthDay já está normalizado em UTC do Map
    const nextFifthDayStr = nextFifthDay.toISOString().split("T")[0]

    const commissionsForNextFifthDay = filteredCommissions.filter((c) => {
      // Verificar se nextFifthDayStr está no array de paymentDueDate
      return c.paymentDueDate.some((paymentDate) => {
        // Extrair ano, mês e dia usando métodos UTC para garantir consistência
        const year = paymentDate.getUTCFullYear()
        const month = paymentDate.getUTCMonth()
        const day = paymentDate.getUTCDate()

        // Criar string de data no formato YYYY-MM-DD
        const paymentStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`
        return paymentStr === nextFifthDayStr
      })
    })
    
    // IMPORTANTE: usar a MESMA lógica de cálculo do valor mensal usada em getNextPayments,
    // para que o total exibido no card "A receber no próximo quinto dia útil" seja
    // idêntico ao total mostrado no modal de detalhes por data.
    const totalNextPayment = commissionsForNextFifthDay.reduce((sum, c) => {
      // Encontrar o índice da data de pagamento correspondente
      const paymentIndex = c.paymentDueDate.findIndex((paymentDate) => {
        const year = paymentDate.getUTCFullYear()
        const month = paymentDate.getUTCMonth()
        const day = paymentDate.getUTCDate()
        const paymentStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`
        return paymentStr === nextFifthDayStr
      })

      let monthlyCommission: number

      if (paymentIndex === 0) {
        monthlyCommission = userRole === "escritorio" ? (c.officeCommission ?? c.advisorCommission) : c.advisorCommission
      } else if (c.monthlyBreakdown && c.monthlyBreakdown.length > paymentIndex) {
        const entry = c.monthlyBreakdown[paymentIndex]
        monthlyCommission = userRole === "escritorio" ? (entry.officeCommission ?? entry.advisorCommission) : entry.advisorCommission
      } else {
        const rate = userRole === "escritorio" 
          ? (c.officeRate || 0.01)
          : (c.advisorRate || 0.03)
        monthlyCommission = c.amount * rate
      }

      return sum + monthlyCommission
    }, 0)

    const totalInvestorNextPayment = commissionsForNextFifthDay.reduce((sum, c) => {
      const paymentIndex = c.paymentDueDate.findIndex((paymentDate) => {
        const year = paymentDate.getUTCFullYear()
        const month = paymentDate.getUTCMonth()
        const day = paymentDate.getUTCDate()
        const paymentStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        return paymentStr === nextFifthDayStr
      })
      const invVal = paymentIndex >= 0 && c.monthlyBreakdown?.[paymentIndex]
        ? (c.monthlyBreakdown[paymentIndex].investorCommission ?? 0)
        : 0
      return sum + invVal
    }, 0)
    
    return {
      date: nextFifthDay,
      dateFormatted: formatDate(nextFifthDay),
      total: totalNextPayment,
      totalInvestor: totalInvestorNextPayment,
      count: commissionsForNextFifthDay.length,
    }
  }

  const nextPaymentInfo = getNextPaymentInfo()

  // Preparar próximos recebimentos futuros
  const getNextPayments = () => {
    // Considerar o \"hoje\" em horário local, zerando horas/minutos
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Filtrar apenas comissões futuras (próximos 12 meses)
    // IMPORTANTE: Normalizar todas as datas para comparação correta
    const oneYearFromNow = new Date(today)
    oneYearFromNow.setMonth(oneYearFromNow.getMonth() + 12)
    oneYearFromNow.setHours(23, 59, 59, 999) // Fim do dia
    
    const futureCommissions = filteredCommissions.filter((c) => {
      // Verificar se alguma data de pagamento está no futuro ou hoje (base UTC)
      return c.paymentDueDate.some((paymentDate) => {
        const paymentUTC = new Date(paymentDate) // já vem em UTC 00:00
        const isFutureOrToday = paymentUTC >= today
        const isWithinOneYear = paymentUTC <= oneYearFromNow
        return isFutureOrToday && isWithinOneYear
      })
    })
    
    // Agrupar por data
    const groupedByDate = new Map<string, { 
      date: Date; 
      total: number; 
      totalInvestor: number;
      count: number; 
      commissions: typeof futureCommissions;
    }>()
    
    futureCommissions.forEach((commission) => {
      // Iterar sobre todas as datas de pagamento do array
      commission.paymentDueDate.forEach((paymentDate, paymentIndex) => {
        // Usar diretamente a data em UTC (já normalizada na geração)
        const paymentUTC = new Date(paymentDate)
        const dateStr = paymentUTC.toISOString().split("T")[0]
        
        // Só incluir se for futura ou hoje
        if (paymentUTC >= today && paymentUTC <= oneYearFromNow) {
          // Buscar a comissão correspondente ao mês desta data de pagamento
          // IMPORTANTE: Para o primeiro pagamento (índice 0), usar advisorCommission 
          // que é a comissão acumulada até o corte atual (inclui todos os dias até 20/10)
          // Para meses futuros (índice > 0), usar a comissão mensal completa do monthlyBreakdown
          let monthlyCommission: number;
          
          if (paymentIndex === 0) {
            monthlyCommission = userRole === "escritorio" 
              ? (commission.officeCommission ?? commission.advisorCommission) 
              : commission.advisorCommission
          } else if (commission.monthlyBreakdown && commission.monthlyBreakdown.length > paymentIndex) {
            const entry = commission.monthlyBreakdown[paymentIndex]
            monthlyCommission = userRole === "escritorio" 
              ? (entry.officeCommission ?? entry.advisorCommission) 
              : entry.advisorCommission
          } else {
            const rate = userRole === "escritorio" 
              ? (commission.officeRate || 0.01)
              : (commission.advisorRate || 0.03)
            monthlyCommission = commission.amount * rate
          }
          
          const invCommission = commission.monthlyBreakdown?.[paymentIndex]?.investorCommission ?? 0

          if (!groupedByDate.has(dateStr)) {
            groupedByDate.set(dateStr, {
              date: new Date(paymentUTC),
              total: 0,
              totalInvestor: 0,
              count: 0,
              commissions: [],
            })
          }
          
          const group = groupedByDate.get(dateStr)!
          group.total += monthlyCommission
          group.totalInvestor += invCommission
          group.count += 1
          // Guardar a comissão junto com o índice da data de pagamento para referência
          group.commissions.push({
            ...commission,
            monthlyCommissionForDate: monthlyCommission, // Comissão específica para esta data
            paymentDateIndex: paymentIndex, // Índice da data de pagamento para referência
          })
        }
      })
    })
    
    // Criar array ordenado
    return Array.from(groupedByDate.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item) => {
        const daysUntil = Math.ceil((item.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        
        return {
          date: formatDate(item.date),
          dateFull: item.date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "UTC",
          }),
          dateLong: item.date.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }),
          total: item.total,
          totalInvestor: item.totalInvestor,
          count: item.count,
          daysUntil,
          dateObject: item.date,
          commissions: item.commissions,
        }
      })
  }

  const allNextPayments = getNextPayments()
  
  // Filtrar para excluir a data que já está sendo mostrada em "A receber no próximo quinto dia útil"
  const nextPayments = allNextPayments.filter((payment) => {
    // Comparar as datas normalizadas para verificar se são iguais
    const paymentDateStr = payment.dateObject.toISOString().split("T")[0]
    const nextPaymentDateStr = nextPaymentInfo.date.toISOString().split("T")[0]
    return paymentDateStr !== nextPaymentDateStr
  })

  const sanitizeSheetName = (name: string) => name.replace(/[\/*?:\\[\]]/g, "_").slice(0, 31)

  const setColWidths = (sheet: XLSX.WorkSheet, widths: number[]) => {
    sheet["!cols"] = widths.map((w) => ({ wch: w }))
  }

  const toDateOnlyExport = (d: string | Date | null | undefined): string | undefined => {
    if (!d) return undefined
    const s = typeof d === "string" ? d : new Date(d).toISOString()
    return s.split("T")[0] || undefined
  }
  const processOneForExport = async (rd: RawData, x: RawItem): Promise<CommissionDetail | null> => {
    const { investment, investorProfile } = x
    const invDate = investment.payment_date || investment.created_at
    if (!invDate) return null
    const paymentDate = toDateOnlyExport(invDate) || invDate
    const investorUserTypeId = investorProfile?.user_type_id || null
    try {
      let calc: any
      if (rd.effectiveIsOffice) {
        const adv = investorProfile?.parent_id ? rd.advisorsMap.get(investorProfile.parent_id) : undefined
        const res = await calculateNewCommissionLogic({
          id: investment.id, user_id: investment.user_id, amount: Number(investment.amount),
          payment_date: paymentDate, commitment_period: investment.commitment_period || 12,
          liquidity: investment.profitability_liquidity, investorName: investorProfile?.full_name || "Investidor",
          investorUserTypeId, officeId: rd.user.id, officeName: rd.profile?.full_name || "Escritório",
          advisorId: adv?.id, advisorName: adv?.name,
          advisorUserTypeId: adv?.user_type_id ?? null,
          advisorRole: adv?.user_type?.toLowerCase().includes("externo") ? "assessor_externo" : undefined,
        })
        calc = { ...res, advisorId: adv?.id, advisorName: adv?.name, monthlyBreakdown: res.monthlyBreakdown }
      } else {
        calc = await calculateNewCommissionLogic({
          id: investment.id, user_id: investment.user_id, amount: Number(investment.amount),
          payment_date: paymentDate, commitment_period: investment.commitment_period || 12,
          liquidity: investment.profitability_liquidity, investorName: investorProfile?.full_name || "Investidor",
          investorUserTypeId, advisorId: rd.user.id, advisorName: rd.profile?.full_name || "Assessor",
          advisorRole: rd.userTypeSlug, advisorUserTypeId: rd.profile?.user_type_id || null, isForAdvisor: true,
        })
      }
      const recs = (rd.receipts || []).filter((r: any) => r.transaction_id === investment.id)
      let adv: { id?: string; name?: string } = {}
      if (rd.effectiveIsOffice && investorProfile?.parent_id) {
        const a = rd.advisorsMap.get(investorProfile.parent_id)
        if (a) adv = { id: a.id, name: a.name }
      }
      return {
        ...calc,
        investorEmail: investorProfile?.email,
        liquidity: formatLiquidity(investment.profitability_liquidity),
        commitmentPeriod: investment.commitment_period || 12,
        ...(rd.effectiveIsOffice ? { advisorId: adv.id, advisorName: adv.name || "N/A" } : {}),
        pixReceipts: recs.map((r: any) => ({ id: r.id, file_name: r.file_name, file_path: r.file_path, status: r.status, created_at: r.created_at })),
      }
    } catch (e) {
      console.error("Erro ao calcular comissão para export:", e)
      return null
    }
  }

  const exportToExcel = async () => {
    if (!rawData) {
      toast({ title: "Erro", description: "Nenhum dado para exportar.", variant: "destructive" })
      return
    }
    const term = searchTerm.toLowerCase()
    const advisorOk = (x: RawItem) =>
      advisorFilter === "all" || x.investorProfile?.parent_id === advisorFilter
    const searchOk = (x: RawItem) =>
      !term ||
      x.investorProfile?.full_name?.toLowerCase().includes(term) ||
      x.investorProfile?.email?.toLowerCase().includes(term) ||
      x.investment.id?.includes(term)
    const allItems = rawData.items.filter((x) => advisorOk(x) && searchOk(x))
    if (allItems.length === 0) {
      toast({ title: "Aviso", description: "Nenhuma comissão encontrada para exportar.", variant: "destructive" })
      return
    }

    setIsExporting(true)
    setExportProgress(0)
    try {

    const BATCH_SIZE = 15
    const sortedCommissions: CommissionDetail[] = []
    for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
      const batch = allItems.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(batch.map((x) => processOneForExport(rawData, x)))
      results.forEach((r) => { if (r) sortedCommissions.push(r) })
      setExportProgress(Math.round(((i + batch.length) / allItems.length) * 100))
    }

    const baseHeaders = [
      "Investidor",
      "Email",
      "Valor Investimento",
      "Data de Depósito",
      "Próximo Pagamento",
      "Minha Comissão",
      "Comissão Investidor",
    ]

    const workbook = XLSX.utils.book_new()

    if (userRole === "escritorio") {
      const sortedForOffice = [...sortedCommissions].sort((a, b) => {
        const aAdvisor = a.advisorName || "Sem Assessor"
        const bAdvisor = b.advisorName || "Sem Assessor"
        if (aAdvisor !== bAdvisor) return aAdvisor.localeCompare(bAdvisor)
        return a.investorName.localeCompare(b.investorName)
      })

      // Agrupar por assessor para resumo (usar valores do próximo pagamento, alinhado à tabela)
      const byAdvisor = new Map<string, { office: number; advisor: number; count: number; items: CommissionDetail[] }>()
      for (const c of sortedForOffice) {
        const advisorLabel = c.advisorName || "Sem Assessor"
        if (!byAdvisor.has(advisorLabel)) {
          byAdvisor.set(advisorLabel, { office: 0, advisor: 0, count: 0, items: [] })
        }
        const group = byAdvisor.get(advisorLabel)!
        const officeVal = getProrataInfo(c)?.prorataCommission ?? c.officeCommission ?? 0
        const advisorVal = getProrataInfo(c, true)?.prorataCommission ?? c.advisorCommission ?? 0
        group.office += officeVal
        group.advisor += advisorVal
        group.count += 1
        group.items.push(c)
      }

      // --- ABA GERAL (Resumo com percentuais) ---
      const geralData: any[][] = []
      geralData.push(["RESUMO DE COMISSÕES"])
      geralData.push(["Escritório e Assessores - Valores do próximo pagamento"])
      geralData.push([])

      const firstC = sortedForOffice[0]
      const officePct = ((firstC?.officeRate ?? 0.01) * 100).toFixed(1)
      const advisorPct = ((firstC?.advisorRate ?? 0.03) * 100).toFixed(1)
      const investorPct = firstC?.investorRate != null ? ((firstC.investorRate * 100).toFixed(2)) : "—"

      geralData.push(["Assessor", "Qtd", "Comissão Escritório", `% a.m. (${officePct}%)`, "Comissão Assessor", `% a.m. (${advisorPct}%)`, "Comissão Investidor", `% a.m. (${investorPct}%)`])
      let totalOffice = 0
      let totalAdvisor = 0
      let totalInvestor = 0
      for (const [advisorLabel, group] of byAdvisor.entries()) {
        const invSum = group.items.reduce((s, c) => s + (getNextInvestorRentabilityInfo(c)?.valor ?? 0), 0)
        totalOffice += group.office
        totalAdvisor += group.advisor
        totalInvestor += invSum
        geralData.push([advisorLabel, group.count, formatCurrency(group.office), `${officePct}%`, formatCurrency(group.advisor), `${advisorPct}%`, formatCurrency(invSum), `${investorPct}%`])
      }
      geralData.push([])
      geralData.push(["TOTAL", sortedForOffice.length, formatCurrency(totalOffice), "", formatCurrency(totalAdvisor), "", formatCurrency(totalInvestor), ""])

      const sheetGeral = XLSX.utils.aoa_to_sheet(geralData)
      setColWidths(sheetGeral, [28, 6, 16, 12, 16, 12, 16, 12])
      XLSX.utils.book_append_sheet(workbook, sheetGeral, "Geral")

      // --- ABA DETALHES (Tabela completa com % e datas de recebimento) ---
      const detalhesHeaders = [
        "Investidor", "Email", "Assessor",
        "Valor Investido", "Data Depósito", "Liquidez", "Prazo (meses)",
        "Comissão Escritório", "% Escritório", "Recebe em (Escritório)",
        "Comissão Assessor", "% Assessor", "Recebe em (Assessor)",
        "Comissão Investidor", "% Investidor", "Recebe em (Investidor)",
      ]
      const detalhesData: any[][] = [detalhesHeaders]
      for (const c of sortedForOffice) {
        const officeVal = getProrataInfo(c)?.prorataCommission ?? c.officeCommission ?? 0
        const advisorVal = getProrataInfo(c, true)?.prorataCommission ?? c.advisorCommission ?? 0
        const invInfo = getNextInvestorRentabilityInfo(c)
        const invVal = invInfo?.valor ?? 0
        const dateOffice = getNextPaymentDateForCommission(c)
        const dateInvestor = invInfo?.dataPagamento
        detalhesData.push([
          c.investorName,
          c.investorEmail || "",
          c.advisorName || "—",
          formatCurrency(c.amount),
          formatDate(c.paymentDate),
          c.liquidity || "Mensal",
          c.commitmentPeriod ?? 12,
          formatCurrency(officeVal),
          `${((c.officeRate ?? 0.01) * 100).toFixed(1)}%`,
          dateOffice ? formatDate(dateOffice) : "—",
          formatCurrency(advisorVal),
          `${((c.advisorRate ?? 0.03) * 100).toFixed(1)}%`,
          dateOffice ? formatDate(dateOffice) : "—",
          formatCurrency(invVal),
          c.investorRate ? `${(c.investorRate * 100).toFixed(2)}%` : "—",
          dateInvestor ? formatDate(dateInvestor) : "—",
        ])
      }
      const sheetDetalhes = XLSX.utils.aoa_to_sheet(detalhesData)
      setColWidths(sheetDetalhes, [22, 22, 18, 14, 12, 10, 10, 14, 10, 14, 14, 10, 14, 14, 10, 14])
      XLSX.utils.book_append_sheet(workbook, sheetDetalhes, "Detalhes")

      // --- ABA POR ASSESSOR (uma aba por assessor) ---
      const headersPorAssessor = [
        "Investidor", "Email", "Valor Investido", "Data Depósito", "Liquidez",
        "Comissão Escritório", "%", "Recebe em",
        "Comissão Assessor", "%", "Recebe em",
        "Comissão Investidor", "%", "Recebe em",
      ]
      for (const [advisorLabel, group] of byAdvisor.entries()) {
        const rows: any[][] = []
        rows.push([`Investimentos do assessor: ${advisorLabel}`])
        rows.push([])
        rows.push(headersPorAssessor)
        let sumOffice = 0
        let sumAdvisor = 0
        let sumInvestor = 0
        for (const c of group.items) {
          const officeVal = getProrataInfo(c)?.prorataCommission ?? c.officeCommission ?? 0
          const advisorVal = getProrataInfo(c, true)?.prorataCommission ?? c.advisorCommission ?? 0
          const invInfo = getNextInvestorRentabilityInfo(c)
          const invVal = invInfo?.valor ?? 0
          const dateOffAdv = getNextPaymentDateForCommission(c)
          const dateInv = invInfo?.dataPagamento
          sumOffice += officeVal
          sumAdvisor += advisorVal
          sumInvestor += invVal
          rows.push([
            c.investorName,
            c.investorEmail || "",
            formatCurrency(c.amount),
            formatDate(c.paymentDate),
            c.liquidity || "Mensal",
            formatCurrency(officeVal),
            `${((c.officeRate ?? 0.01) * 100).toFixed(1)}%`,
            dateOffAdv ? formatDate(dateOffAdv) : "—",
            formatCurrency(advisorVal),
            `${((c.advisorRate ?? 0.03) * 100).toFixed(1)}%`,
            dateOffAdv ? formatDate(dateOffAdv) : "—",
            formatCurrency(invVal),
            c.investorRate ? `${(c.investorRate * 100).toFixed(2)}%` : "—",
            dateInv ? formatDate(dateInv) : "—",
          ])
        }
        rows.push([])
        rows.push(["Total", "", "", "", "", formatCurrency(sumOffice), "", "", formatCurrency(sumAdvisor), "", "", formatCurrency(sumInvestor), "", ""])
        const sheetAdvisor = XLSX.utils.aoa_to_sheet(rows)
        setColWidths(sheetAdvisor, [22, 22, 14, 12, 10, 14, 6, 12, 14, 6, 12, 14, 6, 12])
        XLSX.utils.book_append_sheet(workbook, sheetAdvisor, sanitizeSheetName(advisorLabel))
      }
    } else {
      // Assessor: abas Detalhes e Resumo (com % e datas de recebimento)
      const sortedForAdvisor = [...sortedCommissions].sort((a, b) =>
        a.investorName.localeCompare(b.investorName)
      )

      // --- ABA DETALHES ---
      const headersAssessor = [
        "Investidor", "Email", "Valor Investido", "Data Depósito", "Liquidez", "Prazo (meses)",
        "Minha Comissão (Assessor)", "% a.m.", "Recebe em",
        "Comissão Investidor", "% a.m.", "Recebe em",
      ]
      const advisorData: any[][] = [headersAssessor]
      for (const c of sortedForAdvisor) {
        const minhaComissao = getProrataInfo(c)?.prorataCommission ?? c.advisorCommission ?? 0
        const invInfo = getNextInvestorRentabilityInfo(c)
        const invVal = invInfo?.valor ?? 0
        const dateAdv = getNextPaymentDateForCommission(c)
        const dateInv = invInfo?.dataPagamento
        advisorData.push([
          c.investorName,
          c.investorEmail || "",
          formatCurrency(c.amount),
          formatDate(c.paymentDate),
          c.liquidity || "Mensal",
          c.commitmentPeriod ?? 12,
          formatCurrency(minhaComissao),
          `${((c.advisorRate ?? 0.03) * 100).toFixed(1)}%`,
          dateAdv ? formatDate(dateAdv) : "—",
          formatCurrency(invVal),
          c.investorRate ? `${(c.investorRate * 100).toFixed(2)}%` : "—",
          dateInv ? formatDate(dateInv) : "—",
        ])
      }
      const sheetDetalhes = XLSX.utils.aoa_to_sheet(advisorData)
      setColWidths(sheetDetalhes, [22, 22, 14, 12, 10, 10, 18, 8, 12, 16, 8, 12])

      // --- ABA RESUMO (primeira aba) ---
      const totalAdv = sortedForAdvisor.reduce((s, c) => s + (getProrataInfo(c)?.prorataCommission ?? c.advisorCommission ?? 0), 0)
      const totalInv = sortedForAdvisor.reduce((s, c) => s + (getNextInvestorRentabilityInfo(c)?.valor ?? 0), 0)
      const resumoData: any[][] = [
        ["RESUMO DE COMISSÕES - ASSESSOR"],
        [],
        ["Total Investidores", sortedForAdvisor.length],
        ["Total Minha Comissão (próximo pagamento)", formatCurrency(totalAdv)],
        ["% a.m. Assessor", `${((sortedForAdvisor[0]?.advisorRate ?? 0.03) * 100).toFixed(1)}%`],
        ["Total Comissão Investidor (próximo pagamento)", formatCurrency(totalInv)],
        ["% a.m. Investidor", sortedForAdvisor[0]?.investorRate ? `${(sortedForAdvisor[0].investorRate * 100).toFixed(2)}%` : "—"],
      ]
      const sheetResumo = XLSX.utils.aoa_to_sheet(resumoData)
      setColWidths(sheetResumo, [35, 25])
      XLSX.utils.book_append_sheet(workbook, sheetResumo, "Resumo")
      XLSX.utils.book_append_sheet(workbook, sheetDetalhes, "Detalhes")
    }

    const fileNamePrefix = userRole === "escritorio" ? "comissoes_escritorio" : "comissoes_assessor"
    const fileName = `${fileNamePrefix}_${new Date().toISOString().split("T")[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)
    setExportProgress(100)
    toast({ title: "Exportação concluída", description: `${sortedCommissions.length} comissões exportadas.` })
  } catch (err) {
    console.error("Erro ao exportar:", err)
    toast({ title: "Erro ao exportar", description: "Não foi possível gerar o arquivo.", variant: "destructive" })
  } finally {
    setIsExporting(false)
    setExportProgress(0)
  }
  }

  if (loading) {
    return (
      <Card className="bg-[#01223F] border-[#003562]">
        <CardContent className="p-6">
          <p className="text-center text-gray-400">Carregando comissões...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="bg-[#01223F] border-[#003562] shadow-lg">
        <CardHeader className="border-b border-[#003562]">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[#00BC6E] text-2xl">Minhas Comissões Detalhadas</CardTitle>
              <CardDescription className="text-gray-400 mt-1">
                Visualize todas as suas comissões por investimento, com detalhes completos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => void exportToExcel()} 
                variant="outline"
                disabled={isExporting}
                className="bg-[#003562] border-[#003562] text-white hover:bg-[#00BC6E] hover:border-[#00BC6E] hover:text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exportando..." : "Exportar Excel"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="bg-[#01223F]">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por investidor, email ou ID do investimento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 bg-[#003562] border-[#003562] text-white placeholder:text-gray-500 focus:border-[#00BC6E]"
                />
              </div>
            </div>
            {userRole === "escritorio" && rawData && rawData.advisorsMap.size > 0 && (
              <div className="w-full md:w-56 shrink-0">
                <Select value={advisorFilter} onValueChange={setAdvisorFilter}>
                  <SelectTrigger className="bg-[#003562] border-[#003562] text-white">
                    <SelectValue placeholder="Filtrar por assessor" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#01223F] border-[#003562] text-white">
                    <SelectItem value="all" className="text-white focus:bg-[#003562] focus:text-white data-[highlighted]:bg-[#003562] data-[highlighted]:text-white">
                      Todos os assessores
                    </SelectItem>
                    {Array.from(rawData.advisorsMap.values())
                      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                      .map((adv) => (
                        <SelectItem
                          key={adv.id}
                          value={adv.id}
                          className="text-white focus:bg-[#003562] focus:text-white data-[highlighted]:bg-[#003562] data-[highlighted]:text-white"
                        >
                          {adv.name || "Assessor"}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Toggle entre tabela e gráfico */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={chartView === "table" ? "default" : "outline"}
              onClick={() => setChartView("table")}
              size="sm"
              className={chartView === "table" 
                ? "bg-[#00BC6E] text-white hover:bg-[#00BC6E]/90" 
                : "bg-[#003562] border-[#003562] text-white hover:bg-[#003562]/80"
              }
            >
              <Calendar className="mr-2 h-4 w-4" />
              Tabela
            </Button>
            <Button
              variant={chartView === "chart" ? "default" : "outline"}
              onClick={() => setChartView("chart")}
              size="sm"
              className={chartView === "chart" 
                ? "bg-[#00BC6E] text-white hover:bg-[#00BC6E]/90" 
                : "bg-[#003562] border-[#003562] text-white hover:bg-[#003562]/80"
              }
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Previsão de Recebimentos
            </Button>
          </div>

          {chartView === "chart" ? (
            <Card className="bg-[#003562] border-[#003562]">
              <CardHeader className="border-b border-[#01223F]">
                <CardTitle className="text-white">Previsão de Recebimentos</CardTitle>
                <CardDescription className="text-gray-400">
                  Consulte quando e quanto você receberá nos próximos meses baseado nos investimentos ativos de seus clientes
                </CardDescription>
              </CardHeader>
              <CardContent className="bg-[#003562]">
                <div className="space-y-6">
                  {/* Área destacada com próximo quinto dia útil */}
                  <Card 
                    className="bg-[#00BC6E]/20 border-[#00BC6E]/30 cursor-pointer hover:border-[#00BC6E]/50 transition-colors"
                    onClick={() => {
                      if (nextPaymentInfo.count > 0) {
                        // Encontrar o grupo correspondente na lista de próximos recebimentos,
                        // comparando pela mesma data formatada exibida no card
                        const nextGroup =
                          allNextPayments.find((p) => p.date === nextPaymentInfo.dateFormatted) ||
                          allNextPayments[0]

                        if (nextGroup) {
                          setSelectedPaymentDate({
                            date: nextGroup.dateFull,
                            commissions: nextGroup.commissions || [],
                          })
                          setPaymentDetailModalOpen(true)
                        }
                      }
                    }}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="h-6 w-6 text-[#00BC6E]" />
                            <h3 className="text-lg font-semibold text-white">A receber no próximo quinto dia útil</h3>
                          </div>
                          <p className="text-sm text-gray-400 mb-4">
                            Valor total das comissões que serão pagas no próximo quinto dia útil do mês
                          </p>
                          <div className="flex flex-wrap items-baseline gap-3">
                            <div>
                              <span className="text-sm text-gray-400 mr-2">Minha Comissão:</span>
                              <span className="text-2xl font-bold text-[#00BC6E]">
                                {formatCurrency(nextPaymentInfo.total)}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm text-gray-400 mr-2">Comissão Investidor:</span>
                              <span className="text-2xl font-bold text-blue-400">
                                {formatCurrency(nextPaymentInfo.totalInvestor ?? 0)}
                              </span>
                            </div>
                            <Badge className="bg-[#003562] text-white border-[#003562] text-sm">
                              {nextPaymentInfo.dateFormatted}
                            </Badge>
                          </div>
                          {nextPaymentInfo.count > 0 && (
                            <p className="text-xs text-gray-400 mt-2">
                              {nextPaymentInfo.count} {nextPaymentInfo.count === 1 ? "comissão" : "comissões"} será{nextPaymentInfo.count === 1 ? "" : "ão"} paga{nextPaymentInfo.count === 1 ? "" : "s"} nesta data
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lista de próximos recebimentos */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                      <Calendar className="h-5 w-5" />
                      Próximos Recebimentos
                    </h3>
                    {nextPayments.length === 0 ? (
                      <Card className="bg-[#01223F] border-[#003562]">
                        <CardContent className="pt-6">
                          <p className="text-center text-gray-400">
                            Nenhum recebimento previsto para os próximos 12 meses
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {nextPayments.map((payment, index) => (
                          <Card 
                            key={index} 
                            className="bg-[#01223F] border-[#003562] hover:border-[#00BC6E]/50 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedPaymentDate({
                                date: payment.dateFull,
                                commissions: payment.commissions || []
                              })
                              setPaymentDetailModalOpen(true)
                            }}
                          >
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-1">
                                    <p className="font-semibold text-base text-white">{payment.dateFull}</p>
                                    <Badge className="bg-[#003562] text-white border-[#003562] text-xs">
                                      Em {payment.daysUntil} {payment.daysUntil === 1 ? "dia" : "dias"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-400 capitalize">
                                    {payment.dateLong}
                                  </p>
                                  {payment.count > 1 && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      {payment.count} recebimentos nesta data
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-400">Minha Comissão</p>
                                  <p className="text-xl font-bold text-[#00BC6E]">
                                    {formatCurrency(payment.total)}
                                  </p>
                                  <p className="text-sm text-gray-400 mt-1">Comissão Investidor</p>
                                  <p className="text-lg font-bold text-blue-400">
                                    {formatCurrency(payment.totalInvestor ?? 0)}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border border-[#01223F]/50 bg-[#01223F] overflow-hidden shadow-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#003562] hover:bg-[#003562] border-b border-[#01223F]">
                  <TableHead className="font-semibold text-white">Investidor</TableHead>
                  {userRole === "escritorio" && <TableHead className="font-semibold text-white">Assessor</TableHead>}
                  <TableHead className="font-semibold text-white">Valor Investido</TableHead>
                  <TableHead className="font-semibold text-white">Minha Comissão</TableHead>
                  {userRole === "escritorio" && <TableHead className="font-semibold text-white">Comissão Assessor</TableHead>}
                  <TableHead className="font-semibold text-white">Comissão Investidor</TableHead>
                  <TableHead className="font-semibold text-white text-center">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageLoading ? (
                  <TableRow>
                    <TableCell colSpan={userRole === "escritorio" ? 7 : 5} className="text-center text-gray-400 py-8 bg-[#01223F]">
                      Carregando comissões...
                    </TableCell>
                  </TableRow>
                ) : paginatedCommissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={userRole === "escritorio" ? 7 : 5} className="text-center text-gray-400 py-8 bg-[#01223F]">
                      Nenhuma comissão encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedCommissions.map((commission) => {
                    return (
                      <TableRow key={commission.investmentId} className="hover:bg-[#003562]/50 transition-colors border-b border-[#01223F]/50 bg-[#01223F]">
                        <TableCell className="py-4">
                          <div>
                            <p className="font-medium text-white">{commission.investorName}</p>
                            <p className="text-xs text-gray-400">
                              {commission.investorEmail}
                            </p>
                          </div>
                        </TableCell>
                        {userRole === "escritorio" && (
                          <TableCell className="py-4">
                            <p className="text-sm text-white">
                              {commission.advisorName || "N/A"}
                            </p>
                          </TableCell>
                        )}
                        <TableCell className="py-4">
                          <div>
                            <p className="font-medium text-white">{formatCurrency(commission.amount)}</p>
                            <p className="text-xs text-gray-400">Depósito: {formatDate(commission.paymentDate)}</p>
                            <Badge className="mt-1 bg-blue-500/20 text-blue-300 border-blue-400/30 hover:bg-blue-500/30 text-xs">
                              {commission.liquidity || "N/A"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 font-semibold text-[#00BC6E]">
                          <div className="flex flex-col">
                            <span>
                              {(() => {
                                const info = getProrataInfo(commission)
                                const value = userRole === "escritorio"
                                  ? (info?.prorataCommission ?? commission.officeCommission ?? commission.advisorCommission)
                                  : (info?.prorataCommission ?? commission.advisorCommission)
                                return formatCurrency(value)
                              })()}
                            </span>
                            <Badge className="mt-1 w-fit bg-[#00BC6E]/20 text-[#00BC6E] border-[#00BC6E]/30 text-xs font-normal">
                              {userRole === "escritorio"
                                ? `${((commission.officeRate ?? 0.01) * 100).toFixed(0)}% a.m.`
                                : `${((commission.advisorRate ?? 0.03) * 100).toFixed(0)}% a.m.`}
                            </Badge>
                            {(() => {
                              const nextDate = getNextPaymentDateForCommission(commission)
                              if (nextDate) {
                                return (
                                  <span className="text-xs text-gray-400 font-normal mt-1">
                                    Recebe em {formatDate(nextDate)}
                                  </span>
                                )
                              }
                              if (commission.monthlyBreakdown && commission.monthlyBreakdown.length > 1) {
                                return (
                                  <span className="text-xs text-gray-400 font-normal mt-1">
                                    Recorrência de {commission.monthlyBreakdown.length} meses
                                  </span>
                                )
                              }
                              return null
                            })()}
                          </div>
                        </TableCell>
                        {userRole === "escritorio" && (
                          <TableCell className="py-4 font-semibold text-amber-400">
                            <div className="flex flex-col">
                              <span>{formatCurrency(getProrataInfo(commission, true)?.prorataCommission ?? commission.advisorCommission ?? 0)}</span>
                              <Badge className="mt-1 w-fit bg-amber-500/20 text-amber-400 border-amber-400/30 text-xs font-normal">
                                {((commission.advisorRate ?? 0.03) * 100).toFixed(0)}% a.m.
                              </Badge>
                              {(() => {
                                const nextDate = getNextPaymentDateForCommission(commission)
                                return nextDate ? (
                                  <span className="text-xs text-gray-400 font-normal mt-1">
                                    Recebe em {formatDate(nextDate)}
                                  </span>
                                ) : null
                              })()}
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="py-4 font-semibold text-blue-400">
                          {(() => {
                            const { valor, dataPagamento } = getNextInvestorRentabilityInfo(commission)
                            return (
                              <div className="flex flex-col">
                                <span>{formatCurrency(valor)}</span>
                                <Badge className="mt-1 w-fit bg-blue-500/20 text-blue-400 border-blue-400/30 text-xs font-normal">
                                  {((commission.investorRate ?? 0) * 100).toFixed(2)}% a.m.
                                </Badge>
                                {dataPagamento && (
                                  <span className="text-xs text-gray-400 font-normal mt-1">
                                    Recebe em {formatDate(dataPagamento)}
                                  </span>
                                )}
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-[#00BC6E]/20 hover:text-[#00BC6E] text-white"
                            onClick={() => {
                              setSelectedCommission(commission)
                              setDetailModalOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
            {/* Paginação */}
            {filteredRawCount > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#01223F]/50 bg-[#01223F]">
                <p className="text-sm text-gray-400">
                  {(clampedPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(clampedPage * ITEMS_PER_PAGE, filteredRawCount)} de {filteredRawCount} comissões
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={clampedPage <= 1}
                    className="bg-[#003562] border-[#003562] text-white hover:bg-[#00BC6E] hover:border-[#00BC6E] disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-white">
                    Página {clampedPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={clampedPage >= totalPages}
                    className="bg-[#003562] border-[#003562] text-white hover:bg-[#00BC6E] hover:border-[#00BC6E] disabled:opacity-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isExporting} onOpenChange={() => {}}>
        <DialogContent className="bg-[#01223F] border-[#003562] text-white max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-white">Exportando para Excel</DialogTitle>
            <DialogDescription className="text-gray-400">
              Processando todas as comissões. Isso pode levar alguns instantes...
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Progress value={exportProgress} className="h-3 bg-[#003562] [&_[data-slot=progress-indicator]]:bg-[#00BC6E]" />
            <p className="text-sm text-gray-400 mt-2 text-center">{exportProgress}%</p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="!max-w-[1400px] sm:!max-w-[1400px] !w-[95vw] max-h-[90vh] overflow-y-auto bg-[#01223F] border-[#003562] text-white">
          <DialogHeader className="border-b border-[#003562] pb-4">
            <DialogTitle className="text-2xl font-bold text-white">Detalhes da Comissão</DialogTitle>
            <DialogDescription className="text-gray-400">
              Informações completas do investimento e comissão
            </DialogDescription>
          </DialogHeader>
          {selectedCommission && (
            <div className="space-y-6 pt-4">
              {/* Info do investimento */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-400">Investidor</p>
                  <p className="font-semibold text-white">{selectedCommission.investorName}</p>
                  <p className="text-xs text-gray-400">{selectedCommission.investorEmail}</p>
                </div>
                {userRole === "escritorio" && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-400">Assessor</p>
                    <p className="font-semibold text-white">{selectedCommission.advisorName || "N/A"}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-400">Valor / Depósito</p>
                  <p className="font-semibold text-white">{formatCurrency(selectedCommission.amount)}</p>
                  <p className="text-xs text-gray-400">{formatDate(selectedCommission.paymentDate)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-400">Liquidez / Próximo pag.</p>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">{selectedCommission.liquidity || "N/A"}</Badge>
                  <p className="text-xs text-gray-400">
                    {(() => { const d = getNextPaymentDateForCommission(selectedCommission); return d ? formatDate(d) : "N/A"; })()}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-400">Duração</p>
                  <p className="font-semibold text-white">
                    {(selectedCommission as CommissionDetail).commitmentPeriod || 12} meses
                  </p>
                </div>
              </div>

              {/* Colunas: Escritório | (Assessor quando escritório) | Investidor */}
              <div className={`grid grid-cols-1 gap-6 ${userRole === "escritorio" && selectedCommission.advisorName ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
                {/* Coluna 1: Comissão do Escritório (ou Minha Comissão quando assessor) */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg text-[#00BC6E]">
                    {userRole === "escritorio" ? "Comissão do Escritório" : "Minha Comissão"}
                  </h4>
                  <div className="p-5 bg-gradient-to-br from-[#00BC6E]/20 to-[#00BC6E]/10 rounded-lg border-2 border-[#00BC6E]/30">
                    <p className="text-sm text-gray-400 mb-1">
                      Taxa {((userRole === "escritorio" ? selectedCommission.officeRate : selectedCommission.advisorRate) ?? 0.01) * 100}%
                    </p>
                    <p className="text-2xl font-bold text-[#00BC6E]">
                      {formatCurrency(getProrataInfo(selectedCommission)?.prorataCommission ?? (userRole === "escritorio" ? selectedCommission.officeCommission : selectedCommission.advisorCommission))}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {(() => {
                        const nextMonth = selectedCommission.monthlyBreakdown?.[0]
                        return nextMonth ? `${nextMonth.month}/${nextMonth.year}` : "próximo período"
                      })()}
                    </p>
                  </div>
                  {(() => {
                    const info = getProrataInfo(selectedCommission)
                    if (!info) return null
                    return (
                      <div className="p-3 bg-[#003562]/30 rounded-lg border border-[#003562] text-sm text-gray-400">
                        <p>Pró-rata: {info.days} dias ({info.startLabel} → {info.endLabel})</p>
                      </div>
                    )
                  })()}
                  {selectedCommission.monthlyBreakdown && selectedCommission.monthlyBreakdown.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-400 mb-2">Por data de pagamento</p>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto">
                        {selectedCommission.monthlyBreakdown
                          .map((month, idx) => ({ month, idx }))
                          .filter(({ idx }) => isPaymentDateFutureOrToday(selectedCommission.paymentDueDate?.[idx]))
                          .map(({ month, idx }) => {
                          const dataPagamento = selectedCommission.paymentDueDate?.[idx]
                          const isFirst = idx === 0
                          const info = isFirst ? getProrataInfo(selectedCommission) : null
                          const cp = (selectedCommission as CommissionDetail).commitmentPeriod || 12
                          const firstCutoff = selectedCommission.cutoffPeriod?.cutoffDate
                            ? new Date(selectedCommission.cutoffPeriod.cutoffDate)
                            : selectedCommission.commissionPeriod?.endDate
                              ? new Date(selectedCommission.commissionPeriod.endDate as Date)
                              : null
                          const payDate = selectedCommission.paymentDate ? new Date(selectedCommission.paymentDate) : null
                          const isLast = idx === selectedCommission.monthlyBreakdown.length - 1
                          const isProRataFinal = isLast && selectedCommission.monthlyBreakdown.length > cp
                          let subtitulo = "Ciclo cheio"
                          if (isFirst && info) subtitulo = `Pró-rata de ${info.startLabel} → ${info.endLabel}`
                          else if (isProRataFinal && firstCutoff && payDate) {
                            const lastCutoffFull = new Date(firstCutoff)
                            lastCutoffFull.setUTCMonth(lastCutoffFull.getUTCMonth() + cp - 1)
                            const lastPeriodStart = new Date(Date.UTC(lastCutoffFull.getUTCFullYear(), lastCutoffFull.getUTCMonth(), lastCutoffFull.getUTCDate() + 1, 0, 0, 0, 0))
                            const fimCompromisso = new Date(payDate)
                            fimCompromisso.setUTCMonth(fimCompromisso.getUTCMonth() + cp)
                            fimCompromisso.setUTCDate(fimCompromisso.getUTCDate() - 1)
                            subtitulo = `Pró-rata final (${formatDate(lastPeriodStart)} → ${formatDate(fimCompromisso)})`
                          } else if (isLast && !isProRataFinal && firstCutoff && cp > 1) {
                            const cutoffAnt = new Date(firstCutoff)
                            cutoffAnt.setUTCMonth(cutoffAnt.getUTCMonth() + cp - 2)
                            const startCiclo = new Date(Date.UTC(cutoffAnt.getUTCFullYear(), cutoffAnt.getUTCMonth(), cutoffAnt.getUTCDate() + 1, 0, 0, 0, 0))
                            const cutoffFim = new Date(firstCutoff)
                            cutoffFim.setUTCMonth(cutoffFim.getUTCMonth() + cp - 1)
                            subtitulo = `Ciclo ${formatDate(startCiclo)} → ${formatDate(cutoffFim)}`
                          }
                          const valorEscritorio = userRole === "escritorio" ? (month.officeCommission ?? month.advisorCommission) : month.advisorCommission
                          return (
                            <div key={idx} className="flex justify-between items-start p-3 bg-[#003562]/30 rounded border border-[#003562]">
                              <div className="flex flex-col">
                                <span className="text-white font-medium">
                                  {dataPagamento ? formatDate(dataPagamento) : `${month.month}/${month.year}`}
                                </span>
                                <span className="text-xs text-gray-500 mt-0.5">{subtitulo}</span>
                              </div>
                              <span className="font-semibold text-[#00BC6E]">{formatCurrency(valorEscritorio)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Coluna 2: Comissão do Assessor (apenas quando escritório e tem assessor) */}
                {userRole === "escritorio" && selectedCommission.advisorName && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg text-amber-400">
                      Comissão do Assessor
                    </h4>
                    <div className="p-5 bg-gradient-to-br from-amber-500/20 to-amber-500/10 rounded-lg border-2 border-amber-400/30">
                      <p className="text-sm text-gray-400 mb-1">
                        Taxa {((selectedCommission.advisorRate ?? 0.03) * 100).toFixed(0)}%
                      </p>
                      <p className="text-2xl font-bold text-amber-400">
                        {formatCurrency(getProrataInfo(selectedCommission, true)?.prorataCommission ?? selectedCommission.advisorCommission ?? 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {(() => {
                          const nextMonth = selectedCommission.monthlyBreakdown?.[0]
                          return nextMonth ? `${nextMonth.month}/${nextMonth.year}` : "próximo período"
                        })()}
                      </p>
                    </div>
                    {(() => {
                      const info = getProrataInfo(selectedCommission, true)
                      if (!info) return null
                      return (
                        <div className="p-3 bg-[#003562]/30 rounded-lg border border-[#003562] text-sm text-gray-400">
                          <p>Pró-rata: {info.days} dias ({info.startLabel} → {info.endLabel})</p>
                        </div>
                      )
                    })()}
                    {selectedCommission.monthlyBreakdown && selectedCommission.monthlyBreakdown.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-400 mb-2">Por data de pagamento</p>
                        <div className="space-y-2 max-h-[280px] overflow-y-auto">
                          {selectedCommission.monthlyBreakdown
                            .map((month, idx) => ({ month, idx }))
                            .filter(({ idx }) => isPaymentDateFutureOrToday(selectedCommission.paymentDueDate?.[idx]))
                            .map(({ month, idx }) => {
                            const dataPagamento = selectedCommission.paymentDueDate?.[idx]
                            const isFirst = idx === 0
                            const info = isFirst ? getProrataInfo(selectedCommission, true) : null
                            const cp = (selectedCommission as CommissionDetail).commitmentPeriod || 12
                            const firstCutoff = selectedCommission.cutoffPeriod?.cutoffDate
                              ? new Date(selectedCommission.cutoffPeriod.cutoffDate)
                              : selectedCommission.commissionPeriod?.endDate
                                ? new Date(selectedCommission.commissionPeriod.endDate as Date)
                                : null
                            const payDate = selectedCommission.paymentDate ? new Date(selectedCommission.paymentDate) : null
                            const isLast = idx === selectedCommission.monthlyBreakdown.length - 1
                            const isProRataFinal = isLast && selectedCommission.monthlyBreakdown.length > cp
                            let subtitulo = "Ciclo cheio"
                            if (isFirst && info) subtitulo = `Pró-rata de ${info.startLabel} → ${info.endLabel}`
                            else if (isProRataFinal && firstCutoff && payDate) {
                              const lastCutoffFull = new Date(firstCutoff)
                              lastCutoffFull.setUTCMonth(lastCutoffFull.getUTCMonth() + cp - 1)
                              const lastPeriodStart = new Date(Date.UTC(lastCutoffFull.getUTCFullYear(), lastCutoffFull.getUTCMonth(), lastCutoffFull.getUTCDate() + 1, 0, 0, 0, 0))
                              const fimCompromisso = new Date(payDate)
                              fimCompromisso.setUTCMonth(fimCompromisso.getUTCMonth() + cp)
                              fimCompromisso.setUTCDate(fimCompromisso.getUTCDate() - 1)
                              subtitulo = `Pró-rata final (${formatDate(lastPeriodStart)} → ${formatDate(fimCompromisso)})`
                            } else if (isLast && !isProRataFinal && firstCutoff && cp > 1) {
                              const cutoffAnt = new Date(firstCutoff)
                              cutoffAnt.setUTCMonth(cutoffAnt.getUTCMonth() + cp - 2)
                              const startCiclo = new Date(Date.UTC(cutoffAnt.getUTCFullYear(), cutoffAnt.getUTCMonth(), cutoffAnt.getUTCDate() + 1, 0, 0, 0, 0))
                              const cutoffFim = new Date(firstCutoff)
                              cutoffFim.setUTCMonth(cutoffFim.getUTCMonth() + cp - 1)
                              subtitulo = `Ciclo ${formatDate(startCiclo)} → ${formatDate(cutoffFim)}`
                            }
                            const valorAssessor = month.advisorCommission ?? 0
                            return (
                              <div key={idx} className="flex justify-between items-start p-3 bg-[#003562]/30 rounded border border-[#003562]">
                                <div className="flex flex-col">
                                  <span className="text-white font-medium">
                                    {dataPagamento ? formatDate(dataPagamento) : `${month.month}/${month.year}`}
                                  </span>
                                  <span className="text-xs text-gray-500 mt-0.5">{subtitulo}</span>
                                </div>
                                <span className="font-semibold text-amber-400">{formatCurrency(valorAssessor)}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Coluna direita: Comissão Investidor */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg text-blue-400">Comissão Investidor</h4>
                  {(() => {
                    const rate = selectedCommission.investorRate ?? 0.02
                    const amount = selectedCommission.amount
                    const cp = (selectedCommission as CommissionDetail).commitmentPeriod || 12
                    const b = (selectedCommission as CommissionDetail).investorRentabilityBreakdown
                    const liq = (selectedCommission.liquidity || "mensal").toLowerCase()
                    const cycleMonths = getLiquidityCycleMonths(
                      (liq === "semestral" || liq === "anual" || liq === "bienal" || liq === "trienal" ? liq : "mensal") as "mensal" | "semestral" | "anual" | "bienal" | "trienal"
                    )
                    const usaComposto = cycleMonths > 1
                    const meses: { mes: number; valor: number; obs?: string }[] = []
                    const mensalSimples = amount * rate
                    const payoutStartDays = b?.payoutStartDays ?? 60
                    if (usaComposto) {
                      // Para liquidez não-mensal: cada ciclo começa com capital original (retirou, volta à estaca inicial)
                      // IMPORTANTE: O capital rende desde o dia 1. D+60 só afeta quando RECEBE, não quando RENDE.
                      const numCiclos = Math.ceil(cp / cycleMonths)
                      for (let ciclo = 0; ciclo < numCiclos; ciclo++) {
                        const inicioMes = ciclo * cycleMonths + 1
                        const fimMes = Math.min((ciclo + 1) * cycleMonths, cp)
                        let saldo = amount // Capital original a cada ciclo
                        for (let i = inicioMes; i <= fimMes; i++) {
                          const valor = saldo * rate
                          saldo += valor
                          meses.push({ mes: i, valor })
                        }
                      }
                    } else {
                      for (let i = 1; i <= cp; i++) {
                        meses.push({ mes: i, valor: mensalSimples })
                      }
                    }
                    const total = meses.reduce((s, m) => s + m.valor, 0)
                    const isMensal = cycleMonths === 1

                    // Para mensal: pró-rata = depósito → dia 20 do período que fechou D+60 (1º corte elegível)
                    if (isMensal) {
                      const payDate = new Date(selectedCommission.paymentDate)
                      const firstCutoff = selectedCommission.cutoffPeriod?.cutoffDate
                        ? new Date(selectedCommission.cutoffPeriod.cutoffDate)
                        : selectedCommission.commissionPeriod?.endDate
                          ? new Date(selectedCommission.commissionPeriod.endDate as Date)
                          : null
                      const payoutStartDays = b?.payoutStartDays ?? 60
                      // 1º corte elegível = dia 20 do período em que D+60 foi fechado (ex: dep 06/01, D+60 em 07/03 → corte 20/03)
                      const firstEligible = firstCutoff
                        ? getFirstEligibleCutoff(payDate, firstCutoff, payoutStartDays, cp)
                        : null
                      const startDate = payDate
                      const endDate = firstEligible ?? firstCutoff
                      const paymentDateNextDay = new Date(Date.UTC(
                        payDate.getUTCFullYear(),
                        payDate.getUTCMonth(),
                        payDate.getUTCDate() + 1,
                        0, 0, 0, 0
                      ))
                      const cutoffUTC = endDate
                        ? new Date(Date.UTC(
                            endDate.getUTCFullYear(),
                            endDate.getUTCMonth(),
                            endDate.getUTCDate(),
                            0, 0, 0, 0
                          ))
                        : null
                      const dias = endDate && cutoffUTC && cutoffUTC >= paymentDateNextDay
                        ? Math.max(0, Math.floor((cutoffUTC.getTime() - paymentDateNextDay.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                        : 0
                      const valorAcumD60 = (b as { valorAcumuladoD60?: number })?.valorAcumuladoD60 ?? 0
                      const valorProRataPrimeiro = b?.valorProRataPrimeiro ?? 0
                      const valorProRata = valorAcumD60 + valorProRataPrimeiro
                      const firstWithValue = selectedCommission.monthlyBreakdown?.find((m) => (m.investorCommission ?? 0) > 0)
                      // Total = Acumulado D+60 + Pró-rata (consistente com o breakdown exibido)
                      const primeiroValor = valorAcumD60 + valorProRata || firstWithValue?.investorCommission ?? 0
                      return (
                        <>
                          <div className="p-5 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-lg border-2 border-blue-400/30">
                            <p className="text-sm text-gray-400 mb-1">
                              Taxa {(rate * 100).toFixed(2)}% · Juros simples
                            </p>
                            <p className="text-2xl font-bold text-blue-400">{formatCurrency(primeiroValor)}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {(() => {
                                const nextMonth = firstWithValue ?? selectedCommission.monthlyBreakdown?.[0]
                                return nextMonth ? `${nextMonth.month}/${nextMonth.year}` : "próximo período"
                              })()}
                            </p>
                          </div>
                          {dias > 0 && endDate && (
                            <div className="p-3 bg-[#003562]/30 rounded-lg border border-[#003562] text-sm text-gray-400 space-y-1">
                              <p>
                                Pró-rata: {dias} dias ({formatDate(startDate)} → {formatDate(endDate)}): {formatCurrency(valorProRata)}
                              </p>
                            </div>
                          )}
                          {selectedCommission.monthlyBreakdown && selectedCommission.monthlyBreakdown.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-400 mb-2">Por data de pagamento</p>
                              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                                {selectedCommission.monthlyBreakdown
                                  .map((month, idx) => ({ month, idx }))
                                  .filter(({ idx }) => isPaymentDateFutureOrToday(selectedCommission.paymentDueDate?.[idx]))
                                  .map(({ month, idx }) => {
                                  const firstWithValueIdx = selectedCommission.monthlyBreakdown.findIndex((m) => (m.investorCommission ?? 0) > 0)
                                  const isFirstWithValue = firstWithValueIdx >= 0 && idx === firstWithValueIdx
                                  const valorExibir = isFirstWithValue ? primeiroValor : (month.investorCommission ?? 0)
                                  const dataPagamento = selectedCommission.paymentDueDate?.[idx]
                                  const isLast = idx === selectedCommission.monthlyBreakdown.length - 1
                                  const isProRataFinal = isLast && selectedCommission.monthlyBreakdown.length > cp
                                  const hasValor = (valorExibir ?? 0) > 0
                                  let subtitulo = "Ciclo cheio"
                                  if (isFirstWithValue && hasValor && startDate && endDate) {
                                    subtitulo = `Pró-rata de ${formatDate(startDate)} → ${formatDate(endDate)}`
                                  } else if (isProRataFinal && hasValor && firstCutoff) {
                                    const lastCutoffFull = new Date(firstCutoff)
                                    lastCutoffFull.setUTCMonth(lastCutoffFull.getUTCMonth() + cp - 1)
                                    const lastPeriodStart = new Date(Date.UTC(lastCutoffFull.getUTCFullYear(), lastCutoffFull.getUTCMonth(), lastCutoffFull.getUTCDate() + 1, 0, 0, 0, 0))
                                    const fimCompromisso = new Date(payDate)
                                    fimCompromisso.setUTCMonth(fimCompromisso.getUTCMonth() + cp)
                                    fimCompromisso.setUTCDate(fimCompromisso.getUTCDate() - 1)
                                    subtitulo = `Pró-rata final (${formatDate(lastPeriodStart)} → ${formatDate(fimCompromisso)})`
                                  } else if (isLast && hasValor && !isProRataFinal && firstCutoff) {
                                    const cutoffAnt = new Date(firstCutoff)
                                    cutoffAnt.setUTCMonth(cutoffAnt.getUTCMonth() + cp - 2)
                                    const startCiclo = new Date(Date.UTC(cutoffAnt.getUTCFullYear(), cutoffAnt.getUTCMonth(), cutoffAnt.getUTCDate() + 1, 0, 0, 0, 0))
                                    const cutoffFim = new Date(firstCutoff)
                                    cutoffFim.setUTCMonth(cutoffFim.getUTCMonth() + cp - 1)
                                    subtitulo = `Ciclo ${formatDate(startCiclo)} → ${formatDate(cutoffFim)}`
                                  }
                                  return (
                                    <div key={idx} className="flex justify-between items-start p-3 bg-[#003562]/30 rounded border border-[#003562]">
                                      <div className="flex flex-col">
                                        <span className="text-white font-medium">
                                          {dataPagamento ? formatDate(dataPagamento) : `${month.month}/${month.year}`}
                                        </span>
                                        <span className="text-xs text-gray-500 mt-0.5">{subtitulo}</span>
                                      </div>
                                      <span className="font-semibold text-blue-400">{formatCurrency(valorExibir)}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )
                    }

                    // Para liquidez não-mensal: agrupar por ciclo (semestre, ano, etc.) com accordion
                    // Também mostrar "Por data de pagamento" filtrando só meses com valor e datas futuras
                    const investorPaymentEntries = (selectedCommission.monthlyBreakdown || [])
                      .map((m, idx) => ({ month: m, idx }))
                      .filter(({ month, idx }) => (month.investorCommission ?? 0) > 0 && isPaymentDateFutureOrToday(selectedCommission.paymentDueDate?.[idx]))
                      .map(({ month }) => month)
                    const ciclos: { ciclo: number; valor: number; obs?: string; meses: typeof meses; dataPagamento?: string }[] = []
                    if (cycleMonths > 1) {
                      const numCiclos = Math.ceil(cp / cycleMonths)
                      const monthlyBreakdown = selectedCommission.monthlyBreakdown || []
                      // Para liquidez anual/semestral/etc: D+60 não impacta — são só os 2 primeiros meses de carência, o investidor recebe após 1 ano mesmo
                      // Todos os ciclos têm a mesma estrutura: 12 meses de 30 dias, juros compostos
                      for (let ciclo = 1; ciclo <= numCiclos; ciclo++) {
                        const inicioMes = (ciclo - 1) * cycleMonths + 1
                        const fimMes = Math.min(ciclo * cycleMonths, cp)
                        let acumulado = 0
                        let obs: string | undefined
                        const mesesDoCiclo: { mes: number; valor: number; obs?: string }[] = []
                        for (let mes = inicioMes; mes <= fimMes; mes++) {
                          const mesData = meses.find(m => m.mes === mes)
                          if (mesData) {
                            acumulado += mesData.valor
                            mesesDoCiclo.push({ ...mesData, obs: "30 dias" })
                            if (mesData.obs && mes === fimMes) obs = mesData.obs
                          }
                        }
                        // Data de pagamento: índice = fim do ciclo (ex: ciclo 1 termina mês 6, pagamento mês 7 = índice 6)
                        // monthlyBreakdown[i] = pagamento do mês (i+1) - ex: i=5 = 6º mês = Julho
                        const breakdownIndex = ciclo * cycleMonths - 1 // ciclo 1: index 5 (Julho), ciclo 2: index 11 (Jan)
                        const entry = monthlyBreakdown[breakdownIndex]
                        const dataPagamento = entry
                          ? `${entry.month}/${entry.year}`
                          : undefined
                        const paymentDate = selectedCommission.paymentDueDate?.[breakdownIndex]
                        if (paymentDate && !isPaymentDateFutureOrToday(paymentDate)) continue
                        // Liquidez anual: ignorar payout start days na exibição — 12 meses de 30 dias, total = soma dos meses
                        ciclos.push({ ciclo, valor: acumulado, obs, meses: mesesDoCiclo, dataPagamento })
                      }
                    }

                    const cicloLabel = cycleMonths === 6 ? "Semestre" : cycleMonths === 12 ? "Ano" : cycleMonths === 24 ? "Biênio" : cycleMonths === 36 ? "Triênio" : "Ciclo"

                    const proximaComissao = ciclos.length > 0 ? ciclos[0] : null

                    return (
                      <>
                        <div className="p-5 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-lg border-2 border-blue-400/30">
                          <p className="text-sm text-gray-400 mb-1">
                            Taxa {(rate * 100).toFixed(2)}% · {usaComposto ? "Juros compostos" : "Juros simples"}
                          </p>
                          <p className="text-2xl font-bold text-blue-400">{formatCurrency(proximaComissao?.valor ?? total)}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {proximaComissao
                              ? (proximaComissao.dataPagamento ? `Recebe em ${proximaComissao.dataPagamento}` : `Próximo ${cicloLabel.toLowerCase()}`)
                              : `acumulado · Recorrência ${cycleMonths} meses`}
                          </p>
                        </div>
                        {isMensal && b && (b.diasNoPrimeiroPeriodo > 0 || (b as { valorAcumuladoD60?: number }).valorAcumuladoD60) && (
                          <div className="p-3 bg-[#003562]/30 rounded-lg border border-[#003562] text-sm text-gray-400 space-y-1">
                            {b.diasNoPrimeiroPeriodo > 0 && (
                              <p>Pró-rata: {b.diasNoPrimeiroPeriodo} dias · {formatCurrency(b.valorProRataPrimeiro ?? 0)}</p>
                            )}
                            {(b as { valorAcumuladoD60?: number }).valorAcumuladoD60 != null && (b as { valorAcumuladoD60?: number }).valorAcumuladoD60 !== 0 && (
                              <p>Acumulado D+60: {formatCurrency((b as { valorAcumuladoD60?: number }).valorAcumuladoD60 ?? 0)}</p>
                            )}
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-400 mb-2">
                            Rendimento por {cicloLabel.toLowerCase()}
                          </p>
                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {ciclos.map((ciclo) => {
                              const isOpen = openCiclo === ciclo.ciclo
                              return (
                                <div key={ciclo.ciclo} className="bg-[#003562]/30 rounded border border-[#003562]">
                                  <button
                                    onClick={() => setOpenCiclo(isOpen ? null : ciclo.ciclo)}
                                    className="w-full flex items-center justify-between p-3 hover:bg-[#003562]/50 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-white font-semibold">
                                        {cicloLabel} {ciclo.ciclo}
                                      </span>
                                      {ciclo.dataPagamento && (
                                        <span className="text-xs text-gray-400 capitalize">
                                          Recebe em {ciclo.dataPagamento}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-blue-400">{formatCurrency(ciclo.valor)}</span>
                                      {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                    </div>
                                  </button>
                                  {isOpen && (
                                    <div className="border-t border-[#003562] p-3">
                                      <p className="text-xs text-gray-400 mb-2">Rendimento mensal:</p>
                                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                        {ciclo.meses.map((m) => (
                                          <div key={m.mes} className="p-2 bg-[#003562]/50 rounded border border-[#003562] text-center">
                                            <p className="text-xs text-gray-500">Mês {m.mes}{m.obs ? ` · ${m.obs}` : ""}</p>
                                            <p className="font-semibold text-blue-400 text-sm">{formatCurrency(m.valor)}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        {investorPaymentEntries.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-400 mb-2">
                              Por data de pagamento ({investorPaymentEntries.length} {investorPaymentEntries.length === 1 ? "data" : "datas"})
                            </p>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                              {investorPaymentEntries.map((month, idx) => (
                                <div key={idx} className="flex justify-between items-center p-3 bg-[#003562]/30 rounded border border-[#003562]">
                                  <span className="text-white capitalize">{month.month}/{month.year}</span>
                                  <span className="font-semibold text-blue-400">{formatCurrency(month.investorCommission ?? 0)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>

              {selectedCommission.pixReceipts && selectedCommission.pixReceipts.length > 0 && (
                <div className="border-t border-[#003562] pt-6">
                  <h4 className="font-semibold text-lg text-white mb-4">Comprovantes PIX</h4>
                  <div className="space-y-3">
                    {selectedCommission.pixReceipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="flex items-center justify-between p-4 bg-[#003562]/30 rounded-lg border border-[#003562] hover:border-[#00BC6E]/50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm text-white">{receipt.file_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-400">
                            {formatDate(receipt.created_at)}
                          </p>
                            <Badge 
                              className={receipt.status === "approved" 
                                ? "bg-[#00BC6E] text-white border-[#00BC6E]" 
                                : "bg-orange-500/20 text-orange-300 border-orange-400/30"
                              }
                            >
                            {receipt.status === "approved" ? "Aprovado" : "Pendente"}
                          </Badge>
                        </div>
                        </div>
                        {receipt.file_path && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-[#003562] hover:bg-[#00BC6E] hover:text-white hover:border-[#00BC6E] text-white border-gray-600"
                            onClick={async () => {
                              // Gerar URL assinada do Supabase Storage
                              const supabaseClient = createClient()
                              const { data: signedUrl } = await supabaseClient
                                .storage
                                .from("pix_receipts")
                                .createSignedUrl(receipt.file_path, 3600)
                              if (signedUrl) {
                                window.open(signedUrl.signedUrl, "_blank")
                              }
                            }}
                          >
                            Ver
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes dos Investimentos por Data de Pagamento */}
      <Dialog open={paymentDetailModalOpen} onOpenChange={setPaymentDetailModalOpen}>
        <DialogContent className="!max-w-[95vw] w-full max-h-[90vh] overflow-y-auto sm:!max-w-[95vw] bg-[#01223F] border-[#003562] text-white">
          <DialogHeader className="border-b border-[#003562]">
            <DialogTitle className="text-white">Investimentos - {selectedPaymentDate?.date}</DialogTitle>
            <DialogDescription className="text-gray-400">
              Detalhes dos investimentos que serão pagos nesta data
            </DialogDescription>
          </DialogHeader>
          {selectedPaymentDate && selectedPaymentDate.commissions.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-[#00BC6E]/20 rounded-lg p-4 border border-[#00BC6E]/30">
                <div className="flex flex-wrap gap-6 items-center justify-between">
                  <div>
                    <span className="font-semibold text-white">Total de Comissões: </span>
                    <span className="text-xl font-bold text-[#00BC6E]">
                      {formatCurrency(
                        selectedPaymentDate.commissions.reduce(
                          (sum, c) => sum + (c.monthlyCommissionForDate ?? (userRole === "escritorio" ? c.officeCommission : c.advisorCommission) ?? 0),
                          0
                        )
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-white">Total Comissão Investidor: </span>
                    <span className="text-xl font-bold text-blue-400">
                      {formatCurrency(
                        selectedPaymentDate.commissions.reduce((sum, c) => {
                          const idx = (c as any).paymentDateIndex ?? 0
                          return sum + (c.monthlyBreakdown?.[idx]?.investorCommission ?? 0)
                        }, 0)
                      )}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedPaymentDate.commissions.length} {selectedPaymentDate.commissions.length === 1 ? "investimento" : "investimentos"}
                </p>
              </div>

              <div className="rounded-md border border-[#003562] overflow-x-auto bg-[#01223F]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#003562]">
                    <TableHead className="w-[40px] text-center text-white">#</TableHead>
                    <TableHead className="min-w-[200px] text-white">Investidor</TableHead>
                      {userRole === "escritorio" && <TableHead className="min-w-[150px] text-white">Assessor</TableHead>}
                      <TableHead className="min-w-[120px] text-white">Valor Investido</TableHead>
                      <TableHead className="min-w-[120px] text-white">Data de Depósito</TableHead>
                      <TableHead className="min-w-[120px] text-white">Minha Comissão</TableHead>
                      <TableHead className="min-w-[140px] text-white">Comissão Investidor</TableHead>
                      <TableHead className="min-w-[80px] text-white">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPaymentDate.commissions.map((commission, index) => (
                      <TableRow key={commission.investmentId} className="bg-[#01223F] hover:bg-[#003562]/50 border-b border-[#003562]">
                        <TableCell className="text-center text-gray-400">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">{commission.investorName}</p>
                            <p className="text-xs text-gray-400">
                              {commission.investorEmail}
                            </p>
                          </div>
                        </TableCell>
                        {userRole === "escritorio" && (
                          <TableCell>
                            <p className="text-sm text-white">
                              {commission.advisorName || "N/A"}
                            </p>
                          </TableCell>
                        )}
                        <TableCell className="text-white">{formatCurrency(commission.amount)}</TableCell>
                        <TableCell className="text-white">{formatDate(commission.paymentDate)}</TableCell>
                        <TableCell className="font-semibold text-[#00BC6E]">
                          <div className="flex flex-col">
                            <span>{formatCurrency(commission.monthlyCommissionForDate ?? (userRole === "escritorio" ? commission.officeCommission : commission.advisorCommission) ?? 0)}</span>
                            {commission.monthlyBreakdown && commission.monthlyBreakdown.length > 1 && (
                              <span className="text-xs text-gray-400 font-normal mt-0.5">
                                Recorrência de {commission.monthlyBreakdown.length} meses
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-blue-400">
                          {(() => {
                            const idx = (commission as any).paymentDateIndex ?? 0
                            const valor = commission.monthlyBreakdown?.[idx]?.investorCommission ?? 0
                            const dataPag = commission.paymentDueDate?.[idx]
                            return (
                              <div className="flex flex-col">
                                <span>{formatCurrency(valor)}</span>
                                {dataPag && (
                                  <span className="text-xs text-gray-400 font-normal mt-0.5">
                                    Recebe em {formatDate(dataPag)}
                                  </span>
                                )}
                              </div>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-[#00BC6E]/20 hover:text-[#00BC6E] text-white"
                            onClick={() => {
                              setSelectedCommission(commission)
                              setDetailModalOpen(true)
                              setPaymentDetailModalOpen(false)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">
                Nenhum investimento encontrado para esta data
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

