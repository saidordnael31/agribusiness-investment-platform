"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, TrendingUp, Shield, Clock } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Investment {
  id: string
  type: "senior" | "subordinada"
  amount: number
  currentValue: number
  monthlyReturn: number
  createdAt: string
}

export function DepositFlow() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<"selection" | "confirmation" | "success">("selection")
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null)
  const [depositAmount, setDepositAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Mock data - em produção viria de API
  const investments: Investment[] = [
    {
      id: "1",
      type: "senior",
      amount: 25000,
      currentValue: 27500,
      monthlyReturn: 750,
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      type: "subordinada",
      amount: 50000,
      currentValue: 55250,
      monthlyReturn: 1750,
      createdAt: "2024-02-01",
    },
  ]

  const handleDepositConfirm = async () => {
    setIsProcessing(true)

    // Simular processamento
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsProcessing(false)
    setStep("success")

    toast({
      title: "Depósito processado com sucesso!",
      description: "Seu depósito adicional foi registrado e será processado em até 1 dia útil.",
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const calculateNewReturn = (investment: Investment, additionalAmount: number) => {
    const rate = investment.type === "senior" ? 0.03 : 0.035
    const newTotal = investment.currentValue + additionalAmount
    return newTotal * rate
  }

  if (step === "success") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-emerald-200">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl text-emerald-800">Depósito Realizado!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-emerald-50 p-6 rounded-lg">
              <h3 className="font-semibold text-emerald-800 mb-4">Detalhes do Depósito</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Protocolo:</span>
                  <span className="font-mono text-sm">DEP-{Date.now()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Investimento:</span>
                  <Badge variant={selectedInvestment?.type === "senior" ? "secondary" : "default"}>
                    Cota {selectedInvestment?.type === "senior" ? "Sênior" : "Subordinada"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor do Depósito:</span>
                  <span className="font-semibold">{formatCurrency(Number(depositAmount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Novo Retorno Mensal:</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(calculateNewReturn(selectedInvestment!, Number(depositAmount)))}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Processamento</p>
                  <p className="text-sm text-blue-600">
                    Seu depósito será processado em até 1 dia útil. Os rendimentos começam a contar a partir da data de
                    processamento.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <Button onClick={() => router.push("/investor")} className="flex-1">
                Voltar ao Dashboard
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("selection")
                  setSelectedInvestment(null)
                  setDepositAmount("")
                }}
                className="flex-1"
              >
                Novo Depósito
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === "confirmation") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setStep("selection")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Confirmar Depósito</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Confirmação de Depósito Adicional</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-4">Resumo do Depósito</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Investimento Selecionado:</span>
                  <Badge variant={selectedInvestment?.type === "senior" ? "secondary" : "default"}>
                    Cota {selectedInvestment?.type === "senior" ? "Sênior" : "Subordinada"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor Atual:</span>
                  <span>{formatCurrency(selectedInvestment?.currentValue || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor do Depósito:</span>
                  <span className="font-semibold">{formatCurrency(Number(depositAmount))}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold">Novo Valor Total:</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency((selectedInvestment?.currentValue || 0) + Number(depositAmount))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-emerald-50 p-6 rounded-lg">
              <h3 className="font-semibold text-emerald-800 mb-4">Novo Retorno Projetado</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Retorno Mensal Atual:</span>
                  <span>{formatCurrency(selectedInvestment?.monthlyReturn || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Novo Retorno Mensal:</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(calculateNewReturn(selectedInvestment!, Number(depositAmount)))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Aumento Mensal:</span>
                  <span className="font-semibold text-emerald-600">
                    +
                    {formatCurrency(
                      calculateNewReturn(selectedInvestment!, Number(depositAmount)) -
                        (selectedInvestment?.monthlyReturn || 0),
                    )}
                  </span>
                </div>
              </div>
            </div>

            <Button onClick={handleDepositConfirm} disabled={isProcessing} className="w-full" size="lg">
              {isProcessing ? "Processando..." : "Confirmar Depósito"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center space-x-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push("/investor")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Dashboard
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Depósito Adicional</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Selecione o Investimento</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {investments.map((investment) => (
                <div
                  key={investment.id}
                  className={`p-6 border rounded-lg cursor-pointer transition-all ${
                    selectedInvestment?.id === investment.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedInvestment(investment)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Badge variant={investment.type === "senior" ? "secondary" : "default"}>
                        Cota {investment.type === "senior" ? "Sênior" : "Subordinada"}
                      </Badge>
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        {investment.type === "senior" ? (
                          <Shield className="w-4 h-4" />
                        ) : (
                          <TrendingUp className="w-4 h-4" />
                        )}
                        <span>{investment.type === "senior" ? "3% a.m." : "3,5% a.m."}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Investimento Inicial</p>
                      <p className="font-semibold">{formatCurrency(investment.amount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Valor Atual</p>
                      <p className="font-semibold">{formatCurrency(investment.currentValue)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Retorno Mensal</p>
                      <p className="font-semibold text-emerald-600">{formatCurrency(investment.monthlyReturn)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedInvestment && (
          <Card>
            <CardHeader>
              <CardTitle>Valor do Depósito</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="deposit-amount">Valor a Depositar</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  placeholder="Ex: 10000"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="1000"
                  step="1000"
                />
                <p className="text-sm text-gray-600 mt-1">Valor mínimo: R$ 1.000,00</p>
              </div>

              {depositAmount && Number(depositAmount) >= 1000 && (
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-emerald-800 mb-2">Projeção do Novo Retorno</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Retorno Mensal Adicional:</span>
                      <span className="font-semibold text-emerald-600">
                        +{formatCurrency(Number(depositAmount) * (selectedInvestment.type === "senior" ? 0.03 : 0.035))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Novo Retorno Total:</span>
                      <span className="font-semibold text-emerald-600">
                        {formatCurrency(calculateNewReturn(selectedInvestment, Number(depositAmount)))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setStep("confirmation")}
                disabled={!depositAmount || Number(depositAmount) < 1000}
                className="w-full"
                size="lg"
              >
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
