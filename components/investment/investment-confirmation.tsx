"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Shield, TrendingUp, ArrowLeft, CheckCircle, Loader2 } from "lucide-react"
import type { InvestmentData } from "./investment-flow"

interface InvestmentConfirmationProps {
  investmentData: InvestmentData
  onConfirm: () => void
  onBack: () => void
}

export function InvestmentConfirmation({ investmentData, onConfirm, onBack }: InvestmentConfirmationProps) {
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [riskAccepted, setRiskAccepted] = useState(false)
  const [complianceAccepted, setComplianceAccepted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = () => {
    if (!termsAccepted || !riskAccepted || !complianceAccepted) return

    setIsProcessing(true)
    onConfirm()
  }

  const isValid = termsAccepted && riskAccepted && complianceAccepted

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-4">Confirme seu Investimento</h2>
        <p className="text-muted-foreground">Revise os detalhes antes de finalizar</p>
      </div>

      {/* Investment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {investmentData.quotaType === "senior" ? (
              <Shield className="h-5 w-5 text-primary" />
            ) : (
              <TrendingUp className="h-5 w-5 text-secondary" />
            )}
            Resumo do Investimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Tipo de Cota</h4>
                <div className="flex items-center gap-2">
                  <Badge variant={investmentData.quotaType === "senior" ? "default" : "secondary"}>
                    {investmentData.quotaType === "senior" ? "Cota Sênior" : "Cota Subordinada"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {investmentData.quotaType === "senior" ? "Conservador" : "Arrojado"}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Valor do Investimento</h4>
                <p className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(investmentData.amount)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Rentabilidade Esperada</h4>
                <p className="text-lg font-bold text-secondary">
                  {investmentData.quotaType === "senior" ? "3%" : "3,5%"} ao mês
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Retorno Mensal Estimado</h4>
                <p className="text-lg font-bold text-accent">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(investmentData.monthlyReturn)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Projeção Anual</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Retorno total estimado:</span>
                <p className="font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(investmentData.expectedReturn)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Valor final estimado:</span>
                <p className="font-bold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(investmentData.amount + investmentData.expectedReturn)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Terms and Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Termos e Condições</CardTitle>
          <CardDescription>Leia e aceite os termos antes de prosseguir</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start space-x-2">
            <Checkbox id="terms" checked={termsAccepted} onCheckedChange={setTermsAccepted} />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Li e aceito os termos e condições
              </label>
              <p className="text-xs text-muted-foreground">
                Declaro ter lido e compreendido os termos do Clube de Investimentos Privado e suas condições de
                participação.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox id="risk" checked={riskAccepted} onCheckedChange={setRiskAccepted} />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="risk"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Estou ciente dos riscos do investimento
              </label>
              <p className="text-xs text-muted-foreground">
                Compreendo que rentabilidade passada não garante rentabilidade futura e que posso ter perdas.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox id="compliance" checked={complianceAccepted} onCheckedChange={setComplianceAccepted} />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="compliance"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Declaro ter ciência de que não se trata de produto regulado pela CVM
              </label>
              <p className="text-xs text-muted-foreground">
                Ao prosseguir, reconheço que participo de um Clube de Investimentos Privado, sem garantia de retorno,
                ciente dos riscos envolvidos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} disabled={isProcessing}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Button onClick={handleConfirm} disabled={!isValid || isProcessing} size="lg" className="px-8">
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Investimento
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
