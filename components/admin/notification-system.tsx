"use client"

import { CardDescription } from "@/components/ui/card"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Settings,
  Filter,
  Eye,
  Trash2,
  Plus,
} from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface Notification {
  id: string
  type: "withdrawal_request" | "campaign_expiry" | "performance_goal" | "recurrence_risk" | "system_alert"
  title: string
  message: string
  priority: "low" | "medium" | "high" | "critical"
  recipients: string[]
  recipientType: "admin" | "office" | "advisor" | "investor" | "all"
  status: "pending" | "sent" | "read" | "dismissed"
  createdAt: string
  scheduledFor?: string
  relatedData?: {
    investorName?: string
    advisorName?: string
    officeName?: string
    amount?: number
    campaignName?: string
    impactAmount?: number
  }
  actions?: {
    approve?: boolean
    reject?: boolean
    acknowledge?: boolean
  }
}

interface AlertRule {
  id: string
  name: string
  description: string
  trigger: "withdrawal_request" | "campaign_expiry" | "performance_achieved" | "recurrence_at_risk" | "low_activity"
  conditions: {
    amount?: number
    daysBeforeExpiry?: number
    riskThreshold?: number
    inactivityDays?: number
  }
  recipients: string[]
  isActive: boolean
  lastTriggered?: string
  triggerCount: number
}

interface NotificationTemplate {
  id: string
  name: string
  type: string
  subject: string
  body: string
  variables: string[]
  isActive: boolean
}

export function NotificationSystem() {
  const { toast } = useToast()

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "withdrawal_request",
      title: "Solicitação de Resgate - João Silva",
      message:
        "Investidor João Silva solicitou resgate total de R$ 100.000. Isso afetará a comissão recorrente do assessor Carlos Santos.",
      priority: "high",
      recipients: ["carlos@alphainvest.com", "admin@alphainvest.com"],
      recipientType: "office",
      status: "pending",
      createdAt: "2025-01-27T10:30:00Z",
      relatedData: {
        investorName: "João Silva",
        advisorName: "Carlos Santos",
        officeName: "Alpha Investimentos",
        amount: 100000,
        impactAmount: -3500,
      },
      actions: { approve: true, reject: true },
    },
    {
      id: "2",
      type: "campaign_expiry",
      title: "Campanha Expirando em 3 dias",
      message: "A campanha 'Promoção Ano Novo' expira em 3 dias. Isso afetará 15 recorrências ativas.",
      priority: "medium",
      recipients: ["admin@agroderi.com"],
      recipientType: "admin",
      status: "sent",
      createdAt: "2025-01-27T08:00:00Z",
      scheduledFor: "2025-01-30T23:59:59Z",
      relatedData: {
        campaignName: "Promoção Ano Novo",
        impactAmount: -18900,
      },
      actions: { acknowledge: true },
    },
    {
      id: "3",
      type: "performance_goal",
      title: "Meta de Performance Atingida!",
      message: "Parabéns! O assessor Ana Santos atingiu a meta de R$ 500K em captação.",
      priority: "low",
      recipients: ["ana@alphainvest.com", "admin@alphainvest.com"],
      recipientType: "advisor",
      status: "read",
      createdAt: "2025-01-26T16:45:00Z",
      relatedData: {
        advisorName: "Ana Santos",
        amount: 500000,
      },
      actions: { acknowledge: true },
    },
  ])

  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: "1",
      name: "Resgate Alto Valor",
      description: "Alerta quando resgate for superior a R$ 50.000",
      trigger: "withdrawal_request",
      conditions: { amount: 50000 },
      recipients: ["admin@agroderi.com"],
      isActive: true,
      triggerCount: 5,
      lastTriggered: "2025-01-27T10:30:00Z",
    },
    {
      id: "2",
      name: "Campanha Expirando",
      description: "Alerta 7 dias antes da campanha expirar",
      trigger: "campaign_expiry",
      conditions: { daysBeforeExpiry: 7 },
      recipients: ["admin@agroderi.com"],
      isActive: true,
      triggerCount: 12,
      lastTriggered: "2025-01-25T08:00:00Z",
    },
    {
      id: "3",
      name: "Recorrência em Risco",
      description: "Alerta quando recorrência tem alta probabilidade de cancelamento",
      trigger: "recurrence_at_risk",
      conditions: { riskThreshold: 70 },
      recipients: ["admin@agroderi.com"],
      isActive: true,
      triggerCount: 3,
      lastTriggered: "2025-01-26T14:20:00Z",
    },
  ])

  const [templates, setTemplates] = useState<NotificationTemplate[]>([
    {
      id: "1",
      name: "Solicitação de Resgate",
      type: "withdrawal_request",
      subject: "Solicitação de Resgate - {{investorName}}",
      body: "O investidor {{investorName}} solicitou resgate de {{amount}}. Isso impactará sua comissão recorrente em {{impactAmount}} mensais.",
      variables: ["investorName", "amount", "impactAmount", "advisorName"],
      isActive: true,
    },
    {
      id: "2",
      name: "Meta Atingida",
      type: "performance_goal",
      subject: "Parabéns! Meta de {{amount}} atingida",
      body: "Você atingiu a meta de captação de {{amount}}! Seu bônus adicional já está ativo.",
      variables: ["amount", "advisorName", "bonusRate"],
      isActive: true,
    },
  ])

  const [selectedFilter, setSelectedFilter] = useState<string>("all")
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)

  // Stats
  const totalNotifications = notifications.length
  const pendingNotifications = notifications.filter((n) => n.status === "pending").length
  const highPriorityNotifications = notifications.filter(
    (n) => n.priority === "high" || n.priority === "critical",
  ).length
  const activeRules = alertRules.filter((r) => r.isActive).length

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "destructive"
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "critical":
        return <XCircle className="w-4 h-4" />
      case "high":
        return <AlertTriangle className="w-4 h-4" />
      case "medium":
        return <Clock className="w-4 h-4" />
      case "low":
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Bell className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "destructive"
      case "sent":
        return "default"
      case "read":
        return "secondary"
      case "dismissed":
        return "outline"
      default:
        return "secondary"
    }
  }

  const handleNotificationAction = (notificationId: string, action: string) => {
    setNotifications(
      notifications.map((n) =>
        n.id === notificationId ? { ...n, status: action === "approve" ? "read" : ("dismissed" as any) } : n,
      ),
    )

    toast({
      title: "Ação realizada!",
      description: `Notificação ${action === "approve" ? "aprovada" : "rejeitada"} com sucesso.`,
    })
  }

  const sendBulkNotification = () => {
    toast({
      title: "Notificações enviadas!",
      description: "Todas as notificações pendentes foram enviadas.",
    })
  }

  const filteredNotifications =
    selectedFilter === "all" ? notifications : notifications.filter((n) => n.status === selectedFilter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Sistema de Notificações e Alertas
          </h2>
          <p className="text-muted-foreground">Gerencie notificações automáticas e alertas da plataforma</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={sendBulkNotification}>
            <Send className="w-4 h-4 mr-2" />
            Enviar Pendentes
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova Notificação
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Notificações</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNotifications}</div>
            <p className="text-xs text-muted-foreground">Últimas 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingNotifications}</div>
            <p className="text-xs text-muted-foreground">Aguardando ação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alta Prioridade</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highPriorityNotifications}</div>
            <p className="text-xs text-muted-foreground">Requer atenção</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regras Ativas</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRules}</div>
            <p className="text-xs text-muted-foreground">Monitorando eventos</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="rules">Regras de Alerta</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">Todas</option>
                <option value="pending">Pendentes</option>
                <option value="sent">Enviadas</option>
                <option value="read">Lidas</option>
                <option value="dismissed">Dispensadas</option>
              </select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Notificações Recentes</CardTitle>
              <CardDescription>Gerencie todas as notificações e alertas do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <div key={notification.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getPriorityIcon(notification.priority)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{notification.title}</h3>
                            <Badge variant={getPriorityColor(notification.priority)}>{notification.priority}</Badge>
                            <Badge variant={getStatusColor(notification.status)}>{notification.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>

                          {notification.relatedData && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs bg-gray-50 p-2 rounded">
                              {notification.relatedData.investorName && (
                                <div>
                                  <span className="text-muted-foreground">Investidor:</span>
                                  <span className="ml-1 font-medium">{notification.relatedData.investorName}</span>
                                </div>
                              )}
                              {notification.relatedData.amount && (
                                <div>
                                  <span className="text-muted-foreground">Valor:</span>
                                  <span className="ml-1 font-medium">
                                    {formatCurrency(notification.relatedData.amount)}
                                  </span>
                                </div>
                              )}
                              {notification.relatedData.impactAmount && (
                                <div>
                                  <span className="text-muted-foreground">Impacto:</span>
                                  <span
                                    className={`ml-1 font-medium ${notification.relatedData.impactAmount < 0 ? "text-red-600" : "text-emerald-600"}`}
                                  >
                                    {formatCurrency(notification.relatedData.impactAmount)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                        {notification.actions && notification.status === "pending" && (
                          <div className="flex gap-1">
                            {notification.actions.approve && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-600 border-emerald-600 bg-transparent"
                                onClick={() => handleNotificationAction(notification.id, "approve")}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Aprovar
                              </Button>
                            )}
                            {notification.actions.reject && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-600 bg-transparent"
                                onClick={() => handleNotificationAction(notification.id, "reject")}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Rejeitar
                              </Button>
                            )}
                          </div>
                        )}
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nova Regra de Alerta</DialogTitle>
                  <DialogDescription>Configure quando e como os alertas devem ser enviados</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ruleName">Nome da Regra</Label>
                      <Input id="ruleName" placeholder="Ex: Resgate Alto Valor" />
                    </div>
                    <div>
                      <Label htmlFor="ruleTrigger">Gatilho</Label>
                      <select id="ruleTrigger" className="w-full mt-1 px-3 py-2 border rounded-lg">
                        <option value="withdrawal_request">Solicitação de Resgate</option>
                        <option value="campaign_expiry">Expiração de Campanha</option>
                        <option value="performance_achieved">Meta Atingida</option>
                        <option value="recurrence_at_risk">Recorrência em Risco</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="ruleDescription">Descrição</Label>
                    <Textarea id="ruleDescription" placeholder="Descreva quando esta regra deve ser ativada" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ruleAmount">Valor Mínimo (R$)</Label>
                      <Input id="ruleAmount" type="number" placeholder="50000" />
                    </div>
                    <div>
                      <Label htmlFor="ruleDays">Dias de Antecedência</Label>
                      <Input id="ruleDays" type="number" placeholder="7" />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => setIsRuleDialogOpen(false)}>Criar Regra</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Regras de Alerta Configuradas</CardTitle>
              <CardDescription>Gerencie as regras automáticas de notificação</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Gatilho</TableHead>
                    <TableHead>Condições</TableHead>
                    <TableHead>Ativações</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.trigger}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {rule.conditions.amount && <div>Valor: {formatCurrency(rule.conditions.amount)}</div>}
                        {rule.conditions.daysBeforeExpiry && <div>Dias: {rule.conditions.daysBeforeExpiry}</div>}
                        {rule.conditions.riskThreshold && <div>Risco: {rule.conditions.riskThreshold}%</div>}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rule.triggerCount}</p>
                          {rule.lastTriggered && (
                            <p className="text-xs text-muted-foreground">
                              Último: {new Date(rule.lastTriggered).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch checked={rule.isActive} />
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Novo Template de Notificação</DialogTitle>
                  <DialogDescription>Crie templates reutilizáveis para notificações</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="templateName">Nome do Template</Label>
                      <Input id="templateName" placeholder="Ex: Solicitação de Resgate" />
                    </div>
                    <div>
                      <Label htmlFor="templateType">Tipo</Label>
                      <select id="templateType" className="w-full mt-1 px-3 py-2 border rounded-lg">
                        <option value="withdrawal_request">Solicitação de Resgate</option>
                        <option value="performance_goal">Meta de Performance</option>
                        <option value="campaign_expiry">Expiração de Campanha</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="templateSubject">Assunto</Label>
                    <Input id="templateSubject" placeholder="Use {{variáveis}} para personalização" />
                  </div>
                  <div>
                    <Label htmlFor="templateBody">Corpo da Mensagem</Label>
                    <Textarea
                      id="templateBody"
                      rows={4}
                      placeholder="Use {{variáveis}} como {{investorName}}, {{amount}}, etc."
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => setIsTemplateDialogOpen(false)}>Criar Template</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Templates de Notificação</CardTitle>
              <CardDescription>Gerencie templates reutilizáveis para diferentes tipos de notificação</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        <Badge variant="outline">{template.type}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={template.isActive} />
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Assunto:</span>
                        <span className="ml-2">{template.subject}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Corpo:</span>
                        <p className="ml-2 text-muted-foreground">{template.body}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Variáveis:</span>
                        <div className="ml-2 flex flex-wrap gap-1 mt-1">
                          {template.variables.map((variable) => (
                            <Badge key={variable} variant="secondary" className="text-xs">
                              {`{{${variable}}}`}
                            </Badge>
                          ))}
                        </div>
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
                <CardTitle>Tipos de Notificação</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {["withdrawal_request", "campaign_expiry", "performance_goal", "recurrence_risk"].map((type) => {
                    const count = notifications.filter((n) => n.type === type).length
                    const percentage = notifications.length > 0 ? (count / notifications.length) * 100 : 0

                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{type}</Badge>
                          <span className="text-sm">{count} notificações</span>
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
                <CardTitle>Taxa de Resposta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Notificações Enviadas</span>
                    <span className="font-medium">{notifications.filter((n) => n.status !== "pending").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lidas</span>
                    <span className="font-medium">{notifications.filter((n) => n.status === "read").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Com Ação</span>
                    <span className="font-medium">
                      {notifications.filter((n) => n.status === "read" && n.actions).length}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Taxa de Engajamento</span>
                      <span className="font-bold text-emerald-600">
                        {notifications.length > 0
                          ? (
                              (notifications.filter((n) => n.status === "read").length / notifications.length) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
