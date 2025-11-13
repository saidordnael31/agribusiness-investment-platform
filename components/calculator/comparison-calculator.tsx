"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Clock3, Droplets, TrendingUp } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import {
  LiquidityOption,
  getAvailableLiquidityOptions,
  getInvestorMonthlyRate,
  getLiquidityCycleMonths,
  getRedemptionWindow,
} from "@/lib/commission-calculator"
import { Separator } from "@/components/ui/separator"

interface ScenarioConfig {
  name: string
  amount: number
  commitmentPeriod: number
  liquidity: LiquidityOption
}

const commitmentOptions = [3, 6, 12, 24, 36]

const liquidityLabels: Record<LiquidityOption, string> = {
  mensal: "Mensal",
  semestral: "Semestral",
  anual: "Anual",
  bienal: "Bienal",
  trienal: "Trienal",
}

export function ComparisonCalculator() {
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>([
    { name: "Cenário 1", amount: 500000, commitmentPeriod: 12, liquidity: "mensal" },
    { name: "Cenário 2", amount: 500000, commitmentPeriod: 12, liquidity: "semestral" },
    { name: "Cenário 3", amount: 500000, commitmentPeriod: 12, liquidity: "anual" },
  ])
  const [chartMode, setChartMode] = useState<"total" | "cycle">("total")

  const calculateScenario = (scenario: ScenarioConfig) => {
    const { amount, commitmentPeriod, liquidity } = scenario

    const investorRate = getInvestorMonthlyRate(commitmentPeriod, liquidity)
    const redemptionWindow = getRedemptionWindow(commitmentPeriod)
    const liquidityCycleMonths = getLiquidityCycleMonths(liquidity)

    const investorMonthlyCommission = amount * investorRate
    const compoundProfit =
      liquidityCycleMonths > 0
        ? amount * (Math.pow(1 + investorRate, commitmentPeriod) - 1)
        : investorMonthlyCommission * commitmentPeriod
    const cycleProfit =
      liquidityCycleMonths > 0
        ? amount * (Math.pow(1 + investorRate, liquidityCycleMonths) - 1)
        : investorMonthlyCommission

    const cycles = liquidityCycleMonths > 0 ? Math.floor(commitmentPeriod / liquidityCycleMonths) : 0
    const remainderMonths = liquidityCycleMonths > 0 ? commitmentPeriod % liquidityCycleMonths : 0

    let totalRescueProfit = cycles * cycleProfit
    if (remainderMonths > 0) {
      totalRescueProfit += amount * (Math.pow(1 + investorRate, remainderMonths) - 1)
    }

    return {
      investorMonthlyCommission,
      liquidityCycleCommission: cycleProfit,
      totalCompoundProfit: compoundProfit,
      totalRescueProfit,
      annualizedCommission: investorMonthlyCommission * 12,
      investorCommission: investorMonthlyCommission * commitmentPeriod,
      investorRate,
      redemptionWindow,
      liquidityCycleMonths,
    }
  }

  const updateScenario = (index: number, field: keyof ScenarioConfig, value: number | LiquidityOption) => {
    setScenarios((prev) => {
      const next = [...prev]
      const scenario = { ...next[index] }

      if (field === "amount" && typeof value === "number") {
        scenario.amount = Math.max(0, value)
      } else if (field === "commitmentPeriod" && typeof value === "number") {
        scenario.commitmentPeriod = value
        const availableLiquidity = getAvailableLiquidityOptions(value)
        scenario.liquidity = availableLiquidity.includes(scenario.liquidity)
          ? scenario.liquidity
          : availableLiquidity[0] || "mensal"
      } else if (field === "liquidity" && typeof value === "string") {
        scenario.liquidity = value as LiquidityOption
      }

      next[index] = scenario
      return next
    })
  }

  const comparisonData = useMemo(() => {
    return scenarios.map((scenario) => {
      const calc = calculateScenario(scenario)
      const availableLiquidity = getAvailableLiquidityOptions(scenario.commitmentPeriod)
      const redemptionWindow = calc.redemptionWindow

      return {
        name: scenario.name,
        amount: scenario.amount,
        commitmentPeriod: scenario.commitmentPeriod,
        liquidity: scenario.liquidity,
        liquidityLabel:
          liquidityLabels[scenario.liquidity] ?? scenario.liquidity.charAt(0).toUpperCase() + scenario.liquidity.slice(1),
        availableLiquidity,
        redemptionWindow,
        investorRate: calc.investorRate,
        investorMonthlyCommission: calc.investorMonthlyCommission,
        monthly: calc.investorMonthlyCommission,
        annual: calc.annualizedCommission,
        totalCompound: calc.totalCompoundProfit,
        totalRescue: calc.totalRescueProfit,
        total: calc.totalCompoundProfit,
        periodCommission: calc.liquidityCycleCommission,
        liquidityCycleMonths: calc.liquidityCycleMonths,
      }
    })
  }, [scenarios])

  const chartData = useMemo(
    () =>
      comparisonData.map((scenario) => ({
        ...scenario,
        value: chartMode === "total" ? scenario.totalCompound : scenario.totalRescue,
      })),
    [comparisonData, chartMode],
  )

  const chartModeLabel = chartMode === "total" ? "Rentabilidade total" : "Rentabilidade com resgates periódicos"
  const chartDescription =
    chartMode === "total"
      ? "O gráfico considera toda a rentabilidade acumulada sem resgates durante o período."
      : "O gráfico considera a rentabilidade disponível ao final de cada ciclo de liquidez, com resgates periódicos."

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Comparação de Cenários
        </CardTitle>
        <CardDescription>
          Ajuste valor, prazo de compromisso, tempo de resgate e liquidez para comparar o impacto na rentabilidade do investidor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {comparisonData.map((scenario, index) => (
            <Card key={scenario.name} className="border-muted-foreground/10 bg-muted/40 backdrop-blur">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{scenario.name}</CardTitle>
                  <Badge variant="outline">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      notation: "compact",
                    }).format(scenario.amount)}
                  </Badge>
                </div>
                <CardDescription>Defina as premissas para este cenário</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`amount-${index}`}>Valor captado</Label>
                  <Input
                    id={`amount-${index}`}
                    type="number"
                    min={0}
                    step={10000}
                    value={scenario.amount}
                    onChange={(event) => updateScenario(index, "amount", Number.parseFloat(event.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo de compromisso</Label>
                  <Select
                    value={String(scenario.commitmentPeriod)}
                    onValueChange={(value) => updateScenario(index, "commitmentPeriod", Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o prazo" />
                    </SelectTrigger>
                    <SelectContent>
                      {commitmentOptions.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option} meses
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Liquidez</Label>
                  <Select
                    value={scenario.liquidity}
                    onValueChange={(value) => updateScenario(index, "liquidity", value as LiquidityOption)}
                    disabled={!scenario.commitmentPeriod || scenario.availableLiquidity?.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a liquidez" />
                    </SelectTrigger>
                    <SelectContent>
                      {scenario.availableLiquidity?.map((option) => (
                        <SelectItem key={option} value={option}>
                          {liquidityLabels[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-background/40 p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock3 className="h-4 w-4" />
                      Prazo de resgate
                    </div>
                    <p className="mt-1 font-semibold">{scenario.redemptionWindow.label}</p>
                  </div>
                  <div className="rounded-lg bg-background/40 p-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Droplets className="h-4 w-4" />
                      Liquidez
                    </div>
                    <p className="mt-1 font-semibold">{scenario.liquidityLabel}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-primary/10 bg-primary/5 p-3 text-sm">
                  <span className="text-muted-foreground">Taxa investidor aplicada</span>
                  <p className="text-lg font-semibold text-primary">
                    {(scenario.investorRate * 100).toFixed(2)}% a.m.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-dashed border-primary/30 bg-background">
          <CardHeader className="pb-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Comparativo de Rentabilidade do Investidor</CardTitle>
                <CardDescription>{chartDescription}</CardDescription>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch
                  id="chart-mode"
                  checked={chartMode === "cycle"}
                  onCheckedChange={(checked) => setChartMode(checked ? "cycle" : "total")}
                />
                <Label htmlFor="chart-mode" className="cursor-pointer text-muted-foreground">
                  Resgate por período
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[420px] w-full pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                  formatter={(value: number, name: string) => {
                    return [
                      new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(value),
                      chartModeLabel,
                    ]
                  }}
                  labelFormatter={(label: string, payload) => {
                    const scenario = payload?.[0]?.payload as (typeof chartData)[number] | undefined
                    if (!scenario) return label
                    const base = `${label} • ${scenario.commitmentPeriod} meses • ${scenario.liquidityLabel}`
                    if (chartMode === "cycle") {
                      return `${base} • Resgate por período`
                    }
                    return `${base} • Rentabilidade total`
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Bar dataKey="value" fill="#1f2933" name={chartModeLabel} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold">Indicadores detalhados por cenário</h4>
          <div className="grid gap-4 lg:grid-cols-3">
            {comparisonData.map((data) => (
              <Card key={`details-${data.name}`} className="border-muted-foreground/10 bg-muted/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">{data.name}</CardTitle>
                    <Badge variant="outline">{data.redemptionWindow.label}</Badge>
                  </div>
                  <CardDescription>{data.liquidityLabel} • {(data.investorRate * 100).toFixed(2)}% a.m.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-muted-foreground">Rentabilidade mensal</span>
                      <p className="font-semibold text-blue-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(data.investorMonthlyCommission)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rentabilidade anualizada</span>
                      <p className="font-semibold text-emerald-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(data.annual)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Rentabilidade {data.liquidityLabel.toLowerCase()}</span>
                      <p className="font-semibold text-purple-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(data.periodCommission)}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-1 text-xs uppercase text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Total sem resgates</span>
                      <span>Com resgates periódicos</span>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-2xl font-semibold text-primary">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(data.totalCompound)}
                    </p>
                    <p className="text-sm font-semibold text-muted-foreground">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(data.totalRescue)}
                    </p>
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
