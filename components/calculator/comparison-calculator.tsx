"use client"

import { useEffect, useMemo, useState } from "react"
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
  getLiquidityCycleMonths,
  getRedemptionWindow,
} from "@/lib/commission-calculator"
import { Separator } from "@/components/ui/separator"
import { getRentabilityConfig, type RentabilityConfig } from "@/lib/rentability-utils"
import { useUserType } from "@/hooks/useUserType"
import { createClient } from "@/lib/supabase/client"
import { getUserTypeHierarchy, getUserTypeFromId } from "@/lib/user-type-utils"

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
  const [isExternalAdvisor, setIsExternalAdvisor] = useState(false)
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>([
    { name: "Cenário 1", amount: 500000, commitmentPeriod: 12, liquidity: "mensal" },
    { name: "Cenário 2", amount: 500000, commitmentPeriod: 12, liquidity: "semestral" },
    { name: "Cenário 3", amount: 500000, commitmentPeriod: 12, liquidity: "anual" },
  ])
  const [chartMode, setChartMode] = useState<"total" | "cycle">("total")
  const [user, setUser] = useState<any>(null)
  const [investorUserTypeId, setInvestorUserTypeId] = useState<number | null>(null)
  const [isLoadingRates, setIsLoadingRates] = useState(true)
  // Configuração de rentabilidade do investidor (carregada uma vez)
  const [rentabilityConfig, setRentabilityConfig] = useState<RentabilityConfig | null>(null)
  
  // Usar hook para obter user_type_id do usuário logado
  const { user_type_id } = useUserType(user?.id)

  useEffect(() => {
    if (typeof window === "undefined") return
    const userStr = localStorage.getItem("user")
    if (!userStr) return
    try {
      const parsed = JSON.parse(userStr)
      setUser(parsed)
      const role = parsed.role || parsed.user_type || parsed.type
      setIsExternalAdvisor(role === "assessor_externo")
    } catch {
      setIsExternalAdvisor(false)
    }
  }, [])

  // Buscar o user_type_id do investidor relacionado ao usuário logado (mesma lógica do InvestmentSimulator)
  useEffect(() => {
    const findInvestorUserTypeId = async () => {
      if (!user_type_id) {
        console.log("[ComparisonCalculator] Aguardando user_type_id...")
        return
      }

      try {
        // Buscar hierarquia (filhos) do user_type logado
        const childUserTypeIds = await getUserTypeHierarchy(user_type_id)
        
        if (childUserTypeIds.length === 0) {
          console.warn("[ComparisonCalculator] Nenhum filho encontrado para user_type:", user_type_id)
          // Se não tiver filhos, pode ser que seja um investidor simulando para si mesmo
          const currentUserType = await getUserTypeFromId(user_type_id)
          if (currentUserType?.user_type === "investor") {
            console.log("[ComparisonCalculator] Usuário já é investidor, usando próprio user_type_id")
            setInvestorUserTypeId(user_type_id)
          }
          return
        }

        // Buscar os tipos filhos para encontrar o investidor
        const childUserTypes = await Promise.all(
          childUserTypeIds.map(id => getUserTypeFromId(id))
        )

        // Encontrar o primeiro tipo que é "investor"
        const investorType = childUserTypes.find(type => type?.user_type === "investor")
        
        if (investorType) {
          console.log("[ComparisonCalculator] Investidor encontrado:", investorType.id)
          setInvestorUserTypeId(investorType.id)
        } else {
          console.warn("[ComparisonCalculator] Nenhum investidor encontrado na hierarquia")
        }
      } catch (error) {
        console.error("[ComparisonCalculator] Erro ao buscar user_type_id do investidor:", error)
        // Fallback: usar o próprio user_type_id
        setInvestorUserTypeId(user_type_id)
      }
    }

    findInvestorUserTypeId()
  }, [user_type_id])

  // Buscar configuração de rentabilidade quando investorUserTypeId mudar (uma vez só)
  useEffect(() => {
    const fetchRentabilityConfig = async () => {
      if (!investorUserTypeId) {
        setRentabilityConfig(null)
        return
      }

      try {
        // Buscar user_type para obter rentability_id
        const userType = await getUserTypeFromId(investorUserTypeId)
        if (!userType || !userType.rentability_id) {
          console.warn("[ComparisonCalculator] User type sem rentability_id")
          setRentabilityConfig(null)
          return
        }

        // Buscar configuração de rentabilidade (JSON completo)
        const config = await getRentabilityConfig(userType.rentability_id)
        setRentabilityConfig(config)
        console.log("[ComparisonCalculator] Configuração de rentabilidade carregada:", config)
      } catch (error) {
        console.error("[ComparisonCalculator] Erro ao buscar configuração de rentabilidade:", error)
        setRentabilityConfig(null)
      }
    }

    fetchRentabilityConfig()
  }, [investorUserTypeId])

  // Marcar como carregado quando a configuração estiver disponível e ajustar liquidezes dos cenários
  useEffect(() => {
    setIsLoadingRates(!rentabilityConfig)
    
    // Quando a configuração for carregada, ajustar as liquidezes dos cenários para garantir que sejam válidas
    if (rentabilityConfig) {
      setScenarios((prev) => {
        return prev.map((scenario) => {
          const availableLiquidity = getAvailableLiquidityOptionsFromConfig(scenario.commitmentPeriod)
          
          // Se a liquidez atual não estiver disponível, usar a primeira disponível
          if (availableLiquidity.length > 0 && !availableLiquidity.includes(scenario.liquidity)) {
            return {
              ...scenario,
              liquidity: availableLiquidity[0] as LiquidityOption,
            }
          }
          
          return scenario
        })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentabilityConfig])

  // Mapeamento de liquidez para chaves de rates (mesma lógica do InvestmentSimulator)
  const liquidityToRateKey: Record<string, keyof RentabilityConfig["periods"][0]["rates"]> = {
    Mensal: "monthly",
    mensal: "monthly",
    Monthly: "monthly",
    monthly: "monthly",
    Semestral: "semiannual",
    semestral: "semiannual",
    Semiannual: "semiannual",
    semiannual: "semiannual",
    Anual: "annual",
    anual: "annual",
    Annual: "annual",
    annual: "annual",
    Bienal: "biennial",
    bienal: "biennial",
    Biennial: "biennial",
    biennial: "biennial",
    Trienal: "triennial",
    trienal: "triennial",
    Triennial: "triennial",
    triennial: "triennial",
  }

  // Função síncrona para obter taxa do estado local (sem chamadas ao banco)
  const getRate = (commitmentPeriod: number, liquidity: LiquidityOption | string): number => {
    if (!rentabilityConfig) {
      return 0
    }

    // Se for fixa, retornar fixed_rate convertido para decimal
    if (rentabilityConfig.is_fixed && rentabilityConfig.fixed_rate !== null) {
      return Number(rentabilityConfig.fixed_rate) / 100
    }

    // Se não for fixa, buscar taxa no período e liquidez específicos
    if (!rentabilityConfig.periods || rentabilityConfig.periods.length === 0) {
      return 0
    }

    // Encontrar período correspondente
    const periodConfig = rentabilityConfig.periods.find((p) => p.months === commitmentPeriod)
    if (!periodConfig) {
      return 0
    }

    // Normalizar liquidez
    const normalizedLiquidity = typeof liquidity === 'string' 
      ? liquidity.charAt(0).toUpperCase() + liquidity.slice(1).toLowerCase()
      : liquidity.charAt(0).toUpperCase() + liquidity.slice(1).toLowerCase()

    // Mapear liquidez para chave de rate
    const rateKey = liquidityToRateKey[normalizedLiquidity]
    if (!rateKey) {
      return 0
    }

    // Obter taxa
    const rate = periodConfig.rates[rateKey]
    if (rate === undefined || rate === null) {
      return 0
    }

    // As taxas vêm como porcentagem (ex: 1.55 para 1.55%), converter para decimal (0.0155)
    return Number(rate) / 100
  }

  const calculateScenario = (scenario: ScenarioConfig) => {
    const { amount, commitmentPeriod, liquidity } = scenario
    
    // Usar taxa do cache (mesma lógica do InvestmentSimulator)
    const investorRate = getRate(commitmentPeriod, liquidity)
    const redemptionWindow = getRedemptionWindow(commitmentPeriod)
    const liquidityCycleMonths = getLiquidityCycleMonths(liquidity)

    // Calcular usando juros compostos (mesma fórmula do InvestmentSimulator)
    // finalAmount = amount * Math.pow(1 + rate, period)
    const finalAmount = amount * Math.pow(1 + investorRate, commitmentPeriod)
    const totalCompoundProfit = finalAmount - amount
    const investorMonthlyCommission = amount * investorRate
    
    // Calcular rentabilidade por ciclo de liquidez
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
      totalCompoundProfit,
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
        const availableLiquidity = getAvailableLiquidityOptionsFromConfig(value)
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


  // Função para obter opções de liquidez disponíveis baseadas no prazo e na configuração de rentabilidade
  const getAvailableLiquidityOptionsFromConfig = (period: number): string[] => {
    // Se não tiver configuração de rentabilidade, retornar array vazio
    if (!rentabilityConfig || !rentabilityConfig.periods) {
      return []
    }

    // Encontrar período correspondente
    const periodConfig = rentabilityConfig.periods.find((p) => p.months === period)
    if (!periodConfig || !periodConfig.rates) {
      return []
    }

    // Mapear as chaves de rates disponíveis para nomes de liquidez
    const availableLiquidity: string[] = []
    
    if (periodConfig.rates.monthly !== undefined && periodConfig.rates.monthly !== null) {
      availableLiquidity.push("mensal")
    }
    if (periodConfig.rates.semiannual !== undefined && periodConfig.rates.semiannual !== null) {
      availableLiquidity.push("semestral")
    }
    if (periodConfig.rates.annual !== undefined && periodConfig.rates.annual !== null) {
      availableLiquidity.push("anual")
    }
    if (periodConfig.rates.biennial !== undefined && periodConfig.rates.biennial !== null) {
      availableLiquidity.push("bienal")
    }
    if (periodConfig.rates.triennial !== undefined && periodConfig.rates.triennial !== null) {
      availableLiquidity.push("trienal")
    }

    return availableLiquidity
  }

  const comparisonData = useMemo(() => {
    return scenarios.map((scenario) => {
      const calc = calculateScenario(scenario)
      const availableLiquidity = getAvailableLiquidityOptionsFromConfig(scenario.commitmentPeriod)
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
  }, [scenarios, isExternalAdvisor])

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
    <Card className="bg-[#01223F] border-[#003562] shadow-lg">
      <CardHeader className="border-b border-[#003562]">
        <CardTitle className="flex items-center gap-2 text-[#00BC6E] text-2xl">
          <TrendingUp className="h-5 w-5" />
          Comparação de Cenários
        </CardTitle>
        <CardDescription className="text-gray-400 mt-1">
          Compare diferentes valores de captação lado a lado
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 bg-[#01223F]">
        <div className="grid gap-4 lg:grid-cols-3">
          {comparisonData.map((scenario, index) => (
            <Card key={scenario.name} className="bg-[#003562] border-[#003562]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-white">{scenario.name}</CardTitle>
                  <Badge className="bg-[#00BC6E] text-white border-[#00BC6E]">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                      notation: "compact",
                    }).format(scenario.amount)}
                  </Badge>
                </div>
                <CardDescription className="text-gray-400">Defina as premissas para este cenário</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 bg-[#003562]">
                <div className="space-y-2">
                  <Label htmlFor={`amount-${index}`} className="text-white">Valor captado</Label>
                  <Input
                    id={`amount-${index}`}
                    type="number"
                    min={0}
                    step={10000}
                    value={scenario.amount}
                    onChange={(event) => updateScenario(index, "amount", Number.parseFloat(event.target.value) || 0)}
                    className="bg-[#01223F] border-[#003562] text-white placeholder:text-gray-500 focus:border-[#00BC6E]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Prazo de compromisso</Label>
                  <Select
                    value={String(scenario.commitmentPeriod)}
                    onValueChange={(value) => updateScenario(index, "commitmentPeriod", Number.parseInt(value))}
                  >
                    <SelectTrigger className="bg-[#01223F] border-[#003562] text-white focus:border-[#00BC6E]">
                      <SelectValue placeholder="Selecione o prazo" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#01223F] border-[#003562] text-white">
                      {commitmentOptions.map((option) => (
                        <SelectItem key={option} value={String(option)} className="hover:bg-[#003562]">
                          {option} meses
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Liquidez</Label>
                  <Select
                    value={scenario.liquidity}
                    onValueChange={(value) => updateScenario(index, "liquidity", value as LiquidityOption)}
                    disabled={!scenario.commitmentPeriod || (rentabilityConfig && scenario.availableLiquidity && scenario.availableLiquidity.length === 0)}
                  >
                    <SelectTrigger className="bg-[#01223F] border-[#003562] text-white focus:border-[#00BC6E]">
                      <SelectValue placeholder={isLoadingRates || !rentabilityConfig ? "Carregando..." : "Selecione a liquidez"} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#01223F] border-[#003562] text-white">
                      {isLoadingRates || !rentabilityConfig ? (
                        <div className="px-2 py-1.5 text-sm text-gray-400">
                          Carregando opções...
                        </div>
                      ) : scenario.availableLiquidity && scenario.availableLiquidity.length > 0 ? (
                        scenario.availableLiquidity.map((option) => (
                          <SelectItem key={option} value={option} className="hover:bg-[#003562]">
                          {liquidityLabels[option]}
                        </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-gray-400">
                          Nenhuma opção disponível
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Separator className="bg-[#003562]" />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-[#01223F] p-3 border border-[#003562]">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Clock3 className="h-4 w-4" />
                      Prazo de resgate
                    </div>
                    <p className="mt-1 font-semibold text-white">{scenario.redemptionWindow.label}</p>
                  </div>
                  <div className="rounded-lg bg-[#01223F] p-3 border border-[#003562]">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Droplets className="h-4 w-4" />
                      Liquidez
                    </div>
                    <p className="mt-1 font-semibold text-white">{scenario.liquidityLabel}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-[#00BC6E]/30 bg-[#00BC6E]/10 p-3 text-sm">
                  <span className="text-gray-400">Taxa investidor aplicada</span>
                  <p className="text-lg font-semibold text-[#00BC6E]">
                    {isLoadingRates || !investorUserTypeId 
                      ? "Carregando..." 
                      : `${(scenario.investorRate * 100).toFixed(2)}% a.m.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-[#01223F] border-[#003562]">
          <CardHeader className="pb-0 border-b border-[#003562]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-[#00BC6E]">Comparativo de Rentabilidade do Investidor</CardTitle>
                <CardDescription className="text-gray-400">{chartDescription}</CardDescription>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Switch
                  id="chart-mode"
                  checked={chartMode === "cycle"}
                  onCheckedChange={(checked) => setChartMode(checked ? "cycle" : "total")}
                />
                <Label htmlFor="chart-mode" className="cursor-pointer text-gray-400">
                  Resgate por período
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[420px] w-full pt-6 bg-[#01223F]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#003562" />
                <XAxis dataKey="name" className="text-xs" stroke="#9CA3AF" />
                <YAxis
                  className="text-xs"
                  stroke="#9CA3AF"
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
                  labelStyle={{ color: "#FFFFFF" }}
                  contentStyle={{
                    backgroundColor: "#01223F",
                    border: "1px solid #003562",
                    borderRadius: "12px",
                  }}
                  itemStyle={{ color: "#FFFFFF" }}
                />
                <Bar dataKey="value" fill="#00BC6E" name={chartModeLabel} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-[#00BC6E]">Comparação Detalhada</h4>
          <div className="grid gap-4 lg:grid-cols-3">
            {comparisonData.map((data) => (
              <Card key={`details-${data.name}`} className="bg-gradient-to-b from-[#C7F3E1] to-[#A8E6CF] border-[#00BC6E]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold text-[#003F28]">{data.name}</CardTitle>
                    <Badge className="bg-[#00BC6E] text-white border-[#00BC6E]">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        notation: "compact",
                      }).format(data.amount)}
                    </Badge>
                  </div>
                  <CardDescription className="text-[#003F28]/70">{data.liquidityLabel} • {(data.investorRate * 100).toFixed(2)}% a.m.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm bg-gradient-to-b from-[#C7F3E1] to-[#A8E6CF]">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[#003F28] font-semibold">Investidor ({(data.investorRate * 100).toFixed(2)}%)</span>
                      <p className="font-bold text-[#003F28]">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(
                          data.investorMonthlyCommission && !isNaN(data.investorMonthlyCommission)
                            ? data.investorMonthlyCommission * data.commitmentPeriod
                            : 0
                        )}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#003F28] font-semibold">Escritório (1%)</span>
                      <p className="font-bold text-[#003F28]">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(data.amount * 0.01 * data.commitmentPeriod)}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#003F28] font-semibold">Assessor (3%)</span>
                      <p className="font-bold text-[#003F28]">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(data.amount * 0.03 * data.commitmentPeriod)}
                      </p>
                    </div>
                    <Separator className="bg-[#003F28]/30" />
                    <div className="flex justify-between items-center">
                      <span className="text-[#003F28] font-semibold">Total com Bônus</span>
                      <p className="font-bold text-[#003F28] text-lg">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                        }).format(
                          (data.investorMonthlyCommission * data.commitmentPeriod) +
                          (data.amount * 0.01 * data.commitmentPeriod) +
                          (data.amount * 0.03 * data.commitmentPeriod)
                        )}
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
