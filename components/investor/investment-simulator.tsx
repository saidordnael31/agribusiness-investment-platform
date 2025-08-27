"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calculator, Gift, TrendingUp } from "lucide-react"
import { Disclaimers } from "@/components/compliance/disclaimers"

interface Bonification {
  id: string
  type: "value" | "commitment" | "promotion"
  name: string
  description: string
  bonus: number
  minValue?: number
  minCommitment?: number
  isActive: boolean
}

const mockBonifications: Bonification[] = [
  {
    id: "1",
    type: "value",
    name: "Investimento Premium",
    description: "Para investimentos acima de R$ 100.000",
    bonus: 0.5,
    minValue: 100000,
    isActive: true,
  },
  {
    id: "2",
    type: "value",
    name: "Investimento VIP",
    description: "Para investimentos acima de R$ 500.000",
    bonus: 1.0,
    minValue: 500000,
    isActive: true,
  },
  {
    id: "3",
    type: "commitment",
    name: "Compromisso 12 meses",
    description: "Sem resgate por 12 meses",
    bonus: 0.3,
    minCommitment: 12,
    isActive: true,
  },
  {
    id: "4",
    type: "commitment",
    name: "Compromisso 24 meses",
    description: "Sem resgate por 24 meses",
    bonus: 0.7,
    minCommitment: 24,
    isActive: true,
  },
  {
    id: "5",
    type: "promotion",
    name: "Promoção Lançamento",
    description: "Bônus especial para novos investidores",
    bonus: 0.2,
    isActive: true,
  },
]

export function InvestmentSimulator() {
  const [amount, setAmount] = useState("")
  const [quotaType, setQuotaType] = useState("")
  const [period, setPeriod] = useState("")
  const [commitmentPeriod, setCommitmentPeriod] = useState("")
  const [results, setResults] = useState<{
    monthlyReturn: number
    totalReturn: number
    finalAmount: number
    baseBonifications: Bonification[]
    totalBonusRate: number
    bonusReturn: number
  } | null>(null)

  const getApplicableBonifications = (investmentAmount: number, commitment: number): Bonification[] => {
    return mockBonifications.filter((bonification) => {
      if (!bonification.isActive) return false

      switch (bonification.type) {
        case "value":
          return bonification.minValue ? investmentAmount >= bonification.minValue : true
        case "commitment":
          return bonification.minCommitment ? commitment >= bonification.minCommitment : true
        case "promotion":
          return true
        default:
          return false
      }
    })
  }

  const calculateReturns = () => {
    const investmentAmount = Number.parseFloat(amount)
    const months = Number.parseInt(period)
    const commitment = Number.parseInt(commitmentPeriod) || 0

    if (!investmentAmount || !quotaType || !months) return

    const baseMonthlyRate = quotaType === "senior" ? 0.03 : 0.035

    const applicableBonifications = getApplicableBonifications(investmentAmount, commitment)
    const totalBonusRate = applicableBonifications.reduce((sum, bonus) => sum + bonus.bonus, 0) / 100
    const finalMonthlyRate = baseMonthlyRate + totalBonusRate

    const monthlyReturn = investmentAmount * finalMonthlyRate
    const baseMonthlyReturn = investmentAmount * baseMonthlyRate
    const bonusReturn = monthlyReturn - baseMonthlyReturn
    const totalReturn = monthlyReturn * months
    const finalAmount = investmentAmount + totalReturn

    setResults({
      monthlyReturn,
      totalReturn,
      finalAmount,
      baseBonifications: applicableBonifications,
      totalBonusRate: totalBonusRate * 100,
      bonusReturn: bonusReturn * months,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Simulador de Investimentos
        </CardTitle>
        <CardDescription>
          Simule os retornos do seu investimento no Clube de Investimentos Privado do Agronegócio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor do Investimento</Label>
            <Input
              id="amount"
              type="number"
              placeholder="5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="5000"
            />
            <p className="text-xs text-muted-foreground">Mínimo: R$ 5.000</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quota">Tipo de Cota</Label>
            <Select value={quotaType} onValueChange={setQuotaType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a cota" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="senior">Cota Sênior (3% a.m.)</SelectItem>
                <SelectItem value="subordinate">Cota Subordinada (3,5% a.m.)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Período (meses)</Label>
            <Input
              id="period"
              type="number"
              placeholder="12"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commitment">Compromisso (meses)</Label>
            <Select value={commitmentPeriod} onValueChange={setCommitmentPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Sem compromisso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sem compromisso</SelectItem>
                <SelectItem value="12">12 meses (+0,3%)</SelectItem>
                <SelectItem value="24">24 meses (+0,7%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={calculateReturns} className="w-full">
          Calcular Retornos com Bonificações
        </Button>

        {results && (
          <div className="space-y-6">
            {results.baseBonifications.length > 0 && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Gift className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-primary">Bonificações Aplicadas</h4>
                  <Badge variant="secondary">+{results.totalBonusRate.toFixed(1)}% a.m.</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {results.baseBonifications.map((bonus) => (
                    <div key={bonus.id} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div>
                        <p className="text-sm font-medium">{bonus.name}</p>
                        <p className="text-xs text-muted-foreground">{bonus.description}</p>
                      </div>
                      <Badge variant="outline">+{bonus.bonus}%</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-card rounded-lg border">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Retorno Mensal</p>
                <p className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.monthlyReturn)}
                </p>
                {results.totalBonusRate > 0 && (
                  <p className="text-xs text-primary">
                    <TrendingUp className="h-3 w-3 inline mr-1" />+
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(
                      results.monthlyReturn - Number.parseFloat(amount) * (quotaType === "senior" ? 0.03 : 0.035),
                    )}{" "}
                    bônus
                  </p>
                )}
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Retorno Total</p>
                <p className="text-2xl font-bold text-secondary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.totalReturn)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Bônus Total</p>
                <p className="text-2xl font-bold text-accent">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.bonusReturn)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Valor Final</p>
                <p className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.finalAmount)}
                </p>
              </div>
            </div>
          </div>
        )}

        <Disclaimers variant="compact" />
      </CardContent>
    </Card>
  )
}
