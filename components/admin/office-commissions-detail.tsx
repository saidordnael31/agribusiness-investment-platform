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
import { Download, Search, Eye, Building2, TrendingUp, Calendar, FileText, Calculator } from "lucide-react"
import { DynamicCommissionCalculator } from "./dynamic-commission-calculator"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getFifthBusinessDayOfMonth } from "@/lib/commission-calculator"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
} from "recharts"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CommissionDetail extends NewCommissionCalculation {
  investorEmail?: string
  pixReceipts?: Array<{
    id: string
    file_name: string
    file_url: string
    status: string
    created_at: string
  }>
}

interface AdvisorSummary {
  advisorId: string
  advisorName: string
  advisorEmail: string
  totalCommission: number
  commissions: CommissionDetail[]
}

export function OfficeCommissionsDetail() {
  const { toast } = useToast()
  const [allCommissions, setAllCommissions] = useState<CommissionDetail[]>([])
  const [advisorSummaries, setAdvisorSummaries] = useState<AdvisorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [selectedCommission, setSelectedCommission] = useState<CommissionDetail | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string | null>(null)
  const [chartView, setChartView] = useState<"table" | "chart">("table")
  const [calculatorModalOpen, setCalculatorModalOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    fetchCommissions()
  }, [])

  const fetchCommissions = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Buscar usuário logado
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        })
        return
      }
      
      setUser(currentUser)
      const user = currentUser

      // Buscar perfil do usuário para confirmar que é escritório
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, user_type, role, full_name")
        .eq("id", user.id)
        .single()

      if (!profile || profile.user_type !== "distributor" || profile.role !== "escritorio") {
        toast({
          title: "Erro",
          description: "Este recurso é apenas para escritórios",
          variant: "destructive",
        })
        return
      }

      // Buscar assessores vinculados a este escritório (office_id = user.id)
      console.log('[ESCRITÓRIO] Buscando assessores com office_id =', user.id);
      const { data: advisors, error: advisorsError } = await supabase
        .from("profiles")
        .select("id, full_name, email, office_id")
        .eq("office_id", user.id)
        .eq("user_type", "distributor")
        .eq("role", "assessor")

      if (advisorsError) {
        console.error('[ESCRITÓRIO] Erro ao buscar assessores:', advisorsError);
      }

      console.log('[ESCRITÓRIO] Assessores encontrados:', advisors?.length || 0);

      // Buscar TODOS os investidores vinculados ao escritório pelo office_id
      console.log('[ESCRITÓRIO] Buscando investidores com office_id =', user.id);
      const { data: allInvestorProfiles, error: investorsError } = await supabase
        .from("profiles")
        .select("id, full_name, email, parent_id, office_id")
        .eq("office_id", user.id)
        .eq("user_type", "investor")

      if (investorsError) {
        console.error('[ESCRITÓRIO] Erro ao buscar investidores:', investorsError);
        toast({
          title: "Erro",
          description: `Erro ao buscar investidores: ${investorsError.message}`,
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      console.log('[ESCRITÓRIO] Investidores encontrados (por office_id):', allInvestorProfiles?.length || 0);
      if (allInvestorProfiles && allInvestorProfiles.length > 0) {
        console.log('[ESCRITÓRIO] IDs dos investidores:', allInvestorProfiles.map(p => p.id));
      }

      // Se não encontrou investidores por office_id, tentar buscar pelos assessores
      let finalInvestorProfiles = allInvestorProfiles || [];
      
      if (finalInvestorProfiles.length === 0) {
        console.log('[ESCRITÓRIO] Nenhum investidor encontrado com office_id =', user.id);
        console.log('[ESCRITÓRIO] Verificando se há investidores sem office_id mas com assessores do escritório...');
        // Verificar se há investidores sem office_id mas com assessores do escritório
        if (advisors && advisors.length > 0) {
          const advisorIds = advisors.map(a => a.id);
          const { data: investorsByParent } = await supabase
            .from("profiles")
            .select("id, full_name, email, parent_id, office_id")
            .in("parent_id", advisorIds)
            .eq("user_type", "investor")
          
          console.log('[ESCRITÓRIO] Investidores encontrados por parent_id (assessores):', investorsByParent?.length || 0);
          
          if (investorsByParent && investorsByParent.length > 0) {
            // Usar investidores encontrados pelos assessores
            finalInvestorProfiles = investorsByParent;
            console.log('[ESCRITÓRIO] Total de investidores (por parent_id):', finalInvestorProfiles.length);
          }
        }
      } else {
        // Se encontrou por office_id, também buscar por parent_id para ter completa
        if (advisors && advisors.length > 0) {
          const advisorIds = advisors.map(a => a.id);
          const { data: investorsByParent } = await supabase
            .from("profiles")
            .select("id, full_name, email, parent_id, office_id")
            .in("parent_id", advisorIds)
            .eq("user_type", "investor")
          
          if (investorsByParent && investorsByParent.length > 0) {
            // Combinar e remover duplicatas
            const allInvestors = [...finalInvestorProfiles, ...investorsByParent];
            finalInvestorProfiles = allInvestors.filter((profile, index, self) => 
              index === self.findIndex(p => p.id === profile.id)
            );
            console.log('[ESCRITÓRIO] Total de investidores (office_id + parent_id):', finalInvestorProfiles.length);
          }
        }
      }
      
      if (finalInvestorProfiles.length === 0) {
        console.log('[ESCRITÓRIO] Nenhum investidor encontrado');
        setAllCommissions([])
        setAdvisorSummaries([])
        setLoading(false)
        return
      }

      const investorIds = finalInvestorProfiles.map((p) => p.id)
      
      console.log('[ESCRITÓRIO] Total de investidores únicos:', investorIds.length);

      // Buscar TODOS os investimentos ativos dos investidores vinculados ao escritório
      console.log('[ESCRITÓRIO] Buscando investimentos para IDs:', investorIds);
      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select("id, user_id, amount, payment_date, created_at, status, commitment_period")
        .in("user_id", investorIds)
        .eq("status", "active")
      
      if (investmentsError) {
        console.error('[ESCRITÓRIO] Erro ao buscar investimentos:', investmentsError);
        toast({
          title: "Erro",
          description: `Erro ao buscar investimentos: ${investmentsError.message}`,
          variant: "destructive",
        })
        setLoading(false)
        return
      }
      
      console.log('[ESCRITÓRIO] Investimentos encontrados no banco:', investments?.length || 0);
      if (investments && investments.length > 0) {
        console.log('[ESCRITÓRIO] Investimentos com payment_date:', investments.filter(inv => inv.payment_date).length);
        console.log('[ESCRITÓRIO] Investimentos sem payment_date:', investments.filter(inv => !inv.payment_date).length);
      }
      
      // Filtrar apenas investimentos com payment_date OU created_at (para processar)
      const investmentsToProcess = investments?.filter(inv => inv.payment_date || inv.created_at) || [];
      
      console.log('[ESCRITÓRIO] Investimentos a processar (com data):', investmentsToProcess.length);
      
      if (investmentsToProcess.length === 0) {
        console.log('[ESCRITÓRIO] Nenhum investimento com data encontrado');
        setAllCommissions([])
        setAdvisorSummaries([])
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
        const investorProfile = finalInvestorProfiles.find((p) => p.id === investment.user_id)
        const advisorId = investorProfile?.parent_id
        const advisor = advisors?.find((a) => a.id === advisorId)
        
        // Se não encontrou assessor pelo parent_id, pode ser investidor direto do escritório
        if (!advisor && investorProfile?.office_id === user.id) {
          console.log('[ESCRITÓRIO] Investidor direto do escritório (sem assessor):', investorProfile.full_name);
        }

        // Determinar a data de pagamento (payment_date tem prioridade, senão usa created_at)
        const investmentPaymentDate = investment.payment_date || investment.created_at
        
        // Debug: log de todos os investimentos processados
        console.log('[ESCRITÓRIO] Processando investimento:', {
          id: investment.id,
          amount: investment.amount,
          payment_date: investmentPaymentDate,
          investor: investorProfile?.full_name,
          advisor: advisor?.full_name,
        });
        
        // Calcular comissão com nova lógica
        // IMPORTANTE: Para assessores, usar isForAdvisor=true (sem D+60, proporcional aos dias)
        // Para escritório, calcular normalmente (com D+60)
        
        let commissionCalc;
        
        if (advisor && advisorId) {
          // Investimento com assessor: calcular comissão do assessor e do escritório
          // Vamos calcular a comissão do assessor primeiro (sem D+60)
          const advisorCommissionCalc = calculateNewCommissionLogic({
            id: investment.id,
            user_id: investment.user_id,
            amount: Number(investment.amount),
            payment_date: investmentPaymentDate,
            commitment_period: investment.commitment_period || 12,
            investorName: investorProfile?.full_name || "Investidor",
            advisorId: advisorId,
            advisorName: advisor?.full_name || "Assessor",
            isForAdvisor: true, // Sem D+60 para assessor
          })
          
          // Agora calcular a comissão do escritório (sem D+60 também)
          const officeCommissionCalc = calculateNewCommissionLogic({
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
          
          // Combinar: usar comissão do assessor e do escritório
          commissionCalc = {
            ...advisorCommissionCalc,
            officeCommission: officeCommissionCalc.officeCommission,
          }
        } else {
          // Investidor direto do escritório (sem assessor): calcular apenas comissão do escritório
          const officeCommissionCalc = calculateNewCommissionLogic({
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
          
          commissionCalc = {
            ...officeCommissionCalc,
            advisorCommission: 0, // Sem assessor, comissão do assessor é zero
            advisorId: undefined,
            advisorName: undefined,
          }
        }
        
        // Debug: Log da comissão calculada
        console.log('[ESCRITÓRIO] Comissão calculada:', {
          id: investment.id,
          amount: investment.amount,
          payment_date: investmentPaymentDate,
          calculated_payment_due: commissionCalc.paymentDueDate,
          advisor_commission: commissionCalc.advisorCommission,
          office_commission: commissionCalc.officeCommission,
          periodLabel: commissionCalc.periodLabel
        });

        // Buscar comprovantes deste investimento
        const investmentReceipts = receipts?.filter(
          (r) => r.investment_id === investment.id
        ) || []

        processedCommissions.push({
          ...commissionCalc,
          investorEmail: investorProfile?.email,
          pixReceipts: investmentReceipts.map((r) => ({
            id: r.id,
            file_name: r.file_name,
            file_url: r.file_url,
            status: r.status,
            created_at: r.created_at,
          })),
        })
      }

      console.log('[ESCRITÓRIO] Total de comissões processadas:', processedCommissions.length);
      
      // Ordenar por data de pagamento (mais recente primeiro)
      processedCommissions.sort(
        (a, b) => {
          const aDate = a.paymentDueDate.length > 0 ? a.paymentDueDate[0] : new Date(0);
          const bDate = b.paymentDueDate.length > 0 ? b.paymentDueDate[0] : new Date(0);
          return bDate.getTime() - aDate.getTime();
        }
      )

      setAllCommissions(processedCommissions)
      console.log('[ESCRITÓRIO] Comissões salvas no estado:', processedCommissions.length);

      // Agrupar por assessor (se houver assessores)
      const summaries: AdvisorSummary[] = []
      if (advisors && advisors.length > 0) {
        for (const advisor of advisors) {
          const advisorCommissions = processedCommissions.filter(
            (c) => c.advisorId === advisor.id
          )
          const totalCommission = advisorCommissions.reduce(
            (sum, c) => sum + c.advisorCommission,
            0
          )

          summaries.push({
            advisorId: advisor.id,
            advisorName: advisor.full_name || "Assessor",
            advisorEmail: advisor.email || "",
            totalCommission,
            commissions: advisorCommissions,
          })
        }

        // Ordenar por total de comissão (maior primeiro)
        summaries.sort((a, b) => b.totalCommission - a.totalCommission)
      }

      setAdvisorSummaries(summaries)
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

  const getStatusBadge = (commission: CommissionDetail) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const paymentDate = commission.paymentDueDate.length > 0 ? commission.paymentDueDate[0] : new Date()
    paymentDate.setHours(0, 0, 0, 0)

    if (paymentDate < today) {
      return <Badge variant="destructive">Vencida</Badge>
    } else if (paymentDate.getTime() === today.getTime()) {
      return <Badge variant="default">Hoje</Badge>
    } else {
      return <Badge variant="secondary">Pendente</Badge>
    }
  }

  const getFilteredCommissions = () => {
    let filtered = allCommissions

    // Filtrar por assessor selecionado
    if (selectedAdvisorId) {
      filtered = filtered.filter((c) => c.advisorId === selectedAdvisorId)
    }

    // Filtrar por busca
    filtered = filtered.filter((commission) => {
      const matchesSearch =
        commission.investorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        commission.investorEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        commission.investmentId.includes(searchTerm) ||
        commission.advisorName?.toLowerCase().includes(searchTerm.toLowerCase())

      if (filterStatus === "all") return matchesSearch

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const paymentDate = commission.paymentDueDate.length > 0 ? commission.paymentDueDate[0] : new Date()
      paymentDate.setHours(0, 0, 0, 0)

      if (filterStatus === "pending") {
        return matchesSearch && paymentDate >= today
      } else if (filterStatus === "overdue") {
        return matchesSearch && paymentDate < today
      }

      return matchesSearch
    })

    return filtered
  }

  const filteredCommissions = getFilteredCommissions()

  const totalOfficeCommission = filteredCommissions.reduce(
    (sum, c) => sum + c.officeCommission,
    0
  )

  const totalAdvisorCommissions = filteredCommissions.reduce(
    (sum, c) => sum + c.advisorCommission,
    0
  )

  // Preparar dados para o gráfico (agrupar por data de recebimento)
  const chartData = () => {
    const groupedByDate = new Map<string, { date: Date; officeTotal: number; advisorTotal: number; count: number; officeCumulative: number; advisorCumulative: number }>()
    
    // Ordenar por data de pagamento (mais antiga primeiro)
    const sortedCommissions = [...filteredCommissions].sort(
      (a, b) => {
        const aDate = a.paymentDueDate.length > 0 ? a.paymentDueDate[0] : new Date(0);
        const bDate = b.paymentDueDate.length > 0 ? b.paymentDueDate[0] : new Date(0);
        return aDate.getTime() - bDate.getTime();
      }
    )
    
    let officeCumulative = 0
    let advisorCumulative = 0
    
    sortedCommissions.forEach((commission) => {
      const paymentDate = commission.paymentDueDate.length > 0 ? commission.paymentDueDate[0] : new Date()
      const dateStr = paymentDate.toISOString().split("T")[0]
      
      if (!groupedByDate.has(dateStr)) {
        groupedByDate.set(dateStr, {
          date: paymentDate,
          officeTotal: 0,
          advisorTotal: 0,
          count: 0,
          officeCumulative: 0,
          advisorCumulative: 0,
        })
      }
      
      const group = groupedByDate.get(dateStr)!
      group.officeTotal += commission.officeCommission
      group.advisorTotal += commission.advisorCommission
      group.count += 1
    })
    
    // Calcular acumulado
    const chartArray = Array.from(groupedByDate.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item) => {
        officeCumulative += item.officeTotal
        advisorCumulative += item.advisorTotal
        return {
          date: formatDate(item.date),
          dateFull: item.date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          officeTotal: item.officeTotal,
          advisorTotal: item.advisorTotal,
          total: item.officeTotal + item.advisorTotal,
          count: item.count,
          officeCumulative,
          advisorCumulative,
          totalCumulative: officeCumulative + advisorCumulative,
        }
      })
    
    return chartArray
  }

  const chartDataArray = chartData()

  // Calcular próximo quinto dia útil e total a receber (escritório)
  const getNextPaymentInfo = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Calcular próximo quinto dia útil (do mês atual ou próximo mês)
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    
    // Verificar se ainda há quinto dia útil neste mês
    const fifthDayThisMonth = getFifthBusinessDayOfMonth(currentYear, currentMonth)
    fifthDayThisMonth.setHours(0, 0, 0, 0)
    
    let nextFifthDay: Date
    if (fifthDayThisMonth > today) {
      nextFifthDay = fifthDayThisMonth
    } else {
      // Próximo mês
      if (currentMonth === 11) {
        nextFifthDay = getFifthBusinessDayOfMonth(currentYear + 1, 0)
      } else {
        nextFifthDay = getFifthBusinessDayOfMonth(currentYear, currentMonth + 1)
      }
      nextFifthDay.setHours(0, 0, 0, 0)
    }
    
    // Filtrar comissões que serão pagas nesse próximo quinto dia útil
    const nextFifthDayStr = nextFifthDay.toISOString().split("T")[0]
    console.log('[ESCRITÓRIO] Buscando comissões para data:', nextFifthDayStr);
    
    const commissionsForNextFifthDay = filteredCommissions.filter((c) => {
      const paymentDate = c.paymentDueDate.length > 0 ? c.paymentDueDate[0] : new Date()
      paymentDate.setHours(0, 0, 0, 0)
      const paymentStr = paymentDate.toISOString().split("T")[0]
      return paymentStr === nextFifthDayStr
    })
    
    console.log('[ESCRITÓRIO] Comissões encontradas para próximo pagamento:', commissionsForNextFifthDay.length);
    if (commissionsForNextFifthDay.length > 0) {
      console.log('[ESCRITÓRIO] Detalhes das comissões:', commissionsForNextFifthDay.map(c => ({
        id: c.investmentId,
        advisorCommission: c.advisorCommission,
        officeCommission: c.officeCommission,
        paymentDueDate: c.paymentDueDate
      })));
    }
    
    const totalOfficeNextPayment = commissionsForNextFifthDay.reduce(
      (sum, c) => sum + c.officeCommission,
      0
    )
    
    const totalAdvisorNextPayment = commissionsForNextFifthDay.reduce(
      (sum, c) => sum + c.advisorCommission,
      0
    )
    
    console.log('[ESCRITÓRIO] Total escritório a receber:', totalOfficeNextPayment);
    console.log('[ESCRITÓRIO] Total assessor a receber:', totalAdvisorNextPayment);
    console.log('[ESCRITÓRIO] Total geral a receber:', totalOfficeNextPayment + totalAdvisorNextPayment);
    
    return {
      date: nextFifthDay,
      dateFormatted: formatDate(nextFifthDay),
      officeTotal: totalOfficeNextPayment,
      advisorTotal: totalAdvisorNextPayment,
      total: totalOfficeNextPayment + totalAdvisorNextPayment,
      count: commissionsForNextFifthDay.length,
    }
  }

  const nextPaymentInfo = getNextPaymentInfo()

  // Preparar próximos recebimentos futuros
  const getNextPayments = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Filtrar apenas comissões futuras (próximos 12 meses)
    const oneYearFromNow = new Date(today)
    oneYearFromNow.setMonth(oneYearFromNow.getMonth() + 12)
    
    const futureCommissions = filteredCommissions.filter((c) => {
      const paymentDate = c.paymentDueDate.length > 0 ? c.paymentDueDate[0] : new Date(0)
      return paymentDate > today && paymentDate <= oneYearFromNow
    })
    
    // Agrupar por data
    const groupedByDate = new Map<string, { 
      date: Date; 
      officeTotal: number;
      advisorTotal: number;
      total: number;
      count: number; 
      commissions: typeof futureCommissions;
    }>()
    
    futureCommissions.forEach((commission) => {
      const paymentDate = commission.paymentDueDate.length > 0 ? commission.paymentDueDate[0] : new Date()
      const dateStr = paymentDate.toISOString().split("T")[0]
      
      if (!groupedByDate.has(dateStr)) {
        groupedByDate.set(dateStr, {
          date: paymentDate,
          officeTotal: 0,
          advisorTotal: 0,
          total: 0,
          count: 0,
          commissions: [],
        })
      }
      
      const group = groupedByDate.get(dateStr)!
      group.officeTotal += commission.officeCommission
      group.advisorTotal += commission.advisorCommission
      group.total = group.officeTotal + group.advisorTotal
      group.count += 1
      group.commissions.push(commission)
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
          officeTotal: item.officeTotal,
          advisorTotal: item.advisorTotal,
          total: item.total,
          count: item.count,
          daysUntil,
          dateObject: item.date,
          commissions: item.commissions,
        }
      })
  }

  const nextPayments = getNextPayments()

  const exportToCSV = () => {
    const headers = [
      "Assessor",
      "Investidor",
      "Email",
      "Valor Investimento",
      "Data Pagamento",
      "Data Vencimento",
      "Período",
      "Comissão Escritório",
      "Comissão Assessor",
      "Status",
    ]

    const rows = filteredCommissions.map((c) => [
      c.advisorName || "N/A",
      c.investorName,
      c.investorEmail || "",
      formatCurrency(c.amount),
      formatDate(c.paymentDate),
      formatDate(c.paymentDueDate.length > 0 ? c.paymentDueDate[0] : new Date()),
      c.periodLabel,
      formatCurrency(c.officeCommission),
      formatCurrency(c.advisorCommission),
      (c.paymentDueDate.length > 0 ? c.paymentDueDate[0] : new Date()) < new Date() ? "Vencida" : "Pendente",
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `comissoes_escritorio_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToPDF = () => {
    const doc = new jsPDF('landscape')
    
    // Título
    doc.setFontSize(18)
    doc.text('Relatório de Comissões - Escritório', 14, 15)
    
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
    doc.text(`Escritório: ${formatCurrency(nextPaymentInfo.officeTotal)}`, 14, 38)
    doc.text(`Assessores: ${formatCurrency(nextPaymentInfo.advisorTotal)}`, 14, 46)
    doc.text(`Total: ${formatCurrency(nextPaymentInfo.total)}`, 150, 38)
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "normal")
    
    // Próxima data a receber (se houver recebimentos futuros)
    let startY = 54
    if (nextPayments.length > 0) {
      const nextPayment = nextPayments[0]
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text('Próxima data a receber:', 14, startY)
      doc.text(nextPayment.dateFull, 100, startY)
      doc.setTextColor(34, 197, 94)
      doc.text(`Escritório: ${formatCurrency(nextPayment.officeTotal)}`, 14, startY + 8)
      doc.text(`Assessores: ${formatCurrency(nextPayment.advisorTotal)}`, 14, startY + 16)
      doc.text(`Total: ${formatCurrency(nextPayment.total)}`, 150, startY + 8)
      doc.setTextColor(0, 0, 0)
      doc.setFont("helvetica", "normal")
      startY += 24
    }
    
    // Totais gerais
    doc.setFontSize(12)
    doc.text(`Total Comissões Escritório: ${formatCurrency(totalOfficeCommission)}`, 14, startY)
    doc.text(`Total Comissões Assessores: ${formatCurrency(totalAdvisorCommissions)}`, 14, startY + 7)
    doc.text(`Quantidade: ${filteredCommissions.length} comissões`, 14, startY + 14)
    startY += 22
    
    // Preparar dados da tabela
    const tableData = filteredCommissions.map((c) => {
      const isMultipleMonths = c.monthlyBreakdown && c.monthlyBreakdown.length > 1
      const officeCommissionText = isMultipleMonths 
        ? `${formatCurrency(c.officeCommission)} (${c.monthlyBreakdown.length} meses)`
        : formatCurrency(c.officeCommission)
      const advisorCommissionText = isMultipleMonths 
        ? `${formatCurrency(c.advisorCommission)} (${c.monthlyBreakdown.length} meses)`
        : formatCurrency(c.advisorCommission)
      
      return [
        c.advisorName || 'N/A',
        c.investorName,
        c.investorEmail || '-',
        formatCurrency(c.amount),
        formatDate(c.paymentDate),
        formatDate(c.paymentDueDate.length > 0 ? c.paymentDueDate[0] : new Date()),
        officeCommissionText,
        advisorCommissionText,
      ]
    })
    
    // Adicionar tabela
    autoTable(doc, {
      head: [['Assessor', 'Investidor', 'Email', 'Valor Investido', 'Data Entrada', 'Data Pagamento', 'Comissão Escritório', 'Comissão Assessor']],
      body: tableData,
      startY: startY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 14, right: 14 },
    })
    
    // Salvar PDF
    doc.save(`comissoes_escritorio_${new Date().toISOString().split("T")[0]}.pdf`)
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
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Comissões do Escritório
              </CardTitle>
              <CardDescription>
                Visualize todas as comissões do escritório e dos assessores vinculados
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setCalculatorModalOpen(true)} variant="outline">
                <Calculator className="mr-2 h-4 w-4" />
                Calcular Comissões
              </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-primary/5 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-1">Total Comissões Escritório</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(totalOfficeCommission)}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-muted-foreground mb-1">
                Total Comissões Assessores
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalAdvisorCommissions)}
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por assessor, investidor, email ou ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedAdvisorId || "all"} onValueChange={(value) => setSelectedAdvisorId(value === "all" ? null : value)}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por assessor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Assessores</SelectItem>
                {advisorSummaries.map((advisor) => (
                  <SelectItem key={advisor.advisorId} value={advisor.advisorId}>
                    {advisor.advisorName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="overdue">Vencidas</SelectItem>
              </SelectContent>
            </Select>
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
              <TrendingUp className="mr-2 h-4 w-4" />
              Gráfico de Rentabilidade
            </Button>
          </div>

          {chartView === "chart" ? (
            <Card>
              <CardHeader>
                <CardTitle>Projeção de Rentabilidade e Datas de Recebimento</CardTitle>
                <CardDescription>
                  Visualize a rentabilidade acumulada do escritório e assessores ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Gráfico de área com rentabilidade acumulada */}
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartDataArray}>
                        <defs>
                          <linearGradient id="colorOffice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorAdvisor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--green-500))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--green-500))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="dateFull"
                          className="text-xs"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          className="text-xs"
                          tickFormatter={(value) =>
                            new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                              notation: "compact",
                            }).format(value)
                          }
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            formatCurrency(value),
                            name === "officeCumulative" ? "Escritório Acumulado" :
                            name === "advisorCumulative" ? "Assessores Acumulado" : name,
                          ]}
                          labelFormatter={(label) => `Data: ${label}`}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="officeCumulative"
                          stroke="hsl(var(--primary))"
                          fillOpacity={1}
                          fill="url(#colorOffice)"
                          name="officeCumulative"
                          stackId="1"
                        />
                        <Area
                          type="monotone"
                          dataKey="advisorCumulative"
                          stroke="hsl(var(--green-500))"
                          fillOpacity={1}
                          fill="url(#colorAdvisor)"
                          name="advisorCumulative"
                          stackId="1"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Gráfico de barras com recebimentos por data */}
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartDataArray}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="dateFull"
                          className="text-xs"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          className="text-xs"
                          tickFormatter={(value) =>
                            new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                              notation: "compact",
                            }).format(value)
                          }
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            formatCurrency(value),
                            name === "officeTotal" ? "Escritório" :
                            name === "advisorTotal" ? "Assessores" : name,
                          ]}
                          labelFormatter={(label) => `Data: ${label}`}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar
                          dataKey="officeTotal"
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                          name="officeTotal"
                          stackId="1"
                        />
                        <Bar
                          dataKey="advisorTotal"
                          fill="hsl(var(--green-500))"
                          radius={[4, 4, 0, 0]}
                          name="advisorTotal"
                          stackId="1"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Tabela resumo por data */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data de Recebimento</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>Escritório</TableHead>
                          <TableHead>Assessores</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Rentabilidade Acumulada</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {chartDataArray.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.dateFull}</TableCell>
                            <TableCell>{item.count} {item.count === 1 ? "comissão" : "comissões"}</TableCell>
                            <TableCell className="font-semibold text-primary">
                              {formatCurrency(item.officeTotal)}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatCurrency(item.advisorTotal)}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(item.total)}
                            </TableCell>
                            <TableCell className="font-semibold text-primary">
                              {formatCurrency(item.totalCumulative)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">Todas as Comissões</TabsTrigger>
              <TabsTrigger value="by-advisor">Por Assessor</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Assessor</TableHead>
                      <TableHead>Investidor</TableHead>
                      <TableHead>Valor Investido</TableHead>
                      <TableHead>Data Entrada</TableHead>
                      <TableHead>Data Pagamento</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Comissão Escritório</TableHead>
                      <TableHead>Comissão Assessor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCommissions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground">
                          Nenhuma comissão encontrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCommissions.map((commission) => (
                        <TableRow key={commission.investmentId}>
                          <TableCell>
                            <p className="font-medium">{commission.advisorName || "N/A"}</p>
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
                          <TableCell>{formatDate(commission.paymentDueDate.length > 0 ? commission.paymentDueDate[0] : new Date())}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{commission.periodLabel}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-primary">
                            {formatCurrency(commission.officeCommission)}
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(commission.advisorCommission)}
                          </TableCell>
                          <TableCell>{getStatusBadge(commission)}</TableCell>
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="by-advisor" className="space-y-4">
              {advisorSummaries.map((advisor) => (
                <Card key={advisor.advisorId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{advisor.advisorName}</CardTitle>
                        <CardDescription>{advisor.advisorEmail}</CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total de Comissões</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(advisor.totalCommission)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Investidor</TableHead>
                            <TableHead>Valor Investido</TableHead>
                            <TableHead>Data Entrada</TableHead>
                            <TableHead>Data Pagamento</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead>Comissão Assessor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {advisor.commissions.map((commission) => (
                            <TableRow key={commission.investmentId}>
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
                              <TableCell>{formatDate(commission.paymentDueDate.length > 0 ? commission.paymentDueDate[0] : new Date())}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{commission.periodLabel}</Badge>
                              </TableCell>
                              <TableCell className="font-semibold text-green-600">
                                {formatCurrency(commission.advisorCommission)}
                              </TableCell>
                              <TableCell>{getStatusBadge(commission)}</TableCell>
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
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Modal de Calculadora de Comissões Dinâmicas */}
      <DynamicCommissionCalculator
        isOpen={calculatorModalOpen}
        onClose={() => setCalculatorModalOpen(false)}
        officeId={user?.id}
      />

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
                  <p className="text-sm font-medium text-muted-foreground">Assessor</p>
                  <p className="font-semibold">{selectedCommission.advisorName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Investidor</p>
                  <p className="font-semibold">{selectedCommission.investorName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCommission.investorEmail}
                  </p>
                </div>
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
                    Data de Entrada
                  </p>
                  <p>{formatDate(selectedCommission.paymentDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Data de Vencimento
                  </p>
                  <p>{formatDate(selectedCommission.paymentDueDate.length > 0 ? selectedCommission.paymentDueDate[0] : new Date())}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Período de Corte</p>
                  <p>{formatDate(selectedCommission.cutoffPeriod.cutoffDate)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Valores da Comissão</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground">Escritório (1%)</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(selectedCommission.officeCommission)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-muted-foreground">Assessor (3%)</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(selectedCommission.advisorCommission)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-muted-foreground">Investidor (2%)</p>
                    <p className="text-lg font-bold text-purple-600">
                      {formatCurrency(selectedCommission.investorCommission)}
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
                        className="p-3 bg-muted/30 rounded-lg border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold capitalize">
                            {month.month} de {month.year}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Escritório (1%)</p>
                            <p className="font-medium text-primary">
                              {formatCurrency(month.officeCommission)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Assessor (3%)</p>
                            <p className="font-medium text-green-600">
                              {formatCurrency(month.advisorCommission)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Investidor (2%)</p>
                            <p className="font-medium text-purple-600">
                              {formatCurrency(month.investorCommission)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">Total do Período</p>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Escritório</p>
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(selectedCommission.officeCommission)}
                          </p>
                        </div>
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
    </div>
  )
}

