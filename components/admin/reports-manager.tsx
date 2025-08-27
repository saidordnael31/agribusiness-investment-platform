"use client"

import { useState } from "react"
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
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

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

  const analyticsData: AnalyticsData = {
    investments: {
      total: 15750000,
      growth: 12.5,
      seniorQuota: 9450000,
      subordinateQuota: 6300000,
      monthlyData: [
        { month: "Jan", value: 4200000, growth: 8.2 },
        { month: "Fev", value: 5800000, growth: 38.1 },
        { month: "Mar", value: 7300000, growth: 25.9 },
        { month: "Abr", value: 9100000, growth: 24.7 },
        { month: "Mai", value: 11500000, growth: 26.4 },
        { month: "Jun", value: 15750000, growth: 37.0 },
      ],
      avgTicket: 87500,
      retention: 94.2,
    },
    users: {
      total: 1247,
      investors: 892,
      distributors: 355,
      offices: 45,
      advisors: 310,
      newThisMonth: 47,
      churnRate: 2.3,
      acquisitionCost: 125,
      monthlyGrowth: [
        { month: "Jan", investors: 89, distributors: 12 },
        { month: "Fev", investors: 124, distributors: 18 },
        { month: "Mar", investors: 156, distributors: 25 },
        { month: "Abr", investors: 203, distributors: 31 },
        { month: "Mai", investors: 178, distributors: 28 },
        { month: "Jun", investors: 142, distributors: 22 },
      ],
    },
    commissions: {
      total: 472500,
      distributors: 330750,
      offices: 141750,
      recurrent: 425250,
      bonuses: 47250,
      monthlyData: [
        { month: "Jan", total: 126000, recurrent: 115000, bonuses: 11000 },
        { month: "Fev", total: 174000, recurrent: 158000, bonuses: 16000 },
        { month: "Mar", total: 219000, recurrent: 198000, bonuses: 21000 },
        { month: "Abr", total: 273000, recurrent: 245000, bonuses: 28000 },
        { month: "Mai", total: 345000, recurrent: 310000, bonuses: 35000 },
        { month: "Jun", total: 472500, recurrent: 425250, bonuses: 47250 },
      ],
      avgCommissionRate: 3.2,
    },
    campaigns: {
      active: 5,
      totalParticipants: 234,
      conversionRate: 18.7,
      totalImpact: 1250000,
      topCampaigns: [
        { name: "Promoção Ano Novo", participants: 89, impact: 445000, roi: 4.2 },
        { name: "Indicação Premiada", participants: 67, impact: 335000, roi: 3.8 },
        { name: "Meta 500K", participants: 45, impact: 270000, roi: 5.1 },
        { name: "Distribuidor Premium", participants: 23, impact: 115000, roi: 2.9 },
        { name: "Cashback Especial", participants: 10, impact: 85000, roi: 6.2 },
      ],
    },
    recurrence: {
      activeFlows: 156,
      monthlyRevenue: 472500,
      projectedAnnual: 5670000,
      atRisk: 12,
      avgDuration: 18.5,
      churnImpact: -85000,
    },
  }

  const [customReports, setCustomReports] = useState<CustomReport[]>([
    {
      id: "1",
      name: "Relatório Financeiro Mensal",
      description: "Análise completa de investimentos, comissões e performance financeira",
      type: "financial",
      frequency: "monthly",
      recipients: ["admin@agroderi.com", "financeiro@agroderi.com"],
      lastGenerated: "2025-01-27T08:00:00Z",
      isActive: true,
    },
    {
      id: "2",
      name: "Compliance e Auditoria",
      description: "Relatório de conformidade e métricas para auditoria",
      type: "compliance",
      frequency: "quarterly",
      recipients: ["compliance@agroderi.com", "auditoria@agroderi.com"],
      lastGenerated: "2025-01-01T08:00:00Z",
      isActive: true,
    },
    {
      id: "3",
      name: "Performance de Distribuidores",
      description: "Análise de performance e ranking de distribuidores",
      type: "performance",
      frequency: "weekly",
      recipients: ["admin@agroderi.com"],
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
