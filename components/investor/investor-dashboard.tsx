"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, DollarSign, ArrowUpRight } from "lucide-react"
import { InvestmentSimulator } from "./investment-simulator"
import { InvestmentHistory } from "./investment-history"
import { PerformanceChart } from "./performance-chart"
import { createBrowserClient } from "@supabase/ssr"

interface UserData {
  name: string
  email: string
  type: string
  id?: string
}

interface InvestmentData {
  totalInvested: number
  currentValue: number
  monthlyReturn: number
  seniorQuota: number
  subordinateQuota: number
}

export function InvestorDashboard() {
  const [user, setUser] = useState<UserData | null>(null)
  const [investments, setInvestments] = useState<InvestmentData>({
    totalInvested: 0,
    currentValue: 0,
    monthlyReturn: 0,
    seniorQuota: 0,
    subordinateQuota: 0,
  })
  const [loading, setLoading] = useState(true)

  const fetchInvestmentData = async (userId: string) => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const { data: investmentData, error } = await supabase
        .from("investments")
        .select("amount, quota_type, monthly_return_rate")
        .eq("user_id", userId)
        .eq("status", "active")

      if (error) {
        console.error("[v0] Erro ao buscar investimentos:", error)
        return
      }

      if (!investmentData || investmentData.length === 0) {
        console.log("[v0] Nenhum investimento encontrado para o usuário")
        setLoading(false)
        return
      }

      const totalInvested = investmentData.reduce((sum, inv) => sum + Number(inv.amount), 0)

      const seniorInvestments = investmentData.filter((inv) => inv.quota_type === "senior")
      const subordinateInvestments = investmentData.filter((inv) => inv.quota_type === "subordinate")

      const seniorQuota = seniorInvestments.reduce((sum, inv) => sum + Number(inv.amount), 0)
      const subordinateQuota = subordinateInvestments.reduce((sum, inv) => sum + Number(inv.amount), 0)

      const seniorReturn = seniorQuota * 0.03
      const subordinateReturn = subordinateQuota * 0.035
      const monthlyReturn = seniorReturn + subordinateReturn

      const currentValue = totalInvested + monthlyReturn * 6

      setInvestments({
        totalInvested,
        currentValue,
        monthlyReturn,
        seniorQuota,
        subordinateQuota,
      })

      console.log("[v0] Dados de investimento carregados:", {
        totalInvested,
        currentValue,
        monthlyReturn,
        seniorQuota,
        subordinateQuota,
      })
    } catch (error) {
      console.error("[v0] Erro ao carregar dados de investimento:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      const userData = JSON.parse(userStr)
      setUser(userData)

      if (userData.id) {
        fetchInvestmentData(userData.id)
      }
    } else {
      setLoading(false)
    }
  }, [])

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando seus investimentos...</p>
        </div>
      </div>
    )
  }

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
                +
                {investments.totalInvested > 0
                  ? ((investments.currentValue / investments.totalInvested - 1) * 100).toFixed(2)
                  : "0.00"}
                % no período
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
              <p className="text-xs text-muted-foreground">Baseado na rentabilidade das cotas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Liquidez</CardTitle>
              <CardDescription>Resgate em até 2 dias úteis</CardDescription>
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
              {investments.seniorQuota > 0 && (
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
              )}

              {investments.subordinateQuota > 0 && (
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
              )}

              {investments.totalInvested === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Você ainda não possui investimentos</p>
                  <p className="text-sm text-muted-foreground">
                    Entre em contato com seu assessor para realizar investimentos
                  </p>
                </div>
              )}
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
