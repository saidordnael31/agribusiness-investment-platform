"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, DollarSign, TrendingUp, Gift, Target, BarChart3, Shield, AlertCircle } from "lucide-react"
import { PromotionManager } from "./promotion-manager"
import { BonificationManager } from "./bonification-manager"
import { UserManager } from "./user-manager"
import { ReportsManager } from "./reports-manager"
import { AdminSettings } from "./admin-settings"
import { HierarchyManager } from "./hierarchy-manager"
import { RecurrenceCalculator } from "./recurrence-calculator"
import { NotificationSystem } from "./notification-system"

interface UserData {
  name: string
  email: string
  type: string
}

interface PlatformStats {
  totalUsers: number
  totalInvestors: number
  totalDistributors: number
  totalInvested: number
  monthlyRevenue: number
  activePromotions: number
  pendingApprovals: number
}

export function AdminDashboard() {
  const [user, setUser] = useState<UserData | null>(null)
  const [stats] = useState<PlatformStats>({
    totalUsers: 1247,
    totalInvestors: 892,
    totalDistributors: 355,
    totalInvested: 15750000,
    monthlyRevenue: 472500,
    activePromotions: 5,
    pendingApprovals: 12,
  })

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }, [])

  if (!user || user.type !== "admin") {
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
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
            <p className="text-xs text-muted-foreground">+12.5% vs mês anterior</p>
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
            <p className="text-xs text-muted-foreground">Resgates para aprovar</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarquia</TabsTrigger>
          <TabsTrigger value="recurrence">Recorrência</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="promotions">Promoções</TabsTrigger>
          <TabsTrigger value="bonifications">Bonificações</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Promoções Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">Promoção Ano Novo</p>
                      <p className="text-sm text-muted-foreground">+0.4% a.m. até 31/03</p>
                    </div>
                    <Badge variant="secondary">Ativa</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                    <div>
                      <p className="font-medium">Indicação Premiada</p>
                      <p className="text-sm text-muted-foreground">+0.2% por indicação</p>
                    </div>
                    <Badge variant="secondary">Ativa</Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4 bg-transparent">
                  Gerenciar Promoções
                </Button>
              </CardContent>
            </Card>

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
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Atividade Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Novo investimento de R$ 250.000</p>
                      <p className="text-sm text-muted-foreground">João Silva - Cota Subordinada</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">2 min atrás</span>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Resgate solicitado - R$ 50.000</p>
                      <p className="text-sm text-muted-foreground">Maria Santos - Aguardando aprovação</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">15 min atrás</span>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Meta atingida por distribuidor</p>
                      <p className="text-sm text-muted-foreground">Carlos Oliveira - R$ 500K captados</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">1 hora atrás</span>
                </div>
              </div>
            </CardContent>
          </Card>
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

        <TabsContent value="reports">
          <ReportsManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
