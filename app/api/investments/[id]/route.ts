import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
export const dynamic = "force-dynamic"

// PATCH - Atualizar investimento (apenas admin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const investmentId = params.id

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

    if (profile?.user_type !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Apenas administradores podem editar investimentos" },
        { status: 403 }
      )
    }

    // Verificar se o investimento existe
    const { data: existingInvestment, error: investmentError } = await supabase
      .from("investments")
      .select("*")
      .eq("id", investmentId)
      .single()

    if (investmentError || !existingInvestment) {
      return NextResponse.json(
        { success: false, error: "Investimento não encontrado" },
        { status: 404 }
      )
    }

    // Obter dados do corpo da requisição
    const updateData = await request.json()
    
    // Campos permitidos para edição
    const allowedFields: Record<string, any> = {}
    
    if (updateData.amount !== undefined) {
      const amount = parseFloat(updateData.amount)
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json(
          { success: false, error: "Valor do investimento deve ser maior que zero" },
          { status: 400 }
        )
      }
      allowedFields.amount = amount
    }

    if (updateData.monthly_return_rate !== undefined) {
      const rate = parseFloat(updateData.monthly_return_rate)
      if (isNaN(rate) || rate < 0 || rate > 1) {
        return NextResponse.json(
          { success: false, error: "Taxa de retorno mensal deve estar entre 0 e 1" },
          { status: 400 }
        )
      }
      allowedFields.monthly_return_rate = rate
    }

    if (updateData.commitment_period !== undefined) {
      const period = parseInt(updateData.commitment_period)
      if (isNaN(period) || period <= 0) {
        return NextResponse.json(
          { success: false, error: "Período de compromisso deve ser maior que zero" },
          { status: 400 }
        )
      }
      allowedFields.commitment_period = period
    }

    if (updateData.profitability_liquidity !== undefined) {
      const validLiquidity = ['Mensal', 'Semestral', 'Anual', 'No Vencimento']
      if (!validLiquidity.includes(updateData.profitability_liquidity)) {
        return NextResponse.json(
          { success: false, error: "Liquidez inválida" },
          { status: 400 }
        )
      }
      allowedFields.profitability_liquidity = updateData.profitability_liquidity
    }

    if (updateData.payment_date !== undefined) {
      if (updateData.payment_date === null || updateData.payment_date === '') {
        allowedFields.payment_date = null
      } else {
        const paymentDate = new Date(updateData.payment_date)
        if (isNaN(paymentDate.getTime())) {
          return NextResponse.json(
            { success: false, error: "Data de pagamento inválida" },
            { status: 400 }
          )
        }
        allowedFields.payment_date = paymentDate.toISOString()
      }
    }

    if (updateData.status !== undefined) {
      const validStatus = ['pending', 'active', 'withdrawn', 'cancelled']
      if (!validStatus.includes(updateData.status)) {
        return NextResponse.json(
          { success: false, error: "Status inválido" },
          { status: 400 }
        )
      }
      allowedFields.status = updateData.status
    }

    if (updateData.quota_type !== undefined) {
      const validQuotaTypes = ['senior', 'subordinada']
      if (!validQuotaTypes.includes(updateData.quota_type)) {
        return NextResponse.json(
          { success: false, error: "Tipo de quota inválido" },
          { status: 400 }
        )
      }
      allowedFields.quota_type = updateData.quota_type
    }

    // Taxa contratual: use sempre `monthly_return_rate` persistido. Para alterar prazo/liquidez e taxa,
    // envie explicitamente `monthly_return_rate` no PATCH (não recalcular automaticamente por tabela).

    // Adicionar updated_at
    allowedFields.updated_at = new Date().toISOString()

    // Atualizar investimento
    const { data: updatedInvestment, error: updateError } = await supabase
      .from("investments")
      .update(allowedFields)
      .eq("id", investmentId)
      .select()
      .single()

    if (updateError) {
      console.error("Database error:", updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedInvestment,
      message: "Investimento atualizado com sucesso",
    })
  } catch (error) {
    console.error("Update investment error:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

