import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { transactionId, action, adminId, reason } = await request.json()
    const supabase = await createServerClient()

    if (!transactionId || !action) {
      return NextResponse.json({ 
        success: false, 
        error: "ID da transação e ação são obrigatórios" 
      }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        success: false, 
        error: "Ação deve ser 'approve' ou 'reject'" 
      }, { status: 400 })
    }

    // Buscar dados da transação antes de processar
    const { data: transaction, error: fetchError } = await supabase
      .from("transactions")
      .select(`
        *,
        profiles!inner(full_name, email)
      `)
      .eq('id', transactionId)
      .single()

    if (fetchError || !transaction) {
      return NextResponse.json({ 
        success: false, 
        error: "Transação não encontrada" 
      }, { status: 404 })
    }

    const newStatus = action === 'approve' ? 'completed' : 'failed'
    const processedAt = new Date().toISOString()

    // Log da operação antes de processar
    console.log("Processando transação:", {
      transactionId,
      action,
      adminId,
      currentStatus: transaction.status,
      newStatus,
      userId: transaction.user_id,
      amount: transaction.amount,
      type: transaction.type,
      timestamp: processedAt
    })

    const { data, error } = await supabase
      .from("transactions")
      .update({ 
        status: newStatus,
        approval_status: action === 'approve' ? 'approved' : 'rejected',
        processed_at: processedAt,
        metadata: {
          ...transaction.metadata,
          processed_by: adminId,
          processed_at: processedAt,
          action: action,
          reason: reason || null
        }
      })
      .eq('id', transactionId)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    // Log de sucesso
    console.log("Transação processada com sucesso:", {
      transactionId,
      action,
      newStatus,
      userId: transaction.user_id,
      amount: transaction.amount,
      timestamp: processedAt
    })

    // Se for um resgate aprovado, atualizar status do investimento se necessário
    if (action === 'approve' && transaction.type === 'withdrawal') {
      if (transaction.withdrawal_type === 'total') {
        // Marcar investimentos como withdrawn
        const { error: updateError } = await supabase
          .from("investments")
          .update({ status: 'withdrawn' })
          .eq('user_id', transaction.user_id)
          .eq('status', 'active')

        if (updateError) {
          console.error("Erro ao atualizar status dos investimentos:", updateError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data,
      message: `Transação ${action === 'approve' ? 'aprovada' : 'rejeitada'} com sucesso!`,
    })
  } catch (error) {
    console.error("Process transaction action error:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
