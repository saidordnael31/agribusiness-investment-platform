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
  const [d60Investments, setD60Investments] = useState<any[]>([])
  const [paymentDayInvestments, setPaymentDayInvestments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPendingData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Buscar investimentos pendentes
      const investmentsResponse = await fetch('/api/investments?status=pending')
      const investmentsData = await investmentsResponse.json()

      if (!investmentsData.success) {
        throw new Error(investmentsData.error || 'Erro ao buscar investimentos pendentes')
      }

      setPendingInvestments(investmentsData.data || [])

      // Buscar investimentos que atingiram D+60
      try {
        const d60Response = await fetch('/api/notifications/d60-check')
        const d60Data = await d60Response.json()
        if (d60Data.success) {
          setD60Investments(d60Data.data || [])
        }
      } catch (err) {
        console.error('Error fetching D+60 investments:', err)
      }

      // Buscar investimentos para pagamento no 5º dia útil
      try {
        const paymentResponse = await fetch('/api/notifications/payment-day-check')
        const paymentData = await paymentResponse.json()
        if (paymentData.success && paymentData.isPaymentDay) {
          setPaymentDayInvestments(paymentData.data || [])
        }
      } catch (err) {
        console.error('Error fetching payment day investments:', err)
      }

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
      type: "withdrawal_request" | "d60_reached" | "payment_day"
      title: string
      message: string
      priority: "high" | "medium" | "critical"
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
        investmentId?: string
        d60Date?: string
        daysSinceD60?: number
        paymentDate?: string
      }
      actions?: { approve: boolean; reject: boolean; acknowledge?: boolean }
    }> = []

    // Notificações de investimentos pendentes da tabela investments
    pendingInvestments.forEach(investment => {
      const investorName = investment.profiles?.full_name || `Investidor ${investment.user_id.slice(0, 8)}`
      const investorEmail = investment.profiles?.email || `admin@agrinvest.com`
      
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
          investmentId: investment.id,
        },
        actions: { approve: true, reject: true },
      })
    })

    // Notificações de investimentos que atingiram D+60
    d60Investments.forEach((investment: any) => {
      notificationsList.push({
        id: `d60_${investment.id}`,
        type: "d60_reached" as const,
        title: `D+60 Atingido - ${investment.investor_name}`,
        message: `Investimento de ${investment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} atingiu D+60 em ${new Date(investment.d60_date).toLocaleDateString('pt-BR')}. Investidor pode começar a receber comissões.`,
        priority: "high" as const,
        recipients: ["admin@agrinvest.com"],
        recipientType: "admin" as const,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
        relatedData: {
          investorName: investment.investor_name,
          amount: investment.amount,
          quotaType: investment.quota_type,
          commitmentPeriod: investment.commitment_period,
          monthlyReturnRate: investment.monthly_return_rate,
          investmentId: investment.id,
          d60Date: investment.d60_date,
          daysSinceD60: investment.days_since_d60,
        },
        actions: { acknowledge: true },
      })
    })

    // Notificações de pagamento no 5º dia útil
    if (paymentDayInvestments.length > 0) {
      const totalAmount = paymentDayInvestments.reduce((sum, inv) => sum + inv.amount, 0)
      const investorsCount = paymentDayInvestments.length

      notificationsList.push({
        id: `payment_day_${new Date().toISOString().split('T')[0]}`,
        type: "payment_day" as const,
        title: `5º Dia Útil - Pagamentos Devidos`,
        message: `Hoje é o 5º dia útil do mês. ${investorsCount} investimento(s) totalizando ${totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} devem receber pagamento.`,
        priority: "critical" as const,
        recipients: ["admin@agrinvest.com"],
        recipientType: "admin" as const,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
        relatedData: {
          amount: totalAmount,
          paymentDate: new Date().toISOString().split('T')[0],
        },
        actions: { acknowledge: true },
      })
    }

    return notificationsList
  }, [pendingInvestments, d60Investments, paymentDayInvestments])

  return {
    pendingTransactions,
    pendingInvestments,
    d60Investments,
    paymentDayInvestments,
    notifications,
    loading,
    error,
    refetch: fetchPendingData,
    processInvestmentAction,
  }
}
