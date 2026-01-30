"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calculator } from "lucide-react"
import { ComparisonCalculator } from "./comparison-calculator"
import { useRouter } from "next/navigation"

interface UserData {
  name: string
  email: string
  type: string
  role?: string
  user_type?: string
}

export function CommissionCalculator() {
  const [user, setUser] = useState<UserData | null>(null)
  const router = useRouter()

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }, [])

  const handleBackToDashboard = () => {
    router.push(user?.type === "distributor" ? "/distributor" : "/investor")
  }

  if (!user) return null

  const isExternalAdvisor = user.role === "assessor_externo" || user.user_type === "assessor_externo"

  return (
    <div className="min-h-screen bg-[#01223F]">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToDashboard}
              className="text-white hover:bg-[#003562] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center space-x-2">
              <Calculator className="h-6 w-6 text-[#00BC6E]" />
              <h1 className="text-2xl font-bold text-white">Comparador de Cenários</h1>
            </div>
          </div>
        </div>
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Compare diferentes estratégias de captação</h2>
          <p className="text-gray-400 max-w-3xl">
            Monte cenários alternativos com valores, liquidez e prazos distintos para visualizar como tempo de resgate e as taxas específicas do investidor impactam o retorno total do investidor.
          </p>
        </div>

        {/* Liquidity and Redemption Overview */}
        <Card className="mb-8 bg-[#003562] border-[#003562] shadow-sm">
          <CardHeader>
            <CardTitle className="text-white">Como avaliamos cada cenário</CardTitle>
            <CardDescription className="text-gray-400">
              As taxas de investidor variam conforme a liquidez acordada e o prazo de compromisso. Assessor e escritório mantêm
              suas participações fixas.
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-[#003562]">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-[#01223F] p-4 border border-[#003562]">
                <h4 className="font-semibold text-[#00BC6E] mb-1">Tempo de resgate</h4>
                <p className="text-sm text-gray-400">
                  Calculamos o período de resgate com base no compromisso (3, 6, 12, 24 ou 36 meses), refletindo o prazo mínimo
                  antes da liquidação.
                </p>
              </div>
              <div className="rounded-lg bg-[#01223F] p-4 border border-[#003562]">
                <h4 className="font-semibold text-[#00BC6E] mb-1">Liquidez da rentabilidade</h4>
                <p className="text-sm text-gray-400">
                  Mensal, semestral, anual ou ciclos maiores definem a disponibilidade do retorno. Disponibilizamos apenas
                  combinações válidas para cada prazo.
                </p>
              </div>
              <div className="rounded-lg bg-[#01223F] p-4 border border-[#003562]">
                <h4 className="font-semibold text-[#00BC6E] mb-1">Taxas aplicadas</h4>
                <p className="text-sm text-gray-400">
                  Rentabilidade do investidor varia entre{" "}
                  {isExternalAdvisor ? "1,35%" : "1,8%"} e {isExternalAdvisor ? "2,0%" : "3,5%"} ao mês, de acordo com a liquidez
                  escolhida.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calculator */}
        <ComparisonCalculator />
      </div>
    </div>
  )
}
