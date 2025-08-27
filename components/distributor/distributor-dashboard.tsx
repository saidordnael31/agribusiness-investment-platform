"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, DollarSign, Users, Trophy } from "lucide-react"
import { CommissionSimulator } from "./commission-simulator"
import { ClientsList } from "./clients-list"
import { SalesChart } from "./sales-chart"

interface UserData {
  name: string
  email: string
  type: string
}

export function DistributorDashboard() {
  const [user, setUser] = useState<UserData | null>(null)

  // Mock distributor data
  const [distributorData] = useState({
    totalCaptured: 750000,
    monthlyCommission: 22500,
    annualCommission: 270000,
    clientsCount: 15,
    officeShare: 8100, // 30% of commission
    advisorShare: 18900, // 70% of commission
    currentMonth: {
      captured: 125000,
      commission: 3750,
    },
    performanceBonus: {
      meta1Achieved: true, // R$ 500k
      meta2Achieved: true, // R$ 1M
      additionalRate: 3, // +1% + 2% = 3% additional
    },
    ranking: {
      position: 3,
      totalDistributors: 50,
      poolShare: 2500, // Share of national pool
    },
  })

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }, [])

  if (!user) return null

  const meta1Progress = Math.min((distributorData.totalCaptured / 500000) * 100, 100)
  const meta2Progress = Math.min((distributorData.totalCaptured / 1000000) * 100, 100)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard do Distribuidor</h2>
          <p className="text-muted-foreground">Acompanhe suas vendas, comissões e performance</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Captado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(distributorData.totalCaptured)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissão Mensal</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(distributorData.monthlyCommission)}
              </div>
              <p className="text-xs text-muted-foreground">3% sobre base investida</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{distributorData.clientsCount}</div>
              <p className="text-xs text-muted-foreground">Investidores cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ranking</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">#{distributorData.ranking.position}</div>
              <p className="text-xs text-muted-foreground">
                de {distributorData.ranking.totalDistributors} distribuidores
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Commission Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Divisão de Comissões</CardTitle>
              <CardDescription>Distribuição mensal das comissões</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <h4 className="font-semibold text-primary">Assessor (70%)</h4>
                  <p className="text-sm text-muted-foreground">Sua parte da comissão</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(distributorData.advisorShare)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <h4 className="font-semibold text-secondary">Escritório (30%)</h4>
                  <p className="text-sm text-muted-foreground">Parte do escritório</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-secondary">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(distributorData.officeShare)}
                  </p>
                </div>
              </div>

              {distributorData.performanceBonus.additionalRate > 0 && (
                <div className="flex items-center justify-between p-4 border border-accent/20 bg-accent/5 rounded-lg">
                  <div>
                    <h4 className="font-semibold text-accent">Bônus Performance</h4>
                    <p className="text-sm text-muted-foreground">
                      +{distributorData.performanceBonus.additionalRate}% adicional
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">Ativo</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metas de Performance</CardTitle>
              <CardDescription>Progresso para bônus adicionais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Meta 1: R$ 500 mil</span>
                  <Badge variant={distributorData.performanceBonus.meta1Achieved ? "default" : "secondary"}>
                    {distributorData.performanceBonus.meta1Achieved ? "Atingida" : "Pendente"}
                  </Badge>
                </div>
                <Progress value={meta1Progress} className="h-2" />
                <p className="text-xs text-muted-foreground">+1% recorrente adicional por 12 meses</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Meta 2: R$ 1 milhão</span>
                  <Badge variant={distributorData.performanceBonus.meta2Achieved ? "default" : "secondary"}>
                    {distributorData.performanceBonus.meta2Achieved ? "Atingida" : "Pendente"}
                  </Badge>
                </div>
                <Progress value={meta2Progress} className="h-2" />
                <p className="text-xs text-muted-foreground">+2% recorrente adicional por 12 meses</p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2">Pool Nacional</h4>
                <p className="text-sm text-muted-foreground mb-2">Sua participação no pool dos top escritórios:</p>
                <p className="font-bold text-accent">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(distributorData.ranking.poolShare)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Evolução de Vendas</CardTitle>
            <CardDescription>Captação mensal nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart />
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <Tabs defaultValue="simulator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simulator">Simulador de Comissões</TabsTrigger>
            <TabsTrigger value="clients">Clientes</TabsTrigger>
          </TabsList>

          <TabsContent value="simulator">
            <CommissionSimulator />
          </TabsContent>

          <TabsContent value="clients">
            <ClientsList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
