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
import { Download, Search, Eye, Calendar, DollarSign, FileText } from "lucide-react"
import { getFifthBusinessDayOfMonth } from "@/lib/commission-calculator"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
      const isAdvisor = profile.role === "assessor"

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
        // Assessor: buscar investidores por parent_id
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
      const matches = c.paymentDueDate.some((paymentDate) => {
        // Extrair ano, mês e dia usando métodos UTC para garantir consistência
        const year = paymentDate.getUTCFullYear()
        const month = paymentDate.getUTCMonth()
        const day = paymentDate.getUTCDate()
        
        // Criar string de data no formato YYYY-MM-DD
        const paymentStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return paymentStr === nextFifthDayStr
      })

      return matches
    })
    
    // Para o primeiro pagamento, usar advisorCommission (comissão acumulada até o corte atual)
    // Isso inclui todos os investimentos feitos antes de 20/09 e até 20/10 como um período único
    const totalNextPayment = commissionsForNextFifthDay.reduce(
      (sum, c) => sum + c.advisorCommission,
      0
    )
    
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
    // IMPORTANTE: Usar UTC para evitar problemas de fuso horário
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    
    // Filtrar apenas comissões futuras (próximos 12 meses)
    // IMPORTANTE: Normalizar todas as datas para comparação correta
    const oneYearFromNow = new Date(today)
    oneYearFromNow.setMonth(oneYearFromNow.getMonth() + 12)
    oneYearFromNow.setHours(23, 59, 59, 999) // Fim do dia
    
    const futureCommissions = filteredCommissions.filter((c) => {
      // Verificar se alguma data de pagamento está no futuro ou hoje
      const todayUTC = new Date(today)
      todayUTC.setUTCHours(0, 0, 0, 0)
      
      return c.paymentDueDate.some((paymentDate) => {
        paymentDate.setUTCHours(0, 0, 0, 0)
        const isFutureOrToday = paymentDate >= todayUTC
        const isWithinOneYear = paymentDate <= oneYearFromNow
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
        // IMPORTANTE: Normalizar a data usando UTC antes de criar a string para agrupamento
        paymentDate.setUTCHours(0, 0, 0, 0)
        const dateStr = paymentDate.toISOString().split("T")[0]
        
        // Normalizar today também para UTC
        const todayUTC = new Date(today)
        todayUTC.setUTCHours(0, 0, 0, 0)
        
        // Só incluir se for futura ou hoje
        if (paymentDate >= todayUTC && paymentDate <= oneYearFromNow) {
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
              date: new Date(paymentDate),
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
          dateFull: item.date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          dateLong: item.date.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
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

  const exportToCSV = () => {
    const baseHeaders = [
      "Investidor",
      "Email",
      "Valor Investimento",
      "Data de Depósito",
      "Próximo Pagamento",
      "Comissão",
    ]
    
    // Se for escritório, adicionar coluna de Assessor
    if (userRole === "escritorio") {
      baseHeaders.splice(1, 0, "Assessor")
    }

    const rows = filteredCommissions.map((c) => {
      const isMultipleMonths = c.monthlyBreakdown && c.monthlyBreakdown.length > 1
      const commissionText = isMultipleMonths 
        ? `${formatCurrency(c.advisorCommission)} (Soma de ${c.monthlyBreakdown.length} meses)`
        : formatCurrency(c.advisorCommission)
      
      const baseRow = [
        c.investorName,
        c.investorEmail || "",
        formatCurrency(c.amount),
        formatDate(c.paymentDate),
        c.paymentDueDate.length > 0 ? formatDate(c.paymentDueDate[0]) : "N/A",
        commissionText,
      ]
      
      // Se for escritório, adicionar coluna de assessor após o investidor
      if (userRole === "escritorio") {
        baseRow.splice(1, 0, c.advisorName || "N/A")
      }
      
      return baseRow
    })

    const csvContent = [baseHeaders, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    const fileNamePrefix = userRole === "escritorio" ? "comissoes_escritorio" : "comissoes_assessor"
    link.setAttribute("download", `${fileNamePrefix}_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    const doc = new jsPDF('landscape')
    
    // Título - ajustar conforme o tipo de usuário
    doc.setFontSize(18)
    const reportTitle = userRole === "escritorio" 
      ? 'Relatório de Comissões - Escritório'
      : 'Relatório de Comissões - Assessor'
    doc.text(reportTitle, 14, 15)
    
    // Data de geração
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22)
    doc.setTextColor(0, 0, 0)
    
    // A receber no próximo quinto dia útil
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text(`A receber no próximo quinto dia útil (${nextPaymentInfo.dateFormatted}):`, 14, 30)
    doc.setTextColor(59, 130, 246)
    doc.text(formatCurrency(nextPaymentInfo.total), 150, 30)
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "normal")
    
    // Próxima data a receber (se houver recebimentos futuros)
    let startY = 38
    if (nextPayments.length > 0) {
      const nextPayment = nextPayments[0]
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text('Próxima data a receber:', 14, startY)
      doc.text(nextPayment.dateFull, 100, startY)
      doc.setTextColor(34, 197, 94)
      doc.text(formatCurrency(nextPayment.total), 150, startY)
      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "normal")
      startY += 8
    }
    
    // Quantidade de comissões
    doc.setFontSize(12)
    doc.text(`Quantidade: ${filteredCommissions.length} comissões`, 14, startY)
    startY += 8
    
    // Preparar dados da tabela
    const tableData = filteredCommissions.map((c) => {
      const isMultipleMonths = c.monthlyBreakdown && c.monthlyBreakdown.length > 1
      const commissionText = isMultipleMonths 
        ? `${formatCurrency(c.advisorCommission)} (${c.monthlyBreakdown.length} meses)`
        : formatCurrency(c.advisorCommission)
      
      // Montar linha base
      const baseRow = [
        c.investorName,
        c.investorEmail || '-',
        formatCurrency(c.amount),
        formatDate(c.paymentDate),
        c.paymentDueDate.length > 0 ? formatDate(c.paymentDueDate[0]) : "N/A",
        commissionText,
      ]
      
      // Se for escritório, adicionar coluna de assessor após o investidor (antes do email)
      if (userRole === "escritorio") {
        baseRow.splice(1, 0, c.advisorName || "N/A")
      }
      
      return baseRow
    })
    
    // Preparar cabeçalho da tabela
    const baseHeaders = ['Investidor', 'Email', 'Valor Investido', 'Data de Depósito', 'Próximo Pagamento', 'Comissão']
    if (userRole === "escritorio") {
      baseHeaders.splice(1, 0, 'Assessor')
    }
    
    // Adicionar tabela
    autoTable(doc, {
      head: [baseHeaders],
      body: tableData,
      startY: startY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    })
    
    // Salvar PDF
    const fileNamePrefix = userRole === "escritorio" ? "comissoes_escritorio" : "comissoes_assessor"
    doc.save(`${fileNamePrefix}_${new Date().toISOString().split("T")[0]}.pdf`)
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
              <Button onClick={exportToCSV} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
              <Button onClick={exportToPDF} variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Exportar PDF
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
                  <Card className="bg-primary/5 border-primary/20">
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
                    // Verificar se é uma soma de múltiplas comissões (tem monthlyBreakdown com mais de 1 mês)
                    const isMultipleMonths = commission.monthlyBreakdown && commission.monthlyBreakdown.length > 1
                    
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
                          {commission.paymentDueDate.length > 0 
                            ? formatDate(commission.paymentDueDate[0]) 
                            : "N/A"}
                          {commission.paymentDueDate.length > 1 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (+{commission.paymentDueDate.length - 1} mais)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          <div className="flex flex-col">
                            <span>{formatCurrency(commission.advisorCommission)}</span>
                            {isMultipleMonths && (
                              <span className="text-xs text-muted-foreground font-normal mt-1">
                                Soma de {commission.monthlyBreakdown.length} {commission.monthlyBreakdown.length === 1 ? "mês" : "meses"}
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
                    {selectedCommission.paymentDueDate.length > 0 
                      ? formatDate(selectedCommission.paymentDueDate[0]) 
                      : "N/A"}
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
                      {formatCurrency(selectedCommission.advisorCommission)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Descrição da Comissão</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedCommission.description}
                </p>
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
                          {formatCurrency(selectedCommission.advisorCommission)}
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
                      <TableHead className="min-w-[200px]">Investidor</TableHead>
                      {userRole === "escritorio" && <TableHead className="min-w-[150px]">Assessor</TableHead>}
                      <TableHead className="min-w-[120px]">Valor Investido</TableHead>
                      <TableHead className="min-w-[120px]">Data de Depósito</TableHead>
                      <TableHead className="min-w-[120px]">Comissão</TableHead>
                      <TableHead className="min-w-[80px]">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPaymentDate.commissions.map((commission) => (
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

