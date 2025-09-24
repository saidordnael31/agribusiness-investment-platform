"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp } from "lucide-react"
import { calculateCommissionBreakdown } from "@/lib/commission-calculator"

export function ComparisonCalculator() {
  const [scenarios, setScenarios] = useState([
    { name: "Cenário 1", amount: 100000 },
    { name: "Cenário 2", amount: 500000 },
    { name: "Cenário 3", amount: 1000000 },
  ])

  const calculateScenario = (amount: number) => {
    // Calcular breakdown de comissões por role
    const breakdown = calculateCommissionBreakdown(amount, 12)
    
    // Calcular bônus de performance
    let performanceBonus = 0
    if (amount >= 1000000) {
      performanceBonus = amount * 0.03 * 12 // +3% additional
    } else if (amount >= 500000) {
      performanceBonus = amount * 0.01 * 12 // +1% additional
    }

    return {
      monthlyCommission: breakdown.totalCommission / 12,
      annualCommission: breakdown.totalCommission,
      performanceBonus,
      investorCommission: breakdown.investorCommission,
      escritorioCommission: breakdown.escritorioCommission,
      assessorCommission: breakdown.assessorCommission,
      totalWithBonus: breakdown.totalCommission + performanceBonus,
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
      total: calc.totalWithBonus,
      investor: calc.investorCommission,
      escritorio: calc.escritorioCommission,
      assessor: calc.assessorCommission,
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
                  name === "annual" ? "Comissão Anual" : "Comissão Anual",
                ]}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="investor" fill="#3b82f6" name="Investidor (2%)" />
              <Bar dataKey="escritorio" fill="#10b981" name="Escritório (1%)" />
              <Bar dataKey="assessor" fill="#8b5cf6" name="Assessor (3%)" />
              <Bar dataKey="total" fill="#f59e0b" name="Total com Bônus" />
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
                      <span className="text-muted-foreground text-blue-600">Investidor (2%)</span>
                      <p className="font-bold text-blue-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(data.investor)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-green-600">Escritório (1%)</span>
                      <p className="font-bold text-green-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(data.escritorio)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-purple-600">Assessor (3%)</span>
                      <p className="font-bold text-purple-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(data.assessor)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total com Bônus</span>
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
