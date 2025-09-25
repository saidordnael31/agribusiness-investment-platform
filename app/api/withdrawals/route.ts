import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// Força a rota a ser dinâmica para permitir uso de cookies
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const withdrawalData = await request.json()
    const supabase = await createServerClient()

    // Obter usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: "Usuário não autenticado" 
      }, { status: 401 })
    }

    // Validações de entrada
    if (!withdrawalData.userId || !withdrawalData.amount || !withdrawalData.withdrawalType) {
      return NextResponse.json({ 
        success: false, 
        error: "Dados obrigatórios: userId, amount, withdrawalType" 
      }, { status: 400 })
    }

    // Verificar se o usuário autenticado é o mesmo do withdrawalData
    if (user.id !== withdrawalData.userId) {
      return NextResponse.json({ 
        success: false, 
        error: "Não autorizado a criar resgate para outro usuário" 
      }, { status: 403 })
    }

    // Validar se o usuário existe
    const { data: userProfile, error: userError } = await supabase
      .from("profiles")
      .select("id, user_type")
      .eq("id", withdrawalData.userId)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ 
        success: false, 
        error: "Usuário não encontrado" 
      }, { status: 404 })
    }

    // Validar se o usuário tem investimentos ativos
    const { data: investments, error: investmentsError } = await supabase
      .from("investments")
      .select("id, amount, status")
      .eq("user_id", withdrawalData.userId)
      .eq("status", "active")

    if (investmentsError) {
      console.error("Erro ao buscar investimentos:", investmentsError)
      return NextResponse.json({ 
        success: false, 
        error: "Erro ao validar investimentos" 
      }, { status: 500 })
    }

    if (!investments || investments.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Usuário não possui investimentos ativos" 
      }, { status: 400 })
    }

    // Função para calcular valor atual disponível de um investimento
    const calculateAvailableAmount = async (investmentId: string, originalAmount: number) => {
      // Buscar todos os resgates já feitos deste investimento
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from("transactions")
        .select("amount, status")
        .eq("investment_id", investmentId)
        .eq("type", "withdrawal")
        .in("status", ["completed", "pending"])

      if (withdrawalsError) {
        console.error("Erro ao buscar resgates:", withdrawalsError)
        return originalAmount // Em caso de erro, retorna valor original
      }

      // Calcular total já resgatado
      const totalWithdrawn = withdrawals?.reduce((sum, withdrawal) => 
        sum + Number(withdrawal.amount), 0) || 0

      // Valor disponível = valor original - resgates já feitos
      const availableAmount = originalAmount - totalWithdrawn
      return Math.max(0, availableAmount) // Não pode ser negativo
    }

    // Calcular total disponível para resgate
    let totalAvailable = 0
    for (const investment of investments) {
      const available = await calculateAvailableAmount(investment.id, Number(investment.amount))
      totalAvailable += available
    }

    // Validar valor do resgate
    if (withdrawalData.withdrawalType === "partial" || withdrawalData.withdrawalType === "total") {
      if (withdrawalData.amount > totalAvailable) {
        return NextResponse.json({ 
          success: false, 
          error: `Valor solicitado (R$ ${withdrawalData.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}) excede o valor disponível para resgate (R$ ${totalAvailable.toLocaleString('pt-BR', {minimumFractionDigits: 2})})` 
        }, { status: 400 })
      }
    }

    // Para resgates parciais, validar se o investimento específico tem valor suficiente
    if (withdrawalData.withdrawalType === "partial" && withdrawalData.investmentId) {
      const investment = investments.find(inv => inv.id === withdrawalData.investmentId)
      if (investment) {
        const availableForThisInvestment = await calculateAvailableAmount(investment.id, Number(investment.amount))
        if (withdrawalData.amount > availableForThisInvestment) {
          return NextResponse.json({ 
            success: false, 
            error: `Valor solicitado (R$ ${withdrawalData.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}) excede o valor disponível neste investimento (R$ ${availableForThisInvestment.toLocaleString('pt-BR', {minimumFractionDigits: 2})})` 
          }, { status: 400 })
        }
      }
    }

    // Log da operação
    console.log("Criando resgate:", {
      userId: withdrawalData.userId,
      amount: withdrawalData.amount,
      withdrawalType: withdrawalData.withdrawalType,
      totalAvailable,
      investmentId: withdrawalData.investmentId,
      timestamp: new Date().toISOString()
    })

    const { data, error } = await supabase
      .from("transactions")
      .insert([
        {
          user_id: withdrawalData.userId,
          investment_id: withdrawalData.investmentId || null,
          type: "withdrawal",
          amount: withdrawalData.amount,
          status: "pending",
          requires_approval: true,
          approval_status: "pending"
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("Erro ao criar transação de resgate:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    // Para resgates totais, marcar investimentos como withdrawn apenas se o valor disponível for totalmente resgatado
    if (withdrawalData.withdrawalType === "total") {
      // Verificar se o valor solicitado é igual ao total disponível
      if (withdrawalData.amount >= totalAvailable) {
        const { error: updateError } = await supabase
          .from("investments")
          .update({ status: 'withdrawn' })
          .eq('user_id', withdrawalData.userId)
          .eq('status', 'active')

        if (updateError) {
          console.error("Erro ao atualizar status dos investimentos:", updateError)
        } else {
          console.log("Investimentos marcados como withdrawn para resgate total")
        }
      }
    } else if (withdrawalData.withdrawalType === "partial" && withdrawalData.investmentId) {
      // Para resgates parciais, verificar se o investimento específico foi totalmente resgatado
      const investment = investments.find(inv => inv.id === withdrawalData.investmentId)
      if (investment) {
        const availableForThisInvestment = await calculateAvailableAmount(investment.id, Number(investment.amount))
        const remainingAfterWithdrawal = availableForThisInvestment - Number(withdrawalData.amount)
        
        if (remainingAfterWithdrawal <= 0) {
          // Se não sobrar nada, marcar como withdrawn
          const { error: updateError } = await supabase
            .from("investments")
            .update({ status: 'withdrawn' })
            .eq('id', withdrawalData.investmentId)

          if (updateError) {
            console.error("Erro ao marcar investimento como withdrawn:", updateError)
          } else {
            console.log("Investimento marcado como withdrawn após resgate parcial total")
          }
        } else {
          console.log("Investimento mantido ativo com valor disponível restante:", {
            investmentId: withdrawalData.investmentId,
            remainingAvailable: remainingAfterWithdrawal
          })
        }
      }
    } else if (withdrawalData.withdrawalType === "dividends_by_period" || withdrawalData.withdrawalType === "monthly_return") {
      // Para resgates de dividendos e retornos mensais, não alteramos o investimento
      // Apenas registramos a transação de saque dos rendimentos
      console.log("Resgate de rendimentos - investimento mantido ativo:", {
        withdrawalType: withdrawalData.withdrawalType,
        amount: withdrawalData.amount,
        investmentId: withdrawalData.investmentId
      })
    }

    // Log de sucesso
    console.log("Resgate criado com sucesso:", {
      transactionId: data.id,
      userId: withdrawalData.userId,
      amount: withdrawalData.amount,
      withdrawalType: withdrawalData.withdrawalType,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data,
      message: "Resgate solicitado com sucesso!",
    })
  } catch (error) {
    console.error("Create withdrawal error:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
