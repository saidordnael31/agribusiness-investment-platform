"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calculator } from "lucide-react"
import { 
  calculateRoleCommission, 
  calculateCommissionWithBonus, 
  calculateCommissionBreakdown
} from "@/lib/commission-calculator"

export function CommissionSimulator() {
  const [capturedAmount, setCapturedAmount] = useState("")
  const [user, setUser] = useState<any>(null)
  const [results, setResults] = useState<{
    monthlyCommission: number
    annualCommission: number
    advisorShare: number
    officeShare: number
    performanceBonus: number
    totalWithBonus: number
  } | null>(null)

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      const userData = JSON.parse(userStr)
      setUser(userData)
    }
  }, [])

  const calculateCommissions = () => {
    const amount = Number.parseFloat(capturedAmount)
    if (!amount) return

    // Determinar role baseado no tipo de usuário
    const userRole = user?.user_type === "investor" ? "investor" : 
                     user?.user_type === "escritorio" ? "escritorio" : "assessor"

    // Calcular comissão baseada no role do usuário
    const roleCalculation = calculateCommissionWithBonus(amount, userRole, 12)
    
    // Para o layout antigo, mostrar divisão assessor/escritório baseada no role
    let advisorShare, officeShare
    if (userRole === "assessor") {
      advisorShare = roleCalculation.totalCommission
      officeShare = 0
    } else if (userRole === "escritorio") {
      advisorShare = 0
      officeShare = roleCalculation.totalCommission
    } else {
      // Para investidor, mostrar divisão proporcional
      advisorShare = roleCalculation.totalCommission * 0.75
      officeShare = roleCalculation.totalCommission * 0.25
    }

    setResults({
      monthlyCommission: roleCalculation.monthlyCommission,
      annualCommission: roleCalculation.totalCommission,
      advisorShare,
      officeShare,
      performanceBonus: roleCalculation.performanceBonus,
      totalWithBonus: roleCalculation.totalCommission + roleCalculation.performanceBonus,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Simulador de Comissões
        </CardTitle>
        <CardDescription>Calcule suas comissões baseadas na captação de investimentos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="captured">Valor Total Captado</Label>
          <Input
            id="captured"
            type="number"
            placeholder="100000"
            value={capturedAmount}
            onChange={(e) => setCapturedAmount(e.target.value)}
            min="0"
          />
          <p className="text-xs text-muted-foreground">Digite o valor total que você pretende captar</p>
        </div>

        <Button onClick={calculateCommissions} className="w-full">
          Calcular Comissões
        </Button>

        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-card rounded-lg border">
                <p className="text-sm text-muted-foreground">Comissão Mensal</p>
                <p className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.monthlyCommission)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.user_type === "investor" ? "2%" : 
                   user?.user_type === "escritorio" ? "1%" : "3%"} sobre base investida
                </p>
              </div>

              <div className="p-4 bg-card rounded-lg border">
                <p className="text-sm text-muted-foreground">Comissão Anual</p>
                <p className="text-2xl font-bold text-secondary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.annualCommission)}
                </p>
                <p className="text-xs text-muted-foreground">Base sem bônus</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  {user?.user_type === "assessor" ? "Sua Comissão" : 
                   user?.user_type === "escritorio" ? "Sua Comissão" : "Assessor (75%)"}
                </p>
                <p className="text-xl font-bold text-primary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.advisorShare)}
                </p>
              </div>

              <div className="p-4 bg-secondary/5 rounded-lg border border-secondary/20">
                <p className="text-sm text-muted-foreground">
                  {user?.user_type === "assessor" ? "Escritório" : 
                   user?.user_type === "escritorio" ? "Escritório" : "Escritório (25%)"}
                </p>
                <p className="text-xl font-bold text-secondary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.officeShare)}
                </p>
              </div>
            </div>

            {results.performanceBonus > 0 && (
              <div className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                <p className="text-sm text-muted-foreground">Bônus de Performance</p>
                <p className="text-xl font-bold text-accent">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(results.performanceBonus)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Number.parseFloat(capturedAmount) >= 1000000
                    ? "Meta 2 atingida: +3% adicional"
                    : "Meta 1 atingida: +1% adicional"}
                </p>
              </div>
            )}

            <div className="p-4 bg-muted rounded-lg border-2 border-primary">
              <p className="text-sm text-muted-foreground">Total Anual</p>
              <p className="text-3xl font-bold text-primary">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(results.totalWithBonus)}
              </p>
            </div>
          </div>
        )}

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Estrutura de Comissões:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <span className="font-medium text-blue-600">Investidor:</span> 2% ao mês sobre valor investido</li>
            <li>• <span className="font-medium text-green-600">Escritório:</span> 1% ao mês sobre valor investido</li>
            <li>• <span className="font-medium text-purple-600">Assessor:</span> 3% ao mês sobre valor investido</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
