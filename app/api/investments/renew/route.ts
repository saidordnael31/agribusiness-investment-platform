import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getInvestorMonthlyRate } from "@/lib/commission-calculator"

export const dynamic = "force-dynamic"

/**
 * Processa a renovação de um investimento.
 * payment_date nunca é alterado — apenas commitment_period acumula o total.
 *
 * Opções:
 * - renew: Renova adicionando original_commitment_period ao total
 * - renew_with_new_rules: Renova adicionando newCommitmentPeriod ao total (com novas regras)
 * - suggest_increase: Renova + cria investimento adicional pendente
 */
export async function POST(request: NextRequest) {
  try {
    const {
      investmentId,
      action,
      additionalAmount,
      newCommitmentPeriod,
      newLiquidity,
    } = await request.json()
    const supabase = await createServerClient()

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

    const lastCommitmentPeriod = investment.commitment_period || 12
    const originalCommitmentPeriod =
      investment.original_commitment_period ?? lastCommitmentPeriod
    const newRenewCount = (investment.renewal_count || 0) + 1
    const renewalDate = new Date()
    renewalDate.setHours(0, 0, 0, 0)

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      renewal_count: newRenewCount,
      original_commitment_period: originalCommitmentPeriod,
    }

    let addedPeriod: number

    if (action === "renew") {
      addedPeriod = originalCommitmentPeriod
      updateData.commitment_period = lastCommitmentPeriod + addedPeriod

    } else if (action === "renew_with_new_rules") {
      if (!newCommitmentPeriod || !newLiquidity) {
        return NextResponse.json(
          { success: false, error: "Período e liquidez são obrigatórios para renovação com novas regras" },
          { status: 400 }
        )
      }

      addedPeriod = Number(newCommitmentPeriod)
      updateData.commitment_period = lastCommitmentPeriod + addedPeriod
      updateData.profitability_liquidity = newLiquidity

      const newMonthlyRate = getInvestorMonthlyRate(addedPeriod, newLiquidity as any)
      if (newMonthlyRate > 0) {
        updateData.monthly_return_rate = newMonthlyRate
      }

    } else {
      // suggest_increase
      if (!additionalAmount || additionalAmount <= 0) {
        return NextResponse.json(
          { success: false, error: "Valor adicional é obrigatório para aumento de aporte" },
          { status: 400 }
        )
      }

      addedPeriod = originalCommitmentPeriod
      updateData.commitment_period = lastCommitmentPeriod + addedPeriod

      const { data: newInvestment, error: createError } = await supabase
        .from("investments")
        .insert([
          {
            user_id: user.id,
            quota_type: investment.quota_type,
            amount: Number(additionalAmount),
            monthly_return_rate: investment.monthly_return_rate,
            commitment_period: originalCommitmentPeriod,
            original_commitment_period: originalCommitmentPeriod,
            profitability_liquidity: investment.profitability_liquidity || "Mensal",
            status: "pending",
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

      const currentCommitmentPeriod = updateData.commitment_period as number

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

      const { error: historyError } = await supabase
        .from("investment_renewals")
        .insert([
          {
            investment_id: investmentId,
            user_id: user.id,
            current_renew: newRenewCount,
            current_renewal_date: renewalDate.toISOString(),
            original_commitment_period: originalCommitmentPeriod,
            last_commitment_period: lastCommitmentPeriod,
            current_commitment_period: currentCommitmentPeriod,
            payment_date: investment.payment_date,
          },
        ])

      if (historyError) {
        console.error("Erro ao registrar histórico de renovação:", historyError)
      }

      return NextResponse.json({
        success: true,
        data: {
          renewedInvestment,
          additionalInvestment: newInvestment,
          action,
          additionalAmount,
          renewalCount: renewedInvestment.renewal_count,
        },
        message: "Renovação e aumento de aporte processados. O novo investimento aguarda aprovação.",
      })
    }

    const currentCommitmentPeriod = updateData.commitment_period as number

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

    const { error: historyError } = await supabase
      .from("investment_renewals")
      .insert([
        {
          investment_id: investmentId,
          user_id: user.id,
          current_renew: newRenewCount,
          current_renewal_date: renewalDate.toISOString(),
          original_commitment_period: originalCommitmentPeriod,
          last_commitment_period: lastCommitmentPeriod,
          current_commitment_period: currentCommitmentPeriod,
          payment_date: investment.payment_date,
        },
      ])

    if (historyError) {
      console.error("Erro ao registrar histórico de renovação:", historyError)
    }

    return NextResponse.json({
      success: true,
      data: {
        renewedInvestment,
        action,
        addedPeriod,
        newCommitmentPeriod: action === "renew_with_new_rules" ? newCommitmentPeriod : null,
        newLiquidity: action === "renew_with_new_rules" ? newLiquidity : null,
        renewalCount: renewedInvestment.renewal_count,
      },
      message: action === "renew_with_new_rules"
        ? "Renovação com novas regras processada com sucesso!"
        : "Renovação processada com sucesso!",
    })
  } catch (error) {
    console.error("Erro ao processar renovação:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
