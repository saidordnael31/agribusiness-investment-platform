"use client"

import { DistributorLayout } from "@/components/layout/distributor-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, Loader2, TrendingUp, Users, UserPlus } from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from "recharts"

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
  const [escritorios, setEscritorios] = useState<EscritorioData[]>([])
  const [assessores, setAssessores] = useState<AssessorData[]>([])
  const [aporteMensalData, setAporteMensalData] = useState<AporteMensal[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [viewMode, setViewMode] = useState<"geral" | "escritorio">("geral")
  const [selectedEscritorio, setSelectedEscritorio] = useState<string>("")
  const [selectedAssessor, setSelectedAssessor] = useState<string>("all")
  const [assessorDetail, setAssessorDetail] = useState<AssessorData | null>(null)
  const [investorsData, setInvestorsData] = useState<InvestorData[]>([])

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      const userData = JSON.parse(userStr)
      setUser(userData)
      if (userData?.id && viewMode === "geral") {
        fetchEscritoriosData(userData.id)
      }
    }
  }, [viewMode])

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
          .select("user_id, amount, status, payment_date")
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
    } catch (error) {
      console.error("Erro ao buscar dados dos escritórios:", error)
    } finally {
      setLoading(false)
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
      }
    } else if (viewMode === "geral" && user?.id) {
      // Recarregar dados dos escritórios quando voltar para visão geral
      fetchEscritoriosData(user.id)
      setSelectedAssessor("all")
      setAssessorDetail(null)
      setInvestorsData([])
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
        setAporteMensalData([])
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
          .select("user_id, amount, status, payment_date")
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
    } catch (error) {
      console.error("Erro ao buscar dados dos assessores:", error)
    } finally {
      setLoading(false)
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
          .select("user_id, amount, status, payment_date")
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
    } catch (error) {
      console.error("Erro ao buscar dados do assessor:", error)
    } finally {
      setLoading(false)
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
                        {assessores.map((assessor) => (
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
                          wrapperStyle={{ color: "white", fontSize: "12px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
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
                            wrapperStyle={{ color: "white", fontSize: "12px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
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
                            wrapperStyle={{ color: "white", fontSize: "12px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Gráfico de Linha: Aportes ao Longo do Tempo */}
          {((viewMode === "geral" && escritorios.length > 0) ||
            (viewMode === "escritorio" && (assessores.length > 0 || (selectedAssessor && selectedAssessor !== "all")))) &&
          aporteMensalData.length > 0 && (
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
                        wrapperStyle={{ color: "white", fontSize: "12px", paddingTop: "20px" }}
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
              </CardContent>
            </Card>
          )}
        </div>
      </DistributorLayout>
    </ProtectedRoute>
  )
}
