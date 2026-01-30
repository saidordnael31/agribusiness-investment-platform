"use client"

import { useState, useEffect } from "react"
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
  type NewCommissionCalculation,
} from "@/lib/commission-calculator"
import { useToast } from "@/hooks/use-toast"
import { Download, Search, Eye, Calendar, DollarSign } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface CommissionDetail extends NewCommissionCalculation {
  investorEmail?: string
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

export function AdvisorCommissionsDetail() {
  const { toast } = useToast()
  const [commissions, setCommissions] = useState<CommissionDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCommission, setSelectedCommission] = useState<CommissionDetail | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [chartView, setChartView] = useState<"table" | "chart">("table")
  const [selectedPaymentDate, setSelectedPaymentDate] = useState<{ date: string; commissions: CommissionDetail[] } | null>(null)
  const [paymentDetailModalOpen, setPaymentDetailModalOpen] = useState(false)
  const [userRole, setUserRole] = useState<"assessor" | "escritorio" | null>(null)

  useEffect(() => {
    fetchCommissions()
  }, [])

  const fetchCommissions = async () => {
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
        // Buscar assessores do escritório com seus nomes
        // Primeiro, buscar o user_type_id de "advisor"
        const { data: advisorUserTypes, error: advisorUserTypeError } = await supabase
          .from("user_types")
          .select("id")
          .eq("user_type", "advisor")
          .limit(1)
        
        if (advisorUserTypeError) {
          console.error("Erro ao buscar user_type 'advisor':", advisorUserTypeError)
          toast({
            title: "Erro",
            description: `Erro ao buscar tipo de usuário: ${advisorUserTypeError.message}`,
            variant: "destructive",
          })
          return
        }
        
        if (!advisorUserTypes || advisorUserTypes.length === 0) {
          toast({
            title: "Erro",
            description: "Tipo de usuário 'advisor' não encontrado",
            variant: "destructive",
          })
          return
        }
        
        const advisorUserType = advisorUserTypes[0]
        
        const { data: advisors } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("office_id", user.id)
          .eq("user_type_id", advisorUserType.id)

        if (advisors) {
          advisors.forEach(advisor => {
            advisorsMap.set(advisor.id, { id: advisor.id, name: advisor.full_name || "Assessor" })
          })
        }

        const { data: investorsByOffice } = await supabase
          .from("profiles")
          .select("id, full_name, email, parent_id, user_type_id")
          .eq("office_id", user.id)
          .eq("user_type_id", investorUserType.id)

        if (investorsByOffice) {
          investorProfiles = investorsByOffice
        }

        // Também buscar investidores via assessores do escritório
        if (advisors && advisors.length > 0) {
          const advisorIds = advisors.map(a => a.id)
          const { data: investorsByAdvisors } = await supabase
            .from("profiles")
            .select("id, full_name, email, parent_id, user_type_id")
            .in("parent_id", advisorIds)
            .eq("user_type_id", investorUserType.id)

          if (investorsByAdvisors) {
            // Combinar e remover duplicatas
            const allInvestors = [...investorProfiles, ...investorsByAdvisors]
            investorProfiles = allInvestors.filter((profile, index, self) => 
              index === self.findIndex(p => p.id === profile.id)
            )
          }
        }
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
        setCommissions([])
        setLoading(false)
        return
      }

      const investorIds = investorProfiles.map((p) => p.id)

      // Validar acesso aos investidores antes de buscar investimentos
      const { validateUserAccess, validateAdminAccess } = await import("@/lib/client-permission-utils");
      const isAdmin = await validateAdminAccess(user.id);
      
      const validInvestorIds = [];
      for (const investorId of investorIds) {
        if (isAdmin || await validateUserAccess(user.id, investorId)) {
          validInvestorIds.push(investorId);
        }
      }
      
      if (validInvestorIds.length === 0) {
        setCommissions([]);
        setLoading(false);
        return;
      }

      // Buscar TODOS os investimentos ativos dos investidores deste assessor
      // IMPORTANTE: Não aplicar filtros de data aqui - buscar todos os ativos
      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select("id, user_id, amount, payment_date, created_at, status, commitment_period, profitability_liquidity")
        .in("user_id", validInvestorIds)
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
        setCommissions([])
        setLoading(false)
        return
      }

      // Buscar comprovantes PIX
      const investmentIds = investmentsToProcess.map((inv) => inv.id)
      const { data: receipts } = await supabase
        .from("pix_receipts")
        .select("id, transaction_id, file_name, file_path, status, created_at")
        .in("transaction_id", investmentIds)

      // Processar cada investimento
      const processedCommissions: CommissionDetail[] = []
      
      for (const investment of investmentsToProcess) {
        const investorProfile = investorProfiles.find((p) => p.id === investment.user_id)
        
        if (!investorProfile) {
          continue; // Pular investimento se não encontrar perfil
        }
        
        // Obter user_type_id do investidor (já deve estar no perfil)
        const investorUserTypeId = investorProfile.user_type_id || null

        // Determinar a data de pagamento (payment_date tem prioridade, senão usa created_at)
        const investmentPaymentDateRaw = investment.payment_date || investment.created_at
        
        if (!investmentPaymentDateRaw) {
          continue; // Pular investimento sem data
        }
        
        // IMPORTANTE: Converter data do banco para Date considerando UTC corretamente
        // Se for string ISO do banco, extrair apenas a parte da data (YYYY-MM-DD) para evitar problemas de fuso horário
        let investmentPaymentDate: string | Date;
        if (typeof investmentPaymentDateRaw === 'string') {
          // Se for string, extrair apenas a parte da data (sem hora) para evitar problemas de fuso horário
          const dateOnly = investmentPaymentDateRaw.split('T')[0]; // Extrai "2025-10-30" de "2025-10-30T00:00:00.000Z"
          investmentPaymentDate = dateOnly;
        } else {
          investmentPaymentDate = investmentPaymentDateRaw;
        }
        
        // Debug: verificar data do investimento
        // Criar Date usando UTC para evitar problemas de fuso horário
        let paymentDateCheck: Date;
        if (typeof investmentPaymentDate === 'string') {
          const [year, month, day] = investmentPaymentDate.split('-').map(Number);
          paymentDateCheck = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        } else {
          paymentDateCheck = new Date(investmentPaymentDate);
          paymentDateCheck.setUTCHours(0, 0, 0, 0);
        }
        
        const cutoffCheck = new Date(Date.UTC(2024, 9, 20, 0, 0, 0, 0)); // 20/10/2024 em UTC

        // Calcular comissão com nova lógica
        // Para assessor: sem D+60, proporcional aos dias
        // Para escritório: sem D+60 também, proporcional aos dias
        let commissionCalc;
        try {
          if (effectiveIsOffice) {
            // Escritório: calcular comissão do escritório (1%)
            const calcResult = await calculateNewCommissionLogic({
              id: investment.id,
              user_id: investment.user_id,
              amount: Number(investment.amount),
              payment_date: investmentPaymentDate,
              commitment_period: investment.commitment_period || 12,
              liquidity: investment.profitability_liquidity,
              investorName: investorProfile?.full_name || "Investidor",
              investorUserTypeId: investorUserTypeId,
              officeId: user.id,
              officeName: profile?.full_name || "Escritório",
              // Sem isForAdvisor, então sem D+60 para escritório também
            })
            // Para escritório, mostrar apenas a comissão do escritório (1%) como advisorCommission
            commissionCalc = {
              ...calcResult,
              advisorCommission: calcResult.officeCommission,
              advisorId: undefined,
              advisorName: undefined,
              monthlyBreakdown: calcResult.monthlyBreakdown?.map((month: any) => ({
                ...month,
                advisorCommission: month.officeCommission, // Usar comissão do escritório (1%) ao invés de assessor (3%)
              }))
            }
          } else {
            // Assessor: calcular comissão do assessor
            commissionCalc = await calculateNewCommissionLogic({
              id: investment.id,
              user_id: investment.user_id,
              amount: Number(investment.amount),
              payment_date: investmentPaymentDate,
              commitment_period: investment.commitment_period || 12,
              liquidity: investment.profitability_liquidity,
              investorName: investorProfile?.full_name || "Investidor",
              investorUserTypeId: investorUserTypeId,
              advisorId: user.id,
              advisorName: profile?.full_name || "Assessor",
              advisorRole: userTypeSlug, // Usar o slug do user_type
              advisorUserTypeId: profile?.user_type_id || null,
              isForAdvisor: true, // Flag para aplicar regra sem D+60
            })
          }
        } catch (error) {
          console.error("Erro ao calcular comissão:", error)
          continue; // Pular investimento com erro
        }

        // Buscar comprovantes deste investimento
        const investmentReceipts = receipts?.filter(
          (r) => r.transaction_id === investment.id
        ) || []

        // Se for escritório, buscar informações do assessor do investidor
        let advisorInfo: { id?: string; name?: string } = {}
        if (effectiveIsOffice && investorProfile?.parent_id) {
          const advisor = advisorsMap.get(investorProfile.parent_id)
          if (advisor) {
            advisorInfo = { id: advisor.id, name: advisor.name }
          }
        }

        // Formatar liquidez para exibição
        const formatLiquidity = (liquidity: string | null | undefined): string => {
          if (!liquidity) return "N/A"
          const liquidityMap: Record<string, string> = {
            "Mensal": "Mensal",
            "mensal": "Mensal",
            "monthly": "Mensal",
            "Semestral": "Semestral",
            "semestral": "Semestral",
            "semiannual": "Semestral",
            "Anual": "Anual",
            "anual": "Anual",
            "annual": "Anual",
            "Bienal": "Bienal",
            "bienal": "Bienal",
            "biennial": "Bienal",
            "Trienal": "Trienal",
            "trienal": "Trienal",
            "triennial": "Trienal",
          }
          return liquidityMap[liquidity] || liquidity
        }

        processedCommissions.push({
          ...commissionCalc,
          investorEmail: investorProfile?.email,
          liquidity: formatLiquidity(investment.profitability_liquidity),
          // Adicionar informações do assessor se for escritório (sempre adicionar, mesmo se não houver)
          ...(effectiveIsOffice ? {
            advisorId: advisorInfo.id,
            advisorName: advisorInfo.name || "N/A"
          } : {}),
          pixReceipts: investmentReceipts.map((r) => ({
            id: r.id,
            file_name: r.file_name,
            file_path: r.file_path,
            status: r.status,
            created_at: r.created_at,
          })),
        })
      }

      // Ordenar por data de pagamento (mais recente primeiro) - usar a primeira data do array
      processedCommissions.sort(
        (a, b) => {
          const aDate = a.paymentDueDate.length > 0 ? a.paymentDueDate[0] : new Date(0);
          const bDate = b.paymentDueDate.length > 0 ? b.paymentDueDate[0] : new Date(0);
          return bDate.getTime() - aDate.getTime();
        }
      )

      setCommissions(processedCommissions)
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
  const getProrataInfo = (commission: CommissionDetail) => {
    if (!commission.paymentDate || !commission.commissionPeriod) return null

    // Usar a taxa real do banco (assessor ou escritório)
    const monthlyRate = userRole === "escritorio" 
      ? (commission.officeRate || 0.01) // Taxa do escritório ou fallback 1%
      : (commission.advisorRate || 0.03) // Taxa do assessor ou fallback 3%
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
      if (dueDates.length === 0) {
        periodIndex = 0
      } else {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        let bestIndex = -1
        let bestDate: Date | null = null

        dueDates.forEach((d, idx) => {
          const local = new Date(d)
          local.setHours(0, 0, 0, 0)

          if (local >= today) {
            if (!bestDate || local < bestDate) {
              bestDate = local
              bestIndex = idx
            }
          }
        })

        if (bestIndex === -1) {
          // Se todas as datas são passadas, usar a última para fins de explicação
          periodIndex = dueDates.length - 1
        } else {
          periodIndex = bestIndex
        }
      }
    }

    // Determinar a comissão específica deste período:
    // 1) Se veio de Próximos Recebimentos, usar monthlyCommissionForDate
    // 2) Senão, se for um período futuro (periodIndex > 0), usar o valor do monthlyBreakdown
    // 3) Caso contrário, usar advisorCommission (primeiro período)
    let commissionForThisPeriod: number
    if (ctx.monthlyCommissionForDate !== undefined && ctx.monthlyCommissionForDate !== null) {
      commissionForThisPeriod = ctx.monthlyCommissionForDate
    } else if (
      periodIndex > 0 &&
      Array.isArray(commission.monthlyBreakdown) &&
      commission.monthlyBreakdown.length > periodIndex
    ) {
      commissionForThisPeriod = commission.monthlyBreakdown[periodIndex].advisorCommission
    } else {
      commissionForThisPeriod = commission.advisorCommission
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

      // Descobrir o corte atual e o anterior a partir da data de pagamento deste índice
      const paymentForThis = commission.paymentDueDate[periodIndex]
      const paymentDate = new Date(paymentForThis)
      const year = paymentDate.getFullYear()
      const month = paymentDate.getMonth() // mês do pagamento (5º dia útil)

      // Corte atual é dia 20 do mês anterior ao pagamento
      let cutoffMonth = month - 1
      let cutoffYear = year
      if (cutoffMonth < 0) {
        cutoffMonth = 11
        cutoffYear -= 1
      }
      const currentCutoff = new Date(cutoffYear, cutoffMonth, 20)

      // Corte anterior é dia 20 do mês anterior ao cutoff atual
      let prevMonth = cutoffMonth - 1
      let prevYear = cutoffYear
      if (prevMonth < 0) {
        prevMonth = 11
        prevYear -= 1
      }
      const previousCutoff = new Date(prevYear, prevMonth, 20)

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

  const filteredCommissions = commissions.filter((commission) => {
    // Filtro de busca por texto
    const matchesSearch =
      commission.investorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.investorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commission.investmentId.includes(searchTerm)

    if (!matchesSearch) {
      return false
    }

    // IMPORTANTE: Mostrar TODAS as comissões de investimentos ativos
    // Não filtrar por data - o assessor precisa ver todos os investimentos ativos
    // Isso garante que se um investidor tem 2 investimentos, ambos aparecem
    return true
  })

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
        // Primeiro pagamento: usar a comissão acumulada até o corte atual
        monthlyCommission = c.advisorCommission
      } else if (c.monthlyBreakdown && c.monthlyBreakdown.length > paymentIndex) {
        // Meses futuros: usar a comissão mensal específica deste mês
        monthlyCommission = c.monthlyBreakdown[paymentIndex].advisorCommission
      } else {
        // Fallback: calcular comissão mensal completa usando taxa real
        const rate = userRole === "escritorio" 
          ? (c.officeRate || 0.01)
          : (c.advisorRate || 0.03)
        monthlyCommission = c.amount * rate
      }

      return sum + monthlyCommission
    }, 0)
    
    return {
      date: nextFifthDay,
      dateFormatted: formatDate(nextFifthDay),
      total: totalNextPayment,
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
            // Primeiro pagamento: usar comissão acumulada até o corte atual
            // Isso junta todos os investimentos feitos antes de 20/09 e até 20/10 como um período único
            monthlyCommission = commission.advisorCommission;
          } else if (commission.monthlyBreakdown && commission.monthlyBreakdown.length > paymentIndex) {
            // Meses futuros: usar a comissão mensal específica deste mês
            monthlyCommission = commission.monthlyBreakdown[paymentIndex].advisorCommission;
          } else {
            // Fallback: calcular comissão mensal completa usando taxa real
            const rate = userRole === "escritorio" 
              ? (commission.officeRate || 0.01)
              : (commission.advisorRate || 0.03)
            monthlyCommission = commission.amount * rate;
          }
          
          if (!groupedByDate.has(dateStr)) {
            groupedByDate.set(dateStr, {
              date: new Date(paymentUTC),
              total: 0,
              count: 0,
              commissions: [],
            })
          }
          
          const group = groupedByDate.get(dateStr)!
          group.total += monthlyCommission
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
          // IMPORTANTE: usar timeZone: 'UTC' para evitar que a data apareça um dia antes
          // em localidades com fuso horário negativo (ex.: Brasil).
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

  const exportToExcel = () => {
    const baseHeaders = [
      "Investidor",
      "Email",
      "Valor Investimento",
      "Data de Depósito",
      "Próximo Pagamento",
      "Comissão",
    ]
    
    // Se for escritório, adicionar coluna de Assessor
    const headersForOffice = ["Assessor", ...baseHeaders]

    // Clonar e ordenar comissões para ter agrupamento estável
    const sortedCommissions = [...filteredCommissions].sort((a, b) => {
      if (userRole === "escritorio") {
        const aAdvisor = a.advisorName || "Sem Assessor"
        const bAdvisor = b.advisorName || "Sem Assessor"
        if (aAdvisor !== bAdvisor) return aAdvisor.localeCompare(bAdvisor)
        return a.investorName.localeCompare(b.investorName)
      }
      // Para assessor, ordenar por investidor
      return a.investorName.localeCompare(b.investorName)
    })

    const worksheetData: any[][] = []

    if (userRole === "escritorio") {
      // Escritório: dividir seções por assessor e somar total da comissão (1%) de cada assessor
      let currentAdvisor: string | null = null
      let advisorTotal = 0

      for (const c of sortedCommissions) {
        const advisorLabel = c.advisorName || "Sem Assessor"

        if (advisorLabel !== currentAdvisor) {
          // Antes de mudar de assessor, escrever subtotal do anterior
          if (currentAdvisor !== null) {
            worksheetData.push([
              "",
              "",
              "",
              "",
              "",
              "",
              "Total do Assessor",
              formatCurrency(advisorTotal),
            ])
            worksheetData.push([]) // linha em branco entre seções
          }

          currentAdvisor = advisorLabel
          advisorTotal = 0

          // Cabeçalho da seção
          worksheetData.push([`Assessor: ${advisorLabel}`])
          worksheetData.push(headersForOffice)
        }

        const isMultipleMonths = c.monthlyBreakdown && c.monthlyBreakdown.length > 1
        const commissionText = isMultipleMonths
          ? `${formatCurrency(c.advisorCommission)} (Soma de ${c.monthlyBreakdown.length} meses)`
          : formatCurrency(c.advisorCommission)

        advisorTotal += c.advisorCommission

        worksheetData.push([
          advisorLabel,
          c.investorName,
          c.investorEmail || "",
          formatCurrency(c.amount),
          formatDate(c.paymentDate),
          c.paymentDueDate.length > 0 ? formatDate(c.paymentDueDate[0]) : "N/A",
          commissionText,
        ])
      }

      // Subtotal do último assessor
      if (currentAdvisor !== null) {
        worksheetData.push([
          "",
          "",
          "",
          "",
          "",
          "",
          "Total do Assessor",
          formatCurrency(advisorTotal),
        ])
      }
    } else {
      // Assessor: dividir seções por investidor
      let currentInvestor: string | null = null

      for (const c of sortedCommissions) {
        const investorKey = `${c.investorName}${c.investorEmail ? ` <${c.investorEmail}>` : ""}`

        if (investorKey !== currentInvestor) {
          currentInvestor = investorKey
          // Cabeçalho da seção
          if (worksheetData.length > 0) {
            worksheetData.push([]) // linha em branco entre seções
          }
          worksheetData.push([`Investidor: ${investorKey}`])
          worksheetData.push(baseHeaders)
        }

        const isMultipleMonths = c.monthlyBreakdown && c.monthlyBreakdown.length > 1
        const commissionText = isMultipleMonths
          ? `${formatCurrency(c.advisorCommission)} (Soma de ${c.monthlyBreakdown.length} meses)`
          : formatCurrency(c.advisorCommission)

        worksheetData.push([
          c.investorName,
          c.investorEmail || "",
          formatCurrency(c.amount),
          formatDate(c.paymentDate),
          c.paymentDueDate.length > 0 ? formatDate(c.paymentDueDate[0]) : "N/A",
          commissionText,
        ])
      }
    }

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comissões")

    const fileNamePrefix = userRole === "escritorio" ? "comissoes_escritorio" : "comissoes_assessor"
    const fileName = `${fileNamePrefix}_${new Date().toISOString().split("T")[0]}.xlsx`
    XLSX.writeFile(workbook, fileName)
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
                onClick={exportToExcel} 
                variant="outline"
                className="bg-[#003562] border-[#003562] text-white hover:bg-[#00BC6E] hover:border-[#00BC6E] hover:text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
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
                          <div className="flex items-baseline gap-3">
                            <span className="text-2xl font-bold text-[#00BC6E]">
                              {formatCurrency(nextPaymentInfo.total)}
                            </span>
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
                                  <p className="text-xl font-bold text-[#00BC6E]">
                                    {formatCurrency(payment.total)}
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
                  <TableHead className="font-semibold text-white">Data de Depósito</TableHead>
                  <TableHead className="font-semibold text-white">Liquidez</TableHead>
                  <TableHead className="font-semibold text-white">Próximo Pagamento</TableHead>
                  <TableHead className="font-semibold text-white">Minha Comissão</TableHead>
                  <TableHead className="font-semibold text-white">Comissão Investidor</TableHead>
                  <TableHead className="font-semibold text-white text-center">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={userRole === "escritorio" ? 9 : 8} className="text-center text-gray-400 py-8 bg-[#01223F]">
                      Nenhuma comissão encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCommissions.map((commission) => {
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
                        <TableCell className="py-4 font-medium text-white">{formatCurrency(commission.amount)}</TableCell>
                        <TableCell className="py-4 text-white">{formatDate(commission.paymentDate)}</TableCell>
                        <TableCell className="py-4">
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 hover:bg-blue-500/30">
                            {commission.liquidity || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-white">
                          {(() => {
                            const nextDate = getNextPaymentDateForCommission(commission)
                            return nextDate ? formatDate(nextDate) : "N/A"
                          })()}
                          {commission.paymentDueDate.length > 1 && (
                            <span className="text-xs text-gray-400 ml-1">
                              (+{commission.paymentDueDate.length - 1} mais)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-4 font-semibold text-[#00BC6E]">
                          <div className="flex flex-col">
                            <span>
                              {(() => {
                                const info = getProrataInfo(commission)
                                const value =
                                  info?.prorataCommission ?? commission.advisorCommission
                                return formatCurrency(value)
                              })()}
                            </span>
                            {commission.monthlyBreakdown && commission.monthlyBreakdown.length > 1 && (
                              <span className="text-xs text-gray-400 font-normal mt-1">
                                Recorrência de {commission.monthlyBreakdown.length}{" "}
                                {commission.monthlyBreakdown.length === 1 ? "mês" : "meses"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 font-semibold text-blue-400">
                          <div className="flex flex-col">
                            <span>
                              {(() => {
                                // Calcular comissão do investidor proporcionalmente
                                const investorRate = commission.investorRate || 0.02
                                const info = getProrataInfo(commission)
                                if (info) {
                                  const dailyRate = investorRate / 30
                                  const investorProrataCommission = commission.amount * dailyRate * info.days
                                  return formatCurrency(investorProrataCommission)
                                }
                                // Se não houver info de pró-rata, usar a comissão do investidor do objeto
                                return formatCurrency(commission.investorCommission || 0)
                              })()}
                            </span>
                            {commission.monthlyBreakdown && commission.monthlyBreakdown.length > 1 && (
                              <span className="text-xs text-gray-400 font-normal mt-1">
                                Recorrência de {commission.monthlyBreakdown.length}{" "}
                                {commission.monthlyBreakdown.length === 1 ? "mês" : "meses"}
                              </span>
                            )}
                          </div>
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
          </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#01223F] border-[#003562] text-white">
          <DialogHeader className="border-b border-[#003562] pb-4">
            <DialogTitle className="text-2xl font-bold text-white">Detalhes da Comissão</DialogTitle>
            <DialogDescription className="text-gray-400">
              Informações completas do investimento e comissão
            </DialogDescription>
          </DialogHeader>
          {selectedCommission && (
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-400">Investidor</p>
                  <p className="font-semibold text-white text-lg">{selectedCommission.investorName}</p>
                  <p className="text-sm text-gray-400">
                    {selectedCommission.investorEmail}
                  </p>
                </div>
                {userRole === "escritorio" && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-400">Assessor</p>
                    <p className="font-semibold text-white text-lg">
                      {selectedCommission.advisorName || "N/A"}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-400">
                    Valor do Investimento
                  </p>
                  <p className="font-semibold text-xl text-white">
                    {formatCurrency(selectedCommission.amount)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-400">
                    Data de Depósito
                  </p>
                  <p className="text-white font-medium">{formatDate(selectedCommission.paymentDate)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-400">
                    Liquidez
                  </p>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                    {selectedCommission.liquidity || "N/A"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-400">
                    Próximo Pagamento
                  </p>
                  <p className="text-white font-medium">
                    {(() => {
                      const nextDate = getNextPaymentDateForCommission(selectedCommission)
                      return nextDate ? formatDate(nextDate) : "N/A"
                    })()}
                  </p>
                </div>
              </div>

              <div className="border-t border-[#003562] pt-6">
                <h4 className="font-semibold text-lg text-white mb-4">Valores da Comissão</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Minha Comissão (usuário logado) */}
                  <div className="p-5 bg-gradient-to-br from-[#00BC6E]/20 to-[#00BC6E]/10 rounded-lg border-2 border-[#00BC6E]/30 shadow-lg">
                    <p className="text-sm font-medium text-gray-300 mb-2">
                      Minha Comissão ({(() => {
                        const rate = userRole === "escritorio" 
                          ? (selectedCommission.officeRate || 0.01)
                          : (selectedCommission.advisorRate || 0.03)
                        return `${(rate * 100).toFixed(2)}%`
                      })()})
                    </p>
                    <p className="text-3xl font-bold text-[#00BC6E]">
                      {(() => {
                        const info = getProrataInfo(selectedCommission)
                        const value =
                          info?.prorataCommission ?? selectedCommission.advisorCommission
                        return formatCurrency(value)
                      })()}
                    </p>
                  </div>
                  
                  {/* Comissão do Investidor */}
                  <div className="p-5 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-lg border-2 border-blue-400/30 shadow-lg">
                    <p className="text-sm font-medium text-gray-300 mb-2">
                      Comissão do Investidor ({(() => {
                        const rate = selectedCommission.investorRate || 0.02
                        return `${(rate * 100).toFixed(2)}%`
                      })()})
                    </p>
                    <p className="text-3xl font-bold text-blue-400">
                      {(() => {
                        const info = getProrataInfo(selectedCommission)
                        // Calcular comissão do investidor proporcionalmente
                        const investorRate = selectedCommission.investorRate || 0.02
                        if (info) {
                          const dailyRate = investorRate / 30
                          const investorProrataCommission = selectedCommission.amount * dailyRate * info.days
                          return formatCurrency(investorProrataCommission)
                        }
                        // Se não houver info de pró-rata, usar a comissão do investidor do objeto
                        return formatCurrency(selectedCommission.investorCommission || 0)
                      })()}
                    </p>
                  </div>
                </div>

                {/* Detalhamento do pró-rata considerado */}
                {(() => {
                  const info = getProrataInfo(selectedCommission)
                  if (!info) return null

                  return (
                    <div className="mt-6 p-4 bg-[#003562]/30 rounded-lg border border-[#003562]">
                      <p className="text-sm text-gray-300 mb-2">
                        <span className="font-semibold text-white">Pró-rata considerado:</span>{" "}
                        de {info.startLabel} até {info.endLabel}{" "}
                        ({info.days} {info.days === 1 ? "dia" : "dias"}, equivalente a{" "}
                        {(info.fractionOfMonth * 100).toFixed(1)}% de um mês de 30 dias).
                      </p>
                      <p className="text-sm text-gray-400">
                        A comissão cheia de {(() => {
                          const rate = userRole === "escritorio" 
                            ? (selectedCommission.officeRate || 0.01)
                            : (selectedCommission.advisorRate || 0.03)
                          return `${(rate * 100).toFixed(2)}%`
                        })()} sobre {formatCurrency(selectedCommission.amount)} seria{" "}
                        {formatCurrency(info.theoreticalFullMonth)}; aplicando o pró-rata de{" "}
                        {info.days}/{30} dias, a comissão deste período é{" "}
                        <span className="font-semibold text-[#00BC6E]">{formatCurrency(info.prorataCommission)}</span>.
                      </p>
                    </div>
                  )
                })()}
              </div>

              {selectedCommission.monthlyBreakdown && selectedCommission.monthlyBreakdown.length > 0 && (
                <div className="border-t border-[#003562] pt-6">
                  <h4 className="font-semibold text-lg text-white mb-4">Detalhamento Mensal dos Rendimentos</h4>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {selectedCommission.monthlyBreakdown.map((month, index) => (
                      <div
                        key={index}
                        className="p-4 bg-[#003562]/30 rounded-lg border border-[#003562] hover:border-[#00BC6E]/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold capitalize text-base text-white">
                              {month.month} de {month.year}
                            </p>
                            {selectedCommission.paymentDueDate && selectedCommission.paymentDueDate[index] && (
                              <p className="text-xs text-gray-400 mt-1">
                                Pagamento em {formatDate(selectedCommission.paymentDueDate[index])}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-6">
                          <div className="text-right">
                              <p className="text-gray-400 text-xs mb-1">
                                Minha Comissão ({(() => {
                                  const rate = userRole === "escritorio" 
                                    ? (selectedCommission.officeRate || 0.01)
                                    : (selectedCommission.advisorRate || 0.03)
                                  return `${(rate * 100).toFixed(2)}%`
                                })()})
                            </p>
                              <p className="font-semibold text-[#00BC6E] text-lg">
                              {formatCurrency(month.advisorCommission)}
                            </p>
                            </div>
                            <div className="text-right">
                              <p className="text-gray-400 text-xs mb-1">
                                Comissão do Investidor ({(() => {
                                  const rate = selectedCommission.investorRate || 0.02
                                  return `${(rate * 100).toFixed(2)}%`
                                })()})
                              </p>
                              <p className="font-semibold text-blue-400 text-lg">
                                {formatCurrency(month.investorCommission)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="mt-4 p-4 bg-gradient-to-r from-[#00BC6E]/20 to-[#00BC6E]/10 rounded-lg border-2 border-[#00BC6E]/30">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-lg text-white">Total do Período</p>
                        <p className="text-2xl font-bold text-[#00BC6E]">
                          {(() => {
                            const info = getProrataInfo(selectedCommission)
                            const value =
                              info?.prorataCommission ?? selectedCommission.advisorCommission
                            return formatCurrency(value)
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                            className="hover:bg-[#00BC6E] hover:text-white hover:border-[#00BC6E] text-white border-gray-600"
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
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Total de Comissões:</span>
                  <span className="text-xl font-bold text-[#00BC6E]">
                    {formatCurrency(
                      selectedPaymentDate.commissions.reduce(
                        (sum, c) => sum + (c.monthlyCommissionForDate || c.advisorCommission),
                        0
                      )
                    )}
                  </span>
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
                      <TableHead className="min-w-[120px] text-white">Comissão</TableHead>
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
                          {formatCurrency(commission.monthlyCommissionForDate || commission.advisorCommission)}
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

