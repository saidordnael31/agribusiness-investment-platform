import { useState, useEffect, useMemo } from 'react'

interface PendingTransaction {
  id: string
  type: 'deposit' | 'withdrawal'
  amount: number
  status: string
  created_at: string
  profiles: {
    full_name: string
    email: string
    user_type: string
  }
  investments?: {
    quota_type: string
    amount: number
  }
}

interface PendingInvestment {
  id: string
  quota_type: string
  amount: number
  status: string
  created_at: string
  user_id: string
  commitment_period: number
  monthly_return_rate: number
  updated_at: string
  profiles?: {
    full_name: string
    email: string
    user_type: string
  } | null
}

export function useNotifications() {
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([])
  const [pendingInvestments, setPendingInvestments] = useState<PendingInvestment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPendingData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Buscar apenas investimentos pendentes da tabela investments
      const investmentsResponse = await fetch('/api/investments?status=pending')
      const investmentsData = await investmentsResponse.json()

      if (!investmentsData.success) {
        throw new Error(investmentsData.error || 'Erro ao buscar investimentos pendentes')
      }

      setPendingInvestments(investmentsData.data || [])
      // Limpar transações pendentes já que focamos apenas em investments
      setPendingTransactions([])
    } catch (err) {
      console.error('Error fetching pending investments:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const processInvestmentAction = async (investmentId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/investments/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          investmentId,
          action,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar ação')
      }

      // Recarregar os dados após a ação
      await fetchPendingData()

      return data
    } catch (error) {
      console.error('Error processing investment action:', error)
      throw error
    }
  }

  useEffect(() => {
    fetchPendingData()
  }, [])

  const notifications = useMemo(() => {
    const notificationsList: Array<{
      id: string
      type: "withdrawal_request"
      title: string
      message: string
      priority: "high" | "medium"
      recipients: string[]
      recipientType: "admin"
      status: "pending"
      createdAt: string
      relatedData: {
        investorName: string
        amount: number
        quotaType: string
        commitmentPeriod?: number
        monthlyReturnRate?: number
      }
      actions: { approve: boolean; reject: boolean }
    }> = []

    // Notificações de investimentos pendentes da tabela investments
    pendingInvestments.forEach(investment => {
      const investorName = investment.profiles?.full_name || `Investidor ${investment.user_id.slice(0, 8)}`
      const investorEmail = investment.profiles?.email || `admin@agroderi.com`
      
      notificationsList.push({
        id: `investment_${investment.id}`,
        type: "withdrawal_request" as const,
        title: `Investimento Pendente - ${investorName}`,
        message: `Novo investimento de ${investment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${investment.quota_type}) aguardando aprovação.`,
        priority: investment.amount > 50000 ? "high" as const : "medium" as const,
        recipients: [investorEmail],
        recipientType: "admin" as const,
        status: "pending" as const,
        createdAt: investment.created_at,
        relatedData: {
          investorName,
          amount: investment.amount,
          quotaType: investment.quota_type,
          commitmentPeriod: investment.commitment_period,
          monthlyReturnRate: investment.monthly_return_rate,
        },
        actions: { approve: true, reject: true },
      })
    })

    return notificationsList
  }, [pendingInvestments])

  return {
    pendingTransactions,
    pendingInvestments,
    notifications,
    loading,
    error,
    refetch: fetchPendingData,
    processInvestmentAction,
  }
}
