import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Verifica investimentos que estão próximos do vencimento (1 mês antes)
 * Retorna investimentos ativos que vencem em aproximadamente 30 dias
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || user.id

    // Buscar investimentos ativos do usuário
    const { data: investments, error: investmentsError } = await supabase
      .from("investments")
      .select("id, user_id, amount, payment_date, commitment_period, status, quota_type, monthly_return_rate, profitability_liquidity")
      .eq("user_id", userId)
      .eq("status", "active")

    if (investmentsError) {
      console.error("Erro ao buscar investimentos:", investmentsError)
      return NextResponse.json(
        { success: false, error: "Erro ao buscar investimentos" },
        { status: 500 }
      )
    }

    if (!investments || investments.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "Nenhum investimento ativo encontrado"
      })
    }

    // Calcular data de vencimento e verificar se está próximo ou no momento do vencimento
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Janela de alerta:
    // - 1 mês antes: entre 25 e 35 dias
    // - No momento do vencimento: 0 a 5 dias após o vencimento
    const minDaysUntilExpiry = -5 // Permite até 5 dias após vencimento
    const maxDaysUntilExpiry = 35 // Até 35 dias antes

    const investmentsNearExpiry = investments
      .filter((investment) => {
        if (!investment.payment_date || !investment.commitment_period) {
          return false
        }

        // Calcular data de vencimento
        const paymentDate = new Date(investment.payment_date)
        paymentDate.setHours(0, 0, 0, 0)
        const expiryDate = new Date(paymentDate)
        expiryDate.setMonth(expiryDate.getMonth() + investment.commitment_period)
        expiryDate.setHours(0, 0, 0, 0)

        // Calcular dias até o vencimento
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Investimento está próximo do vencimento se:
        // - Está dentro da janela de alerta (entre -5 e 35 dias)
        // - Isso inclui investimentos que já venceram (até 5 dias) e os que vão vencer (até 35 dias)
        return daysUntilExpiry >= minDaysUntilExpiry && daysUntilExpiry <= maxDaysUntilExpiry
      })
      .map((investment) => {
        const paymentDate = new Date(investment.payment_date!)
        paymentDate.setHours(0, 0, 0, 0)
        const expiryDate = new Date(paymentDate)
        expiryDate.setMonth(expiryDate.getMonth() + investment.commitment_period!)
        expiryDate.setHours(0, 0, 0, 0)
        
        // Calcular dias até o vencimento
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )

        return {
          ...investment,
          expiry_date: expiryDate.toISOString().split('T')[0],
          days_until_expiry: daysUntilExpiry,
          payment_date: investment.payment_date,
          commitment_period: investment.commitment_period,
          profitability_liquidity: investment.profitability_liquidity
        }
      })

    return NextResponse.json({
      success: true,
      data: investmentsNearExpiry,
      count: investmentsNearExpiry.length
    })
  } catch (error) {
    console.error("Erro ao verificar investimentos próximos do vencimento:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

