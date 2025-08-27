"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TrendingUp, DollarSign, Clock, Target, Gift } from "lucide-react"

interface BonificationTier {
  id: string
  category: "investment" | "period" | "performance" | "promotion"
  name: string
  condition: string
  bonusRate: number
  duration?: string
  userType: "investor" | "distributor" | "both"
  isActive: boolean
}

export function BonificationTable() {
  const bonificationTiers: BonificationTier[] = [
    // Bonificações por Investimento
    {
      id: "inv_50k",
      category: "investment",
      name: "Investidor Bronze",
      condition: "R$ 50.000 - R$ 99.999",
      bonusRate: 0.1,
      userType: "investor",
      isActive: true,
    },
    {
      id: "inv_100k",
      category: "investment",
      name: "Investidor Prata",
      condition: "R$ 100.000 - R$ 249.999",
      bonusRate: 0.3,
      userType: "investor",
      isActive: true,
    },
    {
      id: "inv_250k",
      category: "investment",
      name: "Investidor Ouro",
      condition: "R$ 250.000 - R$ 499.999",
      bonusRate: 0.5,
      userType: "investor",
      isActive: true,
    },
    {
      id: "inv_500k",
      category: "investment",
      name: "Investidor Platina",
      condition: "R$ 500.000 - R$ 999.999",
      bonusRate: 0.7,
      userType: "investor",
      isActive: true,
    },
    {
      id: "inv_1m",
      category: "investment",
      name: "Investidor Diamante",
      condition: "Acima de R$ 1.000.000",
      bonusRate: 1.0,
      userType: "investor",
      isActive: true,
    },

    // Bonificações por Prazo
    {
      id: "period_3m",
      category: "period",
      name: "Compromisso Trimestral",
      condition: "3 meses sem resgate",
      bonusRate: 0.1,
      duration: "3 meses",
      userType: "investor",
      isActive: true,
    },
    {
      id: "period_6m",
      category: "period",
      name: "Compromisso Semestral",
      condition: "6 meses sem resgate",
      bonusRate: 0.2,
      duration: "6 meses",
      userType: "investor",
      isActive: true,
    },
    {
      id: "period_12m",
      category: "period",
      name: "Compromisso Anual",
      condition: "12 meses sem resgate",
      bonusRate: 0.5,
      duration: "12 meses",
      userType: "investor",
      isActive: true,
    },

    // Bonificações para Distribuidores
    {
      id: "dist_100k",
      category: "performance",
      name: "Distribuidor Iniciante",
      condition: "Captação de R$ 100.000",
      bonusRate: 0.5,
      duration: "6 meses",
      userType: "distributor",
      isActive: true,
    },
    {
      id: "dist_500k",
      category: "performance",
      name: "Distribuidor Profissional",
      condition: "Captação de R$ 500.000",
      bonusRate: 1.0,
      duration: "12 meses",
      userType: "distributor",
      isActive: true,
    },
    {
      id: "dist_1m",
      category: "performance",
      name: "Distribuidor Elite",
      condition: "Captação de R$ 1.000.000",
      bonusRate: 2.0,
      duration: "12 meses",
      userType: "distributor",
      isActive: true,
    },
    {
      id: "dist_2m",
      category: "performance",
      name: "Distribuidor Master",
      condition: "Captação de R$ 2.000.000",
      bonusRate: 3.0,
      duration: "12 meses",
      userType: "distributor",
      isActive: true,
    },

    // Promoções Especiais
    {
      id: "promo_new_year",
      category: "promotion",
      name: "Promoção Ano Novo",
      condition: "Novos investimentos até 31/03",
      bonusRate: 0.4,
      duration: "3 meses",
      userType: "both",
      isActive: true,
    },
    {
      id: "promo_referral",
      category: "promotion",
      name: "Indicação Premiada",
      condition: "Por cada indicação efetivada",
      bonusRate: 0.2,
      duration: "6 meses",
      userType: "both",
      isActive: true,
    },
  ]

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "investment":
        return <DollarSign className="w-4 h-4" />
      case "period":
        return <Clock className="w-4 h-4" />
      case "performance":
        return <Target className="w-4 h-4" />
      case "promotion":
        return <Gift className="w-4 h-4" />
      default:
        return <TrendingUp className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "investment":
        return "text-emerald-600 bg-emerald-50"
      case "period":
        return "text-blue-600 bg-blue-50"
      case "performance":
        return "text-purple-600 bg-purple-50"
      case "promotion":
        return "text-orange-600 bg-orange-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case "investment":
        return "Por Valor"
      case "period":
        return "Por Prazo"
      case "performance":
        return "Por Performance"
      case "promotion":
        return "Promoções"
      default:
        return "Outros"
    }
  }

  const formatRate = (rate: number) => {
    return `+${rate.toFixed(1)}%`
  }

  const groupedTiers = bonificationTiers.reduce(
    (acc, tier) => {
      if (!acc[tier.category]) {
        acc[tier.category] = []
      }
      acc[tier.category].push(tier)
      return acc
    },
    {} as Record<string, BonificationTier[]>,
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <TrendingUp className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold">Tabela de Bonificações</h2>
      </div>

      {Object.entries(groupedTiers).map(([category, tiers]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className={`p-2 rounded-lg ${getCategoryColor(category)}`}>{getCategoryIcon(category)}</div>
              <span>{getCategoryName(category)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nível</TableHead>
                  <TableHead>Condição</TableHead>
                  <TableHead>Bonificação</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Público</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => (
                  <TableRow key={tier.id}>
                    <TableCell className="font-medium">{tier.name}</TableCell>
                    <TableCell>{tier.condition}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-bold">
                        {formatRate(tier.bonusRate)} a.m.
                      </Badge>
                    </TableCell>
                    <TableCell>{tier.duration || "Permanente"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {tier.userType === "both"
                          ? "Ambos"
                          : tier.userType === "investor"
                            ? "Investidor"
                            : "Distribuidor"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tier.isActive ? "default" : "secondary"}>
                        {tier.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-gradient-to-r from-emerald-50 to-blue-50">
        <CardHeader>
          <CardTitle>Como Funciona o Sistema de Bonificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Para Investidores</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Bonificações por valor investido são cumulativas</li>
                <li>• Bonificações por prazo requerem compromisso de não resgate</li>
                <li>• Promoções têm validade limitada</li>
                <li>• Todas as bonificações são aplicadas sobre a taxa base</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Para Distribuidores</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Bonificações baseadas em metas de captação</li>
                <li>• Aplicadas sobre as comissões recorrentes</li>
                <li>• Duração limitada após atingir a meta</li>
                <li>• Podem ser combinadas com promoções especiais</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
