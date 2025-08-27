"use client"

import { CardDescription } from "@/components/ui/card"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Calculator, TrendingUp, DollarSign, AlertTriangle, Eye, RefreshCw, Users, Building2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface RecurrenceCalculation {
  id: string
  investorName: string
  investorEmail: string
  advisorName: string
  advisorId: string
  officeName: string
  officeId: string
  investmentAmount: number
  baseCommissionRate: number // 3% base
  bonusRate: number // bonificações aplicadas
  totalCommissionRate: number
  monthlyCommission: number
  advisorShare: number // 70%
  officeShare: number // 30%
  startDate: string
  projectedEndDate?: string
  status: "active" | "paused" | "cancelled" | "at_risk"
  totalPaid: number
  projectedTotal: number
  remainingMonths: number
  appliedBonuses: string[]
  riskFactors: string[]
}

interface RecurrenceProjection {
  month: number
  date: string
  advisorCommission: number
  officeCommission: number
  totalCommission: number
  cumulativeAdvisor: number
  cumulativeOffice: number
  cumulativeTotal: number
  activeBonuses: string[]
  riskLevel: "low" | "medium" | "high"
}

interface RecurrenceImpact {
  type: "withdrawal" | "bonus_expiry" | "campaign_end" | "performance_goal"
  description: string
  impactDate: string
  monthlyImpact: number
  totalImpact: number
  affectedRecurrences: number
}

export function RecurrenceCalculator() {
  const { toast } = useToast()

  const [recurrences, setRecurrences] = useState<RecurrenceCalculation[]>([
    {
      id: "1",
      investorName: "João Silva",
      investorEmail: "joao@email.com",
      advisorName: "Carlos Santos",
      advisorId: "adv1",
      officeName: "Alpha Investimentos",
      officeId: "off1",
      investmentAmount: 100000,
      baseCommissionRate: 3.0,
      bonusRate: 0.5,
      totalCommissionRate: 3.5,
      monthlyCommission: 3500,
      advisorShare: 2450,
      officeShare: 1050,
      startDate: "2025-01-15",
      projectedEndDate: "2026-01-15",
      status: "active",
      totalPaid: 10500,
      projectedTotal: 42000,
      remainingMonths: 9,
      appliedBonuses: ["Promoção Ano Novo", "Meta 500K"],
      riskFactors: [],
    },
    {
      id: "2",
      investorName: "Maria Costa",
      investorEmail: "maria@email.com",
      advisorName: "Ana Oliveira",
      advisorId: "adv2",
      officeName: "Beta Capital",
      officeId: "off2",
      investmentAmount: 250000,
      baseCommissionRate: 3.0,
      bonusRate: 1.0,
      totalCommissionRate: 4.0,
      monthlyCommission: 10000,
      advisorShare: 7000,
      officeShare: 3000,
      startDate: "2024-12-01",
      status: "at_risk",
      totalPaid: 30000,
      projectedTotal: 120000,
      remainingMonths: 9,
      appliedBonuses: ["Distribuidor Premium"],
      riskFactors: ["Solicitou informações sobre resgate", "Baixa atividade na plataforma"],
    },
  ])

  const [projections, setProjections] = useState<RecurrenceProjection[]>([])
  const [impacts, setImpacts] = useState<RecurrenceImpact[]>([
    {
      type: "withdrawal",
      description: "Resgate total previsto - João Silva",
      impactDate: "2025-06-15",
      monthlyImpact: -3500,
      totalImpact: -31500,
      affectedRecurrences: 1,
    },
    {
      type: "bonus_expiry",
      description: "Expiração da Promoção Ano Novo",
      impactDate: "2025-03-31",
      monthlyImpact: -2100,
      totalImpact: -18900,
      affectedRecurrences: 15,
    },
  ])

  const [selectedRecurrence, setSelectedRecurrence] = useState<RecurrenceCalculation | null>(null)
  const [isProjectionOpen, setIsProjectionOpen] = useState(false)

  // Cálculos agregados
  const totalActiveRecurrences = recurrences.filter((r) => r.status === "active").length
  const totalMonthlyCommissions = recurrences
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + r.monthlyCommission, 0)
  const totalAdvisorShare = recurrences.filter((r) => r.status === "active").reduce((sum, r) => sum + r.advisorShare, 0)
  const totalOfficeShare = recurrences.filter((r) => r.status === "active").reduce((sum, r) => sum + r.officeShare, 0)
  const atRiskRecurrences = recurrences.filter((r) => r.status === "at_risk").length

  const generateProjection = (recurrence: RecurrenceCalculation) => {
    const projections: RecurrenceProjection[] = []
    let cumulativeAdvisor = 0
    let cumulativeOffice = 0
    let cumulativeTotal = 0

    for (let month = 1; month <= 12; month++) {
      const date = new Date()
      date.setMonth(date.getMonth() + month)

      // Simular variações de bônus ao longo do tempo
      let currentBonusRate = recurrence.bonusRate
      if (month > 3) currentBonusRate = Math.max(0, currentBonusRate - 0.1) // Alguns bônus expiram

      const monthlyCommission = (recurrence.investmentAmount * (recurrence.baseCommissionRate + currentBonusRate)) / 100
      const advisorCommission = monthlyCommission * 0.7
      const officeCommission = monthlyCommission * 0.3

      cumulativeAdvisor += advisorCommission
      cumulativeOffice += officeCommission
      cumulativeTotal += monthlyCommission

      // Determinar nível de risco baseado em fatores
      let riskLevel: "low" | "medium" | "high" = "low"
      if (recurrence.riskFactors.length > 0) riskLevel = "medium"
      if (recurrence.riskFactors.length > 2) riskLevel = "high"

      projections.push({
        month,
        date: date.toISOString().split("T")[0],
        advisorCommission,
        officeCommission,
        totalCommission: monthlyCommission,
        cumulativeAdvisor,
        cumulativeOffice,
        cumulativeTotal,
        activeBonuses: currentBonusRate > 0 ? recurrence.appliedBonuses : [],
        riskLevel,
      })
    }

    setProjections(projections)
  }

  const handleViewProjection = (recurrence: RecurrenceCalculation) => {
    setSelectedRecurrence(recurrence)
    generateProjection(recurrence)
    setIsProjectionOpen(true)
  }

  const recalculateAll = () => {
    // Simular recálculo de todas as recorrências
    toast({
      title: "Recálculo realizado!",
      description: "Todas as projeções foram atualizadas com as campanhas e bônus atuais.",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "at_risk":
        return "destructive"
      case "paused":
        return "secondary"
      case "cancelled":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo"
      case "at_risk":
        return "Em Risco"
      case "paused":
        return "Pausado"
      case "cancelled":
        return "Cancelado"
      default:
        return status
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-emerald-600"
      case "medium":
        return "text-yellow-600"
      case "high":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="w-6 h-6" />
            Sistema de Cálculo de Recorrência
          </h2>
          <p className="text-muted-foreground">Monitore e projete comissões recorrentes mensais</p>
        </div>
        <Button onClick={recalculateAll} className="bg-orange-600 hover:bg-orange-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Recalcular Tudo
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recorrências Ativas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveRecurrences}</div>
            <p className="text-xs text-muted-foreground">{atRiskRecurrences} em risco</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões Mensais</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalMonthlyCommissions)}</div>
            <p className="text-xs text-muted-foreground">Total recorrente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessores (70%)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAdvisorShare)}</div>
            <p className="text-xs text-muted-foreground">Participação mensal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escritórios (30%)</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOfficeShare)}</div>
            <p className="text-xs text-muted-foreground">Participação mensal</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recurrences" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recurrences">Recorrências Ativas</TabsTrigger>
          <TabsTrigger value="impacts">Impactos Futuros</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="recurrences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comissões Recorrentes</CardTitle>
              <CardDescription>Monitore todas as comissões recorrentes ativas e suas projeções</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investidor</TableHead>
                    <TableHead>Assessor/Escritório</TableHead>
                    <TableHead>Investimento</TableHead>
                    <TableHead>Taxa Total</TableHead>
                    <TableHead>Comissão Mensal</TableHead>
                    <TableHead>Divisão (70/30)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurrences.map((recurrence) => (
                    <TableRow key={recurrence.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{recurrence.investorName}</p>
                          <p className="text-sm text-muted-foreground">{recurrence.investorEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{recurrence.advisorName}</p>
                          <p className="text-sm text-muted-foreground">{recurrence.officeName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{formatCurrency(recurrence.investmentAmount)}</p>
                        <p className="text-sm text-muted-foreground">
                          Desde {new Date(recurrence.startDate).toLocaleDateString("pt-BR")}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{recurrence.totalCommissionRate.toFixed(1)}%</p>
                          <p className="text-sm text-muted-foreground">
                            Base: {recurrence.baseCommissionRate}% + Bônus: {recurrence.bonusRate}%
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{formatCurrency(recurrence.monthlyCommission)}</p>
                        <p className="text-sm text-muted-foreground">Pago: {formatCurrency(recurrence.totalPaid)}</p>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="text-emerald-600">{formatCurrency(recurrence.advisorShare)}</span>
                          </p>
                          <p className="text-sm">
                            <span className="text-orange-600">{formatCurrency(recurrence.officeShare)}</span>
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(recurrence.status)}>{getStatusLabel(recurrence.status)}</Badge>
                        {recurrence.riskFactors.length > 0 && (
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {recurrence.riskFactors.length} alertas
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewProjection(recurrence)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impacts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Impactos Futuros na Recorrência</CardTitle>
              <CardDescription>Eventos que afetarão as comissões recorrentes nos próximos meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {impacts.map((impact, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            impact.type === "withdrawal"
                              ? "bg-red-500"
                              : impact.type === "bonus_expiry"
                                ? "bg-yellow-500"
                                : impact.type === "campaign_end"
                                  ? "bg-orange-500"
                                  : "bg-blue-500"
                          }`}
                        ></div>
                        <h3 className="font-semibold">{impact.description}</h3>
                      </div>
                      <Badge variant="outline">{new Date(impact.impactDate).toLocaleDateString("pt-BR")}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Impacto Mensal</p>
                        <p className={`font-medium ${impact.monthlyImpact < 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {formatCurrency(impact.monthlyImpact)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Impacto Total</p>
                        <p className={`font-medium ${impact.totalImpact < 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {formatCurrency(impact.totalImpact)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Recorrências Afetadas</p>
                        <p className="font-medium">{impact.affectedRecurrences}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["active", "at_risk", "paused", "cancelled"].map((status) => {
                    const count = recurrences.filter((r) => r.status === status).length
                    const percentage = recurrences.length > 0 ? (count / recurrences.length) * 100 : 0

                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(status)}>{getStatusLabel(status)}</Badge>
                          <span className="text-sm">{count} recorrências</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Projeção de 12 Meses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receita Atual (mensal)</span>
                    <span className="font-medium">{formatCurrency(totalMonthlyCommissions)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projeção 12 meses</span>
                    <span className="font-medium">{formatCurrency(totalMonthlyCommissions * 12)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impacto de riscos</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(impacts.reduce((sum, i) => sum + i.totalImpact, 0))}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Projeção Líquida</span>
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(
                          totalMonthlyCommissions * 12 + impacts.reduce((sum, i) => sum + i.totalImpact, 0),
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Projection Dialog */}
      <Dialog open={isProjectionOpen} onOpenChange={setIsProjectionOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Projeção de Recorrência - {selectedRecurrence?.investorName}</DialogTitle>
            <DialogDescription>Projeção detalhada dos próximos 12 meses de comissões</DialogDescription>
          </DialogHeader>

          {selectedRecurrence && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Investimento</p>
                  <p className="font-semibold">{formatCurrency(selectedRecurrence.investmentAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Atual</p>
                  <p className="font-semibold">{selectedRecurrence.totalCommissionRate}% a.m.</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Comissão Mensal</p>
                  <p className="font-semibold">{formatCurrency(selectedRecurrence.monthlyCommission)}</p>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Assessor (70%)</TableHead>
                      <TableHead>Escritório (30%)</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Acumulado</TableHead>
                      <TableHead>Risco</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projections.map((projection) => (
                      <TableRow key={projection.month}>
                        <TableCell>{projection.month}</TableCell>
                        <TableCell>{new Date(projection.date).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell className="text-emerald-600">
                          {formatCurrency(projection.advisorCommission)}
                        </TableCell>
                        <TableCell className="text-orange-600">{formatCurrency(projection.officeCommission)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(projection.totalCommission)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatCurrency(projection.cumulativeTotal)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getRiskLevelColor(projection.riskLevel)}>
                            {projection.riskLevel}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
