"use client"

import { CardDescription } from "@/components/ui/card"
import * as Tooltip from "@radix-ui/react-tooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
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
  Download,
  FileText,
  Info,
} from "lucide-react"
import { useRecurrenceCalculator } from "./useRecurrenceCalculator"

export function RecurrenceCalculator() {
  const {
    recurrences,
    projections,
    selectedRecurrence,
    isProjectionOpen,
    loading,
    filterType,
    filterValue,
    filterOptions,
    investorRate,
    filteredRecurrences,
    totalsByCategory,
    totalActiveRecurrences,
    totalMonthlyCommissions,
    totalAdvisorShare,
    totalOfficeShare,
    atRiskRecurrences,
    lastCutoffDate,
    nextFifthBusinessDay,
    totalToBePaid,
    setFilterType,
    setFilterValue,
    setIsProjectionOpen,
    recalculateAll,
    handleViewProjection,
    shouldShowAggregatedData,
    getStatusColor,
    getStatusLabel,
    exportToExcel,
    exportToPDF,
    formatCurrency,
    calculateInvestorCommission,
    calculateInvestorRate,
  } = useRecurrenceCalculator()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando dados de recorrência...</span>
      </div>
    )
  }

  const formatDateLabel = (value: string | Date | null | undefined): string => {
    if (!value) return "-"

    const toFormattedString = (dateObj: Date) => {
      const year = dateObj.getUTCFullYear()
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0")
      const day = String(dateObj.getUTCDate()).padStart(2, "0")
      return `${day}/${month}/${year}`
    }

    if (typeof value === "string") {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (match) {
        const [, year, month, day] = match
        const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
        return toFormattedString(date)
      }
      const parsed = new Date(value)
      if (isNaN(parsed.getTime())) return "-"
      const normalized = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
      return toFormattedString(normalized)
    }

    const normalized = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
    return toFormattedString(normalized)
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

      {/* Card destacado com próximo pagamento */}
      <Card className="overflow-hidden border border-emerald-300 shadow-sm">
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 px-6 py-5 text-emerald-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <DollarSign className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">Próximo Pagamento</p>
                <p className="text-lg font-semibold">Monitoramento do ciclo de recorrência</p>
              </div>
            </div>
            <span className="text-sm text-emerald-100/90">
              Atualizado automaticamente com base no corte vigente
            </span>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Último corte (dia 20)</p>
              <p className="text-2xl font-semibold text-slate-900">
                  {lastCutoffDate.toLocaleDateString("pt-BR", { 
                    day: "2-digit", 
                    month: "2-digit", 
                  year: "numeric",
                  })}
                </p>
              <p className="text-sm text-muted-foreground">
                Investimentos até essa data entram no lote atual de pagamento.
                </p>
              </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Pagamento agendado</p>
              <p className="text-3xl font-bold text-emerald-700 leading-tight">
                  {nextFifthBusinessDay.toLocaleDateString("pt-BR", { 
                    weekday: "long", 
                    year: "numeric", 
                    month: "long", 
                  day: "numeric",
                  })}
                </p>
              <p className="text-sm text-muted-foreground">
                  {nextFifthBusinessDay.toLocaleDateString("pt-BR", { 
                    day: "2-digit", 
                    month: "2-digit", 
                  year: "numeric",
                  })}
                </p>
              </div>

            <div className="space-y-2 md:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Valor total do ciclo</p>
              <p className="text-4xl font-bold text-emerald-700">{formatCurrency(totalToBePaid)}</p>
              <p className="text-sm text-muted-foreground md:ml-auto md:max-w-[220px]">
                Soma das comissões aprovadas para liberação no próximo quinto dia útil.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <CardTitle className="text-sm font-medium">Assessores (3%)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAdvisorShare)}</div>
            <p className="text-xs text-muted-foreground">Participação mensal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Escritórios (1%)</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOfficeShare)}</div>
            <p className="text-xs text-muted-foreground">Participação mensal</p>
          </CardContent>
        </Card>
      </div>

      <Tooltip.Provider delayDuration={150} skipDelayDuration={0}>
      <Tabs defaultValue="recurrences" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recurrences">Recorrências Ativas</TabsTrigger>
        </TabsList>

        <TabsContent value="recurrences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comissões Recorrentes</CardTitle>
              <CardDescription>
                Monitore todas as comissões recorrentes ativas e suas projeções
                {filterType !== "all" && (
                  <span className="ml-2 text-sm font-medium">
                    ({filteredRecurrences.length} de {recurrences.length} recorrências)
                    {!filterValue ? (
                      <span className="text-blue-600"> - Mostrando todos os {filterType === "investors" ? "investidores" : filterType === "advisors" ? "assessores" : "escritórios"}</span>
                    ) : (
                      <span className="text-green-600"> - Investimentos do {filterType === "investors" ? "investidor" : filterType === "advisors" ? "assessor" : "escritório"} selecionado</span>
                    )}
                  </span>
                )}
              </CardDescription>
              
              <div className="flex flex-col gap-4 mt-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de filtro" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Ver Todos</SelectItem>
                        <SelectItem value="investors">Ver Por Investidores</SelectItem>
                        <SelectItem value="advisors">Ver Por Assessores</SelectItem>
                        <SelectItem value="offices">Ver Por Escritórios</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {filterType !== "all" && (
                    <div className="flex-1">
                      <Select value={filterValue} onValueChange={setFilterValue}>
                        <SelectTrigger>
                          <SelectValue placeholder={`Selecione ${filterType === "investors" ? "investidor" : filterType === "advisors" ? "assessor" : "escritório"}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {filterType === "investors" && filterOptions.investors.map(option => (
                            <SelectItem key={option.id} value={option.name}>{option.name}</SelectItem>
                          ))}
                          {filterType === "advisors" && filterOptions.advisors.map(option => (
                            <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                          ))}
                          {filterType === "offices" && filterOptions.offices.map(option => (
                            <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {filteredRecurrences.length > 0 && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportToExcel("recurrences")}>
                      <Download className="w-4 h-4 mr-2" />
                      Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportToPDF("recurrences")}>
                      <FileText className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {filteredRecurrences.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {recurrences.length === 0 
                      ? "Nenhuma recorrência ativa encontrada."
                      : "Nenhuma recorrência encontrada com o filtro aplicado."
                    }
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {recurrences.length === 0 
                      ? "As recorrências aparecerão aqui quando houver investimentos ativos na plataforma."
                      : "Tente alterar o filtro para ver mais resultados."
                    }
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {shouldShowAggregatedData() ? (
                        filterType === "investors" ? (
                          <>
                            <TableHead>Investidor</TableHead>
                            <TableHead>Total Investido</TableHead>
                            <TableHead>Comissão Assessor (3%)</TableHead>
                            <TableHead>Comissão Escritório (1%)</TableHead>
                            <TableHead>Comissão Investidor</TableHead>
                            <TableHead>Investimentos</TableHead>
                            <TableHead>Ações</TableHead>
                          </>
                        ) : filterType === "advisors" ? (
                          <>
                            <TableHead>Assessor</TableHead>
                            <TableHead>Total Investido</TableHead>
                            <TableHead>Comissão Mensal (3%)</TableHead>
                            <TableHead>Investidores</TableHead>
                            <TableHead>Investimentos</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ações</TableHead>
                          </>
                        ) : filterType === "offices" ? (
                          <>
                            <TableHead>Escritório</TableHead>
                            <TableHead>Total Investido</TableHead>
                            <TableHead>Comissão Mensal (1%)</TableHead>
                            <TableHead>Assessores</TableHead>
                            <TableHead>Investimentos</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Ações</TableHead>
                          </>
                        ) : null
                      ) : (
                        <>
                          <TableHead>Investidor</TableHead>
                          <TableHead>Assessor/Escritório</TableHead>
                          <TableHead>Investimento</TableHead>
                          <TableHead>
                            <span className="font-medium">
                              A pagar em {nextFifthBusinessDay.toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </span>
                          </TableHead>
                          <TableHead>Dias contabilizados</TableHead>
                          <TableHead>Ações</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shouldShowAggregatedData() ? (
                      filterType === "investors" ? (
                        Array.from(totalsByCategory.investors.values()).map((investor, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{investor.name}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{formatCurrency(investor.totalAmount)}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-emerald-600">{formatCurrency(investor.advisorCommission)}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-orange-600">{formatCurrency(investor.officeCommission)}</p>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-blue-600">{formatCurrency(investor.investorCommission)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(() => {
                                    const commitmentPeriod = 12
                                    const days = commitmentPeriod * 30
                                    let liquidity = "mensal"
                                    if (commitmentPeriod >= 24) liquidity = "anual"
                                    else if (commitmentPeriod >= 12) liquidity = "semestral"
                                    
                                    let rate = 0
                                    if (days <= 90) rate = 1.8
                                    else if (days <= 180) rate = liquidity === "mensal" ? 1.9 : 2.0
                                    else if (days <= 360) {
                                      if (liquidity === "mensal") rate = 2.1
                                      else if (liquidity === "semestral") rate = 2.2
                                      else if (liquidity === "anual") rate = 2.5
                                    } else if (days <= 720) {
                                      if (liquidity === "mensal") rate = 2.3
                                      else if (liquidity === "semestral") rate = 2.5
                                      else if (liquidity === "anual") rate = 2.7
                                      else if (liquidity === "bienal") rate = 3.0
                                    } else if (days <= 1080) {
                                      if (liquidity === "mensal") rate = 2.4
                                      else if (liquidity === "semestral") rate = 2.6
                                      else if (liquidity === "bienal") rate = 3.2
                                      else if (liquidity === "trienal") rate = 3.5
                                    } else rate = 3.5
                                    
                                    return `${rate}% a.m.`
                                  })()}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {filteredRecurrences.filter(r => r.investorName === investor.name).length} investimento(s)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setFilterType("investors")
                                setFilterValue(investor.name)
                              }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filterType === "advisors" ? (
                        Array.from(totalsByCategory.advisors.values()).map((advisor, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{advisor.name}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{formatCurrency(advisor.totalAmount)}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-emerald-600">{formatCurrency(advisor.totalCommission)}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {filteredRecurrences.filter(r => r.advisorId === advisor.id).length} investidor(es)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {advisor.count} investimento(s)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default">Ativo</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setFilterType("advisors")
                                setFilterValue(advisor.id)
                              }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : filterType === "offices" ? (
                        Array.from(totalsByCategory.offices.values()).map((office, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{office.name}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{formatCurrency(office.totalAmount)}</p>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-orange-600">{formatCurrency(office.totalCommission)}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {filteredRecurrences.filter(r => r.officeId === office.id).length} assessor(es)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {office.count} investimento(s)
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default">Ativo</Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => {
                                setFilterType("offices")
                                setFilterValue(office.id)
                              }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : null
                    ) : (
                      filteredRecurrences.map((recurrence) => {
                        const nextDetails = recurrence.nextPaymentDetails
                        const officeAmount = nextDetails?.officeAmount ?? recurrence.officeShare
                        const advisorAmount = nextDetails?.advisorAmount ?? recurrence.advisorShare
                        const investorAmount = nextDetails?.investorAmount ?? calculateInvestorCommission(recurrence)
                        const investorRateValue = nextDetails?.investorRate ?? calculateInvestorRate(recurrence)
                        const depositDateDisplay = formatDateLabel(recurrence.paymentDate)
                        const cutoffDateDisplay = formatDateLabel(nextDetails?.cutoffDate ?? null)

                        return (
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
                              Depósito: {recurrence.paymentDate ? (() => {
                                // Formatar data preservando o formato do banco (YYYY-MM-DD) sem problemas de timezone
                                const dateStr = recurrence.paymentDate
                                if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                                  const [datePart] = dateStr.split('T')
                                  const [year, month, day] = datePart.split('-').map(Number)
                                  // Usar UTC para evitar problemas de timezone
                                  const date = new Date(Date.UTC(year, month - 1, day))
                                  // Formatar usando UTC também
                                  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
                                }
                                // Fallback: tentar parsear como Date e usar UTC
                                const date = new Date(dateStr)
                                if (!isNaN(date.getTime())) {
                                  const year = date.getUTCFullYear()
                                  const month = date.getUTCMonth() + 1
                                  const day = date.getUTCDate()
                                  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
                                }
                                return "N/A"
                              })() : "N/A"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              <p className="font-medium text-orange-600">
                                <span className="inline-flex items-center gap-2">
                                  Escritório (1%): {formatCurrency(officeAmount)}
                                  <Tooltip.Root>
                                    <Tooltip.Trigger asChild>
                                      <button
                                        type="button"
                                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-600 transition hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-help"
                                        aria-label="Como essa comissão é calculada"
                                      >
                                        <Info className="h-3.5 w-3.5" />
                                      </button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content side="top" align="start" className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-xl" sideOffset={8}>
                                      <p className="font-semibold text-orange-300">Escritório (1%)</p>
                                      <p className="mt-1">Fórmula:</p>
                                      <p className="font-mono text-[11px]">valor × (0,01 / 30) × dias contabilizados</p>
                                      <p className="mt-1">Valor do investimento: {formatCurrency(recurrence.investmentAmount)}</p>
                                      {recurrence.nextPaymentDetails?.daysCounted != null && (
                                        <p>Dias contabilizados: {recurrence.nextPaymentDetails.daysCounted}</p>
                                      )}
                                      <p className="mt-1 font-semibold">Resultado: {formatCurrency(officeAmount)}</p>
                                      <Tooltip.Arrow className="fill-slate-900" />
                                    </Tooltip.Content>
                                  </Tooltip.Root>
                                </span>
                                {recurrence.nextPaymentDetails?.officePercentage != null && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({recurrence.nextPaymentDetails.officePercentage.toFixed(2)}% do investimento)
                                  </span>
                                )}
                              </p>
                              <p className="font-medium text-emerald-600">
                                <span className="inline-flex items-center gap-2">
                                  Assessor (3%): {formatCurrency(advisorAmount)}
                                  <Tooltip.Root>
                                    <Tooltip.Trigger asChild>
                                      <button
                                        type="button"
                                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition hover:bg-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-help"
                                        aria-label="Como essa comissão é calculada"
                                      >
                                        <Info className="h-3.5 w-3.5" />
                                      </button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content side="top" align="start" className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-xl" sideOffset={8}>
                                      <p className="font-semibold text-emerald-300">Assessor (3%)</p>
                                      <p className="mt-1">Fórmula:</p>
                                      <p className="font-mono text-[11px]">valor × (0,03 / 30) × dias contabilizados</p>
                                      <p className="mt-1">Valor do investimento: {formatCurrency(recurrence.investmentAmount)}</p>
                                      {recurrence.nextPaymentDetails?.daysCounted != null && (
                                        <p>Dias contabilizados: {recurrence.nextPaymentDetails.daysCounted}</p>
                                      )}
                                      <p className="mt-1 font-semibold">Resultado: {formatCurrency(advisorAmount)}</p>
                                      <Tooltip.Arrow className="fill-slate-900" />
                                    </Tooltip.Content>
                                  </Tooltip.Root>
                                </span>
                                {recurrence.nextPaymentDetails?.advisorPercentage != null && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({recurrence.nextPaymentDetails.advisorPercentage.toFixed(2)}% do investimento)
                                  </span>
                                )}
                              </p>
                              <p className="font-medium text-blue-600">
                                <span className="inline-flex items-center gap-2">
                                  Investidor ({investorRateValue.toFixed(1)}%): {formatCurrency(investorAmount)}
                                  <Tooltip.Root>
                                    <Tooltip.Trigger asChild>
                                      <button
                                        type="button"
                                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-help"
                                        aria-label="Como essa comissão é calculada"
                                      >
                                        <Info className="h-3.5 w-3.5" />
                                      </button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content side="top" align="start" className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-xl" sideOffset={8}>
                                      <p className="font-semibold text-blue-300">Investidor ({investorRateValue.toFixed(1)}%)</p>
                                      <p className="mt-1">Fórmula:</p>
                                      <p className="font-mono text-[11px]">valor × ({investorRateValue.toFixed(3)} / 30) × dias contabilizados</p>
                                      <p className="mt-1">Valor do investimento: {formatCurrency(recurrence.investmentAmount)}</p>
                                      {recurrence.nextPaymentDetails?.daysCounted != null && (
                                        <p>Dias contabilizados: {recurrence.nextPaymentDetails.daysCounted}</p>
                                      )}
                                      <p className="mt-1 font-semibold">Resultado: {formatCurrency(investorAmount)}</p>
                                      <Tooltip.Arrow className="fill-slate-900" />
                                    </Tooltip.Content>
                                  </Tooltip.Root>
                                </span>
                                {recurrence.nextPaymentDetails?.investorPercentage != null && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    ({recurrence.nextPaymentDetails.investorPercentage.toFixed(2)}% do investimento)
                                  </span>
                                )}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {recurrence.nextPaymentDetails?.daysCounted != null ? (
                              <Tooltip.Root delayDuration={150}>
                                <Tooltip.Trigger asChild>
                                  <button
                                    type="button"
                                    className="flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-700 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                    aria-label="Detalhes dos dias contabilizados"
                                  >
                                    <span>{recurrence.nextPaymentDetails.daysCounted} dia(s)</span>
                                    <Info className="h-3.5 w-3.5 text-slate-500" />
                                  </button>
                                </Tooltip.Trigger>
                                <Tooltip.Content side="top" align="start" className="max-w-sm rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-xl" sideOffset={8}>
                                  <p className="font-semibold text-white">Dias contabilizados</p>
                                  <p className="mt-1 whitespace-pre-line">
                                    Intervalo entre a data do depósito e a última data de fechamento (dia 20)
                                    considerada para este pagamento proporcional.
                                  </p>
                                  <p className="mt-2">Depósito: {depositDateDisplay}</p>
                                  <p>Última data de fechamento: {cutoffDateDisplay}</p>
                                  <p className="mt-1">Total de dias: {recurrence.nextPaymentDetails.daysCounted}</p>
                                  <Tooltip.Arrow className="fill-slate-900" />
                                </Tooltip.Content>
                              </Tooltip.Root>
                            ) : (
                              <div className="text-sm text-muted-foreground">-</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleViewProjection(recurrence)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </Tooltip.Provider>

      <Dialog open={isProjectionOpen} onOpenChange={setIsProjectionOpen}>
        <DialogContent className="!max-w-[95vw] !w-[95vw] max-h-[95vh] sm:!max-w-[95vw]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>Projeção de Recorrência - {selectedRecurrence?.investorName}</DialogTitle>
                <DialogDescription>Projeção detalhada dos próximos 12 meses de comissões</DialogDescription>
              </div>
              {projections.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportToExcel("projection")}>
                    <Download className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportToPDF("projection")}>
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedRecurrence && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Investimento</p>
                  <p className="font-semibold">{formatCurrency(selectedRecurrence.investmentAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data do Depósito</p>
                  <p className="font-semibold">{selectedRecurrence.paymentDate ? (() => {
                    // Formatar data preservando o formato do banco (YYYY-MM-DD) sem problemas de timezone
                    const dateStr = selectedRecurrence.paymentDate
                    if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                      const [datePart] = dateStr.split('T')
                      const [year, month, day] = datePart.split('-').map(Number)
                      // Usar UTC para evitar problemas de timezone
                      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
                    }
                    // Fallback: tentar parsear como Date e usar UTC
                    const date = new Date(dateStr)
                    if (!isNaN(date.getTime())) {
                      const year = date.getUTCFullYear()
                      const month = date.getUTCMonth() + 1
                      const day = date.getUTCDate()
                      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
                    }
                    return "N/A"
                  })() : "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Período</p>
                  <p className="font-semibold">{selectedRecurrence.commitmentPeriod} meses</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Liquidez</p>
                  <p className="font-semibold">{selectedRecurrence.profitabilityLiquidity || "Mensal"}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <Table className="w-full">
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead className="w-16 text-center">Mês</TableHead>
                        <TableHead className="w-32 text-center">Data</TableHead>
                        <TableHead className="w-32 text-center">Valor Total</TableHead>
                        <TableHead className="w-32 text-center">Investidor ({investorRate || 2.0}%)</TableHead>
                        <TableHead className="w-32 text-center">Assessor (3%)</TableHead>
                        <TableHead className="w-32 text-center">Escritório (1%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projections.map((projection) => (
                        <TableRow key={projection.month}>
                          <TableCell className="font-medium text-center">{projection.month}</TableCell>
                          <TableCell className="text-center text-sm">
                            {new Date(projection.date).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-purple-600 font-medium text-center">
                            {formatCurrency(projection.totalValue)}
                          </TableCell>
                          <TableCell className="text-blue-600 font-medium text-center">
                            {formatCurrency(projection.investorCommission)}
                          </TableCell>
                          <TableCell className="text-emerald-600 font-medium text-center">
                            {formatCurrency(projection.advisorCommission)}
                          </TableCell>
                          <TableCell className="text-orange-600 font-medium text-center">
                            {formatCurrency(projection.officeCommission)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

