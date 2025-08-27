"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Search,
  Eye,
  Edit,
  Plus,
  Calendar,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface Office {
  id: string
  name: string
  email: string
  totalAdvisors: number
  totalClients: number
  totalInvested: number
  monthlyCommission: number
  status: "active" | "inactive"
  createdAt: string
}

interface Advisor {
  id: string
  name: string
  email: string
  officeId: string
  officeName: string
  totalClients: number
  totalInvested: number
  monthlyCommission: number
  status: "active" | "inactive"
  createdAt: string
}

interface CommissionFlow {
  id: string
  investorName: string
  advisorName: string
  officeName: string
  investmentAmount: number
  monthlyCommission: number
  advisorShare: number
  officeShare: number
  status: "active" | "paused" | "cancelled"
  startDate: string
  endDate?: string
}

export function HierarchyManager() {
  const [offices, setOffices] = useState<Office[]>([
    {
      id: "1",
      name: "Escritório Alpha Investimentos",
      email: "contato@alphainvest.com",
      totalAdvisors: 12,
      totalClients: 89,
      totalInvested: 4500000,
      monthlyCommission: 135000,
      status: "active",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      name: "Beta Capital Partners",
      email: "admin@betacapital.com",
      totalAdvisors: 8,
      totalClients: 56,
      totalInvested: 2800000,
      monthlyCommission: 84000,
      status: "active",
      createdAt: "2024-02-10",
    },
  ])

  const [advisors, setAdvisors] = useState<Advisor[]>([
    {
      id: "1",
      name: "Carlos Silva",
      email: "carlos@alphainvest.com",
      officeId: "1",
      officeName: "Escritório Alpha Investimentos",
      totalClients: 25,
      totalInvested: 1200000,
      monthlyCommission: 36000,
      status: "active",
      createdAt: "2024-01-20",
    },
    {
      id: "2",
      name: "Ana Santos",
      email: "ana@alphainvest.com",
      officeId: "1",
      officeName: "Escritório Alpha Investimentos",
      totalClients: 18,
      totalInvested: 950000,
      monthlyCommission: 28500,
      status: "active",
      createdAt: "2024-02-05",
    },
  ])

  const [commissionFlows, setCommissionFlows] = useState<CommissionFlow[]>([
    {
      id: "1",
      investorName: "João Oliveira",
      advisorName: "Carlos Silva",
      officeName: "Escritório Alpha Investimentos",
      investmentAmount: 100000,
      monthlyCommission: 3000,
      advisorShare: 2100,
      officeShare: 900,
      status: "active",
      startDate: "2024-01-15",
    },
    {
      id: "2",
      investorName: "Maria Costa",
      advisorName: "Ana Santos",
      officeName: "Escritório Alpha Investimentos",
      investmentAmount: 250000,
      monthlyCommission: 7500,
      advisorShare: 5250,
      officeShare: 2250,
      status: "active",
      startDate: "2024-02-01",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOffice, setSelectedOffice] = useState<string>("all")

  const totalOffices = offices.length
  const totalAdvisors = advisors.length
  const totalCommissionFlow = commissionFlows.reduce((sum, flow) => sum + flow.monthlyCommission, 0)
  const activeFlows = commissionFlows.filter((flow) => flow.status === "active").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Hierarquia</h2>
          <p className="text-muted-foreground">Gerencie escritórios, assessores e fluxo de comissões</p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Escritório
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Escritórios</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOffices}</div>
            <p className="text-xs text-muted-foreground">Ativos na plataforma</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Assessores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAdvisors}</div>
            <p className="text-xs text-muted-foreground">Vinculados aos escritórios</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fluxo de Comissões</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCommissionFlow)}</div>
            <p className="text-xs text-muted-foreground">Mensal total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fluxos Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeFlows}</div>
            <p className="text-xs text-muted-foreground">Gerando comissões</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="offices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="offices">Escritórios</TabsTrigger>
          <TabsTrigger value="advisors">Assessores</TabsTrigger>
          <TabsTrigger value="commissions">Fluxo de Comissões</TabsTrigger>
          <TabsTrigger value="hierarchy">Visualização Hierárquica</TabsTrigger>
        </TabsList>

        <TabsContent value="offices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Escritórios Cadastrados</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar escritórios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {offices.map((office) => (
                  <div key={office.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{office.name}</h3>
                        <p className="text-sm text-muted-foreground">{office.email}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">{office.totalAdvisors} assessores</span>
                          <span className="text-xs text-muted-foreground">{office.totalClients} clientes</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(office.totalInvested)} investidos
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(office.monthlyCommission)}</p>
                        <p className="text-xs text-muted-foreground">Comissão mensal</p>
                      </div>
                      <Badge variant={office.status === "active" ? "default" : "secondary"}>
                        {office.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advisors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assessores Cadastrados</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar assessores..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={selectedOffice}
                  onChange={(e) => setSelectedOffice(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">Todos os escritórios</option>
                  {offices.map((office) => (
                    <option key={office.id} value={office.id}>
                      {office.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {advisors.map((advisor) => (
                  <div key={advisor.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{advisor.name}</h3>
                        <p className="text-sm text-muted-foreground">{advisor.email}</p>
                        <p className="text-xs text-orange-600">{advisor.officeName}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">{advisor.totalClients} clientes</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(advisor.totalInvested)} investidos
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(advisor.monthlyCommission)}</p>
                        <p className="text-xs text-muted-foreground">Comissão mensal</p>
                      </div>
                      <Badge variant={advisor.status === "active" ? "default" : "secondary"}>
                        {advisor.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fluxo de Comissões Ativas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitore todas as comissões recorrentes e seus impactos em resgates
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commissionFlows.map((flow) => (
                  <div key={flow.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <h3 className="font-semibold">{flow.investorName}</h3>
                        <Badge variant={flow.status === "active" ? "default" : "secondary"}>
                          {flow.status === "active" ? "Ativo" : flow.status === "paused" ? "Pausado" : "Cancelado"}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(flow.monthlyCommission)}</p>
                        <p className="text-xs text-muted-foreground">Comissão mensal total</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Investimento</p>
                        <p className="font-medium">{formatCurrency(flow.investmentAmount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Assessor (70%)</p>
                        <p className="font-medium">{flow.advisorName}</p>
                        <p className="text-emerald-600">{formatCurrency(flow.advisorShare)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Escritório (30%)</p>
                        <p className="font-medium">{flow.officeName}</p>
                        <p className="text-orange-600">{formatCurrency(flow.officeShare)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        Início: {new Date(flow.startDate).toLocaleDateString("pt-BR")}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <AlertTriangle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visualização Hierárquica</CardTitle>
              <p className="text-sm text-muted-foreground">Estrutura organizacional e fluxo de comissões</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {offices.map((office) => (
                  <div key={office.id} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{office.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {office.totalAdvisors} assessores • {formatCurrency(office.monthlyCommission)}/mês
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {advisors
                        .filter((advisor) => advisor.officeId === office.id)
                        .map((advisor) => (
                          <div key={advisor.id} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Users className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">{advisor.name}</h4>
                                <p className="text-xs text-muted-foreground">{advisor.totalClients} clientes</p>
                              </div>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Investido:</span>
                                <span className="font-medium">{formatCurrency(advisor.totalInvested)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Comissão:</span>
                                <span className="font-medium text-emerald-600">
                                  {formatCurrency(advisor.monthlyCommission)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
