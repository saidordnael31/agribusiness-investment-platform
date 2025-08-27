"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Shield, TrendingUp, Calculator, AlertCircle } from "lucide-react"
import type { InvestmentData } from "./investment-flow"

interface InvestmentSelectionProps {
  onNext: (data: InvestmentData) => void
}

export function InvestmentSelection({ onNext }: InvestmentSelectionProps) {
  const [selectedQuota, setSelectedQuota] = useState<"senior" | "subordinate" | null>(null)
  const [amount, setAmount] = useState("")
  const [isValid, setIsValid] = useState(false)

  const handleAmountChange = (value: string) => {
    setAmount(value)
    const numValue = Number.parseFloat(value)
    setIsValid(numValue >= 5000 && selectedQuota !== null)
  }

  const handleQuotaSelect = (quota: "senior" | "subordinate") => {
    setSelectedQuota(quota)
    const numValue = Number.parseFloat(amount)
    setIsValid(numValue >= 5000)
  }

  const handleNext = () => {
    if (!selectedQuota || !isValid) return

    const numAmount = Number.parseFloat(amount)
    const monthlyRate = selectedQuota === "senior" ? 0.03 : 0.035
    const monthlyReturn = numAmount * monthlyRate
    const expectedReturn = monthlyReturn * 12

    onNext({
      quotaType: selectedQuota,
      amount: numAmount,
      expectedReturn,
      monthlyReturn,
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">Escolha seu Investimento</h2>
        <p className="text-muted-foreground">Selecione a cota e o valor que deseja investir no FIDC Agroderi</p>
      </div>

      {/* Quota Selection */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedQuota === "senior" ? "ring-2 ring-primary bg-primary/5" : ""
          }`}
          onClick={() => handleQuotaSelect("senior")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <Shield className="h-8 w-8 text-primary" />
              <Badge variant="outline">Conservador</Badge>
            </div>
            <CardTitle className="text-primary">Cota Sênior</CardTitle>
            <CardDescription>Perfil conservador com prioridade nos pagamentos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Rentabilidade alvo:</span>
                <span className="font-bold text-primary">3% ao mês</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Resgate:</span>
                <span className="font-bold">D+2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Proteção:</span>
                <span className="font-bold">Subordinação</span>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Ideal para investidores que buscam rentabilidade consistente com menor risco
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedQuota === "subordinate" ? "ring-2 ring-secondary bg-secondary/5" : ""
          }`}
          onClick={() => handleQuotaSelect("subordinate")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <TrendingUp className="h-8 w-8 text-secondary" />
              <Badge variant="secondary">Arrojado</Badge>
            </div>
            <CardTitle className="text-secondary">Cota Subordinada</CardTitle>
            <CardDescription>Perfil arrojado com maior potencial de retorno</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Rentabilidade alvo:</span>
                <span className="font-bold text-secondary">3,5% ao mês</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Resgate:</span>
                <span className="font-bold">D+2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Upside:</span>
                <span className="font-bold">Crescimento da base</span>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Ideal para investidores que buscam maior rentabilidade e aceitam maior risco
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Amount Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Valor do Investimento
          </CardTitle>
          <CardDescription>Digite o valor que deseja investir (mínimo R$ 5.000)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="5.000"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              min="5000"
              step="1000"
            />
            {amount && Number.parseFloat(amount) < 5000 && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>O valor mínimo de investimento é R$ 5.000</span>
              </div>
            )}
          </div>

          {selectedQuota && amount && Number.parseFloat(amount) >= 5000 && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold">Simulação de Retorno:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Retorno mensal:</span>
                  <p className="font-bold text-primary">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(Number.parseFloat(amount) * (selectedQuota === "senior" ? 0.03 : 0.035))}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Retorno anual:</span>
                  <p className="font-bold text-secondary">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(Number.parseFloat(amount) * (selectedQuota === "senior" ? 0.03 : 0.035) * 12)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Important Information */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="h-5 w-5" />
            Informações Importantes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-800">
          <ul className="space-y-2 text-sm">
            <li>• Fundo regulado pela CVM com auditoria independente</li>
            <li>• Rentabilidade passada não garante rentabilidade futura</li>
            <li>• Liquidez: resgate em até 2 dias úteis (D+2)</li>
            <li>• Investimento mínimo: R$ 5.000</li>
            <li>• Destinado exclusivamente a investidores qualificados</li>
          </ul>
        </CardContent>
      </Card>

      {/* Next Button */}
      <div className="text-center">
        <Button onClick={handleNext} disabled={!isValid} size="lg" className="px-8">
          Continuar para Confirmação
        </Button>
      </div>
    </div>
  )
}
