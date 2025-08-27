"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp } from "lucide-react"

export function ComparisonCalculator() {
  const [scenarios, setScenarios] = useState([
    { name: "Cenário 1", amount: 100000 },
    { name: "Cenário 2", amount: 500000 },
    { name: "Cenário 3", amount: 1000000 },
  ])

  const calculateScenario = (amount: number) => {
    const monthlyCommission = amount * 0.03
    const annualCommission = monthlyCommission * 12

    let performanceBonus = 0
    if (amount >= 1000000) {
      performanceBonus = amount * 0.03 * 12 // +3% additional
    } else if (amount >= 500000) {
      performanceBonus = amount * 0.01 * 12 // +1% additional
    }

    const advisorShare = (annualCommission + performanceBonus) * 0.7
    const totalWithBonus = annualCommission + performanceBonus

    return {
      monthlyCommission,
      annualCommission,
      performanceBonus,
      advisorShare,
      totalWithBonus,
    }
  }

  const updateScenario = (index: number, amount: number) => {
    const newScenarios = [...scenarios]
    newScenarios[index].amount = amount
    setScenarios(newScenarios)
  }

  const comparisonData = scenarios.map((scenario) => {
    const calc = calculateScenario(scenario.amount)
    return {
      name: scenario.name,
      amount: scenario.amount,
      monthly: calc.monthlyCommission,
      annual: calc.annualCommission,
      bonus: calc.performanceBonus,
      total: calc.totalWithBonus,
      advisor: calc.advisorShare,
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Comparação de Cenários
        </CardTitle>
        <CardDescription>Compare diferentes valores de captação lado a lado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Inputs */}
        <div className="grid md:grid-cols-3 gap-4">
          {scenarios.map((scenario, index) => (
            <div key={index} className="space-y-2">
              <Label htmlFor={`scenario-${index}`}>{scenario.name}</Label>
              <Input
                id={`scenario-${index}`}
                type="number"
                value={scenario.amount}
                onChange={(e) => updateScenario(index, Number.parseFloat(e.target.value) || 0)}
                min="0"
                step="10000"
              />
            </div>
          ))}
        </div>

        {/* Comparison Chart */}
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
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
                  name === "annual" ? "Comissão Anual" : name === "bonus" ? "Bônus" : "Total",
                ]}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="annual" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
              <Bar dataKey="bonus" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison Table */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Comparação Detalhada</h4>
          <div className="grid gap-4">
            {comparisonData.map((data, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{data.name}</CardTitle>
                    <Badge variant="outline">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        notation: "compact",
                      }).format(data.amount)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Mensal</span>
                      <p className="font-bold">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(data.monthly)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Anual</span>
                      <p className="font-bold">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(data.annual)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bônus</span>
                      <p className="font-bold text-secondary">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(data.bonus)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total</span>
                      <p className="font-bold text-primary">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(data.total)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
