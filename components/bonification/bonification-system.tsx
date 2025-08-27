"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Clock, DollarSign, Target, Gift, Star } from "lucide-react"

interface BonificationRule {
  id: string
  type: "investment_amount" | "lock_period" | "performance_goal" | "promotion"
  name: string
  description: string
  condition: {
    minAmount?: number
    maxAmount?: number
    minPeriod?: number // em meses
    targetAmount?: number
    promotionCode?: string
  }
  bonus: {
    additionalRate: number // percentual adicional (ex: 0.5 = 0.5%)
    type: "fixed" | "progressive"
    duration?: number // em meses, se aplicável
  }
  isActive: boolean
  validUntil?: string
  userType: "investor" | "distributor" | "both"
}

interface UserBonification {
  ruleId: string
  appliedRate: number
  earnedAt: string
  expiresAt?: string
}

export function BonificationSystem({ userType = "investor" }: { userType?: "investor" | "distributor" }) {
  const [bonificationRules] = useState<BonificationRule[]>([
    {
      id: "high_investment",
      type: "investment_amount",
      name: "Investimento Premium",
      description: "Bonificação para investimentos acima de R$ 100.000",
      condition: { minAmount: 100000 },
      bonus: { additionalRate: 0.3, type: "fixed" },
      isActive: true,
      userType: "investor",
    },
    {
      id: "mega_investment",
      type: "investment_amount",
      name: "Investimento Mega",
      description: "Bonificação para investimentos acima de R$ 500.000",
      condition: { minAmount: 500000 },
      bonus: { additionalRate: 0.7, type: "fixed" },
      isActive: true,
      userType: "investor",
    },
    {
      id: "lock_6m",
      type: "lock_period",
      name: "Compromisso 6 Meses",
      description: "Taxa adicional por manter investimento por 6 meses",
      condition: { minPeriod: 6 },
      bonus: { additionalRate: 0.2, type: "fixed", duration: 6 },
      isActive: true,
      userType: "investor",
    },
    {
      id: "lock_12m",
      type: "lock_period",
      name: "Compromisso 12 Meses",
      description: "Taxa adicional por manter investimento por 12 meses",
      condition: { minPeriod: 12 },
      bonus: { additionalRate: 0.5, type: "fixed", duration: 12 },
      isActive: true,
      userType: "investor",
    },
    {
      id: "distributor_500k",
      type: "performance_goal",
      name: "Meta Distribuidor 500K",
      description: "Bonificação para distribuidores que captarem R$ 500.000",
      condition: { targetAmount: 500000 },
      bonus: { additionalRate: 1.0, type: "fixed", duration: 12 },
      isActive: true,
      userType: "distributor",
    },
    {
      id: "distributor_1m",
      type: "performance_goal",
      name: "Meta Distribuidor 1M",
      description: "Bonificação para distribuidores que captarem R$ 1.000.000",
      condition: { targetAmount: 1000000 },
      bonus: { additionalRate: 2.0, type: "fixed", duration: 12 },
      isActive: true,
      userType: "distributor",
    },
    {
      id: "new_year_promo",
      type: "promotion",
      name: "Promoção Ano Novo",
      description: "Taxa especial para novos investimentos até 31/03",
      condition: { promotionCode: "NEWYEAR2025" },
      bonus: { additionalRate: 0.4, type: "fixed", duration: 3 },
      isActive: true,
      validUntil: "2025-03-31",
      userType: "both",
    },
  ])

  const [userBonifications] = useState<UserBonification[]>([
    {
      ruleId: "high_investment",
      appliedRate: 0.3,
      earnedAt: "2024-01-15",
    },
    {
      ruleId: "lock_6m",
      appliedRate: 0.2,
      earnedAt: "2024-02-01",
      expiresAt: "2024-08-01",
    },
  ])

  const getActiveRules = () => {
    return bonificationRules.filter((rule) => rule.isActive && (rule.userType === userType || rule.userType === "both"))
  }

  const getAppliedBonifications = () => {
    return userBonifications
      .map((ub) => {
        const rule = bonificationRules.find((r) => r.id === ub.ruleId)
        return { ...ub, rule }
      })
      .filter((item) => item.rule)
  }

  const calculateBonifiedRate = (baseRate: number, amount: number, lockPeriod?: number) => {
    let totalBonus = 0
    const applicableRules = getActiveRules()

    // Bonificação por valor
    const amountRules = applicableRules.filter((r) => r.type === "investment_amount")
    for (const rule of amountRules) {
      if (rule.condition.minAmount && amount >= rule.condition.minAmount) {
        totalBonus += rule.bonus.additionalRate
      }
    }

    // Bonificação por prazo
    if (lockPeriod) {
      const periodRules = applicableRules.filter((r) => r.type === "lock_period")
      for (const rule of periodRules) {
        if (rule.condition.minPeriod && lockPeriod >= rule.condition.minPeriod) {
          totalBonus += rule.bonus.additionalRate
        }
      }
    }

    // Promoções ativas
    const promoRules = applicableRules.filter((r) => r.type === "promotion")
    for (const rule of promoRules) {
      totalBonus += rule.bonus.additionalRate
    }

    return baseRate + totalBonus
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatRate = (rate: number) => {
    return `${rate.toFixed(2)}%`
  }

  const getRuleIcon = (type: string) => {
    switch (type) {
      case "investment_amount":
        return <DollarSign className="w-5 h-5" />
      case "lock_period":
        return <Clock className="w-5 h-5" />
      case "performance_goal":
        return <Target className="w-5 h-5" />
      case "promotion":
        return <Gift className="w-5 h-5" />
      default:
        return <Star className="w-5 h-5" />
    }
  }

  const getRuleColor = (type: string) => {
    switch (type) {
      case "investment_amount":
        return "text-emerald-600 bg-emerald-50"
      case "lock_period":
        return "text-blue-600 bg-blue-50"
      case "performance_goal":
        return "text-purple-600 bg-purple-50"
      case "promotion":
        return "text-orange-600 bg-orange-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <TrendingUp className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Sistema de Bonificação</h2>
      </div>

      <Tabs defaultValue="available" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">Bonificações Disponíveis</TabsTrigger>
          <TabsTrigger value="active">Minhas Bonificações</TabsTrigger>
          <TabsTrigger value="calculator">Calculadora</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <div className="grid gap-4">
            {getActiveRules().map((rule) => (
              <Card key={rule.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${getRuleColor(rule.type)}`}>{getRuleIcon(rule.type)}</div>
                      <div>
                        <CardTitle className="text-lg">{rule.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg font-bold">
                      +{formatRate(rule.bonus.additionalRate)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Condição</p>
                      <p className="font-medium">
                        {rule.condition.minAmount && `Mín: ${formatCurrency(rule.condition.minAmount)}`}
                        {rule.condition.minPeriod && `${rule.condition.minPeriod} meses`}
                        {rule.condition.targetAmount && `Meta: ${formatCurrency(rule.condition.targetAmount)}`}
                        {rule.condition.promotionCode && `Código: ${rule.condition.promotionCode}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bonificação</p>
                      <p className="font-medium text-emerald-600">+{formatRate(rule.bonus.additionalRate)} a.m.</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duração</p>
                      <p className="font-medium">
                        {rule.bonus.duration ? `${rule.bonus.duration} meses` : "Permanente"}
                      </p>
                    </div>
                  </div>
                  {rule.validUntil && (
                    <div className="mt-3 p-2 bg-orange-50 rounded-lg">
                      <p className="text-sm text-orange-700">
                        Válido até: {new Date(rule.validUntil).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4">
            {getAppliedBonifications().length > 0 ? (
              getAppliedBonifications().map((bonification) => (
                <Card key={bonification.ruleId} className="border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                          {getRuleIcon(bonification.rule!.type)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{bonification.rule!.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Ativa desde {new Date(bonification.earnedAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <Badge className="text-lg font-bold bg-emerald-100 text-emerald-700">
                        +{formatRate(bonification.appliedRate)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="font-medium text-emerald-600">Ativa</p>
                      </div>
                      {bonification.expiresAt && (
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Expira em</p>
                          <p className="font-medium">{new Date(bonification.expiresAt).toLocaleDateString("pt-BR")}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma bonificação ativa</h3>
                  <p className="text-muted-foreground">
                    Explore as bonificações disponíveis para aumentar sua rentabilidade
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calculator" className="space-y-4">
          <BonificationCalculator bonificationRules={getActiveRules()} calculateBonifiedRate={calculateBonifiedRate} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BonificationCalculator({
  bonificationRules,
  calculateBonifiedRate,
}: {
  bonificationRules: BonificationRule[]
  calculateBonifiedRate: (baseRate: number, amount: number, lockPeriod?: number) => number
}) {
  const [amount, setAmount] = useState(50000)
  const [lockPeriod, setLockPeriod] = useState<number | undefined>(undefined)
  const [quotaType, setQuotaType] = useState<"senior" | "subordinada">("senior")

  const baseRate = quotaType === "senior" ? 3.0 : 3.5
  const bonifiedRate = calculateBonifiedRate(baseRate, amount, lockPeriod)
  const additionalRate = bonifiedRate - baseRate

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatRate = (rate: number) => {
    return `${rate.toFixed(2)}%`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calculadora de Bonificação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Valor do Investimento</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full mt-1 px-3 py-2 border rounded-lg"
              min="5000"
              step="1000"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tipo de Cota</label>
            <select
              value={quotaType}
              onChange={(e) => setQuotaType(e.target.value as "senior" | "subordinada")}
              className="w-full mt-1 px-3 py-2 border rounded-lg"
            >
              <option value="senior">Sênior (3% a.m.)</option>
              <option value="subordinada">Subordinada (3,5% a.m.)</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Prazo de Compromisso</label>
            <select
              value={lockPeriod || ""}
              onChange={(e) => setLockPeriod(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full mt-1 px-3 py-2 border rounded-lg"
            >
              <option value="">Sem compromisso</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
            </select>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Resultado da Simulação</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Taxa Base</p>
              <p className="text-2xl font-bold text-gray-700">{formatRate(baseRate)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Bonificação</p>
              <p className="text-2xl font-bold text-emerald-600">+{formatRate(additionalRate)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Taxa Final</p>
              <p className="text-2xl font-bold text-primary">{formatRate(bonifiedRate)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Retorno Mensal</p>
              <p className="text-2xl font-bold text-secondary">{formatCurrency(amount * (bonifiedRate / 100))}</p>
            </div>
          </div>
        </div>

        {additionalRate > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold">Bonificações Aplicadas:</h4>
            {bonificationRules.map((rule) => {
              let applies = false
              if (rule.type === "investment_amount" && rule.condition.minAmount && amount >= rule.condition.minAmount) {
                applies = true
              }
              if (
                rule.type === "lock_period" &&
                rule.condition.minPeriod &&
                lockPeriod &&
                lockPeriod >= rule.condition.minPeriod
              ) {
                applies = true
              }
              if (rule.type === "promotion") {
                applies = true
              }

              if (applies) {
                return (
                  <div key={rule.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <span className="text-sm font-medium">{rule.name}</span>
                    <Badge variant="secondary">+{formatRate(rule.bonus.additionalRate)}</Badge>
                  </div>
                )
              }
              return null
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
