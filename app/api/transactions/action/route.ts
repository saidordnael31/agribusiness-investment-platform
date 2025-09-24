import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"

export async function POST(request: NextRequest) {
  try {
    const { transactionId, action } = await request.json()
    const supabase = createClient()

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

    const newStatus = action === 'approve' ? 'completed' : 'failed'
    const processedAt = new Date().toISOString()

    const { data, error } = await supabase
      .from("transactions")
      .update({ 
        status: newStatus,
        processed_at: processedAt
      })
      .eq('id', transactionId)
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
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
