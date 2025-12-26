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
  pixReceipts?: Array<{
    id: string
    file_name: string
    file_url: string
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
        .select("id, user_type, role, office_id, full_name")
        .eq("id", user.id)
        .single()

      if (!profile || profile.user_type !== "distributor") {
        toast({
          title: "Erro",
          description: "Este recurso é apenas para assessores e escritórios",
          variant: "destructive",
        })
        return
      }

      const isOffice = profile.role === "escritorio"
      const isAdvisor = profile.role === "assessor" || profile.role === "assessor_externo"

      if (!isOffice && !isAdvisor) {
        toast({
          title: "Erro",
          description: "Este recurso é apenas para assessores e escritórios",
          variant: "destructive",
        })
        return
      }

      // Armazenar o role do usuário para exibição
      setUserRole(isOffice ? "escritorio" : "assessor")

      // Buscar investimentos dos clientes
      // Se for escritório: buscar por office_id (e também por assessores)
      // Se for assessor: buscar por parent_id
      let investorProfiles: any[] = []

      // Buscar assessores do escritório (se for escritório) para mapear investidores
      let advisorsMap = new Map<string, { id: string; name: string }>()
      
      if (isOffice) {
        // Buscar assessores do escritório com seus nomes
        const { data: advisors } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("office_id", user.id)
          .eq("user_type", "distributor")
          .eq("role", "assessor")

        if (advisors) {
          advisors.forEach(advisor => {
            advisorsMap.set(advisor.id, { id: advisor.id, name: advisor.full_name || "Assessor" })
          })
        }

        // Escritório: buscar investidores por office_id (com parent_id para identificar assessor)
        const { data: investorsByOffice } = await supabase
          .from("profiles")
          .select("id, full_name, email, parent_id")
          .eq("office_id", user.id)
          .eq("user_type", "investor")

        if (investorsByOffice) {
          investorProfiles = investorsByOffice
        }

        // Também buscar investidores via assessores do escritório
        if (advisors && advisors.length > 0) {
          const advisorIds = advisors.map(a => a.id)
          const { data: investorsByAdvisors } = await supabase
            .from("profiles")
            .select("id, full_name, email, parent_id")
            .in("parent_id", advisorIds)
            .eq("user_type", "investor")

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
          .select("id, full_name, email")
          .eq("parent_id", user.id)
          .eq("user_type", "investor")

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

      // Buscar TODOS os investimentos ativos dos investidores deste assessor
      // IMPORTANTE: Não aplicar filtros de data aqui - buscar todos os ativos
      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select("id, user_id, amount, payment_date, created_at, status, commitment_period")
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
        setCommissions([])
        setLoading(false)
        return
      }

      // Buscar comprovantes PIX
      const investmentIds = investmentsToProcess.map((inv) => inv.id)
      const { data: receipts } = await supabase
        .from("pix_receipts")
        .select("id, investment_id, file_name, file_url, status, created_at")
        .in("investment_id", investmentIds)

      // Processar cada investimento
      const processedCommissions: CommissionDetail[] = []
      
      for (const investment of investmentsToProcess) {
        const investorProfile = investorProfiles.find((p) => p.id === investment.user_id)
        
        if (!investorProfile) {
          continue; // Pular investimento se não encontrar perfil
        }

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
          if (isOffice) {
            // Escritório: calcular comissão do escritório (1%)
            commissionCalc = calculateNewCommissionLogic({
              id: investment.id,
              user_id: investment.user_id,
              amount: Number(investment.amount),
              payment_date: investmentPaymentDate,
              commitment_period: investment.commitment_period || 12,
              investorName: investorProfile?.full_name || "Investidor",
              officeId: user.id,
              officeName: profile?.full_name || "Escritório",
              // Sem isForAdvisor, então sem D+60 para escritório também
            })
            // Para escritório, mostrar apenas a comissão do escritório (1%) como advisorCommission
            commissionCalc.advisorCommission = commissionCalc.officeCommission
            commissionCalc.advisorId = undefined
            commissionCalc.advisorName = undefined
            
            // Ajustar monthlyBreakdown para mostrar apenas comissão do escritório (1%)
            if (commissionCalc.monthlyBreakdown) {
              commissionCalc.monthlyBreakdown = commissionCalc.monthlyBreakdown.map(month => ({
                ...month,
                advisorCommission: month.officeCommission, // Usar comissão do escritório (1%) ao invés de assessor (3%)
              }))
            }
          } else {
            // Assessor: calcular comissão do assessor
            commissionCalc = calculateNewCommissionLogic({
              id: investment.id,
              user_id: investment.user_id,
              amount: Number(investment.amount),
              payment_date: investmentPaymentDate,
              commitment_period: investment.commitment_period || 12,
              investorName: investorProfile?.full_name || "Investidor",
              advisorId: user.id,
              advisorName: profile?.full_name || "Assessor",
              advisorRole: profile.role,
              isForAdvisor: true, // Flag para aplicar regra sem D+60
            })
          }
        } catch (error) {
          continue; // Pular investimento com erro
        }

        // Buscar comprovantes deste investimento
        const investmentReceipts = receipts?.filter(
          (r) => r.investment_id === investment.id
        ) || []

        // Se for escritório, buscar informações do assessor do investidor
        let advisorInfo: { id?: string; name?: string } = {}
        if (isOffice && investorProfile?.parent_id) {
          const advisor = advisorsMap.get(investorProfile.parent_id)
          if (advisor) {
            advisorInfo = { id: advisor.id, name: advisor.name }
          }
        }

        processedCommissions.push({
          ...commissionCalc,
          investorEmail: investorProfile?.email,
          // Adicionar informações do assessor se for escritório (sempre adicionar, mesmo se não houver)
          ...(isOffice ? {
            advisorId: advisorInfo.id,
            advisorName: advisorInfo.name || "N/A"
          } : {}),
          pixReceipts: investmentReceipts.map((r) => ({
            id: r.id,
            file_name: r.file_name,
            file_url: r.file_url,
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

    const monthlyRate = 0.03 // 3% ao mês para assessor
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
        // Fallback: calcular comissão mensal completa (3% do valor)
        monthlyCommission = c.amount * 0.03
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
            // Fallback: calcular comissão mensal completa (3% do valor)
            monthlyCommission = commission.amount * 0.03;
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Minhas Comissões Detalhadas</CardTitle>
              <CardDescription>
                Visualize todas as suas comissões por investimento, com detalhes completos
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToExcel} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por investidor, email ou ID do investimento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
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
            >
              <Calendar className="mr-2 h-4 w-4" />
              Tabela
            </Button>
            <Button
              variant={chartView === "chart" ? "default" : "outline"}
              onClick={() => setChartView("chart")}
              size="sm"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Previsão de Recebimentos
            </Button>
          </div>

          {chartView === "chart" ? (
            <Card>
              <CardHeader>
                <CardTitle>Previsão de Recebimentos</CardTitle>
                <CardDescription>
                  Consulte quando e quanto você receberá nos próximos meses baseado nos investimentos ativos de seus clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Área destacada com próximo quinto dia útil */}
                  <Card 
                    className="bg-primary/5 border-primary/20 cursor-pointer"
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
                            <DollarSign className="h-6 w-6 text-primary" />
                            <h3 className="text-lg font-semibold">A receber no próximo quinto dia útil</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-4">
                            Valor total das comissões que serão pagas no próximo quinto dia útil do mês
                          </p>
                          <div className="flex items-baseline gap-3">
                            <span className="text-2xl font-bold text-primary">
                              {formatCurrency(nextPaymentInfo.total)}
                            </span>
                            <Badge variant="outline" className="text-sm">
                              {nextPaymentInfo.dateFormatted}
                            </Badge>
                          </div>
                          {nextPaymentInfo.count > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {nextPaymentInfo.count} {nextPaymentInfo.count === 1 ? "comissão" : "comissões"} será{nextPaymentInfo.count === 1 ? "" : "ão"} paga{nextPaymentInfo.count === 1 ? "" : "s"} nesta data
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lista de próximos recebimentos */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Próximos Recebimentos
                    </h3>
                    {nextPayments.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6">
                          <p className="text-center text-muted-foreground">
                            Nenhum recebimento previsto para os próximos 12 meses
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {nextPayments.map((payment, index) => (
                          <Card 
                            key={index} 
                            className="hover:bg-accent/50 transition-colors cursor-pointer"
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
                                    <p className="font-semibold text-base">{payment.dateFull}</p>
                                    <Badge variant="outline" className="text-xs">
                                      Em {payment.daysUntil} {payment.daysUntil === 1 ? "dia" : "dias"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground capitalize">
                                    {payment.dateLong}
                                  </p>
                                  {payment.count > 1 && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {payment.count} recebimentos nesta data
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold text-green-600">
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
            <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investidor</TableHead>
                  {userRole === "escritorio" && <TableHead>Assessor</TableHead>}
                  <TableHead>Valor Investido</TableHead>
                  <TableHead>Data de Depósito</TableHead>
                  <TableHead>Próximo Pagamento</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={userRole === "escritorio" ? 7 : 6} className="text-center text-muted-foreground">
                      Nenhuma comissão encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCommissions.map((commission) => {
                    return (
                      <TableRow key={commission.investmentId}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{commission.investorName}</p>
                            <p className="text-xs text-muted-foreground">
                              {commission.investorEmail}
                            </p>
                          </div>
                        </TableCell>
                        {userRole === "escritorio" && (
                          <TableCell>
                            <p className="text-sm">
                              {commission.advisorName || "N/A"}
                            </p>
                          </TableCell>
                        )}
                        <TableCell>{formatCurrency(commission.amount)}</TableCell>
                        <TableCell>{formatDate(commission.paymentDate)}</TableCell>
                        <TableCell>
                          {(() => {
                            const nextDate = getNextPaymentDateForCommission(commission)
                            return nextDate ? formatDate(nextDate) : "N/A"
                          })()}
                          {commission.paymentDueDate.length > 1 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (+{commission.paymentDueDate.length - 1} mais)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
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
                              <span className="text-xs text-muted-foreground font-normal mt-1">
                                Recorrência de {commission.monthlyBreakdown.length}{" "}
                                {commission.monthlyBreakdown.length === 1 ? "mês" : "meses"}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Comissão</DialogTitle>
            <DialogDescription>
              Informações completas do investimento e comissão
            </DialogDescription>
          </DialogHeader>
          {selectedCommission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Investidor</p>
                  <p className="font-semibold">{selectedCommission.investorName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCommission.investorEmail}
                  </p>
                </div>
                {userRole === "escritorio" && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Assessor</p>
                    <p className="font-semibold">
                      {selectedCommission.advisorName || "N/A"}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Valor do Investimento
                  </p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(selectedCommission.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Data de Depósito
                  </p>
                  <p>{formatDate(selectedCommission.paymentDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Próximo Pagamento
                  </p>
                  <p>
                    {(() => {
                      const nextDate = getNextPaymentDateForCommission(selectedCommission)
                      return nextDate ? formatDate(nextDate) : "N/A"
                    })()}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-4">Valores da Comissão</h4>
                <div className="flex justify-start">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200 w-full max-w-[300px]">
                    <p className="text-sm text-muted-foreground mb-1">
                      Sua Comissão ({userRole === "escritorio" ? "1%" : "3%"})
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {(() => {
                        const info = getProrataInfo(selectedCommission)
                        const value =
                          info?.prorataCommission ?? selectedCommission.advisorCommission
                        return formatCurrency(value)
                      })()}
                    </p>
                  </div>
                </div>

                {/* Detalhamento do pró-rata considerado */}
                {(() => {
                  const info = getProrataInfo(selectedCommission)
                  if (!info) return null

                  return (
                    <div className="mt-4 text-sm text-muted-foreground space-y-1">
                      <p>
                        <span className="font-medium text-foreground">Pró-rata considerado:</span>{" "}
                        de {info.startLabel} até {info.endLabel}{" "}
                        ({info.days} {info.days === 1 ? "dia" : "dias"}, equivalente a{" "}
                        {(info.fractionOfMonth * 100).toFixed(1)}% de um mês de 30 dias).
                      </p>
                      <p>
                        A comissão cheia de 3% sobre {formatCurrency(selectedCommission.amount)} seria{" "}
                        {formatCurrency(info.theoreticalFullMonth)}; aplicando o pró-rata de{" "}
                        {info.days}/{30} dias, a comissão deste período é{" "}
                        {formatCurrency(info.prorataCommission)}.
                      </p>
                    </div>
                  )
                })()}
              </div>

              {selectedCommission.monthlyBreakdown && selectedCommission.monthlyBreakdown.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Detalhamento Mensal dos Rendimentos</h4>
                  <div className="space-y-3">
                    {selectedCommission.monthlyBreakdown.map((month, index) => (
                      <div
                        key={index}
                        className="p-4 bg-muted/30 rounded-lg border"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold capitalize text-base">
                              {month.month} de {month.year}
                            </p>
                            {selectedCommission.paymentDueDate && selectedCommission.paymentDueDate[index] && (
                              <p className="text-xs text-muted-foreground">
                                Pagamento em {formatDate(selectedCommission.paymentDueDate[index])}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground text-xs mb-1">
                              Sua Comissão ({userRole === "escritorio" ? "1%" : "3%"})
                            </p>
                            <p className="font-semibold text-green-600 text-lg">
                              {formatCurrency(month.advisorCommission)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">Total do Período</p>
                        <p className="text-lg font-bold text-primary">
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
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Comprovantes PIX</h4>
                  <div className="space-y-2">
                    {selectedCommission.pixReceipts.map((receipt) => (
                      <div
                        key={receipt.id}
                        className="flex items-center justify-between p-2 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-sm">{receipt.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(receipt.created_at)}
                          </p>
                          <Badge variant={receipt.status === "approved" ? "default" : "secondary"}>
                            {receipt.status === "approved" ? "Aprovado" : "Pendente"}
                          </Badge>
                        </div>
                        {receipt.file_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(receipt.file_url, "_blank")}
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
        <DialogContent className="!max-w-[95vw] w-full max-h-[90vh] overflow-y-auto sm:!max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>Investimentos - {selectedPaymentDate?.date}</DialogTitle>
            <DialogDescription>
              Detalhes dos investimentos que serão pagos nesta data
            </DialogDescription>
          </DialogHeader>
          {selectedPaymentDate && selectedPaymentDate.commissions.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total de Comissões:</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(
                      selectedPaymentDate.commissions.reduce(
                        (sum, c) => sum + (c.monthlyCommissionForDate || c.advisorCommission),
                        0
                      )
                    )}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedPaymentDate.commissions.length} {selectedPaymentDate.commissions.length === 1 ? "investimento" : "investimentos"}
                </p>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                    <TableHead className="w-[40px] text-center">#</TableHead>
                    <TableHead className="min-w-[200px]">Investidor</TableHead>
                      {userRole === "escritorio" && <TableHead className="min-w-[150px]">Assessor</TableHead>}
                      <TableHead className="min-w-[120px]">Valor Investido</TableHead>
                      <TableHead className="min-w-[120px]">Data de Depósito</TableHead>
                      <TableHead className="min-w-[120px]">Comissão</TableHead>
                      <TableHead className="min-w-[80px]">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPaymentDate.commissions.map((commission, index) => (
                      <TableRow key={commission.investmentId}>
                        <TableCell className="text-center text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{commission.investorName}</p>
                            <p className="text-xs text-muted-foreground">
                              {commission.investorEmail}
                            </p>
                          </div>
                        </TableCell>
                        {userRole === "escritorio" && (
                          <TableCell>
                            <p className="text-sm">
                              {commission.advisorName || "N/A"}
                            </p>
                          </TableCell>
                        )}
                        <TableCell>{formatCurrency(commission.amount)}</TableCell>
                        <TableCell>{formatDate(commission.paymentDate)}</TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {formatCurrency(commission.monthlyCommissionForDate || commission.advisorCommission)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
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
              <p className="text-muted-foreground">
                Nenhum investimento encontrado para esta data
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

