"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Download, TrendingUp, Users, DollarSign, Target } from "lucide-react"

export function ReportsManager() {
  const [selectedPeriod, setSelectedPeriod] = useState("30d")

  const reportData = {
    investments: {
      total: 15750000,
      growth: 12.5,
      seniorQuota: 9450000,
      subordinateQuota: 6300000,
    },
    users: {
      total: 1247,
      investors: 892,
      distributors: 355,
      newThisMonth: 47,
    },
    commissions: {
      total: 472500,
      distributors: 330750,
      offices: 141750,
    },
    performance: {
      topDistributors: [
        { name: "Carlos Oliveira", captured: 750000, commission: 22500 },
        { name: "Ana Costa", captured: 450000, commission: 13500 },
        { name: "Roberto Silva", captured: 380000, commission: 11400 },
      ],
      topInvestors: [
        { name: "João Silva", invested: 250000, returns: 7500 },
        { name: "Maria Santos", invested: 150000, returns: 4500 },
        { name: "Pedro Almeida", invested: 120000, returns: 3600 },
      ],
    },
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const handleExportReport = (type: string) => {
    // Simular download de relatório
    console.log(`Exportando relatório: ${type}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Relatórios e Análises
          </h2>
          <p className="text-muted-foreground">Acompanhe métricas e performance da plataforma</p>
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
            <option value="1y">Último ano</option>
          </select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reportData.investments.total)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-600">+{reportData.investments.growth}%</span> vs período anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.users.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+{reportData.users.newThisMonth} novos este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Pagas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(reportData.commissions.total)}</div>
            <p className="text-xs text-muted-foreground">Distribuídas este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68.5%</div>
            <p className="text-xs text-muted-foreground">Visitantes → Investidores</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="investments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="investments">Investimentos</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="commissions">Comissões</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

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
                      <p className="font-bold">{formatCurrency(reportData.investments.seniorQuota)}</p>
                      <Badge variant="secondary">3% a.m.</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="font-medium">Cota Subordinada</p>
                      <p className="text-sm text-muted-foreground">40% do total</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(reportData.investments.subordinateQuota)}</p>
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Janeiro</span>
                    <span className="font-medium">{formatCurrency(4200000)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Fevereiro</span>
                    <span className="font-medium">{formatCurrency(5800000)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Março</span>
                    <span className="font-medium">{formatCurrency(7300000)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Abril</span>
                    <span className="font-medium">{formatCurrency(9100000)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Maio</span>
                    <span className="font-medium">{formatCurrency(11500000)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-sm font-medium">Total Atual</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(reportData.investments.total)}</span>
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
                      <p className="font-bold">{reportData.users.investors}</p>
                      <Badge variant="secondary">Ativos</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div>
                      <p className="font-medium">Distribuidores</p>
                      <p className="text-sm text-muted-foreground">28.5% do total</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{reportData.users.distributors}</p>
                      <Badge variant="secondary">Ativos</Badge>
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Janeiro</span>
                    <span className="font-medium">+89 usuários</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Fevereiro</span>
                    <span className="font-medium">+124 usuários</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Março</span>
                    <span className="font-medium">+156 usuários</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Abril</span>
                    <span className="font-medium">+203 usuários</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Maio</span>
                    <span className="font-medium">+178 usuários</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-sm font-medium">Total</span>
                    <span className="font-bold text-emerald-600">{reportData.users.total}</span>
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
                      <p className="font-bold">{formatCurrency(reportData.commissions.distributors)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Escritórios (30%)</p>
                      <p className="text-sm text-muted-foreground">Comissão indireta</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(reportData.commissions.offices)}</p>
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Janeiro</span>
                    <span className="font-medium">{formatCurrency(126000)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Fevereiro</span>
                    <span className="font-medium">{formatCurrency(174000)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Março</span>
                    <span className="font-medium">{formatCurrency(219000)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Abril</span>
                    <span className="font-medium">{formatCurrency(273000)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Maio</span>
                    <span className="font-medium">{formatCurrency(345000)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-sm font-medium">Total</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(reportData.commissions.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Distribuidores</CardTitle>
                <CardDescription>Maiores captadores do período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.performance.topDistributors.map((distributor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{distributor.name}</p>
                          <p className="text-sm text-muted-foreground">Captou {formatCurrency(distributor.captured)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{formatCurrency(distributor.commission)}</p>
                        <p className="text-xs text-muted-foreground">Comissão</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Investidores</CardTitle>
                <CardDescription>Maiores investimentos do período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.performance.topInvestors.map((investor, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{investor.name}</p>
                          <p className="text-sm text-muted-foreground">Investiu {formatCurrency(investor.invested)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">{formatCurrency(investor.returns)}</p>
                        <p className="text-xs text-muted-foreground">Retorno</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
