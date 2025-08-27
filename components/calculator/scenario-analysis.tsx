"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { BarChart3, Target, TrendingUp } from "lucide-react"

export function ScenarioAnalysis() {
  const [selectedAnalysis, setSelectedAnalysis] = useState<"growth" | "targets" | "timeline">("growth")

  // Growth trajectory analysis
  const growthData = [
    { month: "Mês 1", conservative: 50000, moderate: 75000, aggressive: 100000 },
    { month: "Mês 3", conservative: 150000, moderate: 250000, aggressive: 350000 },
    { month: "Mês 6", conservative: 300000, moderate: 500000, aggressive: 750000 },
    { month: "Mês 9", conservative: 450000, moderate: 750000, aggressive: 1200000 },
    { month: "Mês 12", conservative: 600000, moderate: 1000000, aggressive: 1500000 },
  ]

  // Target achievement scenarios
  const targetScenarios = [
    {
      name: "Sem Metas",
      amount: 400000,
      monthlyCommission: 12000,
      annualCommission: 144000,
      bonus: 0,
      total: 144000,
    },
    {
      name: "Meta 1 (R$ 500k)",
      amount: 500000,
      monthlyCommission: 15000,
      annualCommission: 180000,
      bonus: 60000,
      total: 240000,
    },
    {
      name: "Meta 2 (R$ 1M)",
      amount: 1000000,
      monthlyCommission: 30000,
      annualCommission: 360000,
      bonus: 360000,
      total: 720000,
    },
  ]

  // Timeline analysis
  const timelineData = [
    { period: "3 meses", amount: 250000, commission: 22500, bonus: 0, total: 22500 },
    { period: "6 meses", amount: 500000, commission: 90000, bonus: 30000, total: 120000 },
    { period: "9 meses", amount: 750000, commission: 202500, bonus: 67500, total: 270000 },
    { period: "12 meses", amount: 1000000, commission: 360000, bonus: 360000, total: 720000 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Análise de Cenários
        </CardTitle>
        <CardDescription>Explore diferentes estratégias de crescimento e suas implicações</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Analysis Type Selector */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedAnalysis === "growth" ? "default" : "outline"}
            onClick={() => setSelectedAnalysis("growth")}
            size="sm"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Trajetória de Crescimento
          </Button>
          <Button
            variant={selectedAnalysis === "targets" ? "default" : "outline"}
            onClick={() => setSelectedAnalysis("targets")}
            size="sm"
          >
            <Target className="h-4 w-4 mr-2" />
            Atingimento de Metas
          </Button>
          <Button
            variant={selectedAnalysis === "timeline" ? "default" : "outline"}
            onClick={() => setSelectedAnalysis("timeline")}
            size="sm"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Análise Temporal
          </Button>
        </div>

        {/* Growth Trajectory Analysis */}
        {selectedAnalysis === "growth" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Trajetórias de Crescimento</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Compare diferentes estratégias de captação ao longo do tempo
              </p>
            </div>

            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
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
                      new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(value),
                      name === "conservative" ? "Conservador" : name === "moderate" ? "Moderado" : "Agressivo",
                    ]}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="conservative"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="moderate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="aggressive"
                    stroke="hsl(var(--secondary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Estratégia Conservadora</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">R$ 600k/ano</p>
                  <p className="text-xs text-muted-foreground">Crescimento gradual e sustentável</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-primary">Estratégia Moderada</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-primary">R$ 1M/ano</p>
                  <p className="text-xs text-muted-foreground">Equilibrio entre risco e retorno</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-secondary">Estratégia Agressiva</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-secondary">R$ 1.5M/ano</p>
                  <p className="text-xs text-muted-foreground">Crescimento acelerado</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Target Achievement Analysis */}
        {selectedAnalysis === "targets" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Impacto das Metas de Performance</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Veja como o atingimento das metas afeta suas comissões totais
              </p>
            </div>

            <div className="grid gap-4">
              {targetScenarios.map((scenario, index) => (
                <Card key={index} className={index === 2 ? "border-2 border-primary" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className={index === 2 ? "text-primary" : ""}>{scenario.name}</CardTitle>
                      <Badge variant={index === 0 ? "secondary" : index === 1 ? "default" : "default"}>
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          notation: "compact",
                        }).format(scenario.amount)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground">Comissão Mensal</span>
                        <p className="font-bold">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(scenario.monthlyCommission)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Comissão Anual</span>
                        <p className="font-bold">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(scenario.annualCommission)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Bônus</span>
                        <p className="font-bold text-secondary">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(scenario.bonus)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Total</span>
                        <p className={`font-bold ${index === 2 ? "text-primary" : ""}`}>
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(scenario.total)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
              <h4 className="font-semibold text-accent mb-2">Insight Estratégico</h4>
              <p className="text-sm text-muted-foreground">
                Atingir a Meta 2 (R$ 1M) resulta em <strong>5x mais comissões</strong> comparado ao cenário sem metas. O
                investimento em estratégias mais agressivas pode ser altamente recompensador.
              </p>
            </div>
          </div>
        )}

        {/* Timeline Analysis */}
        {selectedAnalysis === "timeline" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Análise Temporal de Retorno</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Evolução das comissões ao longo do tempo com crescimento progressivo
              </p>
            </div>

            <div className="grid gap-4">
              {timelineData.map((period, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{period.period}</CardTitle>
                      <Badge variant="outline">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          notation: "compact",
                        }).format(period.amount)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground">Comissão Base</span>
                        <p className="font-bold">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(period.commission)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Bônus</span>
                        <p className="font-bold text-secondary">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(period.bonus)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Total Acumulado</span>
                        <p className="font-bold text-primary">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(period.total)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
