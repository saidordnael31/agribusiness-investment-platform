"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calculator } from "lucide-react"
import { useUserType } from "@/hooks/useUserType"
import { getCommissionRate } from "@/lib/commission-utils"

export function CommissionSimulator() {
  const [capturedAmount, setCapturedAmount] = useState("")
  const [results, setResults] = useState<{
    monthlyCommission: number
    annualCommission: number
    commissionRate: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { user_type_id, user_type, display_name } = useUserType()

  const calculateCommissions = async () => {
    const amount = Number.parseFloat(capturedAmount)
    if (!amount || !user_type_id) {
      console.warn("[CommissionSimulator] Valor ou user_type_id não disponível")
      return
    }

    setIsLoading(true)
    try {
      // Buscar taxa de comissão do banco (sempre usa período de 12 meses e liquidez mensal para comissões)
      const commissionRate = await getCommissionRate(user_type_id, 12, "Mensal")
      
      if (commissionRate === 0) {
        console.warn("[CommissionSimulator] Taxa de comissão não encontrada")
        setIsLoading(false)
        return
      }

      // Calcular comissão mensal e anual
      // commissionRate já vem em decimal (ex: 0.02 para 2%)
      const monthlyCommission = amount * commissionRate
      const annualCommission = monthlyCommission * 12

      setResults({
        monthlyCommission,
        annualCommission,
        commissionRate, // Taxa em decimal para exibição
      })
    } catch (error) {
      console.error("[CommissionSimulator] Erro ao calcular comissões:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-gradient-to-b from-[#D9D9D9] via-[#596D7E] to-[#01223F] border-gray-200 rounded-lg h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-[#003F28] text-xl font-bold mb-2">
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
          disabled={isLoading || !user_type_id}
          className="w-full bg-[#01223F] hover:bg-[#01223F]/80 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Calculator className="h-4 w-4 mr-2" />
          {isLoading ? "Calculando..." : "Calcular Comissões"}
        </Button>

        {results && (
          <div className="space-y-4">
            <div className="p-4 bg-[#D9D9D9]/45 rounded-lg border border-gray-300">
              <p className="text-sm text-gray-600">
                Comissão Mensal {display_name ? `(${display_name})` : ""}
              </p>
              <div className="mt-1 text-2xl font-bold text-[#00BC6E]">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(results.monthlyCommission)}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Equivalente a {(results.commissionRate * 100).toFixed(2)}% a.m.
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
            {results ? (
              <p>
                • <span className="font-medium text-[#003F28]">Sua Comissão {display_name ? `(${display_name})` : ""}:</span>{" "}
                {(results.commissionRate * 100).toFixed(2)}% ao mês sobre valor investido
              </p>
            ) : (
              <p className="text-gray-500">Calcule as comissões para ver sua estrutura</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
