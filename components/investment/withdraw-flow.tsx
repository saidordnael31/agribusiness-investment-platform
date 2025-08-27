"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ArrowLeft, Minus, AlertTriangle, Clock, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Investment {
  id: string
  type: "senior" | "subordinada"
  amount: number
  currentValue: number
  monthlyReturn: number
  createdAt: string
  availableForWithdraw: number
}

export function WithdrawFlow() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<"selection" | "confirmation" | "success">("selection")
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null)
  const [withdrawType, setWithdrawType] = useState<"partial" | "total">("partial")
  const [withdrawAmount, setWithdrawAmount] = useState("")
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
      availableForWithdraw: 27500,
    },
    {
      id: "2",
      type: "subordinada",
      amount: 50000,
      currentValue: 55250,
      monthlyReturn: 1750,
      createdAt: "2024-02-01",
      availableForWithdraw: 55250,
    },
  ]

  const handleWithdrawConfirm = async () => {
    setIsProcessing(true)

    // Simular processamento
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsProcessing(false)
    setStep("success")

    toast({
      title: "Resgate solicitado com sucesso!",
      description: "Seu resgate será processado em até 2 dias úteis (D+2).",
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const calculateRemainingReturn = (investment: Investment, withdrawAmount: number) => {
    if (withdrawType === "total") return 0

    const rate = investment.type === "senior" ? 0.03 : 0.035
    const remainingValue = investment.currentValue - withdrawAmount
    return remainingValue * rate
  }

  const getWithdrawAmount = () => {
    if (withdrawType === "total") return selectedInvestment?.currentValue || 0
    return Number(withdrawAmount) || 0
  }

  if (step === "success") {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-blue-200">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl text-blue-800">Resgate Solicitado!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-4">Detalhes do Resgate</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Protocolo:</span>
                  <span className="font-mono text-sm">RES-{Date.now()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo de Resgate:</span>
                  <Badge variant={withdrawType === "total" ? "destructive" : "secondary"}>
                    {withdrawType === "total" ? "Total" : "Parcial"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor do Resgate:</span>
                  <span className="font-semibold">{formatCurrency(getWithdrawAmount())}</span>
                </div>
                {withdrawType === "partial" && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Novo Retorno Mensal:</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(calculateRemainingReturn(selectedInvestment!, getWithdrawAmount()))}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Prazo de Liquidação</p>
                  <p className="text-sm text-amber-600">
                    Seu resgate será processado em até 2 dias úteis (D+2). O valor será creditado em sua conta
                    cadastrada.
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
                  setWithdrawAmount("")
                  setWithdrawType("partial")
                }}
                className="flex-1"
              >
                Novo Resgate
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
          <h1 className="text-2xl font-bold text-gray-900">Confirmar Resgate</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Minus className="w-5 h-5" />
              <span>Confirmação de Resgate</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-semibold mb-4">Resumo do Resgate</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Investimento:</span>
                  <Badge variant={selectedInvestment?.type === "senior" ? "secondary" : "default"}>
                    Cota {selectedInvestment?.type === "senior" ? "Sênior" : "Subordinada"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor Atual:</span>
                  <span>{formatCurrency(selectedInvestment?.currentValue || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo de Resgate:</span>
                  <Badge variant={withdrawType === "total" ? "destructive" : "secondary"}>
                    {withdrawType === "total" ? "Total" : "Parcial"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor do Resgate:</span>
                  <span className="font-semibold">{formatCurrency(getWithdrawAmount())}</span>
                </div>
                {withdrawType === "partial" && (
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold">Valor Remanescente:</span>
                      <span className="font-semibold text-blue-600">
                        {formatCurrency((selectedInvestment?.currentValue || 0) - getWithdrawAmount())}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {withdrawType === "partial" && (
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-4">Novo Retorno Projetado</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Retorno Mensal Atual:</span>
                    <span>{formatCurrency(selectedInvestment?.monthlyReturn || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Novo Retorno Mensal:</span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(calculateRemainingReturn(selectedInvestment!, getWithdrawAmount()))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Redução Mensal:</span>
                    <span className="font-semibold text-red-600">
                      -
                      {formatCurrency(
                        (selectedInvestment?.monthlyReturn || 0) -
                          calculateRemainingReturn(selectedInvestment!, getWithdrawAmount()),
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {withdrawType === "total" && (
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Resgate Total</p>
                    <p className="text-sm text-red-600">
                      Ao confirmar o resgate total, seu investimento será encerrado e você não receberá mais rendimentos
                      mensais.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Prazo de Liquidação</p>
                  <p className="text-sm text-amber-600">
                    O resgate será processado em até 2 dias úteis (D+2) conforme regulamentação do fundo.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleWithdrawConfirm}
              disabled={isProcessing}
              className="w-full"
              size="lg"
              variant={withdrawType === "total" ? "destructive" : "default"}
            >
              {isProcessing ? "Processando..." : `Confirmar Resgate ${withdrawType === "total" ? "Total" : "Parcial"}`}
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
        <h1 className="text-2xl font-bold text-gray-900">Resgate de Investimento</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Minus className="w-5 h-5" />
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
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedInvestment(investment)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Badge variant={investment.type === "senior" ? "secondary" : "default"}>
                        Cota {investment.type === "senior" ? "Sênior" : "Subordinada"}
                      </Badge>
                      <div className="text-sm text-gray-600">Liquidez: D+2</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Valor Atual</p>
                      <p className="font-semibold">{formatCurrency(investment.currentValue)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Disponível para Resgate</p>
                      <p className="font-semibold text-blue-600">{formatCurrency(investment.availableForWithdraw)}</p>
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
              <CardTitle>Tipo de Resgate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <RadioGroup value={withdrawType} onValueChange={(value: "partial" | "total") => setWithdrawType(value)}>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="partial" id="partial" />
                  <Label htmlFor="partial" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">Resgate Parcial</p>
                      <p className="text-sm text-gray-600">Resgatar apenas parte do investimento</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <RadioGroupItem value="total" id="total" />
                  <Label htmlFor="total" className="flex-1 cursor-pointer">
                    <div>
                      <p className="font-medium">Resgate Total</p>
                      <p className="text-sm text-gray-600">Resgatar todo o investimento e encerrar</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {withdrawType === "partial" && (
                <div>
                  <Label htmlFor="withdraw-amount">Valor a Resgatar</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="Ex: 5000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    min="1000"
                    max={selectedInvestment.availableForWithdraw}
                    step="1000"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Valor mínimo: R$ 1.000,00 | Máximo disponível:{" "}
                    {formatCurrency(selectedInvestment.availableForWithdraw)}
                  </p>
                </div>
              )}

              {((withdrawType === "partial" && withdrawAmount && Number(withdrawAmount) >= 1000) ||
                withdrawType === "total") && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Resumo do Resgate</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Valor do Resgate:</span>
                      <span className="font-semibold">{formatCurrency(getWithdrawAmount())}</span>
                    </div>
                    {withdrawType === "partial" && (
                      <>
                        <div className="flex justify-between">
                          <span>Valor Remanescente:</span>
                          <span className="font-semibold text-blue-600">
                            {formatCurrency(selectedInvestment.currentValue - getWithdrawAmount())}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Novo Retorno Mensal:</span>
                          <span className="font-semibold text-blue-600">
                            {formatCurrency(calculateRemainingReturn(selectedInvestment, getWithdrawAmount()))}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-amber-600">
                      <span>Prazo de Liquidação:</span>
                      <span className="font-semibold">D+2 (2 dias úteis)</span>
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() => setStep("confirmation")}
                disabled={withdrawType === "partial" && (!withdrawAmount || Number(withdrawAmount) < 1000)}
                className="w-full"
                size="lg"
                variant={withdrawType === "total" ? "destructive" : "default"}
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
