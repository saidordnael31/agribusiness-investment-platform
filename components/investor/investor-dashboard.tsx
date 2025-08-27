"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, DollarSign, Calendar, ArrowUpRight, Plus, Minus } from "lucide-react"
import { InvestmentSimulator } from "./investment-simulator"
import { InvestmentHistory } from "./investment-history"
import { PerformanceChart } from "./performance-chart"
import Link from "next/link"

interface UserData {
  name: string
  email: string
  type: string
}

export function InvestorDashboard() {
  const [user, setUser] = useState<UserData | null>(null)

  // Mock investment data
  const [investments] = useState({
    totalInvested: 150000,
    currentValue: 163500,
    monthlyReturn: 4500,
    seniorQuota: 100000,
    subordinateQuota: 50000,
  })

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }, [])

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Welcome Section */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Bem-vindo, {user.name}</h2>
              <p className="text-muted-foreground">Acompanhe seus investimentos no Clube Agroderi</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/deposit" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  Depositar
                </Button>
              </Link>
              <Link href="/withdraw" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-transparent"
                >
                  <Minus className="h-4 w-4" />
                  Resgatar
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-primary">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(investments.totalInvested)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Atual</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-secondary">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(investments.currentValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                +{((investments.currentValue / investments.totalInvested - 1) * 100).toFixed(2)}% no período
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retorno Mensal</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-accent">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(investments.monthlyReturn)}
              </div>
              <p className="text-xs text-muted-foreground">Média dos últimos 3 meses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Liquidez</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">D+2</div>
              <p className="text-xs text-muted-foreground">Resgate em até 2 dias úteis</p>
            </CardContent>
          </Card>
        </div>

        {/* Investment Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição dos Investimentos</CardTitle>
              <CardDescription>Suas cotas no Clube Agroderi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg space-y-2 sm:space-y-0">
                <div>
                  <h4 className="font-semibold text-primary">Cota Sênior</h4>
                  <p className="text-sm text-muted-foreground">Rentabilidade: 3% a.m.</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(investments.seniorQuota)}
                  </p>
                  <Badge variant="outline">Conservador</Badge>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border border-border rounded-lg space-y-2 sm:space-y-0">
                <div>
                  <h4 className="font-semibold text-secondary">Cota Subordinada</h4>
                  <p className="text-sm text-muted-foreground">Rentabilidade: 3,5% a.m.</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-bold">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(investments.subordinateQuota)}
                  </p>
                  <Badge variant="secondary">Arrojado</Badge>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Link href="/deposit" className="flex-1">
                  <Button variant="outline" className="w-full flex items-center justify-center gap-2 bg-transparent">
                    <Plus className="h-4 w-4" />
                    Depositar Mais
                  </Button>
                </Link>
                <Link href="/withdraw" className="flex-1">
                  <Button variant="outline" className="w-full flex items-center justify-center gap-2 bg-transparent">
                    <Minus className="h-4 w-4" />
                    Resgatar
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Mensal</CardTitle>
              <CardDescription>Evolução dos seus investimentos</CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceChart />
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="simulator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simulator" className="text-sm">
              Simulador
            </TabsTrigger>
            <TabsTrigger value="history" className="text-sm">
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simulator">
            <InvestmentSimulator />
          </TabsContent>

          <TabsContent value="history">
            <InvestmentHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
