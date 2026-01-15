"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Users, DollarSign, TrendingUp, Target, BarChart3, Shield, AlertCircle, Filter, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react"
import { PromotionManager } from "../promotion-manager"
import { BonificationManager } from "../bonification-manager"
import { UserManager } from "../user-manager"
import { ReportsManager } from "../reports-manager"
import { AdminSettings } from "../admin-settings"
import { HierarchyManager } from "../hierarchy-manager"
import { RecurrenceCalculator } from "../recurrence-calculator"
import { NotificationSystem } from "../notification-system"
import { ApproveInvestmentModal } from "../approve-investment-modal"
import { AdminApproveInvestmentModal } from "../admin-approve-investment-modal"
import { InvestmentsManager } from "../investments-manager"
import AkintecManager from "../akintec-manager"
import { AdminCommissionsDetail } from "../admin-commissions-detail"
import { useAdminDashboard } from "./useAdminDashboard"
import { AdminContractsManager } from "../admin-contracts-manager"

export function AdminDashboard() {
  const {
    user,
    stats,
    recentActivities,
    loading,
    activityFilters,
    currentPage,
    totalPages,
    totalActivities,
    approveModalOpen,
    adminApproveModalOpen,
    selectedInvestment,
    handleFilterChange,
    handlePageChange,
    clearFilters,
    handleActivityAction,
    handleApprovalSuccess,
    closeApprovalModal,
    formatCurrency,
  } = useAdminDashboard()

  if (!user || user.user_type !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-8">
            <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acesso Negado</h3>
            <p className="text-muted-foreground">Você não tem permissão para acessar esta área.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p>Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Painel Administrativo</h1>
            <p className="text-muted-foreground">Bem-vindo, {user.name}</p>
          </div>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Administrador
          </Badge>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalInvestors} investidores, {stats.totalDistributors} distribuidores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalInvested)}</div>
            <p className="text-xs text-muted-foreground">Valor total em investimentos ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">Taxa de administração</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendências</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Transações para aprovar</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 min-w-max">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Visão Geral</TabsTrigger>
            <TabsTrigger value="investments" className="text-xs sm:text-sm">Investimentos</TabsTrigger>
            <TabsTrigger value="contracts" className="text-xs sm:text-sm">Contratos</TabsTrigger>
            <TabsTrigger value="akintec" className="text-xs sm:text-sm">Akintec</TabsTrigger>
            <TabsTrigger value="hierarchy" className="text-xs sm:text-sm">Hierarquia</TabsTrigger>
            <TabsTrigger value="recurrence" className="text-xs sm:text-sm">Recorrência</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">Notificações</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm">Configurações</TabsTrigger>
            <TabsTrigger value="promotions" className="text-xs sm:text-sm">Promoções</TabsTrigger>
            <TabsTrigger value="bonifications" className="text-xs sm:text-sm">Bonificações</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm">Usuários</TabsTrigger>
            <TabsTrigger value="commissions" className="text-xs sm:text-sm">Comissões</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs sm:text-sm">Relatórios</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {user.email === "felipe@aethosconsultoria.com.br" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Metas de Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div>
                        <p className="font-medium">Meta R$ 500K</p>
                        <p className="text-sm text-muted-foreground">+1% adicional por 12 meses</p>
                      </div>
                      <Badge variant="secondary">23 atingiram</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium">Meta R$ 1M</p>
                        <p className="text-sm text-muted-foreground">+2% adicional por 12 meses</p>
                      </div>
                      <Badge variant="secondary">8 atingiram</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4 bg-transparent">
                    Configurar Metas
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Atividade Recente
                </CardTitle>
                <Badge variant="outline">
                  {totalActivities} atividades
                </Badge>
              </div>
              
              {/* Filtros */}
              <div className="flex flex-wrap gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <Label className="text-sm font-medium">Filtros:</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Tipo:</Label>
                  <Select 
                    value={activityFilters.type} 
                    onValueChange={(value) => handleFilterChange({ type: value })}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="investment">Investimentos</SelectItem>
                      <SelectItem value="pending_investment">Investimentos Pendentes</SelectItem>
                      <SelectItem value="active_investment_pending_admin">Aguardando Admin</SelectItem>
                      <SelectItem value="withdrawal">Transações</SelectItem>
                      <SelectItem value="user_created">Usuários</SelectItem>
                      <SelectItem value="goal_achieved">Metas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm">De:</Label>
                  <Input
                    type="date"
                    value={activityFilters.dateFrom}
                    onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
                    className="w-40"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm">Até:</Label>
                  <Input
                    type="date"
                    value={activityFilters.dateTo}
                    onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
                    className="w-40"
                  />
                </div>

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearFilters}
                  className="ml-auto"
                >
                  Limpar Filtros
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 ${activity.color} rounded-full mt-2`}></div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{activity.title}</p>
                              {activity.type === "investment" && activity.id.startsWith("active-inv-") && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                  ✓ Ativo
                                </Badge>
                              )}
                              {activity.type === "pending_investment" && (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                                  ⏳ Pendente
                                </Badge>
                              )}
                              {activity.type === "active_investment_pending_admin" && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                  ⚠️ Aguardando Admin
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
                            
                            {/* Informações adicionais para investimentos pendentes */}
                            {activity.type === "pending_investment" && activity.relatedData && (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs bg-orange-50 p-3 rounded border border-orange-200">
                                <div>
                                  <span className="text-muted-foreground">Valor:</span>
                                  <span className="ml-1 font-medium">
                                    {formatCurrency(activity.relatedData.amount || 0)}
                                  </span>
                                </div>
                                {activity.relatedData.quotaType && (
                                  <div>
                                    <span className="text-muted-foreground">Tipo:</span>
                                    <span className="ml-1 font-medium capitalize">{activity.relatedData.quotaType}</span>
                                  </div>
                                )}
                                {activity.relatedData.commitmentPeriod && (
                                  <div>
                                    <span className="text-muted-foreground">Período:</span>
                                    <span className="ml-1 font-medium">{activity.relatedData.commitmentPeriod} meses</span>
                                  </div>
                                )}
                                {activity.relatedData.monthlyReturnRate && (
                                  <div>
                                    <span className="text-muted-foreground">Taxa:</span>
                                    <span className="ml-1 font-medium text-emerald-600">
                                      {(activity.relatedData.monthlyReturnRate * 100).toFixed(2)}% a.m.
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Informações adicionais para investimentos ativos que aguardam aprovação do admin */}
                            {activity.type === "active_investment_pending_admin" && activity.relatedData && (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs bg-yellow-50 p-3 rounded border border-yellow-200">
                                <div>
                                  <span className="text-muted-foreground">Status:</span>
                                  <span className="ml-1 font-medium text-yellow-700">⚠️ Aguardando Admin</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Valor:</span>
                                  <span className="ml-1 font-medium">
                                    {formatCurrency(activity.relatedData.amount || 0)}
                                  </span>
                                </div>
                                {activity.relatedData.quotaType && (
                                  <div>
                                    <span className="text-muted-foreground">Tipo:</span>
                                    <span className="ml-1 font-medium capitalize">{activity.relatedData.quotaType}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-muted-foreground">Aprovado por:</span>
                                  <span className="ml-1 font-medium text-yellow-600">Assessor</span>
                                </div>
                              </div>
                            )}

                            {/* Informações adicionais para investimentos ativos */}
                            {activity.type === "investment" && activity.id.startsWith("active-inv-") && (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs bg-green-50 p-3 rounded border border-green-200">
                                <div>
                                  <span className="text-muted-foreground">Status:</span>
                                  <span className="ml-1 font-medium text-green-700">✓ Ativo</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Valor:</span>
                                  <span className="ml-1 font-medium">
                                    {formatCurrency(activity.relatedData?.amount || 0)}
                                  </span>
                                </div>
                                {activity.relatedData?.quotaType && (
                                  <div>
                                    <span className="text-muted-foreground">Tipo:</span>
                                    <span className="ml-1 font-medium capitalize">{activity.relatedData.quotaType}</span>
                                  </div>
                                )}
                                <div>
                                  <span className="text-muted-foreground">Ação:</span>
                                  <span className="ml-1 font-medium text-green-600">Processado</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {activity.timestamp}
                          </span>
                          
                          {/* Botões de ação para investimentos pendentes */}
                          {activity.actions && activity.type === "pending_investment" && (
                            <div className="flex gap-1">
                              {activity.actions.approve && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-600 border-emerald-600 bg-transparent hover:bg-emerald-50"
                                  onClick={() => handleActivityAction(activity.id, "approve")}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Aprovar
                                </Button>
                              )}
                              {activity.actions.reject && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-600 bg-transparent hover:bg-red-50"
                                  onClick={() => handleActivityAction(activity.id, "reject")}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Rejeitar
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Botões de ação para investimentos ativos que aguardam aprovação do admin */}
                          {activity.actions && activity.type === "active_investment_pending_admin" && (
                            <div className="flex gap-1">
                              {activity.actions.approve && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-600 border-emerald-600 bg-transparent hover:bg-emerald-50"
                                  onClick={() => handleActivityAction(activity.id, "approve")}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Aprovar Admin
                                </Button>
                              )}
                              {activity.actions.reject && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-600 bg-transparent hover:bg-red-50"
                                  onClick={() => handleActivityAction(activity.id, "reject")}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Rejeitar
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Controles de Paginação */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages} ({totalActivities} atividades)
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Anterior
                        </Button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                            if (pageNum > totalPages) return null
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Próxima
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {activityFilters.type !== "all" || activityFilters.dateFrom || activityFilters.dateTo
                      ? "Nenhuma atividade encontrada com os filtros aplicados"
                      : "Nenhuma atividade recente encontrada"
                    }
                  </p>
                  {(activityFilters.type !== "all" || activityFilters.dateFrom || activityFilters.dateTo) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearFilters}
                      className="mt-2"
                    >
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="investments">
          <InvestmentsManager />
        </TabsContent>

        <TabsContent value="contracts">
          <AdminContractsManager />
        </TabsContent>

        <TabsContent value="akintec">
          <AkintecManager />
        </TabsContent>

        <TabsContent value="hierarchy">
          <HierarchyManager />
        </TabsContent>

        <TabsContent value="recurrence">
          <RecurrenceCalculator />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSystem />
        </TabsContent>

        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>

        <TabsContent value="promotions">
          <PromotionManager />
        </TabsContent>

        <TabsContent value="bonifications">
          <BonificationManager />
        </TabsContent>

        <TabsContent value="users">
          <UserManager />
        </TabsContent>

        <TabsContent value="commissions">
          <AdminCommissionsDetail />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsManager />
        </TabsContent>
      </Tabs>

      {/* Modal de aprovação com upload de comprovante (para investimentos pendentes) */}
      {selectedInvestment && (
        <ApproveInvestmentModal
          isOpen={approveModalOpen}
          onClose={closeApprovalModal}
          investmentId={selectedInvestment.id}
          investmentAmount={selectedInvestment.amount}
          investorName={selectedInvestment.investorName}
          onSuccess={handleApprovalSuccess}
        />
      )}

      {/* Modal de aprovação pelo admin (mostra comprovante e data existentes) */}
      {selectedInvestment && (
        <AdminApproveInvestmentModal
          isOpen={adminApproveModalOpen}
          onClose={closeApprovalModal}
          investmentId={selectedInvestment.id}
          investmentAmount={selectedInvestment.amount}
          investorName={selectedInvestment.investorName}
          onSuccess={handleApprovalSuccess}
        />
      )}
    </div>
  )
}


