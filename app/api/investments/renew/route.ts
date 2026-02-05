import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getInvestorMonthlyRate } from "@/lib/commission-calculator"

export const dynamic = "force-dynamic"

/**
 * Processa a renovação de um investimento
 * Opções:
 * - renew: Renova o contrato com mesmo valor e mesmas condições
 * - renew_with_new_rules: Renova com novas regras (período e liquidez)
 * - suggest_increase: Sugere aumento de aporte (captação passiva)
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      investmentId, 
      action, 
      additionalAmount,
      newCommitmentPeriod,
      newLiquidity 
    } = await request.json()
    const supabase = await createServerClient()

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      )
    }

    if (!investmentId || !action) {
      return NextResponse.json(
        { success: false, error: "Dados obrigatórios: investmentId, action" },
        { status: 400 }
      )
    }

    if (!["renew", "renew_with_new_rules", "suggest_increase"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Ação inválida. Use 'renew', 'renew_with_new_rules' ou 'suggest_increase'" },
        { status: 400 }
      )
    }

    // Buscar investimento atual
    const { data: investment, error: investmentError } = await supabase
      .from("investments")
      .select("*")
      .eq("id", investmentId)
      .eq("user_id", user.id)
      .single()

    if (investmentError || !investment) {
      return NextResponse.json(
        { success: false, error: "Investimento não encontrado" },
        { status: 404 }
      )
    }

    if (investment.status !== "active") {
      return NextResponse.json(
        { success: false, error: "Apenas investimentos ativos podem ser renovados" },
        { status: 400 }
      )
    }

    // Salvar dados anteriores para histórico
    const previousPaymentDate = investment.payment_date
    const previousCommitmentPeriod = investment.commitment_period
    const previousLiquidity = investment.profitability_liquidity
    const previousMonthlyRate = investment.monthly_return_rate
    
    // Calcular data de vencimento anterior
    let previousExpiryDate: Date | null = null
    if (previousPaymentDate && previousCommitmentPeriod) {
      previousExpiryDate = new Date(previousPaymentDate)
      previousExpiryDate.setMonth(previousExpiryDate.getMonth() + previousCommitmentPeriod)
    }

    // Preparar dados de atualização
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Calcular nova data de pagamento (renovação = hoje)
    const newPaymentDate = new Date()
    newPaymentDate.setHours(0, 0, 0, 0)
    
    // Atualizar campos de renovação
    updateData.renewal_count = (investment.renewal_count || 0) + 1
    updateData.last_renewal_date = newPaymentDate.toISOString()
    updateData.current_cycle_start_date = newPaymentDate.toISOString()
    
    // Garantir que original_investment_date existe
    if (!investment.original_investment_date) {
      updateData.original_investment_date = investment.payment_date || investment.created_at
    }

    // Dados para histórico de renovação
    const renewalHistoryData: any = {
      investment_id: investmentId,
      user_id: user.id,
      previous_payment_date: previousPaymentDate,
      previous_commitment_period: previousCommitmentPeriod,
      previous_profitability_liquidity: previousLiquidity,
      previous_monthly_return_rate: previousMonthlyRate,
      previous_expiry_date: previousExpiryDate ? previousExpiryDate.toISOString().split('T')[0] : null,
      new_payment_date: newPaymentDate.toISOString(),
      renewal_type: action,
      renewed_by: user.id,
    }

    if (action === "renew") {
      // Renovar com mesmas condições
      updateData.payment_date = newPaymentDate.toISOString()
      // Manter commitment_period e profitability_liquidity iguais
      
      renewalHistoryData.new_commitment_period = previousCommitmentPeriod
      renewalHistoryData.new_profitability_liquidity = previousLiquidity
      renewalHistoryData.new_monthly_return_rate = previousMonthlyRate
      
    } else if (action === "renew_with_new_rules") {
      // Renovar com novas regras
      if (!newCommitmentPeriod || !newLiquidity) {
        return NextResponse.json(
          { success: false, error: "Período e liquidez são obrigatórios para renovação com novas regras" },
          { status: 400 }
        )
      }
      
      updateData.payment_date = newPaymentDate.toISOString()
      updateData.commitment_period = Number(newCommitmentPeriod)
      updateData.profitability_liquidity = newLiquidity
      
      // Recalcular taxa de retorno baseada nas novas regras
      const newMonthlyRate = getInvestorMonthlyRate(
        Number(newCommitmentPeriod),
        newLiquidity as any
      )
      
      if (newMonthlyRate > 0) {
        updateData.monthly_return_rate = newMonthlyRate
      }
      
      // Calcular nova data de vencimento
      const newExpiryDate = new Date(newPaymentDate)
      newExpiryDate.setMonth(newExpiryDate.getMonth() + Number(newCommitmentPeriod))
      
      renewalHistoryData.new_commitment_period = Number(newCommitmentPeriod)
      renewalHistoryData.new_profitability_liquidity = newLiquidity
      renewalHistoryData.new_monthly_return_rate = newMonthlyRate
      renewalHistoryData.new_expiry_date = newExpiryDate.toISOString().split('T')[0]
      
    } else if (action === "suggest_increase") {
      // Sugerir aumento de aporte (captação passiva)
      // Por enquanto, apenas registra a intenção - o aumento pode ser processado depois
      // Ou podemos criar um novo investimento com o valor adicional
      if (!additionalAmount || additionalAmount <= 0) {
        return NextResponse.json(
          { success: false, error: "Valor adicional é obrigatório para aumento de aporte" },
          { status: 400 }
        )
      }

      // Criar novo investimento com o valor adicional
      const { data: newInvestment, error: createError } = await supabase
        .from("investments")
        .insert([
          {
            user_id: user.id,
            quota_type: investment.quota_type,
            amount: Number(additionalAmount),
            monthly_return_rate: investment.monthly_return_rate,
            commitment_period: investment.commitment_period || 12,
            profitability_liquidity: investment.profitability_liquidity || "Mensal",
            status: "pending", // Precisa ser aprovado
          },
        ])
        .select()
        .single()

      if (createError) {
        console.error("Erro ao criar investimento adicional:", createError)
        return NextResponse.json(
          { success: false, error: "Erro ao processar aumento de aporte" },
          { status: 500 }
        )
      }

      // Renovar o investimento original também
      updateData.payment_date = newPaymentDate.toISOString()
      
      // Calcular nova data de vencimento
      const newExpiryDate = new Date(newPaymentDate)
      newExpiryDate.setMonth(newExpiryDate.getMonth() + (investment.commitment_period || 12))
      
      renewalHistoryData.new_commitment_period = investment.commitment_period || 12
      renewalHistoryData.new_profitability_liquidity = investment.profitability_liquidity || "Mensal"
      renewalHistoryData.new_monthly_return_rate = investment.monthly_return_rate
      renewalHistoryData.new_expiry_date = newExpiryDate.toISOString().split('T')[0]
      renewalHistoryData.additional_amount = Number(additionalAmount)
      renewalHistoryData.additional_investment_id = newInvestment.id

      // Atualizar investimento original
      const { data: renewedInvestment, error: updateError } = await supabase
        .from("investments")
        .update(updateData)
        .eq("id", investmentId)
        .select()
        .single()

      if (updateError) {
        console.error("Erro ao renovar investimento:", updateError)
        return NextResponse.json(
          { success: false, error: "Erro ao processar renovação" },
          { status: 500 }
        )
      }

      // Registrar no histórico
      const { error: historyError } = await supabase
        .from("investment_renewals")
        .insert([renewalHistoryData])

      if (historyError) {
        console.error("Erro ao registrar histórico de renovação:", historyError)
        // Não falhar a renovação se o histórico falhar
      }

      return NextResponse.json({
        success: true,
        data: {
          renewedInvestment: renewedInvestment,
          additionalInvestment: newInvestment,
          action: action,
          additionalAmount: additionalAmount
        },
        message: "Renovação e aumento de aporte processados. O novo investimento aguarda aprovação."
      })
    }
    
    // Calcular nova data de vencimento para renovação simples
    if (action === "renew") {
      const newExpiryDate = new Date(newPaymentDate)
      newExpiryDate.setMonth(newExpiryDate.getMonth() + (previousCommitmentPeriod || 12))
      renewalHistoryData.new_commitment_period = previousCommitmentPeriod || 12
      renewalHistoryData.new_profitability_liquidity = previousLiquidity || "Mensal"
      renewalHistoryData.new_monthly_return_rate = previousMonthlyRate
      renewalHistoryData.new_expiry_date = newExpiryDate.toISOString().split('T')[0]
    }

    // Atualizar investimento existente (renovação simples ou com novas regras)
    const { data: renewedInvestment, error: updateError } = await supabase
      .from("investments")
      .update(updateData)
      .eq("id", investmentId)
      .select()
      .single()

    if (updateError) {
      console.error("Erro ao renovar investimento:", updateError)
      return NextResponse.json(
        { success: false, error: "Erro ao processar renovação" },
        { status: 500 }
      )
    }

    // Registrar no histórico de renovações
    const { error: historyError } = await supabase
      .from("investment_renewals")
      .insert([renewalHistoryData])

    if (historyError) {
      console.error("Erro ao registrar histórico de renovação:", historyError)
      // Não falhar a renovação se o histórico falhar, mas logar o erro
    }

    return NextResponse.json({
      success: true,
      data: {
        renewedInvestment: renewedInvestment,
        action: action,
        newCommitmentPeriod: action === "renew_with_new_rules" ? newCommitmentPeriod : null,
        newLiquidity: action === "renew_with_new_rules" ? newLiquidity : null,
        renewalCount: renewedInvestment.renewal_count
      },
      message: action === "renew_with_new_rules"
        ? "Renovação com novas regras processada com sucesso!"
        : "Renovação processada com sucesso!"
    })
  } catch (error) {
    console.error("Erro ao processar renovação:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

