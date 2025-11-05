"use client"

import { CardDescription } from "@/components/ui/card"
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
} from "lucide-react"
import { useRecurrenceCalculator } from "./useRecurrenceCalculator"

export function RecurrenceCalculator() {
  const {
    recurrences,
    projections,
    impacts,
    selectedRecurrence,
    isProjectionOpen,
    loading,
    filterType,
    filterValue,
    dateFilter,
    filterOptions,
    investorRate,
    filteredRecurrences,
    totalsByCategory,
    totalActiveRecurrences,
    totalMonthlyCommissions,
    totalAdvisorShare,
    totalOfficeShare,
    atRiskRecurrences,
    setFilterType,
    setFilterValue,
    setDateFilter,
    handleClearDateFilter,
    setIsProjectionOpen,
    recalculateAll,
    handleViewProjection,
    shouldShowAggregatedData,
    getStatusColor,
    getStatusLabel,
    exportToExcel,
    exportToPDF,
    formatCurrency,
  } = useRecurrenceCalculator()

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

      <Tabs defaultValue="recurrences" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recurrences">Recorrências Ativas</TabsTrigger>
          <TabsTrigger value="totals">Totais por Categoria</TabsTrigger>
          <TabsTrigger value="impacts">Impactos Futuros</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
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

                  <div className="flex-1">
                    <Input
                      type="date"
                      placeholder="Valores até"
                      value={dateFilter}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(e.target.value)}
                      className="w-full"
                    />
                  </div>

                  {dateFilter && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleClearDateFilter}
                      className="whitespace-nowrap"
                    >
                      Limpar Data
                    </Button>
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
                          <TableHead>Comissão Mensal</TableHead>
                          <TableHead>Divisão (3%/1%)</TableHead>
                          <TableHead>Status</TableHead>
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
                      filteredRecurrences.map((recurrence) => (
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
                            <p className="font-medium">{formatCurrency(recurrence.monthlyCommission)}</p>
                            <p className="text-sm text-muted-foreground">Pago: {formatCurrency(recurrence.totalPaid)}</p>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm">
                                <span className="text-emerald-600">Assessor: {formatCurrency(recurrence.advisorShare)}</span>
                              </p>
                              <p className="text-sm">
                                <span className="text-orange-600">Escritório: {formatCurrency(recurrence.officeShare)}</span>
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
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="totals" className="space-y-6">
          <div className="flex justify-end mb-4">
            {Array.from(totalsByCategory.investors.values()).length > 0 || 
             Array.from(totalsByCategory.advisors.values()).length > 0 || 
             Array.from(totalsByCategory.offices.values()).length > 0 ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToExcel("totals")}>
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF("totals")}>
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
            ) : null}
          </div>
          <div className={`grid grid-cols-1 ${filterType === "all" ? "lg:grid-cols-3" : "lg:grid-cols-1"} gap-6`}>
            {(filterType === "all" || filterType === "investors") && (
              <Card>
                <CardHeader>
                  <CardTitle>Totais por Investidores</CardTitle>
                  <CardDescription>Valores investidos e comissões por investidor</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from(totalsByCategory.investors.values()).map((investor, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{investor.name}</h3>
                          <Badge variant="outline">{formatCurrency(investor.totalAmount)}</Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Assessor (3%):</span>
                            <span className="font-medium text-emerald-600">
                              {formatCurrency(investor.advisorCommission)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Escritório (1%):</span>
                            <span className="font-medium text-orange-600">
                              {formatCurrency(investor.officeCommission)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Investidor (varia):</span>
                            <span className="font-medium text-blue-600">
                              {formatCurrency(investor.investorCommission)}
                            </span>
                          </div>
                          <div className="border-t pt-1">
                            <div className="flex justify-between font-semibold">
                              <span>Total Comissões:</span>
                              <span>{formatCurrency(investor.totalCommission)}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Baseado no prazo e liquidez do investimento
                          </div>
                        </div>
                      </div>
                    ))}
                    {Array.from(totalsByCategory.investors.values()).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">Nenhum investidor encontrado</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {(filterType === "all" || filterType === "advisors") && (
              <Card>
                <CardHeader>
                  <CardTitle>Totais por Assessores</CardTitle>
                  <CardDescription>Comissões e investimentos por assessor</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from(totalsByCategory.advisors.values()).map((advisor, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{advisor.name}</h3>
                          <Badge variant="outline">{advisor.count} investimento(s)</Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Investido:</span>
                            <span className="font-medium">{formatCurrency(advisor.totalAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Comissão Mensal (3%):</span>
                            <span className="font-medium text-emerald-600">
                              {formatCurrency(advisor.totalCommission)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(advisor.totalAmount)} × 3% = {formatCurrency(advisor.totalCommission)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {Array.from(totalsByCategory.advisors.values()).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">Nenhum assessor encontrado</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {(filterType === "all" || filterType === "offices") && (
              <Card>
                <CardHeader>
                  <CardTitle>Totais por Escritórios</CardTitle>
                  <CardDescription>Comissões e investimentos por escritório</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from(totalsByCategory.offices.values()).map((office, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold">{office.name}</h3>
                          <Badge variant="outline">{office.count} investimento(s)</Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Investido:</span>
                            <span className="font-medium">{formatCurrency(office.totalAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Comissão Mensal (1%):</span>
                            <span className="font-medium text-orange-600">
                              {formatCurrency(office.totalCommission)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(office.totalAmount)} × 1% = {formatCurrency(office.totalCommission)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {Array.from(totalsByCategory.offices.values()).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">Nenhum escritório encontrado</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
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
                    const count = filteredRecurrences.filter((r) => r.status === status).length
                    const percentage = filteredRecurrences.length > 0 ? (count / filteredRecurrences.length) * 100 : 0

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

