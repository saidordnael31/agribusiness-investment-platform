"use client"

import { DistributorLayout } from "@/components/layout/distributor-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, Loader2, TrendingUp, Users, UserPlus, DollarSign, ChevronLeft, ChevronRight, Eye, X } from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts"
import { calculateNewCommissionLogic } from "@/lib/commission-calculator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { UserProfileView } from "@/components/admin/user-profile-view"

interface EscritorioData {
  id: string
  name: string
  totalInvested: number
  assessoresCount: number
  investorsCount: number
}

interface AporteMensal {
  mes: string
  [key: string]: string | number // Cada escritório/assessor será uma propriedade dinâmica
}

interface AssessorData {
  id: string
  name: string
  totalInvested: number
  investorsCount: number
}

interface InvestorData {
  id: string
  name: string
  totalInvested: number
}

const COLORS = [
  "#00BC6E", // Verde
  "#3B82F6", // Azul
  "#8B5CF6", // Roxo
  "#F59E0B", // Laranja
  "#EF4444", // Vermelho
  "#06B6D4", // Ciano
  "#EC4899", // Rosa
  "#10B981", // Verde esmeralda
  "#6366F1", // Índigo
  "#F97316", // Laranja escuro
]

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function AnalisesPage() {
  const router = useRouter()
  const [escritorios, setEscritorios] = useState<EscritorioData[]>([])
  const [assessores, setAssessores] = useState<AssessorData[]>([])
  const [allAssessores, setAllAssessores] = useState<AssessorData[]>([]) // Lista completa de assessores para o select
  const [aporteMensalData, setAporteMensalData] = useState<AporteMensal[]>([])
  const [comissaoMensalData, setComissaoMensalData] = useState<AporteMensal[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [viewMode, setViewMode] = useState<"geral" | "escritorio">("geral")
  const [selectedEscritorio, setSelectedEscritorio] = useState<string>("")
  const [selectedAssessor, setSelectedAssessor] = useState<string>("all")
  const [assessorDetail, setAssessorDetail] = useState<AssessorData | null>(null)
  const [investorsData, setInvestorsData] = useState<InvestorData[]>([])
  const [comissaoPeriodIndex, setComissaoPeriodIndex] = useState<number>(0) // Índice para navegar nos períodos
  const [comissaoPeriodMonths, setComissaoPeriodMonths] = useState<number>(12) // Número de meses a exibir (2-12)
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  // Verificar se o usuário tem role "distribuidor"
  useEffect(() => {
    const checkRole = async () => {
      const userStr = localStorage.getItem("user")
      if (!userStr) {
        router.push("/login")
        return
      }

      try {
        const userData = JSON.parse(userStr)
        let userRole = userData.role

        // Se o role não estiver no localStorage, buscar do Supabase
        if (!userRole) {
          const supabase = createClient()
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userData.id)
            .single()

          userRole = profile?.role || null
        }

        // Se não for distribuidor, redirecionar para o dashboard
        if (userRole !== "distribuidor") {
          router.push("/distributor")
          return
        }

        setUser(userData)
      } catch (error) {
        console.error("Erro ao verificar role:", error)
        router.push("/distributor")
      }
    }

    checkRole()
  }, [router])

  // Carregar dados quando o usuário estiver definido e viewMode for "geral"
  useEffect(() => {
    if (user?.id && viewMode === "geral") {
      fetchEscritoriosData(user.id)
    }
  }, [user, viewMode])

  const fetchEscritoriosData = async (distribuidorId: string) => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Buscar escritórios onde role == "escritorio" e parent_id = distribuidorId
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "escritorio")
        .eq("parent_id", distribuidorId)
        .order("created_at", { ascending: false })

      if (profilesError) {
        console.error("Erro ao buscar escritórios:", profilesError)
        return
      }

      if (!profiles || profiles.length === 0) {
        setEscritorios([])
        setLoading(false)
        return
      }

      const escritorioIds = profiles.map((p) => p.id)

      // Buscar assessores usando distributor_id (incluindo assessores externos)
      const { data: assessores, error: assessoresError } = await supabase
        .from("profiles")
        .select("id, parent_id, office_id, user_type, role, distributor_id")
        .eq("user_type", "distributor")
        .in("role", ["assessor", "assessor_externo"])
        .eq("distributor_id", distribuidorId)

      if (assessoresError) {
        console.error("Erro ao buscar assessores:", assessoresError)
      }

      // Buscar investidores usando distributor_id
      const { data: investors, error: investorsError } = await supabase
        .from("profiles")
        .select("id, parent_id, office_id, distributor_id")
        .eq("user_type", "investor")
        .eq("distributor_id", distribuidorId)

      if (investorsError) {
        console.error("Erro ao buscar investidores:", investorsError)
      }

      const investorIds = (investors || []).map((i) => i.id)

      // Buscar investimentos (incluindo payment_date para gráfico de linha)
      let investments: any[] = []
      if (investorIds.length > 0) {
        const { data: investmentsData, error: investmentsError } = await supabase
          .from("investments")
          .select("id, user_id, amount, status, payment_date, commitment_period, profitability_liquidity")
          .eq("status", "active")
          .in("user_id", investorIds)
          .order("payment_date", { ascending: true })

        if (!investmentsError) {
          investments = investmentsData || []
        }
      }

      // Calcular totais por investidor
      const investmentsByInvestor = investments.reduce<Record<string, number>>(
        (acc, investment) => {
          const amount = Number(investment.amount) || 0
          const userId = investment.user_id
          acc[userId] = (acc[userId] || 0) + amount
          return acc
        },
        {}
      )

      // Contar assessores por escritório
      const assessoresByEscritorio = (assessores || []).reduce<Record<string, number>>(
        (acc, assessor) => {
          const escritorioId = assessor.office_id || assessor.parent_id
          if (escritorioId && escritorioIds.includes(escritorioId)) {
            acc[escritorioId] = (acc[escritorioId] || 0) + 1
          }
          return acc
        },
        {}
      )

      // Contar investidores por escritório
      const investorsByEscritorio: Record<string, Set<string>> = {}
      escritorioIds.forEach((id) => {
        investorsByEscritorio[id] = new Set()
      })

      // Adicionar investidores diretamente vinculados ao escritório
      ;(investors || []).forEach((investor) => {
        const escritorioId = investor.office_id
        if (escritorioId && escritorioIds.includes(escritorioId)) {
          investorsByEscritorio[escritorioId].add(investor.id)
        }
      })

      // Adicionar investidores vinculados via assessores
      ;(assessores || []).forEach((assessor) => {
        const escritorioId = assessor.office_id || assessor.parent_id
        if (escritorioId && escritorioIds.includes(escritorioId)) {
          ;(investors || []).forEach((investor) => {
            if (investor.parent_id === assessor.id) {
              investorsByEscritorio[escritorioId].add(investor.id)
            }
          })
        }
      })

      // Converter sets para contagens
      const investorsByEscritorioCount: Record<string, number> = {}
      Object.keys(investorsByEscritorio).forEach((escritorioId) => {
        investorsByEscritorioCount[escritorioId] = investorsByEscritorio[escritorioId].size
      })

      // Transformar dados dos escritórios
      const transformedEscritorios: EscritorioData[] = profiles.map((profile) => {
        const escritorioId = profile.id
        const escritorioAssessores = assessoresByEscritorio[escritorioId] || 0
        const escritorioInvestors = investorsByEscritorioCount[escritorioId] || 0

        // Calcular total investido
        const escritorioAssessorIds = (assessores || [])
          .filter((a) => (a.office_id || a.parent_id) === escritorioId)
          .map((a) => a.id)

        const escritorioInvestorIds = (investors || [])
          .filter(
            (i) =>
              i.office_id === escritorioId ||
              escritorioAssessorIds.includes(i.parent_id || "")
          )
          .map((i) => i.id)

        const totalInvested = escritorioInvestorIds.reduce(
          (sum, investorId) => {
            return sum + (investmentsByInvestor[investorId] || 0)
          },
          0
        )

        return {
          id: profile.id,
          name: profile.full_name || profile.email.split("@")[0],
          totalInvested,
          assessoresCount: escritorioAssessores,
          investorsCount: escritorioInvestors,
        }
      })

      setEscritorios(transformedEscritorios)

      // Preparar dados para gráfico de linha (aportes ao longo do tempo)
      const aportesPorMes: Record<string, Record<string, number>> = {}

      // Mapear investidor -> escritório
      const investorToEscritorio: Record<string, string> = {}
      transformedEscritorios.forEach((escritorio) => {
        const escritorioAssessorIds = (assessores || [])
          .filter((a) => (a.office_id || a.parent_id) === escritorio.id)
          .map((a) => a.id)

        const escritorioInvestorIds = (investors || [])
          .filter(
            (i) =>
              i.office_id === escritorio.id ||
              escritorioAssessorIds.includes(i.parent_id || "")
          )
          .map((i) => i.id)

        escritorioInvestorIds.forEach((investorId) => {
          investorToEscritorio[investorId] = escritorio.name
        })
      })

      // Processar investimentos por mês
      investments.forEach((investment) => {
        if (!investment.payment_date) return

        const date = new Date(investment.payment_date)
        const mesAno = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const mesLabel = date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })

        const escritorioName = investorToEscritorio[investment.user_id]
        if (!escritorioName) return

        if (!aportesPorMes[mesAno]) {
          aportesPorMes[mesAno] = { mes: mesLabel }
        }

        if (!aportesPorMes[mesAno][escritorioName]) {
          aportesPorMes[mesAno][escritorioName] = 0
        }

        aportesPorMes[mesAno][escritorioName] += Number(investment.amount) || 0
      })

      // Converter para array e ordenar por data
      const aportesArray: AporteMensal[] = Object.keys(aportesPorMes)
        .sort()
        .map((mesAno) => ({
          mes: aportesPorMes[mesAno].mes as string,
          ...Object.fromEntries(
            Object.entries(aportesPorMes[mesAno]).filter(([key]) => key !== "mes")
          ),
        }))

      // Garantir que todos os escritórios apareçam em todos os meses (com 0 se não houver)
      const escritorioNames = transformedEscritorios.map((e) => e.name)
      const aportesCompletos = aportesArray.map((mes) => {
        const mesCompleto: AporteMensal = { mes: mes.mes }
        escritorioNames.forEach((nome) => {
          mesCompleto[nome] = (mes[nome] as number) || 0
        })
        return mesCompleto
      })

      setAporteMensalData(aportesCompletos)

      // Buscar e processar comissões
      await fetchComissoesData(distribuidorId, transformedEscritorios, assessores, investors, investments, investorToEscritorio)
    } catch (error) {
      console.error("Erro ao buscar dados dos escritórios:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComissoesData = async (
    distribuidorId: string,
    escritoriosData: EscritorioData[],
    assessoresData: any[],
    investorsData: any[],
    investments: any[],
    investorToEscritorio: Record<string, string>
  ) => {
    try {
      if (!investments || investments.length === 0) {
        setComissaoMensalData([])
        return
      }

      // Buscar perfis dos investidores para obter nomes
      const supabase = createClient()
      const investorIds = investments.map((inv) => inv.user_id)
      const { data: investorProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", investorIds)

      const investorProfileMap = new Map(
        (investorProfiles || []).map((p: any) => [p.id, p])
      )

      // Processar comissões por mês
      const comissoesPorMes: Record<string, Record<string, number>> = {}

      // Processar cada investimento e calcular comissões
      for (const investment of investments) {
        if (!investment.payment_date && !investment.created_at) continue

        const investorProfile = investorProfileMap.get(investment.user_id)
        const escritorioName = investorToEscritorio[investment.user_id]
        if (!escritorioName) continue

        try {
          // Calcular comissões para o escritório (1%)
          const paymentDate = investment.payment_date || investment.created_at
          const dateStr = typeof paymentDate === 'string' ? paymentDate.split('T')[0] : paymentDate

          const commissionCalc = calculateNewCommissionLogic({
            id: investment.id,
            user_id: investment.user_id,
            amount: Number(investment.amount) || 0,
            payment_date: dateStr,
            commitment_period: investment.commitment_period || 12,
            liquidity: investment.profitability_liquidity,
            investorName: investorProfile?.full_name || "Investidor",
            officeId: escritoriosData.find(e => e.name === escritorioName)?.id,
            officeName: escritorioName,
          })

          // Processar monthlyBreakdown para agrupar por mês
          if (commissionCalc.monthlyBreakdown) {
            commissionCalc.monthlyBreakdown.forEach((monthData) => {
              const mesAno = `${monthData.year}-${String(monthData.monthNumber).padStart(2, "0")}`
              const mesLabel = `${monthData.month.substring(0, 3)}/${monthData.year}`

              if (!comissoesPorMes[mesAno]) {
                comissoesPorMes[mesAno] = { mes: mesLabel }
              }

              if (!comissoesPorMes[mesAno][escritorioName]) {
                comissoesPorMes[mesAno][escritorioName] = 0
              }

              // Somar comissão do escritório (1%)
              comissoesPorMes[mesAno][escritorioName] += Number(monthData.officeCommission) || 0
            })
          }
        } catch (error) {
          console.error(`Erro ao calcular comissão para investimento ${investment.id}:`, error)
          continue
        }
      }

      // Converter para array e ordenar por data
      const comissoesArray: AporteMensal[] = Object.keys(comissoesPorMes)
        .sort()
        .map((mesAno) => ({
          mes: comissoesPorMes[mesAno].mes as string,
          ...Object.fromEntries(
            Object.entries(comissoesPorMes[mesAno]).filter(([key]) => key !== "mes")
          ),
        }))

      // Garantir que todos os escritórios apareçam em todos os meses (com 0 se não houver)
      const escritorioNames = escritoriosData.map((e) => e.name)
      const comissoesCompletas = comissoesArray.map((mes) => {
        const mesCompleto: AporteMensal = { mes: mes.mes }
        escritorioNames.forEach((nome) => {
          mesCompleto[nome] = (mes[nome] as number) || 0
        })
        return mesCompleto
      })

      setComissaoMensalData(comissoesCompletas)
    } catch (error) {
      console.error("Erro ao buscar dados de comissões:", error)
      setComissaoMensalData([])
    }
  }

  // Buscar dados por assessor quando estiver em modo "por escritório"
  useEffect(() => {
    if (viewMode === "escritorio" && selectedEscritorio) {
      if (selectedAssessor && selectedAssessor !== "all") {
        fetchAssessorDetailData(selectedAssessor)
      } else {
        // Se "Todos os assessores" está selecionado, mostrar todos os assessores do escritório
        fetchAssessoresData(selectedEscritorio)
        setAssessorDetail(null)
        setInvestorsData([])
        setComissaoMensalData([])
        setComissaoPeriodIndex(0) // Resetar índice ao trocar de escritório
      }
    } else if (viewMode === "geral" && user?.id) {
      // Recarregar dados dos escritórios quando voltar para visão geral
      fetchEscritoriosData(user.id)
      setSelectedAssessor("all")
      setAssessorDetail(null)
      setInvestorsData([])
      setComissaoMensalData([])
      setComissaoPeriodIndex(0) // Resetar índice ao voltar para visão geral
    }
  }, [viewMode, selectedEscritorio, selectedAssessor, user?.id])

  const fetchAssessoresData = async (escritorioId: string) => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Buscar assessores do escritório
      const { data: assessoresData, error: assessoresError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("user_type", "distributor")
        .in("role", ["assessor", "assessor_externo"])
        .or(`office_id.eq.${escritorioId},parent_id.eq.${escritorioId}`)

      if (assessoresError) {
        console.error("Erro ao buscar assessores:", assessoresError)
        return
      }

      if (!assessoresData || assessoresData.length === 0) {
        setAssessores([])
        setAllAssessores([])
        setAporteMensalData([])
        setComissaoMensalData([])
        setLoading(false)
        return
      }

      const assessorIds = assessoresData.map((a) => a.id)

      // Buscar investidores dos assessores
      const { data: investors, error: investorsError } = await supabase
        .from("profiles")
        .select("id, parent_id")
        .eq("user_type", "investor")
        .in("parent_id", assessorIds)

      if (investorsError) {
        console.error("Erro ao buscar investidores:", investorsError)
      }

      const investorIds = (investors || []).map((i) => i.id)

      // Buscar investimentos
      let investments: any[] = []
      if (investorIds.length > 0) {
        const { data: investmentsData, error: investmentsError } = await supabase
          .from("investments")
          .select("id, user_id, amount, status, payment_date, commitment_period, profitability_liquidity")
          .eq("status", "active")
          .in("user_id", investorIds)
          .order("payment_date", { ascending: true })

        if (!investmentsError) {
          investments = investmentsData || []
        }
      }

      // Calcular totais por assessor
      const investmentsByInvestor = investments.reduce<Record<string, number>>(
        (acc, investment) => {
          const amount = Number(investment.amount) || 0
          const userId = investment.user_id
          acc[userId] = (acc[userId] || 0) + amount
          return acc
        },
        {}
      )

      // Contar investidores por assessor
      const investorsByAssessor: Record<string, number> = {}
      assessorIds.forEach((assessorId) => {
        const assessorInvestors = (investors || []).filter(
          (inv) => inv.parent_id === assessorId
        )
        investorsByAssessor[assessorId] = assessorInvestors.length
      })

      // Transformar dados dos assessores
      const transformedAssessores: AssessorData[] = assessoresData.map((assessor) => {
        const assessorInvestorIds = (investors || [])
          .filter((inv) => inv.parent_id === assessor.id)
          .map((inv) => inv.id)

        const totalInvested = assessorInvestorIds.reduce(
          (sum, investorId) => {
            return sum + (investmentsByInvestor[investorId] || 0)
          },
          0
        )

        return {
          id: assessor.id,
          name: assessor.full_name || assessor.email.split("@")[0],
          totalInvested,
          investorsCount: investorsByAssessor[assessor.id] || 0,
        }
      })

      setAssessores(transformedAssessores)
      setAllAssessores(transformedAssessores) // Manter lista completa para o select

      // Preparar dados para gráfico de linha por assessor
      const aportesPorMes: Record<string, Record<string, number>> = {}
      const investorToAssessor: Record<string, string> = {}

      transformedAssessores.forEach((assessor) => {
        const assessorInvestorIds = (investors || [])
          .filter((inv) => inv.parent_id === assessor.id)
          .map((inv) => inv.id)

        assessorInvestorIds.forEach((investorId) => {
          investorToAssessor[investorId] = assessor.name
        })
      })

      investments.forEach((investment) => {
        if (!investment.payment_date) return

        const date = new Date(investment.payment_date)
        const mesAno = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const mesLabel = date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })

        const assessorName = investorToAssessor[investment.user_id]
        if (!assessorName) return

        if (!aportesPorMes[mesAno]) {
          aportesPorMes[mesAno] = { mes: mesLabel }
        }

        if (!aportesPorMes[mesAno][assessorName]) {
          aportesPorMes[mesAno][assessorName] = 0
        }

        aportesPorMes[mesAno][assessorName] += Number(investment.amount) || 0
      })

      const aportesArray: AporteMensal[] = Object.keys(aportesPorMes)
        .sort()
        .map((mesAno) => ({
          mes: aportesPorMes[mesAno].mes as string,
          ...Object.fromEntries(
            Object.entries(aportesPorMes[mesAno]).filter(([key]) => key !== "mes")
          ),
        }))

      const assessorNames = transformedAssessores.map((a) => a.name)
      const aportesCompletos = aportesArray.map((mes) => {
        const mesCompleto: AporteMensal = { mes: mes.mes }
        assessorNames.forEach((nome) => {
          mesCompleto[nome] = (mes[nome] as number) || 0
        })
        return mesCompleto
      })

      setAporteMensalData(aportesCompletos)

      // Buscar comissões por assessor
      await fetchComissoesPorAssessor(transformedAssessores, investors, investments, investorToAssessor)
    } catch (error) {
      console.error("Erro ao buscar dados dos assessores:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComissoesPorAssessor = async (
    assessoresData: AssessorData[],
    investorsData: any[],
    investments: any[],
    investorToAssessor: Record<string, string>
  ) => {
    try {
      if (!investments || investments.length === 0) {
        setComissaoMensalData([])
        return
      }

      const supabase = createClient()
      const investorIds = investments.map((inv) => inv.user_id)
      const { data: investorProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", investorIds)

      const investorProfileMap = new Map(
        (investorProfiles || []).map((p: any) => [p.id, p])
      )

      // Processar comissões por mês
      const comissoesPorMes: Record<string, Record<string, number>> = {}

      // Processar cada investimento e calcular comissões
      for (const investment of investments) {
        if (!investment.payment_date && !investment.created_at) continue

        const investorProfile = investorProfileMap.get(investment.user_id)
        const assessorName = investorToAssessor[investment.user_id]
        if (!assessorName) continue

        try {
          const paymentDate = investment.payment_date || investment.created_at
          const dateStr = typeof paymentDate === 'string' ? paymentDate.split('T')[0] : paymentDate

          const assessor = assessoresData.find(a => a.name === assessorName)
          if (!assessor) continue

          // Calcular comissões para o assessor (3%)
          const commissionCalc = calculateNewCommissionLogic({
            id: investment.id,
            user_id: investment.user_id,
            amount: Number(investment.amount) || 0,
            payment_date: dateStr,
            commitment_period: investment.commitment_period || 12,
            liquidity: investment.profitability_liquidity,
            investorName: investorProfile?.full_name || "Investidor",
            advisorId: assessor.id,
            advisorName: assessor.name,
            advisorRole: "assessor",
            isForAdvisor: true,
          })

          // Processar monthlyBreakdown para agrupar por mês
          if (commissionCalc.monthlyBreakdown) {
            commissionCalc.monthlyBreakdown.forEach((monthData) => {
              const mesAno = `${monthData.year}-${String(monthData.monthNumber).padStart(2, "0")}`
              const mesLabel = `${monthData.month.substring(0, 3)}/${monthData.year}`

              if (!comissoesPorMes[mesAno]) {
                comissoesPorMes[mesAno] = { mes: mesLabel }
              }

              if (!comissoesPorMes[mesAno][assessorName]) {
                comissoesPorMes[mesAno][assessorName] = 0
              }

              // Somar comissão do assessor (3%)
              comissoesPorMes[mesAno][assessorName] += Number(monthData.advisorCommission) || 0
            })
          }
        } catch (error) {
          console.error(`Erro ao calcular comissão para investimento ${investment.id}:`, error)
          continue
        }
      }

      const comissoesArray: AporteMensal[] = Object.keys(comissoesPorMes)
        .sort()
        .map((mesAno) => ({
          mes: comissoesPorMes[mesAno].mes as string,
          ...Object.fromEntries(
            Object.entries(comissoesPorMes[mesAno]).filter(([key]) => key !== "mes")
          ),
        }))

      const assessorNames = assessoresData.map((a) => a.name)
      const comissoesCompletas = comissoesArray.map((mes) => {
        const mesCompleto: AporteMensal = { mes: mes.mes }
        assessorNames.forEach((nome) => {
          mesCompleto[nome] = (mes[nome] as number) || 0
        })
        return mesCompleto
      })

      setComissaoMensalData(comissoesCompletas)
    } catch (error) {
      console.error("Erro ao buscar dados de comissões por assessor:", error)
      setComissaoMensalData([])
    }
  }

  const fetchAssessorDetailData = async (assessorId: string) => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Buscar dados do assessor
      const { data: assessorData, error: assessorError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", assessorId)
        .single()

      if (assessorError || !assessorData) {
        console.error("Erro ao buscar assessor:", assessorError)
        return
      }

      // Buscar investidores do assessor
      const { data: investors, error: investorsError } = await supabase
        .from("profiles")
        .select("id, parent_id, full_name, email")
        .eq("user_type", "investor")
        .eq("parent_id", assessorId)

      if (investorsError) {
        console.error("Erro ao buscar investidores:", investorsError)
      }

      const investorIds = (investors || []).map((i) => i.id)

      // Buscar investimentos
      let investments: any[] = []
      if (investorIds.length > 0) {
        const { data: investmentsData, error: investmentsError } = await supabase
          .from("investments")
          .select("id, user_id, amount, status, payment_date, commitment_period, profitability_liquidity")
          .eq("status", "active")
          .in("user_id", investorIds)
          .order("payment_date", { ascending: true })

        if (!investmentsError) {
          investments = investmentsData || []
        }
      }

      // Calcular totais
      const investmentsByInvestor = investments.reduce<Record<string, number>>(
        (acc, investment) => {
          const amount = Number(investment.amount) || 0
          const userId = investment.user_id
          acc[userId] = (acc[userId] || 0) + amount
          return acc
        },
        {}
      )

      const totalInvested = investorIds.reduce(
        (sum, investorId) => {
          return sum + (investmentsByInvestor[investorId] || 0)
        },
        0
      )

      const assessorDetailData: AssessorData = {
        id: assessorData.id,
        name: assessorData.full_name || assessorData.email.split("@")[0],
        totalInvested,
        investorsCount: investorIds.length,
      }

      setAssessorDetail(assessorDetailData)
      setAssessores([assessorDetailData]) // Para manter compatibilidade com os gráficos
      // Não atualizar allAssessores aqui - manter a lista completa para o select

      // Preparar dados dos investidores para o gráfico de pizza
      const investorsDetail: InvestorData[] = (investors || []).map((investor) => {
        const investorTotal = investmentsByInvestor[investor.id] || 0
        return {
          id: investor.id,
          name: investor.full_name || investor.email.split("@")[0],
          totalInvested: investorTotal,
        }
      })

      setInvestorsData(investorsDetail)

      // Preparar dados para gráfico de linha por investidor
      const aportesPorMes: Record<string, Record<string, number>> = {}
      const investorNameMap: Record<string, string> = {}

      // Criar mapa de investidor ID -> nome
      investorsDetail.forEach((investor) => {
        investorNameMap[investor.id] = investor.name
      })

      investments.forEach((investment) => {
        if (!investment.payment_date) return

        const date = new Date(investment.payment_date)
        const mesAno = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const mesLabel = date.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })

        const investorName = investorNameMap[investment.user_id]
        if (!investorName) return

        if (!aportesPorMes[mesAno]) {
          aportesPorMes[mesAno] = { mes: mesLabel }
        }

        if (!aportesPorMes[mesAno][investorName]) {
          aportesPorMes[mesAno][investorName] = 0
        }

        aportesPorMes[mesAno][investorName] += Number(investment.amount) || 0
      })

      const aportesArray: AporteMensal[] = Object.keys(aportesPorMes)
        .sort()
        .map((mesAno) => ({
          mes: aportesPorMes[mesAno].mes as string,
          ...Object.fromEntries(
            Object.entries(aportesPorMes[mesAno]).filter(([key]) => key !== "mes")
          ),
        }))

      // Garantir que todos os investidores apareçam em todos os meses (com 0 se não houver)
      const investorNames = investorsDetail.map((i) => i.name)
      const aportesCompletos = aportesArray.map((mes) => {
        const mesCompleto: AporteMensal = { mes: mes.mes }
        investorNames.forEach((nome) => {
          mesCompleto[nome] = (mes[nome] as number) || 0
        })
        return mesCompleto
      })

      setAporteMensalData(aportesCompletos)

      // Buscar comissões por investidor
      await fetchComissoesPorInvestidor(investorsDetail, investments, investorNameMap)
    } catch (error) {
      console.error("Erro ao buscar dados do assessor:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchComissoesPorInvestidor = async (
    investorsData: InvestorData[],
    investments: any[],
    investorNameMap: Record<string, string>
  ) => {
    try {
      if (!investments || investments.length === 0) {
        setComissaoMensalData([])
        return
      }

      // Processar comissões por mês
      const comissoesPorMes: Record<string, Record<string, number>> = {}

      // Processar cada investimento e calcular comissões
      for (const investment of investments) {
        if (!investment.payment_date && !investment.created_at) continue

        const investorName = investorNameMap[investment.user_id]
        if (!investorName) continue

        try {
          const paymentDate = investment.payment_date || investment.created_at
          const dateStr = typeof paymentDate === 'string' ? paymentDate.split('T')[0] : paymentDate

          // Calcular comissões para o assessor (3%) - assumindo que o assessor é o parent do investidor
          const commissionCalc = calculateNewCommissionLogic({
            id: investment.id,
            user_id: investment.user_id,
            amount: Number(investment.amount) || 0,
            payment_date: dateStr,
            commitment_period: investment.commitment_period || 12,
            liquidity: investment.profitability_liquidity,
            investorName: investorName,
            advisorId: investment.user_id, // Usar user_id temporariamente, será ajustado
            advisorName: investorName,
            advisorRole: "assessor",
            isForAdvisor: true,
          })

          // Processar monthlyBreakdown para agrupar por mês
          if (commissionCalc.monthlyBreakdown) {
            commissionCalc.monthlyBreakdown.forEach((monthData) => {
              const mesAno = `${monthData.year}-${String(monthData.monthNumber).padStart(2, "0")}`
              const mesLabel = `${monthData.month.substring(0, 3)}/${monthData.year}`

              if (!comissoesPorMes[mesAno]) {
                comissoesPorMes[mesAno] = { mes: mesLabel }
              }

              if (!comissoesPorMes[mesAno][investorName]) {
                comissoesPorMes[mesAno][investorName] = 0
              }

              // Somar comissão do assessor (3%) - mas na verdade queremos mostrar a comissão total (assessor + escritório)
              // Para simplificar, vamos mostrar apenas a comissão do assessor
              comissoesPorMes[mesAno][investorName] += Number(monthData.advisorCommission) || 0
            })
          }
        } catch (error) {
          console.error(`Erro ao calcular comissão para investimento ${investment.id}:`, error)
          continue
        }
      }

      const comissoesArray: AporteMensal[] = Object.keys(comissoesPorMes)
        .sort()
        .map((mesAno) => ({
          mes: comissoesPorMes[mesAno].mes as string,
          ...Object.fromEntries(
            Object.entries(comissoesPorMes[mesAno]).filter(([key]) => key !== "mes")
          ),
        }))

      // Garantir que todos os investidores apareçam em todos os meses
      const investorNames = investorsData.map((i) => i.name)
      const comissoesCompletas = comissoesArray.map((mes) => {
        const mesCompleto: AporteMensal = { mes: mes.mes }
        investorNames.forEach((nome) => {
          mesCompleto[nome] = (mes[nome] as number) || 0
        })
        return mesCompleto
      })

      setComissaoMensalData(comissoesCompletas)
    } catch (error) {
      console.error("Erro ao buscar dados de comissões por investidor:", error)
      setComissaoMensalData([])
    }
  }

  // Preparar dados para os gráficos
  const valorCaptadoData = viewMode === "geral"
    ? escritorios.map((escritorio, index) => ({
        name: escritorio.name,
        value: escritorio.totalInvested,
        color: COLORS[index % COLORS.length],
      }))
    : selectedAssessor && selectedAssessor !== "all" && assessorDetail
    ? investorsData.map((investor, index) => ({
        name: investor.name,
        value: investor.totalInvested,
        color: COLORS[index % COLORS.length],
      }))
    : assessores.map((assessor, index) => ({
        name: assessor.name,
        value: assessor.totalInvested,
        color: COLORS[index % COLORS.length],
      }))

  const assessoresData = escritorios.map((escritorio, index) => ({
    name: escritorio.name,
    value: escritorio.assessoresCount,
    color: COLORS[index % COLORS.length],
  }))

  const investidoresData = viewMode === "geral"
    ? escritorios.map((escritorio, index) => ({
        name: escritorio.name,
        value: escritorio.investorsCount,
        color: COLORS[index % COLORS.length],
      }))
    : selectedAssessor && selectedAssessor !== "all" && assessorDetail
    ? [{
        name: assessorDetail.name,
        value: assessorDetail.investorsCount,
        color: COLORS[0],
      }]
    : assessores.map((assessor, index) => ({
        name: assessor.name,
        value: assessor.investorsCount,
        color: COLORS[index % COLORS.length],
      }))

  // Função auxiliar para verificar se há dados válidos (não vazios e com valores > 0)
  const hasValidData = (data: any[]) => {
    return data && data.length > 0 && data.some(item => item.value > 0)
  }

  // Função auxiliar para converter "Jan/2026" ou "jan de 2026" para Date
  const parseMonthLabel = (mesLabel: string): Date | null => {
    try {
      // Formato "Jan/2026"
      if (mesLabel.includes('/')) {
        const [mes, ano] = mesLabel.split('/')
        const monthMap: Record<string, number> = {
          'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
          'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
        }
        const monthIndex = monthMap[mes.toLowerCase()]
        if (monthIndex === undefined || !ano) return null
        return new Date(parseInt(ano), monthIndex, 1)
      }
      
      // Formato "jan de 2026" (toLocaleDateString)
      const parts = mesLabel.split(' de ')
      if (parts.length === 2) {
        const mes = parts[0].toLowerCase()
        const ano = parts[1]
        const monthMap: Record<string, number> = {
          'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
          'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
        }
        const monthIndex = monthMap[mes]
        if (monthIndex === undefined || !ano) return null
        return new Date(parseInt(ano), monthIndex, 1)
      }
      
      return null
    } catch {
      return null
    }
  }

  // Função para obter dados de comissões a partir do mês atual
  const getComissaoDataFromCurrentMonth = () => {
    if (!comissaoMensalData || comissaoMensalData.length === 0) return []
    
    const hoje = new Date()
    const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    
    // Filtrar apenas meses a partir do mês atual (inclusive)
    const filtered = comissaoMensalData.filter(item => {
      if (!item.mes) return false
      const itemDate = parseMonthLabel(item.mes)
      if (!itemDate) {
        // Se não conseguir parsear, tentar incluir se parecer um formato válido
        return item.mes.includes('/') || item.mes.includes(' de ')
      }
      return itemDate >= mesAtual
    })
    
    // Se não houver dados a partir do mês atual, retornar todos os dados
    return filtered.length > 0 ? filtered : comissaoMensalData
  }

  // Função para obter dados de comissões até o mês atual (para navegação para trás)
  const getComissaoDataUpToCurrentMonth = () => {
    if (!comissaoMensalData || comissaoMensalData.length === 0) return []
    
    const hoje = new Date()
    const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    
    // Filtrar apenas meses até o mês atual (exclusive, para não duplicar com "a partir de")
    const filtered = comissaoMensalData.filter(item => {
      if (!item.mes) return false
      const itemDate = parseMonthLabel(item.mes)
      if (!itemDate) {
        return false
      }
      return itemDate < mesAtual
    })
    
    return filtered
  }

  // Função para filtrar dados de comissões mostrando apenas o período selecionado a partir do índice atual
  const getComissaoFilteredData = () => {
    // Fallback: se não houver dados, retornar array vazio
    if (!comissaoMensalData || comissaoMensalData.length === 0) return []
    
    const hoje = new Date()
    const mesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const monthsPerView = comissaoPeriodMonths
    
    // Quando índice = 0 (período atual/"Hoje"), mostrar os próximos N meses a partir do mês atual
    if (comissaoPeriodIndex === 0) {
      const dataFromCurrent = getComissaoDataFromCurrentMonth()
      
      if (dataFromCurrent.length === 0) {
        // Se não houver dados futuros, usar todos os dados disponíveis
        return comissaoMensalData.slice(0, monthsPerView)
      }
      
      // Pegar os primeiros N meses a partir do mês atual
      return dataFromCurrent.slice(0, monthsPerView)
    }
    
    // Para índices positivos, navegar para períodos mais futuros
    if (comissaoPeriodIndex > 0) {
      const dataFromCurrent = getComissaoDataFromCurrentMonth()
      
      if (dataFromCurrent.length === 0) {
        return []
      }
      
      const startIndex = comissaoPeriodIndex * monthsPerView
      const endIndex = startIndex + monthsPerView
      
      return dataFromCurrent.slice(startIndex, endIndex)
    }
    
    // Para índices negativos, navegar para períodos mais antigos
    if (comissaoPeriodIndex < 0) {
      const dataUpToCurrent = getComissaoDataUpToCurrentMonth()
      
      if (dataUpToCurrent.length === 0) {
        return []
      }
      
      // Índice -1 = últimos N meses antes do mês atual
      // Índice -2 = N meses antes disso, etc.
      const absIndex = Math.abs(comissaoPeriodIndex)
      const totalMonths = dataUpToCurrent.length
      const startIndex = Math.max(0, totalMonths - (absIndex * monthsPerView) - monthsPerView)
      const endIndex = Math.max(0, totalMonths - (absIndex * monthsPerView))
      
      if (startIndex >= endIndex || endIndex === 0) {
        return []
      }
      
      return dataUpToCurrent.slice(startIndex, endIndex)
    }
    
    return []
  }

  // Função para obter o período atual sendo exibido
  const getComissaoPeriodLabel = () => {
    if (!comissaoMensalData || comissaoMensalData.length === 0) return ""
    
    const filteredData = getComissaoFilteredData()
    if (filteredData.length === 0) return ""
    
    const firstMonth = filteredData[0]?.mes || ""
    const lastMonth = filteredData[filteredData.length - 1]?.mes || ""
    
    return `${firstMonth} - ${lastMonth}`
  }

  // Função para verificar se pode navegar para trás (períodos mais antigos)
  const canNavigateComissaoBack = () => {
    if (!comissaoMensalData || comissaoMensalData.length === 0) return false
    
    // Se estiver no índice 0, verificar se há dados antes do mês atual
    if (comissaoPeriodIndex === 0) {
      const dataUpToCurrent = getComissaoDataUpToCurrentMonth()
      return dataUpToCurrent.length > 0
    }
    
    // Se estiver em índice negativo, verificar se há mais períodos antigos
    if (comissaoPeriodIndex < 0) {
      const dataUpToCurrent = getComissaoDataUpToCurrentMonth()
      const monthsPerView = comissaoPeriodMonths
      const absIndex = Math.abs(comissaoPeriodIndex)
      const totalMonths = dataUpToCurrent.length
      const startIndex = Math.max(0, totalMonths - (absIndex * monthsPerView) - monthsPerView)
      return startIndex > 0
    }
    
    // Se estiver em índice positivo, sempre pode voltar (indo para índice 0 ou negativo)
    return true
  }

  // Função para verificar se pode navegar para frente (períodos mais futuros)
  const canNavigateComissaoForward = () => {
    if (!comissaoMensalData || comissaoMensalData.length === 0) return false
    
    const dataFromCurrent = getComissaoDataFromCurrentMonth()
    const monthsPerView = comissaoPeriodMonths
    
    // Se estiver no índice 0, verificar se há mais meses futuros do que o período selecionado
    if (comissaoPeriodIndex === 0) {
      return dataFromCurrent.length > monthsPerView
    }
    
    // Se estiver em índice positivo, verificar se há mais períodos futuros
    if (comissaoPeriodIndex > 0) {
      const startIndex = (comissaoPeriodIndex + 1) * monthsPerView
      return startIndex < dataFromCurrent.length
    }
    
    // Se estiver em índice negativo, pode ir para frente (indo para índice 0 ou positivo)
    return true
  }

  const CustomTooltip = ({ active, payload, chartType }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      let valueText = ""
      
      if (chartType === "valor") {
        valueText = formatCurrency(data.value)
      } else if (chartType === "assessores") {
        valueText = `${data.value} assessor${data.value !== 1 ? "es" : ""}`
      } else if (chartType === "investidores") {
        valueText = `${data.value} investidor${data.value !== 1 ? "es" : ""}`
      }
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">{valueText}</p>
        </div>
      )
    }
    return null
  }

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percent < 0.05) return null // Não mostrar labels muito pequenos

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  if (loading) {
    return (
      <ProtectedRoute allowedTypes={["distributor"]}>
        <DistributorLayout>
          <div className="container mx-auto p-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          </div>
        </DistributorLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedTypes={["distributor"]}>
      <DistributorLayout>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-white">Análises</h1>
              <p className="text-white/80 mb-6">
                Visualize gráficos e métricas comparativas dos seus escritórios
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="view-mode" className="text-white cursor-pointer">
                  Visão Geral
                </Label>
                <Switch
                  id="view-mode"
                  checked={viewMode === "escritorio"}
                  onCheckedChange={(checked) => {
                    setViewMode(checked ? "escritorio" : "geral")
                    if (checked && escritorios.length > 0) {
                      // Selecionar o primeiro escritório automaticamente
                      setSelectedEscritorio(escritorios[0].id)
                    } else {
                      setSelectedEscritorio("")
                      setSelectedAssessor("all")
                      setAssessorDetail(null)
                      setAllAssessores([])
                    }
                  }}
                  className="data-[state=checked]:bg-[#00BC6E] data-[state=unchecked]:bg-white/20"
                />
                <Label htmlFor="view-mode" className="text-white cursor-pointer">
                  Por Escritório
                </Label>
              </div>
              {viewMode === "escritorio" && (
                <>
                  <Select 
                    value={selectedEscritorio} 
                    onValueChange={(value) => {
                      setSelectedEscritorio(value)
                      setSelectedAssessor("all")
                      setAssessorDetail(null)
                      setAllAssessores([]) // Limpar lista ao trocar escritório
                    }}
                  >
                    <SelectTrigger className="w-[250px] bg-[#01223F]/80 border-[#00BC6E]/30 text-white hover:bg-[#01223F] hover:border-[#00BC6E]/50">
                      <SelectValue placeholder="Selecione um escritório" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#01223F] border-[#00BC6E]/30">
                      {escritorios.map((escritorio) => (
                        <SelectItem 
                          key={escritorio.id} 
                          value={escritorio.id}
                          className="text-white hover:bg-[#003562] focus:bg-[#003562]"
                        >
                          {escritorio.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedEscritorio && (
                    <Select 
                      value={selectedAssessor} 
                      onValueChange={(value) => {
                        setSelectedAssessor(value)
                        if (value === "all") {
                          setAssessorDetail(null)
                        }
                      }}
                    >
                      <SelectTrigger className="w-[250px] bg-[#01223F]/80 border-[#00BC6E]/30 text-white hover:bg-[#01223F] hover:border-[#00BC6E]/50">
                        <SelectValue placeholder="Todos os assessores" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#01223F] border-[#00BC6E]/30">
                        <SelectItem 
                          value="all"
                          className="text-white hover:bg-[#003562] focus:bg-[#003562]"
                        >
                          Todos os assessores
                        </SelectItem>
                        {allAssessores.map((assessor) => (
                          <SelectItem 
                            key={assessor.id} 
                            value={assessor.id}
                            className="text-white hover:bg-[#003562] focus:bg-[#003562]"
                          >
                            {assessor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </>
              )}
            </div>
          </div>

          {(viewMode === "geral" && escritorios.length === 0) ||
          (viewMode === "escritorio" && (!selectedEscritorio || (assessores.length === 0 && selectedAssessor === "all"))) ? (
            <Card className="bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white">
              <CardContent className="py-12">
                <div className="text-center text-white/50">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">
                    {viewMode === "geral"
                      ? "Nenhum escritório encontrado"
                      : "Selecione um escritório ou não há assessores cadastrados"}
                  </p>
                  <p className="text-sm mt-2">
                    {viewMode === "geral"
                      ? "Cadastre escritórios para visualizar as análises"
                      : "Selecione um escritório para ver os dados dos assessores"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Cards de Resumo quando há escritório ou assessor selecionado */}
              {((viewMode === "escritorio" && selectedEscritorio) || (selectedAssessor && selectedAssessor !== "all")) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {/* Card: Total Captado */}
                <Card className="bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white/70 text-sm mb-2">Total Captado</p>
                        <p className="text-3xl font-bold text-white">
                          {(() => {
                            if (selectedAssessor && selectedAssessor !== "all" && assessorDetail) {
                              return formatCurrency(assessorDetail.totalInvested)
                            } else if (viewMode === "escritorio" && selectedEscritorio) {
                              const escritorio = escritorios.find(e => e.id === selectedEscritorio)
                              return formatCurrency(escritorio?.totalInvested || 0)
                            }
                            return formatCurrency(0)
                          })()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-12 w-12 text-white/30" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (selectedAssessor && selectedAssessor !== "all" && assessorDetail) {
                              setSelectedProfileUserId(assessorDetail.id)
                              setIsProfileModalOpen(true)
                            } else if (viewMode === "escritorio" && selectedEscritorio) {
                              setSelectedProfileUserId(selectedEscritorio)
                              setIsProfileModalOpen(true)
                            }
                          }}
                          className="text-white hover:bg-white/10 h-8 w-8 p-0"
                          title="Ver perfil"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card: Total de Assessores (apenas se não for assessor selecionado) */}
                {!(selectedAssessor && selectedAssessor !== "all") && (
                  <Card className="bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/70 text-sm mb-2">Total de Assessores</p>
                          <p className="text-3xl font-bold text-white">
                            {(() => {
                              if (viewMode === "escritorio" && selectedEscritorio) {
                                return assessores.length || 0
                              }
                              return 0
                            })()}
                          </p>
                        </div>
                        <Users className="h-12 w-12 text-white/30" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Card: Total de Investidores */}
                <Card className="bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-sm mb-2">Total de Investidores</p>
                        <p className="text-3xl font-bold text-white">
                          {(() => {
                            if (selectedAssessor && selectedAssessor !== "all" && assessorDetail) {
                              return assessorDetail.investorsCount || 0
                            } else if (viewMode === "escritorio" && selectedEscritorio) {
                              return assessores.reduce((sum, a) => sum + (a.investorsCount || 0), 0)
                            }
                            return 0
                          })()}
                        </p>
                      </div>
                      <UserPlus className="h-12 w-12 text-white/30" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              )}

              <div className={`grid grid-cols-1 ${
              selectedAssessor && selectedAssessor !== "all" 
                ? "lg:grid-cols-1" 
                : viewMode === "escritorio" 
                  ? "lg:grid-cols-2" 
                  : "lg:grid-cols-3"
            } gap-6`}>
              {/* Gráfico 1: Valor Total Captado / Valor Por Investidor */}
              <Card className="bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <CardTitle className="text-white">
                      {selectedAssessor && selectedAssessor !== "all" ? "Valor Por Investidor" : "Valor Total Captado"}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-white/70">
                    {selectedAssessor && selectedAssessor !== "all" 
                      ? "Distribuição por investidor" 
                      : viewMode === "geral" 
                        ? "Distribuição por escritório" 
                        : "Distribuição por assessor"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {hasValidData(valorCaptadoData) ? (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={valorCaptadoData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={CustomLabel}
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            onClick={(data: any) => {
                              // Encontrar o ID do usuário baseado no nome
                              if (selectedAssessor && selectedAssessor !== "all") {
                                // Se for investidor, buscar pelo nome
                                const investor = investorsData.find(inv => inv.name === data.name)
                                if (investor) {
                                  setSelectedProfileUserId(investor.id)
                                  setIsProfileModalOpen(true)
                                }
                              } else if (viewMode === "escritorio") {
                                // Se for assessor, buscar pelo nome
                                const assessor = assessores.find(a => a.name === data.name)
                                if (assessor) {
                                  setSelectedProfileUserId(assessor.id)
                                  setIsProfileModalOpen(true)
                                }
                              } else {
                                // Se for escritório, buscar pelo nome
                                const escritorio = escritorios.find(e => e.name === data.name)
                                if (escritorio) {
                                  setSelectedProfileUserId(escritorio.id)
                                  setIsProfileModalOpen(true)
                                }
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            {valorCaptadoData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip chartType="valor" />} />
                          <Legend
                            formatter={(value, entry: any) => {
                              const data = valorCaptadoData.find((d) => d.name === value)
                              return `${value} (${formatCurrency(data?.value || 0)})`
                            }}
                            wrapperStyle={{ color: "white", fontSize: "12px", cursor: "pointer" }}
                            onClick={(e: any) => {
                              const name = e.value || e.payload?.value
                              if (!name) {
                                console.warn('⚠️ [WARNING] Nome não encontrado no evento:', e)
                                return
                              }
                              
                              console.log('🔍 [DEBUG] Clique na legenda:', { name, selectedAssessor, viewMode })
                              
                              if (selectedAssessor && selectedAssessor !== "all") {
                                // Se for investidor, buscar pelo nome
                                const investor = investorsData.find(inv => inv.name === name)
                                console.log('🔍 [DEBUG] Investidor encontrado:', investor)
                                if (investor) {
                                  setSelectedProfileUserId(investor.id)
                                  setIsProfileModalOpen(true)
                                } else {
                                  console.warn('⚠️ [WARNING] Investidor não encontrado:', name, 'Lista:', investorsData.map(i => i.name))
                                }
                              } else if (viewMode === "escritorio") {
                                // Se for assessor, buscar pelo nome
                                const assessor = assessores.find(a => a.name === name)
                                console.log('🔍 [DEBUG] Assessor encontrado:', assessor)
                                if (assessor) {
                                  setSelectedProfileUserId(assessor.id)
                                  setIsProfileModalOpen(true)
                                } else {
                                  console.warn('⚠️ [WARNING] Assessor não encontrado:', name, 'Lista:', assessores.map(a => a.name))
                                }
                              } else {
                                // Se for escritório, buscar pelo nome
                                const escritorio = escritorios.find(e => e.name === name)
                                console.log('🔍 [DEBUG] Escritório encontrado:', escritorio)
                                if (escritorio) {
                                  setSelectedProfileUserId(escritorio.id)
                                  setIsProfileModalOpen(true)
                                } else {
                                  console.warn('⚠️ [WARNING] Escritório não encontrado:', name, 'Lista:', escritorios.map(e => e.name))
                                }
                              }
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] w-full flex items-center justify-center">
                      <div className="text-center text-white/50">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">Não há dados disponíveis</p>
                        <p className="text-sm mt-2">
                          {selectedAssessor && selectedAssessor !== "all"
                            ? "Não há investimentos registrados para este assessor"
                            : viewMode === "geral"
                              ? "Não há investimentos registrados para os escritórios"
                              : "Não há investimentos registrados para os assessores"}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gráfico 2: Assessores Cadastrados (apenas em visão geral) */}
              {viewMode === "geral" && (
                <Card className="bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      <CardTitle className="text-white">Assessores Cadastrados</CardTitle>
                    </div>
                    <CardDescription className="text-white/70">
                      Distribuição por escritório
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hasValidData(assessoresData) ? (
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={assessoresData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={CustomLabel}
                              innerRadius={60}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {assessoresData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip chartType="assessores" />} />
                            <Legend
                              formatter={(value, entry: any) => {
                                const data = assessoresData.find((d) => d.name === value)
                                return `${value} (${data?.value || 0})`
                              }}
                              wrapperStyle={{ color: "white", fontSize: "12px", cursor: "pointer" }}
                              onClick={(e: any) => {
                                const name = e.value || e.payload?.value
                                if (!name) return
                                
                                // Buscar escritório pelo nome
                                const escritorio = escritorios.find(e => e.name === name)
                                if (escritorio) {
                                  setSelectedProfileUserId(escritorio.id)
                                  setIsProfileModalOpen(true)
                                }
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] w-full flex items-center justify-center">
                        <div className="text-center text-white/50">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
                          <p className="text-lg font-medium">Não há dados disponíveis</p>
                          <p className="text-sm mt-2">Não há assessores cadastrados nos escritórios</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Gráfico 3: Investidores Cadastrados (oculto quando assessor selecionado) */}
              {!(selectedAssessor && selectedAssessor !== "all") && (
                <Card className="bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5" />
                      <CardTitle className="text-white">Investidores Cadastrados</CardTitle>
                    </div>
                    <CardDescription className="text-white/70">
                      {viewMode === "geral" ? "Distribuição por escritório" : "Distribuição por assessor"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hasValidData(investidoresData) ? (
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                          <Pie
                            data={investidoresData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={CustomLabel}
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                              {investidoresData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip chartType="investidores" />} />
                            <Legend
                              formatter={(value, entry: any) => {
                                const data = investidoresData.find((d) => d.name === value)
                                return `${value} (${data?.value || 0})`
                              }}
                              wrapperStyle={{ color: "white", fontSize: "12px", cursor: "pointer" }}
                              onClick={(e: any) => {
                                const name = e.value || e.payload?.value
                                if (!name) return
                                
                                if (viewMode === "escritorio") {
                                  // Se for assessor, buscar pelo nome
                                  const assessor = assessores.find(a => a.name === name)
                                  if (assessor) {
                                    setSelectedProfileUserId(assessor.id)
                                    setIsProfileModalOpen(true)
                                  }
                                } else {
                                  // Se for escritório, buscar pelo nome
                                  const escritorio = escritorios.find(e => e.name === name)
                                  if (escritorio) {
                                    setSelectedProfileUserId(escritorio.id)
                                    setIsProfileModalOpen(true)
                                  }
                                }
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] w-full flex items-center justify-center">
                        <div className="text-center text-white/50">
                          <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-30" />
                          <p className="text-lg font-medium">Não há dados disponíveis</p>
                          <p className="text-sm mt-2">
                            {viewMode === "geral"
                              ? "Não há investidores cadastrados nos escritórios"
                              : "Não há investidores cadastrados para os assessores"}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Gráfico de Linha: Aportes ao Longo do Tempo */}
          {((viewMode === "geral" && escritorios.length > 0) ||
            (viewMode === "escritorio" && (assessores.length > 0 || (selectedAssessor && selectedAssessor !== "all")))) && (
            <Card className="bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <CardTitle className="text-white">Aportes ao Longo do Tempo</CardTitle>
                </div>
                <CardDescription className="text-white/70">
                  {selectedAssessor && selectedAssessor !== "all"
                    ? "Comparação de aportes mensais por investidor"
                    : viewMode === "geral"
                      ? "Comparação de aportes mensais por escritório"
                      : "Comparação de aportes mensais por assessor"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {aporteMensalData.length > 0 && aporteMensalData.some(mes => {
                  // Verificar se há pelo menos um mês com algum valor > 0
                  return Object.keys(mes).some(key => key !== 'mes' && Number(mes[key]) > 0)
                }) ? (
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={aporteMensalData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-white/20" />
                        <XAxis
                          dataKey="mes"
                          className="text-xs text-white/70"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          className="text-xs text-white/70"
                          tickFormatter={(value) =>
                            new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                              notation: "compact",
                            }).format(value)
                          }
                        />
                        <Tooltip
                          shared={false}
                          cursor={{ fill: 'rgba(0, 188, 110, 0.1)' }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              // Com shared={false}, o payload deve conter apenas a barra específica sendo hovered
                              const barPayload = payload[0]
                              
                              if (barPayload && barPayload.value !== null && barPayload.value !== undefined && Number(barPayload.value) !== 0) {
                                return (
                                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                    <p className="font-semibold text-gray-900 mb-1">{label}</p>
                                    <p className="text-sm text-gray-600">
                                      <span
                                        style={{
                                          display: "inline-block",
                                          width: 12,
                                          height: 12,
                                          backgroundColor: barPayload.color || barPayload.fill || COLORS[0],
                                          marginRight: 6,
                                          borderRadius: 2,
                                        }}
                                      />
                                      {barPayload.name || barPayload.dataKey}: {formatCurrency(Number(barPayload.value))}
                                    </p>
                                  </div>
                                )
                              }
                            }
                            return null
                          }}
                          labelStyle={{ color: "#01223F", fontWeight: 600 }}
                          contentStyle={{
                            backgroundColor: "rgba(255,255,255,0.98)",
                            border: "1px solid rgba(15,23,42,0.12)",
                            borderRadius: "8px",
                            boxShadow: "0 10px 25px rgba(15,23,42,0.25)",
                            color: "#01223F",
                          }}
                        />
                        <Legend
                          wrapperStyle={{ color: "white", fontSize: "12px", paddingTop: "20px", cursor: "pointer" }}
                          onClick={(e: any) => {
                            const name = e.value || e.payload?.value || e.payload?.dataKey
                            if (!name) return
                            
                            if (selectedAssessor && selectedAssessor !== "all") {
                              // Se for investidor, buscar pelo nome
                              const investor = investorsData.find(inv => inv.name === name)
                              if (investor) {
                                setSelectedProfileUserId(investor.id)
                                setIsProfileModalOpen(true)
                              }
                            } else if (viewMode === "escritorio") {
                              // Se for assessor, buscar pelo nome
                              const assessor = assessores.find(a => a.name === name)
                              if (assessor) {
                                setSelectedProfileUserId(assessor.id)
                                setIsProfileModalOpen(true)
                              }
                            } else {
                              // Se for escritório, buscar pelo nome
                              const escritorio = escritorios.find(e => e.name === name)
                              if (escritorio) {
                                setSelectedProfileUserId(escritorio.id)
                                setIsProfileModalOpen(true)
                              }
                            }
                          }}
                        />
                         {selectedAssessor && selectedAssessor !== "all"
                           ? investorsData.map((investor, index) => (
                               <Bar
                                 key={investor.id}
                                 dataKey={investor.name}
                                 fill={COLORS[index % COLORS.length]}
                                 radius={[4, 4, 0, 0]}
                               />
                             ))
                           : viewMode === "geral"
                           ? escritorios.map((escritorio, index) => (
                               <Bar
                                 key={escritorio.id}
                                 dataKey={escritorio.name}
                                 fill={COLORS[index % COLORS.length]}
                                 radius={[4, 4, 0, 0]}
                               />
                             ))
                           : assessores.map((assessor, index) => (
                               <Bar
                                 key={assessor.id}
                                 dataKey={assessor.name}
                                 fill={COLORS[index % COLORS.length]}
                                 radius={[4, 4, 0, 0]}
                               />
                             ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[400px] w-full flex items-center justify-center">
                    <div className="text-center text-white/50">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-lg font-medium">Não há dados disponíveis</p>
                      <p className="text-sm mt-2">
                        {selectedAssessor && selectedAssessor !== "all"
                          ? "Não há movimentação de aportes registrada para este assessor"
                          : viewMode === "geral"
                            ? "Não há movimentação de aportes registrada para os escritórios"
                            : "Não há movimentação de aportes registrada para os assessores"}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Gráfico de Linha: Comissões ao Longo do Tempo */}
          {((viewMode === "geral" && escritorios.length > 0) ||
            (viewMode === "escritorio" && (assessores.length > 0 || (selectedAssessor && selectedAssessor !== "all")))) && (
            <Card className="bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      <CardTitle className="text-white">Comissões ao Longo do Tempo</CardTitle>
                    </div>
                    <CardDescription className="text-white/70 mt-1">
                      {selectedAssessor && selectedAssessor !== "all"
                        ? "Comparação de comissões mensais por investidor"
                        : viewMode === "geral"
                          ? "Comparação de comissões mensais por escritório"
                          : "Comparação de comissões mensais por assessor"}
                    </CardDescription>
                  </div>
                  {(() => {
                    const dataFromCurrent = getComissaoDataFromCurrentMonth()
                    const dataUpToCurrent = getComissaoDataUpToCurrentMonth()
                    const totalData = comissaoMensalData.length
                    const hasEnoughData = totalData > comissaoPeriodMonths || dataFromCurrent.length > comissaoPeriodMonths || dataUpToCurrent.length > 0
                    
                    if (!hasEnoughData) return null
                    
                    return (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="period-select" className="text-sm text-white/70">
                            Período:
                          </Label>
                          <Select
                            value={String(comissaoPeriodMonths)}
                            onValueChange={(value) => {
                              const newMonths = parseInt(value, 10)
                              if (!isNaN(newMonths) && newMonths >= 2 && newMonths <= 12) {
                                setComissaoPeriodMonths(newMonths)
                                setComissaoPeriodIndex(0) // Resetar para o período atual ao mudar o número de meses
                              }
                            }}
                          >
                            <SelectTrigger 
                              id="period-select"
                              className="w-[120px] h-8 bg-[#01223F]/80 border-[#01223F] text-white text-sm"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#01223F] border-[#01223F] text-white">
                              {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((months) => (
                                <SelectItem 
                                  key={months} 
                                  value={String(months)}
                                  className="hover:bg-[#003562] focus:bg-[#003562]"
                                >
                                  {months} {months === 1 ? 'mês' : 'meses'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="text-sm text-white/70">
                          {getComissaoPeriodLabel()}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              // Navegar para períodos mais antigos (diminuir índice)
                              if (comissaoPeriodIndex === 0) {
                                // Se estiver em 0, ir para -1 (períodos antes do mês atual)
                                setComissaoPeriodIndex(-1)
                              } else if (comissaoPeriodIndex > 0) {
                                // Se estiver em índice positivo, diminuir até chegar em 0
                                setComissaoPeriodIndex(comissaoPeriodIndex - 1)
                              } else {
                                // Se estiver em índice negativo, diminuir (mais antigo)
                                setComissaoPeriodIndex(comissaoPeriodIndex - 1)
                              }
                            }}
                            disabled={!canNavigateComissaoBack()}
                            className={`p-1.5 rounded-md transition-colors ${
                              canNavigateComissaoBack()
                                ? "bg-[#01223F]/80 hover:bg-[#003562] text-white cursor-pointer"
                                : "bg-[#01223F]/40 text-white/30 cursor-not-allowed"
                            }`}
                            title="Período anterior"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Navegar para períodos mais futuros (aumentar índice)
                              if (comissaoPeriodIndex === 0) {
                                // Se estiver em 0, ir para 1 (períodos futuros)
                                setComissaoPeriodIndex(1)
                              } else if (comissaoPeriodIndex < 0) {
                                // Se estiver em índice negativo, aumentar até chegar em 0
                                setComissaoPeriodIndex(comissaoPeriodIndex + 1)
                              } else {
                                // Se estiver em índice positivo, aumentar (mais futuro)
                                setComissaoPeriodIndex(comissaoPeriodIndex + 1)
                              }
                            }}
                            disabled={!canNavigateComissaoForward()}
                            className={`p-1.5 rounded-md transition-colors ${
                              canNavigateComissaoForward()
                                ? "bg-[#01223F]/80 hover:bg-[#003562] text-white cursor-pointer"
                                : "bg-[#01223F]/40 text-white/30 cursor-not-allowed"
                            }`}
                            title="Próximo período"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setComissaoPeriodIndex(0)}
                            className="px-3 py-1.5 text-xs bg-[#01223F]/80 hover:bg-[#003562] text-white rounded-md transition-colors"
                            title="Voltar para o período atual (próximos 12 meses a partir do mês atual)"
                          >
                            Hoje
                          </button>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  let filteredData = getComissaoFilteredData()
                  
                  // Fallback: se filteredData estiver vazio mas houver dados originais, usar os últimos 12 meses
                  if (filteredData.length === 0 && comissaoMensalData.length > 0) {
                    filteredData = comissaoMensalData.slice(-12)
                  }
                  
                  const hasData = filteredData.length > 0 && filteredData.some(mes => {
                    // Verificar se há pelo menos um mês com algum valor > 0
                    return Object.keys(mes).some(key => key !== 'mes' && Number(mes[key]) > 0)
                  })
                  
                  return hasData ? (
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-white/20" />
                        <XAxis
                          dataKey="mes"
                          className="text-xs text-white/70"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis
                          className="text-xs text-white/70"
                          tickFormatter={(value) =>
                            new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                              notation: "compact",
                            }).format(value)
                          }
                        />
                        <Tooltip
                          shared={false}
                          cursor={{ fill: 'rgba(0, 188, 110, 0.1)' }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              // Com shared={false}, o payload deve conter apenas a barra específica sendo hovered
                              const barPayload = payload[0]
                              
                              if (barPayload && barPayload.value !== null && barPayload.value !== undefined && Number(barPayload.value) !== 0) {
                                return (
                                  <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                    <p className="font-semibold text-gray-900 mb-1">{label}</p>
                                    <p className="text-sm text-gray-600">
                                      <span
                                        style={{
                                          display: "inline-block",
                                          width: 12,
                                          height: 12,
                                          backgroundColor: barPayload.color || barPayload.fill || COLORS[0],
                                          marginRight: 6,
                                          borderRadius: 2,
                                        }}
                                      />
                                      {barPayload.name || barPayload.dataKey}: {formatCurrency(Number(barPayload.value))}
                                    </p>
                                  </div>
                                )
                              }
                            }
                            return null
                          }}
                          labelStyle={{ color: "#01223F", fontWeight: 600 }}
                          contentStyle={{
                            backgroundColor: "rgba(255,255,255,0.98)",
                            border: "1px solid rgba(15,23,42,0.12)",
                            borderRadius: "8px",
                            boxShadow: "0 10px 25px rgba(15,23,42,0.25)",
                            color: "#01223F",
                          }}
                        />
                        <Legend
                          wrapperStyle={{ color: "white", fontSize: "12px", paddingTop: "20px", cursor: "pointer" }}
                          onClick={(e: any) => {
                            const name = e.value || e.payload?.value || e.payload?.dataKey
                            if (!name) return
                            
                            if (selectedAssessor && selectedAssessor !== "all") {
                              // Se for investidor, buscar pelo nome
                              const investor = investorsData.find(inv => inv.name === name)
                              if (investor) {
                                setSelectedProfileUserId(investor.id)
                                setIsProfileModalOpen(true)
                              }
                            } else if (viewMode === "escritorio") {
                              // Se for assessor, buscar pelo nome
                              const assessor = assessores.find(a => a.name === name)
                              if (assessor) {
                                setSelectedProfileUserId(assessor.id)
                                setIsProfileModalOpen(true)
                              }
                            } else {
                              // Se for escritório, buscar pelo nome
                              const escritorio = escritorios.find(e => e.name === name)
                              if (escritorio) {
                                setSelectedProfileUserId(escritorio.id)
                                setIsProfileModalOpen(true)
                              }
                            }
                          }}
                        />
                        {selectedAssessor && selectedAssessor !== "all"
                          ? investorsData.map((investor, index) => (
                              <Bar
                                key={investor.id}
                                dataKey={investor.name}
                                fill={COLORS[index % COLORS.length]}
                                radius={[4, 4, 0, 0]}
                              />
                            ))
                          : viewMode === "geral"
                          ? escritorios.map((escritorio, index) => (
                              <Bar
                                key={escritorio.id}
                                dataKey={escritorio.name}
                                fill={COLORS[index % COLORS.length]}
                                radius={[4, 4, 0, 0]}
                              />
                            ))
                          : assessores.map((assessor, index) => (
                              <Bar
                                key={assessor.id}
                                dataKey={assessor.name}
                                fill={COLORS[index % COLORS.length]}
                                radius={[4, 4, 0, 0]}
                              />
                            ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[400px] w-full flex items-center justify-center">
                      <div className="text-center text-white/50">
                        <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium">Não há dados disponíveis</p>
                        <p className="text-sm mt-2">
                          {selectedAssessor && selectedAssessor !== "all"
                            ? "Não há movimentação de comissões registrada para este assessor"
                            : viewMode === "geral"
                              ? "Não há movimentação de comissões registrada para os escritórios"
                              : "Não há movimentação de comissões registrada para os assessores"}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}
            </>
          )}
        </div>

        {/* Modal de Perfil */}
        <Dialog open={isProfileModalOpen} onOpenChange={(open) => {
          setIsProfileModalOpen(open)
          if (!open) {
            // Resetar o userId quando o modal é fechado
            setSelectedProfileUserId(null)
          }
        }}>
          <DialogContent className="!max-w-[95vw] sm:!max-w-[90vw] md:!max-w-7xl lg:!max-w-[90vw] w-[95vw] max-h-[90vh] overflow-hidden bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white p-0" style={{ maxWidth: '90vw' }}>
            <div className="overflow-y-auto max-h-[90vh]">
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10">
                <DialogTitle className="text-white text-2xl font-bold flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  Perfil do Usuário
                </DialogTitle>
              </DialogHeader>
              <div className="px-6 py-4">
                {selectedProfileUserId ? (
                  <UserProfileView
                    key={selectedProfileUserId}
                    userId={selectedProfileUserId}
                    onEdit={() => {}}
                    onClose={() => {
                      setIsProfileModalOpen(false)
                      setSelectedProfileUserId(null)
                    }}
                  />
                ) : (
                  <div className="text-center py-8 text-white/70">
                    <p>Carregando perfil...</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DistributorLayout>
    </ProtectedRoute>
  )
}


