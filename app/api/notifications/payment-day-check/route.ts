import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Verifica se hoje é o 5º dia útil do mês
 * Retorna investimentos que devem receber pagamento no 5º dia útil
 */
function isFifthBusinessDay(date: Date): boolean {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  // Verificar se é dia útil (segunda a sexta, 1-5)
  const dayOfWeek = date.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false // Fim de semana
  }

  // Contar dias úteis do mês até hoje
  let businessDays = 0
  for (let d = 1; d <= day; d++) {
    const currentDate = new Date(year, month, d)
    const currentDayOfWeek = currentDate.getDay()
    
    // Se não for sábado (6) nem domingo (0), é dia útil
    if (currentDayOfWeek !== 0 && currentDayOfWeek !== 6) {
      businessDays++
    }
  }

  return businessDays === 5
}

/**
 * Verifica investimentos que devem receber pagamento no 5º dia útil
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

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Verificar se hoje é o 5º dia útil
    if (!isFifthBusinessDay(today)) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        message: "Hoje não é o 5º dia útil do mês",
        isPaymentDay: false
      })
    }

    // Buscar investimentos ativos que devem receber pagamento
    // Investimentos que já passaram de D+60 e estão no período de comissionamento
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
        message: "Nenhum investimento encontrado",
        isPaymentDay: true
      })
    }

    // Filtrar investimentos que já passaram de D+60
    // (investidores só começam a receber após D+60)
    const investmentsForPayment = investments
      .filter((investment) => {
        if (!investment.payment_date) return false

        const paymentDate = new Date(investment.payment_date)
        paymentDate.setHours(0, 0, 0, 0)

        // Calcular D+60
        const d60Date = new Date(paymentDate)
        d60Date.setDate(d60Date.getDate() + 60)
        d60Date.setHours(0, 0, 0, 0)

        // Verificar se já passou D+60
        return today >= d60Date
      })
      .map((investment) => {
        const paymentDate = new Date(investment.payment_date!)
        paymentDate.setHours(0, 0, 0, 0)

        const d60Date = new Date(paymentDate)
        d60Date.setDate(d60Date.getDate() + 60)

        // Calcular dias desde D+60
        const daysSinceD60 = Math.floor((today.getTime() - d60Date.getTime()) / (1000 * 60 * 60 * 24))

        return {
          id: investment.id,
          user_id: investment.user_id,
          amount: Number(investment.amount),
          payment_date: investment.payment_date,
          d60_date: d60Date.toISOString().split('T')[0],
          days_since_d60: daysSinceD60,
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
      data: investmentsForPayment,
      count: investmentsForPayment.length,
      isPaymentDay: true,
      paymentDate: today.toISOString().split('T')[0]
    })
  } catch (error) {
    console.error("Erro ao verificar pagamentos do 5º dia útil:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

