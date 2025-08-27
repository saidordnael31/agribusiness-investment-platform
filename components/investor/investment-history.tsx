"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowUpRight, ArrowDownRight, Calendar } from "lucide-react"

// Mock data for investment history
const investmentHistory = [
  {
    id: 1,
    date: "2024-01-15",
    type: "investment",
    quotaType: "senior",
    amount: 50000,
    status: "completed",
  },
  {
    id: 2,
    date: "2024-02-01",
    type: "return",
    quotaType: "senior",
    amount: 1500,
    status: "completed",
  },
  {
    id: 3,
    date: "2024-02-20",
    type: "investment",
    quotaType: "subordinate",
    amount: 50000,
    status: "completed",
  },
  {
    id: 4,
    date: "2024-03-01",
    type: "return",
    quotaType: "senior",
    amount: 1500,
    status: "completed",
  },
  {
    id: 5,
    date: "2024-03-01",
    type: "return",
    quotaType: "subordinate",
    amount: 1750,
    status: "completed",
  },
  {
    id: 6,
    date: "2024-03-15",
    type: "investment",
    quotaType: "senior",
    amount: 50000,
    status: "completed",
  },
]

export function InvestmentHistory() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Histórico de Investimentos
        </CardTitle>
        <CardDescription>Acompanhe todas as suas movimentações no FIDC Agroderi</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {investmentHistory.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  {transaction.type === "investment" ? (
                    <ArrowUpRight className="h-5 w-5 text-primary" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5 text-secondary" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">{transaction.type === "investment" ? "Investimento" : "Retorno"}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(transaction.date).toLocaleDateString("pt-BR")} •{" "}
                    {transaction.quotaType === "senior" ? "Cota Sênior" : "Cota Subordinada"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">
                  {transaction.type === "investment" ? "-" : "+"}
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(transaction.amount)}
                </p>
                <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
                  {transaction.status === "completed" ? "Concluído" : "Pendente"}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button variant="outline">Carregar Mais</Button>
        </div>
      </CardContent>
    </Card>
  )
}
