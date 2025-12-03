"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calculator } from "lucide-react"
import { calculateRoleCommission } from "@/lib/commission-calculator"

export function CommissionSimulator() {
  const [capturedAmount, setCapturedAmount] = useState("")
  const [user, setUser] = useState<any>(null)
  const [results, setResults] = useState<{
    monthlyCommission: number
    annualCommission: number
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
    const userRole = user?.role === "investidor" ? "investidor" : 
                     user?.role === "escritorio" ? "escritorio" : "assessor"

    // Calcular comissão baseada no role do usuário (sem bônus)
    const roleCalculation = calculateRoleCommission(amount, userRole, 12)

    setResults({
      monthlyCommission: roleCalculation.monthlyCommission,
      annualCommission: roleCalculation.totalCommission,
    })
  }

  return (
    <Card className="bg-gradient-to-b from-[#D9D9D9] via-[#596D7E] to-[#01223F] border-gray-200 rounded-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-[#003F28] text-xl font-bold flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Simulador de Comissões
        </CardTitle>
        <CardDescription className="text-gray-600 text-sm mt-1">
          Calcule suas comissões baseadas na captação de investimentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="captured" className="text-white">Valor Total Captado</Label>
          <Input
            id="captured"
            type="number"
            placeholder="100000"
            value={capturedAmount}
            onChange={(e) => setCapturedAmount(e.target.value)}
            min="0"
            className="bg-[#D9D9D9]/45 border-gray-300 text-[#003F28]"
          />
          <p className="text-xs text-white/70">Digite o valor total que você pretende captar</p>
        </div>

        <Button 
          onClick={calculateCommissions} 
          className="w-full bg-[#01223F] hover:bg-[#01223F]/80 text-white"
        >
          <Calculator className="h-4 w-4 mr-2" />
          Calcular Comissões
        </Button>

        {results && (
          <div className="space-y-4">
            <div className="p-4 bg-[#D9D9D9]/45 rounded-lg border border-gray-300">
              <p className="text-sm text-gray-600">
                {user?.role === "assessor"
                  ? "Comissão Mensal (Assessor)"
                  : user?.role === "escritorio"
                  ? "Comissão Mensal (Escritório)"
                  : user?.role === "investidor"
                  ? "Comissão Mensal (Investidor)"
                  : "Comissão Mensal"}
              </p>
              <div className="mt-1 text-2xl font-bold text-[#00BC6E]">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(results.monthlyCommission)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Equivalente a {user?.role === "investidor" ? "2% a.m." : user?.role === "escritorio" ? "1% a.m." : "3% a.m."}
              </p>
            </div>

            <div className="p-4 bg-[#D9D9D9]/45 rounded-lg border-2 border-[#003F28]">
              <p className="text-sm text-gray-600">
                Total Anual
              </p>
              <p className="text-3xl font-bold text-[#003F28]">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(results.annualCommission)}
              </p>
            </div>
          </div>
        )}

        <div className="bg-[#D9D9D9]/45 p-4 rounded-lg border border-gray-300">
          <h4 className="font-semibold mb-2 text-[#003F28]">Estrutura de Comissões:</h4>
          <div className="text-sm text-gray-600">
            {user?.role === "investidor" ? (
              <p>• <span className="font-medium text-[#003F28]">Sua Comissão (Investidor):</span> 2% ao mês sobre valor investido</p>
            ) : user?.role === "escritorio" ? (
              <p>• <span className="font-medium text-[#003F28]">Sua Comissão (Escritório):</span> 1% ao mês sobre valor investido</p>
            ) : user?.role === "assessor" ? (
              <p>• <span className="font-medium text-[#003F28]">Sua Comissão (Assessor):</span> 3% ao mês sobre valor investido</p>
            ) : (
              <div className="space-y-1">
                <p>• <span className="font-medium text-[#003F28]">Investidor:</span> 2% ao mês sobre valor investido</p>
                <p>• <span className="font-medium text-[#003F28]">Escritório:</span> 1% ao mês sobre valor investido</p>
                <p>• <span className="font-medium text-[#003F28]">Assessor:</span> 3% ao mês sobre valor investido</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
