"use client"

import { CardDescription } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Calculator,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Eye,
  RefreshCw,
  Users,
  Building2,
  Loader2,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface RecurrenceCalculation {
  id: string
  investorName: string
  investorEmail: string
  advisorName: string
  advisorId: string
  officeName: string
  officeId: string
  investmentAmount: number
  baseCommissionRate: number // Taxa base por role
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
  const supabase = createClient()

  const [recurrences, setRecurrences] = useState<RecurrenceCalculation[]>([])
  const [projections, setProjections] = useState<RecurrenceProjection[]>([])
  const [impacts, setImpacts] = useState<RecurrenceImpact[]>([])
  const [selectedRecurrence, setSelectedRecurrence] = useState<RecurrenceCalculation | null>(null)
  const [isProjectionOpen, setIsProjectionOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchRecurrenceData = async () => {
    try {
      setLoading(true)

      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select(`
          *,
          investor:profiles!investments_user_id_fkey(full_name, email, user_type),
          advisor:profiles!investments_advisor_id_fkey(full_name, user_type, office_id),
          office:profiles!investments_office_id_fkey(full_name, user_type)
        `)
        .eq("status", "active")

      if (investmentsError) throw investmentsError

      const { data: campaigns, error: campaignsError } = await supabase
        .from("promotional_campaigns")
        .select("*")
        .eq("is_active", true)

      if (campaignsError) throw campaignsError

      const processedRecurrences: RecurrenceCalculation[] = (investments || []).map((investment: any) => {
        const baseCommissionRate = 3.0
        const bonusRate = campaigns?.length > 0 ? 0.5 : 0
        const totalCommissionRate = baseCommissionRate + bonusRate
        const monthlyCommission = (investment.amount * totalCommissionRate) / 100
        const advisorShare = monthlyCommission * 0.7
        const officeShare = monthlyCommission * 0.3

        const startDate = investment.payment_date ? new Date(investment.payment_date) : new Date(investment.created_at)
        const now = new Date()
        const monthsPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
        const totalPaid = monthlyCommission * monthsPassed

        return {
          id: investment.id,
          investorName: investment.investor?.full_name || "Investidor",
          investorEmail: investment.investor?.email || "",
          advisorName: investment.advisor?.full_name || "Assessor",
          advisorId: investment.advisor_id || "",
          officeName: investment.office?.full_name || "Escritório",
          officeId: investment.office_id || "",
          investmentAmount: investment.amount,
          baseCommissionRate,
          bonusRate,
          totalCommissionRate,
          monthlyCommission,
          advisorShare,
          officeShare,
          startDate: investment.payment_date || investment.created_at,
          projectedEndDate: undefined,
          status: "active" as const,
          totalPaid,
          projectedTotal: monthlyCommission * 12,
          remainingMonths: 12 - monthsPassed,
          appliedBonuses: campaigns?.map((c) => c.name) || [],
          riskFactors: [],
        }
      })

      setRecurrences(processedRecurrences)

      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from("transaction_approvals")
        .select(`
          *,
          user:profiles(full_name)
        `)
        .eq("type", "withdrawal")
        .eq("status", "pending")

      if (withdrawalsError) throw withdrawalsError

      const processedImpacts: RecurrenceImpact[] = (withdrawals || []).map((withdrawal: any) => ({
        type: "withdrawal" as const,
        description: `Resgate pendente - ${withdrawal.user?.full_name || "Usuário"}`,
        impactDate: withdrawal.created_at,
        monthlyImpact: -(withdrawal.amount * 0.02), // Média ponderada por role
        totalImpact: -(withdrawal.amount * 0.02 * 12),
        affectedRecurrences: 1,
      }))

      setImpacts(processedImpacts)
    } catch (error) {
      console.error("Erro ao buscar dados de recorrência:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de recorrência.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecurrenceData()
  }, [])

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

      let currentBonusRate = recurrence.bonusRate
      if (month > 3) currentBonusRate = Math.max(0, currentBonusRate - 0.1)

      const monthlyCommission = (recurrence.investmentAmount * (recurrence.baseCommissionRate + currentBonusRate)) / 100
      const advisorCommission = monthlyCommission * 0.7
      const officeCommission = monthlyCommission * 0.3

      cumulativeAdvisor += advisorCommission
      cumulativeOffice += officeCommission
      cumulativeTotal += monthlyCommission

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
    fetchRecurrenceData()
    toast({
      title: "Recálculo realizado!",
      description: "Todas as projeções foram atualizadas com os dados mais recentes.",
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando dados de recorrência...</span>
      </div>
    )
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
              {recurrences.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma recorrência ativa encontrada.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    As recorrências aparecerão aqui quando houver investimentos ativos na plataforma.
                  </p>
                </div>
              ) : (
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
              )}
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
              {impacts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum impacto futuro identificado.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Impactos como resgates pendentes e campanhas expirando aparecerão aqui.
                  </p>
                </div>
              ) : (
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
                          <p
                            className={`font-medium ${impact.monthlyImpact < 0 ? "text-red-600" : "text-emerald-600"}`}
                          >
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
              )}
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
