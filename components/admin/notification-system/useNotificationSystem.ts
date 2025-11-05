"use client"

import { useState } from "react"
import { useNotifications } from "@/hooks/use-notifications"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"

export interface Notification {
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
    quotaType?: string
    commitmentPeriod?: number
    monthlyReturnRate?: number
  }
  actions?: {
    approve?: boolean
    reject?: boolean
    acknowledge?: boolean
  }
  amount?: number
}

export interface AlertRule {
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

export interface NotificationTemplate {
  id: string
  name: string
  type: string
  subject: string
  body: string
  variables: string[]
  isActive: boolean
}

interface SelectedInvestment {
  id: string
  amount: number
  investorName: string
}

export function useNotificationSystem() {
  const { toast } = useToast()
  const { notifications, loading, error, refetch, processInvestmentAction } = useNotifications()

  const [alertRules, setAlertRules] = useState<AlertRule[]>([])
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [selectedFilter, setSelectedFilter] = useState<string>("all")
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [approveModalOpen, setApproveModalOpen] = useState(false)
  const [selectedInvestment, setSelectedInvestment] = useState<SelectedInvestment | null>(null)

  const totalNotifications = notifications.length
  const pendingNotifications = notifications.filter((n) => n.status === "pending").length
  const highPriorityNotifications = notifications.filter((n) => n.priority === "high").length
  const activeRules = alertRules.filter((r) => r.isActive).length

  const getPriorityColor = (priority: string): "destructive" | "default" | "secondary" => {
    switch (priority) {
      case "critical":
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

  const getPriorityIconName = (priority: string): string => {
    switch (priority) {
      case "critical":
        return "critical"
      case "high":
        return "high"
      case "medium":
        return "medium"
      case "low":
        return "low"
      default:
        return "default"
    }
  }

  const getStatusColor = (status: string): "destructive" | "default" | "secondary" | "outline" => {
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

  const handleNotificationAction = async (notificationId: string, action: string) => {
    if (action === 'approve') {
      const notification = notifications.find(n => n.id === notificationId)
      if (notification) {
        const realId = notificationId.replace(/^investment_/, '')
        setSelectedInvestment({
          id: realId,
          amount: notification.amount || 0,
          investorName: notification.title.split(' - ')[0] || 'Investidor'
        })
        setApproveModalOpen(true)
      }
      return
    }

    try {
      const realId = notificationId.replace(/^investment_/, '')
      await processInvestmentAction(realId, 'reject')

      toast({
        title: "Investimento rejeitado!",
        description: "O investimento foi rejeitado e removido com sucesso.",
      })
    } catch (error) {
      console.error('Error handling notification action:', error)
      toast({
        title: "Erro",
        description: "Erro ao processar a ação. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  const sendBulkNotification = () => {
    toast({
      title: "Notificações enviadas!",
      description: "Todas as notificações pendentes foram enviadas.",
    })
  }

  const handleApprovalSuccess = () => {
    refetch()
  }

  const handleCloseApprovalModal = () => {
    setApproveModalOpen(false)
    setSelectedInvestment(null)
  }

  const filteredNotifications =
    selectedFilter === "all" ? notifications : notifications.filter((n) => n.status === selectedFilter)

  return {
    notifications,
    loading,
    error,
    refetch,
    alertRules,
    templates,
    selectedFilter,
    isRuleDialogOpen,
    isTemplateDialogOpen,
    approveModalOpen,
    selectedInvestment,
    totalNotifications,
    pendingNotifications,
    highPriorityNotifications,
    activeRules,
    filteredNotifications,
    setSelectedFilter,
    setIsRuleDialogOpen,
    setIsTemplateDialogOpen,
    setApproveModalOpen,
    handleNotificationAction,
    sendBulkNotification,
    handleApprovalSuccess,
    handleCloseApprovalModal,
    getPriorityColor,
    getPriorityIconName,
    getStatusColor,
    formatCurrency,
  }
}

