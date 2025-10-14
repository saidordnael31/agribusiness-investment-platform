import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// POST - Aprovar ou rejeitar comprovante (apenas admin)
export async function POST(request: NextRequest) {
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

    if (profile?.user_type !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Apenas administradores" },
        { status: 403 }
      )
    }

    const { receiptId, action, rejectionReason } = await request.json()

    if (!receiptId || !action) {
      return NextResponse.json(
        { success: false, error: "ID do comprovante e ação são obrigatórios" },
        { status: 400 }
      )
    }

    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Ação inválida. Use 'approved' ou 'rejected'" },
        { status: 400 }
      )
    }

    if (action === 'rejected' && !rejectionReason) {
      return NextResponse.json(
        { success: false, error: "Motivo da rejeição é obrigatório" },
        { status: 400 }
      )
    }

    // Buscar o comprovante
    const { data: receipt, error: fetchError } = await supabase
      .from("pix_receipts")
      .select("*")
      .eq("id", receiptId)
      .single()

    if (fetchError || !receipt) {
      return NextResponse.json(
        { success: false, error: "Comprovante não encontrado" },
        { status: 404 }
      )
    }

    if (receipt.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: "Comprovante já foi processado" },
        { status: 400 }
      )
    }

    // Atualizar status do comprovante
    const updateData: any = {
      status: action,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (action === 'rejected') {
      updateData.rejection_reason = rejectionReason
    }

    const { data: updatedReceipt, error: updateError } = await supabase
      .from("pix_receipts")
      .update(updateData)
      .eq("id", receiptId)
      .select()
      .single()

    if (updateError) {
      console.error("Update error:", updateError)
      return NextResponse.json(
        { success: false, error: "Erro ao atualizar comprovante" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedReceipt,
    })
  } catch (error) {
    console.error("Pix receipt action error:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
