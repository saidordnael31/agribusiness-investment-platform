"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowRight, Calendar, DollarSign } from "lucide-react"
import type { InvestmentData } from "./investment-flow"

interface InvestmentSuccessProps {
  investmentData: InvestmentData
  onBackToDashboard: () => void
}

export function InvestmentSuccess({ investmentData, onBackToDashboard }: InvestmentSuccessProps) {
  const investmentId = `AGR${Date.now().toString().slice(-6)}`

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-foreground mb-4">Investimento Realizado com Sucesso!</h2>
        <p className="text-muted-foreground">Seu investimento foi processado e será creditado em sua conta</p>
      </div>

      {/* Investment Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Investimento</CardTitle>
          <CardDescription>Protocolo: {investmentId}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tipo de Cota:</span>
                <Badge variant={investmentData.quotaType === "senior" ? "default" : "secondary"}>
                  {investmentData.quotaType === "senior" ? "Cota Sênior" : "Cota Subordinada"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Valor Investido:</span>
                <span className="font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(investmentData.amount)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rentabilidade:</span>
                <span className="font-bold text-primary">
                  {investmentData.quotaType === "senior" ? "3%" : "3,5%"} a.m.
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Data do Investimento:</span>
                <span className="font-bold">{new Date().toLocaleDateString("pt-BR")}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Liquidez:</span>
                <span className="font-bold">D+2</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="default">Processando</Badge>
              </div>
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="font-semibold text-primary mb-2">Retorno Mensal Estimado</h4>
            <p className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(investmentData.monthlyReturn)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Baseado na rentabilidade alvo de {investmentData.quotaType === "senior" ? "3%" : "3,5%"} ao mês
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Próximos Passos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <h4 className="font-semibold">Processamento</h4>
                <p className="text-sm text-muted-foreground">
                  Seu investimento será processado em até 1 dia útil e aparecerá em seu dashboard.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <h4 className="font-semibold">Primeiro Rendimento</h4>
                <p className="text-sm text-muted-foreground">
                  O primeiro rendimento será creditado no final do mês corrente.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <h4 className="font-semibold">Acompanhamento</h4>
                <p className="text-sm text-muted-foreground">
                  Acompanhe a performance do seu investimento através do dashboard.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="text-center">
        <Button onClick={onBackToDashboard} size="lg" className="px-8">
          <DollarSign className="h-4 w-4 mr-2" />
          Ir para Dashboard
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
