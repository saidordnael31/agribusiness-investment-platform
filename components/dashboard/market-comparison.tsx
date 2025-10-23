"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface MarketProduct {
  name: string
  type: string
  rate: number
  liquidity: string
  risk: "Baixo" | "Médio" | "Alto"
  trend: "up" | "down" | "stable"
  description: string
}

export default function MarketComparison() {
  const marketProducts: MarketProduct[] = [
    {
      name: "AGRINVEST Conservador",
      type: "Clube Privado",
      rate: 3.0,
      liquidity: "D+2",
      risk: "Baixo",
      trend: "up",
      description: "Clube Privado de Investimento do Agronegócio",
    },
    {
      name: "AGRINVEST Estratégico",
      type: "Clube Privado",
      rate: 3.5,
      liquidity: "D+2",
      risk: "Médio",
      trend: "up",
      description: "Maior potencial de retorno com upside",
    },
    {
      name: "CRI Agro",
      type: "Renda Fixa",
      rate: 2.1,
      liquidity: "D+30",
      risk: "Baixo",
      trend: "stable",
      description: "Certificado de Recebíveis Imobiliários",
    },
    {
      name: "CRA Premium",
      type: "Renda Fixa",
      rate: 2.3,
      liquidity: "D+60",
      risk: "Médio",
      trend: "down",
      description: "Certificado de Recebíveis do Agronegócio",
    },
    {
      name: "Fundo XP Agro",
      type: "Fundo",
      rate: 1.8,
      liquidity: "D+30",
      risk: "Médio",
      trend: "stable",
      description: "Fundo de investimento em agronegócio",
    },
    {
      name: "CDI",
      type: "Renda Fixa",
      rate: 1.1,
      liquidity: "D+1",
      risk: "Baixo",
      trend: "stable",
      description: "Certificado de Depósito Interbancário",
    },
    {
      name: "Clube XP Agro",
      type: "Clube Privado",
      rate: 1.8,
      liquidity: "D+30",
      risk: "Médio",
      trend: "stable",
      description: "Clube de investimento em agronegócio",
    },
  ]

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-emerald-500" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Baixo":
        return "bg-emerald-100 text-emerald-800"
      case "Médio":
        return "bg-yellow-100 text-yellow-800"
      case "Alto":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Comparativo de Mercado
        </CardTitle>
        <CardDescription>Compare a rentabilidade dos produtos AGRINVEST com outras opções do mercado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {marketProducts.map((product, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                product.name.includes("AGRINVEST") ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{product.name}</h4>
                  {product.name.includes("AGRINVEST") && (
                    <Badge variant="default" className="text-xs">
                      Nosso Produto
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(product.trend)}
                  <span className="text-lg font-bold text-primary">{product.rate.toFixed(1)}% a.m.</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-3">{product.description}</p>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Tipo:</span>
                  <span className="font-medium">{product.type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Liquidez:</span>
                  <span className="font-medium">{product.liquidity}</span>
                </div>
                <Badge variant="outline" className={getRiskColor(product.risk)}>
                  {product.risk} Risco
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">Vantagens AGRINVEST</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>
              • <strong>Liquidez superior:</strong> D+2 vs D+30/D+60 do mercado
            </li>
            <li>
              • <strong>Rentabilidade premium:</strong> 3,0% a 3,5% a.m. vs 1,1% a 2,3% do mercado
            </li>
            <li>
              • <strong>Transparência total:</strong> Acompanhamento em tempo real das operações
            </li>
            <li>
              • <strong>Lastro real:</strong> Recebíveis do agronegócio com compradores AAA
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
