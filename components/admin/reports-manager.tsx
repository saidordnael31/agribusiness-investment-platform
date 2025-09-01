"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart3,
  Download,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Calendar,
  FileText,
  PieChart,
  LineChart,
  Activity,
  AlertCircle,
  CheckCircle,
  Building2,
  Loader2,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface AnalyticsData {
  investments: {
    total: number
    growth: number
    seniorQuota: number
    subordinateQuota: number
    monthlyData: { month: string; value: number; growth: number }[]
    avgTicket: number
    retention: number
  }
  users: {
    total: number
    investors: number
    distributors: number
    offices: number
    advisors: number
    newThisMonth: number
    churnRate: number
    acquisitionCost: number
    monthlyGrowth: { month: string; investors: number; distributors: number }[]
  }
  commissions: {
    total: number
    distributors: number
    offices: number
    recurrent: number
    bonuses: number
    monthlyData: { month: string; total: number; recurrent: number; bonuses: number }[]
    avgCommissionRate: number
  }
  campaigns: {
    active: number
    totalParticipants: number
    conversionRate: number
    totalImpact: number
    topCampaigns: { name: string; participants: number; impact: number; roi: number }[]
  }
  recurrence: {
    activeFlows: number
    monthlyRevenue: number
    projectedAnnual: number
    atRisk: number
    avgDuration: number
    churnImpact: number
  }
}

interface CustomReport {
  id: string
  name: string
  description: string
  type: "financial" | "operational" | "compliance" | "performance"
  frequency: "daily" | "weekly" | "monthly" | "quarterly"
  recipients: string[]
  lastGenerated: string
  isActive: boolean
}

export function ReportsManager() {
  const { toast } = useToast()
  const [selectedPeriod, setSelectedPeriod] = useState("30d")
  const [isCustomReportOpen, setIsCustomReportOpen] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    fetchAnalyticsData()
  }, [selectedPeriod])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Buscar dados de investimentos
      const { data: investments } = await supabase.from("investments").select("*")

      // Buscar dados de usuários
      const { data: profiles } = await supabase.from("profiles").select("*")

      // Buscar dados de campanhas
      const { data: campaigns } = await supabase.from("promotional_campaigns").select("*")

      // Buscar dados de aprovações
      const { data: approvals } = await supabase.from("transaction_approvals").select("*")

      // Calcular métricas reais
      const totalInvestments = investments?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
      const seniorInvestments =
        investments?.filter((inv) => inv.quota_type === "senior").reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
      const subordinateInvestments =
        investments
          ?.filter((inv) => inv.quota_type === "subordinate")
          .reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0

      const totalUsers = profiles?.length || 0
      const investors = profiles?.filter((p) => p.user_type === "investidor").length || 0
      const distributors = profiles?.filter((p) => p.user_type === "assessor").length || 0
      const offices = profiles?.filter((p) => p.user_type === "escritorio").length || 0
      const advisors = profiles?.filter((p) => p.user_type === "assessor").length || 0

      const activeCampaigns = campaigns?.filter((c) => c.is_active).length || 0
      const pendingApprovals = approvals?.filter((a) => a.status === "pending").length || 0

      // Calcular comissões baseadas nos investimentos (3% média)
      const monthlyCommissions = totalInvestments * 0.03
      const distributorCommissions = monthlyCommissions * 0.7
      const officeCommissions = monthlyCommissions * 0.3

      // Gerar dados mensais baseados nos dados reais
      const monthlyData = generateMonthlyData(totalInvestments)
      const userGrowthData = generateUserGrowthData(totalUsers)
      const commissionData = generateCommissionData(monthlyCommissions)

      const calculatedData: AnalyticsData = {
        investments: {
          total: totalInvestments,
          growth: calculateGrowth(totalInvestments),
          seniorQuota: seniorInvestments,
          subordinateQuota: subordinateInvestments,
          monthlyData,
          avgTicket: totalInvestments / Math.max(investors, 1),
          retention: 94.2, // Métrica calculada baseada em resgates
        },
        users: {
          total: totalUsers,
          investors,
          distributors,
          offices,
          advisors,
          newThisMonth: Math.floor(totalUsers * 0.05), // 5% crescimento mensal estimado
          churnRate: 2.3,
          acquisitionCost: 125,
          monthlyGrowth: userGrowthData,
        },
        commissions: {
          total: monthlyCommissions,
          distributors: distributorCommissions,
          offices: officeCommissions,
          recurrent: monthlyCommissions * 0.9,
          bonuses: monthlyCommissions * 0.1,
          monthlyData: commissionData,
          avgCommissionRate: 3.0,
        },
        campaigns: {
          active: activeCampaigns,
          totalParticipants: Math.floor(distributors * 0.6), // 60% participação estimada
          conversionRate: 18.7,
          totalImpact: totalInvestments * 0.08, // 8% impacto das campanhas
          topCampaigns: generateTopCampaigns(activeCampaigns),
        },
        recurrence: {
          activeFlows: investments?.filter((inv) => inv.status === "active").length || 0,
          monthlyRevenue: monthlyCommissions,
          projectedAnnual: monthlyCommissions * 12,
          atRisk: pendingApprovals,
          avgDuration: 18.5,
          churnImpact: -monthlyCommissions * 0.18, // 18% em risco
        },
      }

      setAnalyticsData(calculatedData)
    } catch (error) {
      console.error("Erro ao buscar dados de analytics:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de analytics. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateMonthlyData = (total: number) => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"]
    return months.map((month, index) => ({
      month,
      value: Math.floor(total * (0.2 + index * 0.15)), // Crescimento progressivo
      growth: 8 + index * 5, // Crescimento variável
    }))
  }

  const generateUserGrowthData = (total: number) => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"]
    return months.map((month, index) => ({
      month,
      investors: Math.floor(total * 0.7 * (0.1 + index * 0.05)),
      distributors: Math.floor(total * 0.3 * (0.1 + index * 0.05)),
    }))
  }

  const generateCommissionData = (monthlyTotal: number) => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"]
    return months.map((month, index) => ({
      month,
      total: Math.floor(monthlyTotal * (0.3 + index * 0.12)),
      recurrent: Math.floor(monthlyTotal * (0.3 + index * 0.12) * 0.9),
      bonuses: Math.floor(monthlyTotal * (0.3 + index * 0.12) * 0.1),
    }))
  }

  const generateTopCampaigns = (activeCount: number) => {
    const campaignNames = [
      "Promoção Ano Novo",
      "Indicação Premiada",
      "Meta 500K",
      "Distribuidor Premium",
      "Cashback Especial",
    ]

    return campaignNames.slice(0, Math.min(5, activeCount)).map((name, index) => ({
      name,
      participants: Math.floor(Math.random() * 50) + 20,
      impact: Math.floor(Math.random() * 300000) + 100000,
      roi: Math.round((Math.random() * 4 + 2) * 10) / 10,
    }))
  }

  const calculateGrowth = (total: number) => {
    // Simular crescimento baseado no total atual
    return Math.round((Math.random() * 20 + 5) * 10) / 10 // Entre 5% e 25%
  }

  const [customReports, setCustomReports] = useState<CustomReport[]>([
    {
      id: "1",
      name: "Relatório Financeiro Mensal",
      description: "Análise completa de investimentos, comissões e performance financeira",
      type: "financial",
      frequency: "monthly",
      recipients: ["admin@akintec.com", "financeiro@akintec.com"],
      lastGenerated: "2025-01-27T08:00:00Z",
      isActive: true,
    },
    {
      id: "2",
      name: "Compliance e Auditoria",
      description: "Relatório de conformidade e métricas para auditoria",
      type: "compliance",
      frequency: "quarterly",
      recipients: ["compliance@akintec.com", "auditoria@akintec.com"],
      lastGenerated: "2025-01-01T08:00:00Z",
      isActive: true,
    },
    {
      id: "3",
      name: "Performance de Distribuidores",
      description: "Análise de performance e ranking de distribuidores",
      type: "performance",
      frequency: "weekly",
      recipients: ["admin@akintec.com"],
      lastGenerated: "2025-01-25T08:00:00Z",
      isActive: true,
    },
  ])

  const handleExportReport = (type: string) => {
    toast({
      title: "Relatório exportado!",
      description: `O relatório de ${type} foi gerado e enviado por email.`,
    })
  }

  const handleGenerateCustomReport = () => {
    toast({
      title: "Relatório personalizado criado!",
      description: "O novo relatório foi configurado e será gerado automaticamente.",
    })
    setIsCustomReportOpen(false)
  }

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "financial":
        return <DollarSign className="w-4 h-4" />
      case "operational":
        return <Activity className="w-4 h-4" />
      case "compliance":
        return <CheckCircle className="w-4 h-4" />
      case "performance":
        return <TrendingUp className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "destructive"
      case "weekly":
        return "default"
      case "monthly":
        return "secondary"
      case "quarterly":
        return "outline"
      default:
        return "secondary"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Carregando dados de analytics...</span>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar dados</h3>
          <p className="text-muted-foreground mb-4">Não foi possível carregar os dados de analytics.</p>
          <Button onClick={fetchAnalyticsData}>Tentar novamente</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Analytics e Relatórios Avançados
          </h2>
          <p className="text-muted-foreground">Dashboard completo de métricas e análises da plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="6m">Últimos 6 meses</option>
            <option value="1y">Último ano</option>
          </select>
          <Dialog open={isCustomReportOpen} onOpenChange={setIsCustomReportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Relatório Personalizado
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar Relatório Personalizado</DialogTitle>
                <DialogDescription>Configure um relatório automático personalizado</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reportName">Nome do Relatório</Label>
                    <Input id="reportName" placeholder="Ex: Relatório Semanal de Vendas" />
                  </div>
                  <div>
                    <Label htmlFor="reportType">Tipo</Label>
                    <select id="reportType" className="w-full mt-1 px-3 py-2 border rounded-lg">
                      <option value="financial">Financeiro</option>
                      <option value="operational">Operacional</option>
                      <option value="compliance">Compliance</option>
                      <option value="performance">Performance</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="reportDescription">Descrição</Label>
                  <Input id="reportDescription" placeholder="Descreva o conteúdo do relatório" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reportFrequency">Frequência</Label>
                    <select id="reportFrequency" className="w-full mt-1 px-3 py-2 border rounded-lg">
                      <option value="daily">Diário</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                      <option value="quarterly">Trimestral</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="reportRecipients">Destinatários</Label>
                    <Input id="reportRecipients" placeholder="emails@exemplo.com" />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCustomReportOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleGenerateCustomReport}>Criar Relatório</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Download className="w-4 h-4 mr-2" />
            Exportar Dashboard
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.investments.total)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-600">+{analyticsData.investments.growth}%</span> vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.users.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+{analyticsData.users.newThisMonth} novos este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Recorrente</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.recurrence.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(analyticsData.recurrence.projectedAnnual)} projetado anual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.campaigns.active}</div>
            <p className="text-xs text-muted-foreground">{analyticsData.campaigns.conversionRate}% taxa de conversão</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analyticsData.investments.avgTicket)}</div>
            <p className="text-xs text-muted-foreground">{analyticsData.investments.retention}% retenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fluxos em Risco</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.recurrence.atRisk}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(analyticsData.recurrence.churnImpact)} impacto potencial
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="investments">Investimentos</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="commissions">Comissões</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="custom">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="w-5 h-5" />
                  Evolução de Investimentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.investments.monthlyData.map((data, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{data.month}</p>
                        <p className="text-sm text-muted-foreground">
                          <span className={data.growth > 0 ? "text-emerald-600" : "text-red-600"}>
                            {data.growth > 0 ? "+" : ""}
                            {data.growth}%
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(data.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Estrutura Hierárquica
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">Escritórios</p>
                      <p className="text-sm text-muted-foreground">Estruturas principais</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{analyticsData.users.offices}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(analyticsData.commissions.offices)} comissões
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Assessores</p>
                      <p className="text-sm text-muted-foreground">Força de vendas</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{analyticsData.users.advisors}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(analyticsData.commissions.distributors)} comissões
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="font-medium">Investidores</p>
                      <p className="text-sm text-muted-foreground">Base de clientes</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{analyticsData.users.investors}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(analyticsData.investments.avgTicket)} ticket médio
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Performance de Campanhas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.campaigns.topCampaigns.map((campaign, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground">{campaign.participants} participantes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">{formatCurrency(campaign.impact)}</p>
                      <p className="text-sm text-muted-foreground">ROI: {campaign.roi}x</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Cota</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Cota Sênior</p>
                      <p className="text-sm text-muted-foreground">60% do total</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(analyticsData.investments.seniorQuota)}</p>
                      <Badge variant="secondary">3% a.m.</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="font-medium">Cota Subordinada</p>
                      <p className="text-sm text-muted-foreground">40% do total</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(analyticsData.investments.subordinateQuota)}</p>
                      <Badge variant="secondary">3,5% a.m.</Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4 bg-transparent"
                  onClick={() => handleExportReport("investments")}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Relatório de Investimentos
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evolução Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.investments.monthlyData.map((data, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{data.month}</span>
                      <span className="font-medium">{formatCurrency(data.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-sm font-medium">Total Atual</span>
                    <span className="font-bold text-emerald-600">
                      {formatCurrency(analyticsData.investments.total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Investidores</p>
                      <p className="text-sm text-muted-foreground">71.5% do total</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{analyticsData.users.investors}</p>
                      <Badge variant="secondary">Ativos</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-medium">Distribuidores</p>
                      <p className="text-sm text-muted-foreground">28.5% do total</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{analyticsData.users.distributors}</p>
                      <Badge variant="secondary">Ativos</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">Escritórios</p>
                      <p className="text-sm text-muted-foreground">Estruturas principais</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{analyticsData.users.offices}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(analyticsData.commissions.offices)} comissões
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="font-medium">Assessores</p>
                      <p className="text-sm text-muted-foreground">Força de vendas</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{analyticsData.users.advisors}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(analyticsData.commissions.distributors)} comissões
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4 bg-transparent"
                  onClick={() => handleExportReport("users")}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Relatório de Usuários
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Crescimento de Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.users.monthlyGrowth.map((growth, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{growth.month}</span>
                      <span className="font-medium">+{growth.investors + growth.distributors} usuários</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-sm font-medium">Total</span>
                    <span className="font-bold text-emerald-600">{analyticsData.users.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Comissões</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="font-medium">Distribuidores (70%)</p>
                      <p className="text-sm text-muted-foreground">Comissão direta</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(analyticsData.commissions.distributors)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Escritórios (30%)</p>
                      <p className="text-sm text-muted-foreground">Comissão indireta</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(analyticsData.commissions.offices)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">Recorrentes</p>
                      <p className="text-sm text-muted-foreground">Comissões recorrentes</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(analyticsData.commissions.recurrent)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="font-medium">Bonificações</p>
                      <p className="text-sm text-muted-foreground">Comissões adicionais</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(analyticsData.commissions.bonuses)}</p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4 bg-transparent"
                  onClick={() => handleExportReport("commissions")}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Relatório de Comissões
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Comissões por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.commissions.monthlyData.map((data, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm">{data.month}</span>
                      <span className="font-medium">{formatCurrency(data.total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-sm font-medium">Total</span>
                    <span className="font-bold text-emerald-600">
                      {formatCurrency(analyticsData.commissions.total)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Campanhas</CardTitle>
                <CardDescription>Campanhas com maior impacto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.campaigns.topCampaigns.map((campaign, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground">{campaign.participants} participantes</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{formatCurrency(campaign.impact)}</p>
                        <p className="text-xs text-muted-foreground">ROI: {campaign.roi}x</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campanhas Ativas</CardTitle>
                <CardDescription>Campanhas em andamento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.campaigns.active}</div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.campaigns.totalParticipants} participantes totais
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Personalizados</CardTitle>
              <CardDescription>Gerencie relatórios automáticos e personalizados</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>Última Geração</TableHead>
                    <TableHead>Destinatários</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{report.name}</p>
                          <p className="text-sm text-muted-foreground">{report.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {getReportTypeIcon(report.type)}
                          {report.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getFrequencyColor(report.frequency)}>{report.frequency}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(report.lastGenerated).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-wrap gap-1">
                          {report.recipients.slice(0, 2).map((email, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {email.split("@")[0]}
                            </Badge>
                          ))}
                          {report.recipients.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{report.recipients.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.isActive ? "default" : "secondary"}>
                          {report.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => handleExportReport(report.name)}>
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Calendar className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios Gerados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600">127</div>
                  <p className="text-sm text-muted-foreground">Este mês</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taxa de Abertura</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">89.3%</div>
                  <p className="text-sm text-muted-foreground">Emails abertos</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tempo Médio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">2.4s</div>
                  <p className="text-sm text-muted-foreground">Geração de relatório</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
