import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Verifica investimentos que atingiram D+60 (60 dias após payment_date)
 * Retorna investimentos ativos que completaram 60 dias e estão prontos para comissionamento
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

    // Verificar se é admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin") {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Apenas administradores podem acessar." },
        { status: 403 }
      )
    }

    // Buscar investimentos ativos com payment_date
    const { data: investments, error: investmentsError } = await supabase
      .from("investments")
      .select(`
        id,
        user_id,
        amount,
        payment_date,
        commitment_period,
        profitability_liquidity,
        monthly_return_rate,
        status,
        quota_type,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq("status", "active")
      .not("payment_date", "is", null)

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
        count: 0,
        message: "Nenhum investimento encontrado"
      })
    }

    // Data atual
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Verificar investimentos que atingiram D+60 hoje ou nos últimos 7 dias
    // (para não perder notificações de investimentos que atingiram D+60 recentemente)
    const investmentsReachedD60 = investments
      .filter((investment) => {
        if (!investment.payment_date) return false

        const paymentDate = new Date(investment.payment_date)
        paymentDate.setHours(0, 0, 0, 0)

        // Calcular D+60
        const d60Date = new Date(paymentDate)
        d60Date.setDate(d60Date.getDate() + 60)
        d60Date.setHours(0, 0, 0, 0)

        // Calcular diferença em dias
        const daysDiff = Math.floor((today.getTime() - d60Date.getTime()) / (1000 * 60 * 60 * 24))

        // Investimento atingiu D+60 hoje ou nos últimos 7 dias (para não perder notificações)
        return daysDiff >= 0 && daysDiff <= 7
      })
      .map((investment) => {
        const paymentDate = new Date(investment.payment_date!)
        paymentDate.setHours(0, 0, 0, 0)

        const d60Date = new Date(paymentDate)
        d60Date.setDate(d60Date.getDate() + 60)
        d60Date.setHours(0, 0, 0, 0)

        const daysDiff = Math.floor((today.getTime() - d60Date.getTime()) / (1000 * 60 * 60 * 24))

        return {
          id: investment.id,
          user_id: investment.user_id,
          amount: Number(investment.amount),
          payment_date: investment.payment_date,
          d60_date: d60Date.toISOString().split('T')[0],
          days_since_d60: daysDiff,
          commitment_period: investment.commitment_period,
          profitability_liquidity: investment.profitability_liquidity,
          monthly_return_rate: investment.monthly_return_rate,
          quota_type: investment.quota_type,
          investor_name: (investment.profiles as any)?.full_name || "Investidor",
          investor_email: (investment.profiles as any)?.email || "",
        }
      })

    return NextResponse.json({
      success: true,
      data: investmentsReachedD60,
      count: investmentsReachedD60.length
    })
  } catch (error) {
    console.error("Erro ao verificar investimentos D+60:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

