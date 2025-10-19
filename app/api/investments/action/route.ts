import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// Força a rota a ser dinâmica para permitir uso de cookies
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { investmentId, action, paymentDate } = await request.json()
    const supabase = await createServerClient()

    if (!investmentId || !action) {
      return NextResponse.json({ 
        success: false, 
        error: "ID do investimento e ação são obrigatórios" 
      }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        success: false, 
        error: "Ação deve ser 'approve' ou 'reject'" 
      }, { status: 400 })
    }

    if (action === 'approve') {
      // Validar data de pagamento para aprovação
      if (!paymentDate) {
        return NextResponse.json({ 
          success: false, 
          error: "Data de pagamento é obrigatória para aprovação" 
        }, { status: 400 })
      }

      // Validar formato da data
      const paymentDateObj = new Date(paymentDate)
      if (isNaN(paymentDateObj.getTime())) {
        return NextResponse.json({ 
          success: false, 
          error: "Data de pagamento inválida" 
        }, { status: 400 })
      }

      // Aprovar: alterar status para 'active'
      const updatedAt = new Date().toISOString()

      const { data, error } = await supabase
        .from("investments")
        .update({ 
          status: 'active',
          payment_date: paymentDateObj.toISOString(),
          updated_at: updatedAt
        })
        .eq('id', investmentId)
        .select()
        .single()

      if (error) {
        console.error("Database error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data,
        message: "Investimento aprovado com sucesso!",
      })
    } else {
      // Rejeitar: deletar o registro da tabela
      const { data, error } = await supabase
      .from("investments")
      .delete()
      .eq('id', investmentId);
    
    if (error) {
      console.error("Erro ao deletar investimento:", error.message);
    } else {
      console.log("Investimento deletado:", data);
    }
    

      if (error) {
        console.error("Database error:", error)
        return NextResponse.json({ success: false, error: error.message }, { status: 400 })
      }

      return NextResponse.json({
        success: true,
        data: { id: investmentId, deleted: true },
        message: "Investimento rejeitado e removido com sucesso!",
      })
    }
  } catch (error) {
    console.error("Process investment action error:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
