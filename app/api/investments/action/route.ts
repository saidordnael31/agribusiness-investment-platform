import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// Força a rota a ser dinâmica para permitir uso de cookies
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { investmentId, action, paymentDate } = await request.json()
    const supabase = await createServerClient()

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      )
    }

    // Verificar perfil do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type, role, id")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Perfil do usuário não encontrado" },
        { status: 404 }
      )
    }

    // Verificar se é admin ou assessor
    const isAdmin = profile.user_type === 'admin'
    const isAdvisor = profile.user_type === 'distributor' && profile.role === 'assessor'
    
    if (!isAdmin && !isAdvisor) {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Apenas administradores e assessores podem gerenciar investimentos" },
        { status: 403 }
      )
    }

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

    // Verificar se o investimento existe
    const { data: investment, error: investmentError } = await supabase
      .from("investments")
      .select("*")
      .eq("id", investmentId)
      .single()

    if (investmentError || !investment) {
      return NextResponse.json(
        { success: false, error: "Investimento não encontrado" },
        { status: 404 }
      )
    }

    // Se for assessor, verificar se tem permissão para gerenciar este investimento
    if (isAdvisor) {
      const { data: investorProfile, error: investorError } = await supabase
        .from("profiles")
        .select("parent_id")
        .eq("id", investment.user_id)
        .eq("user_type", "investor")
        .single()

      if (investorError || !investorProfile) {
        return NextResponse.json(
          { success: false, error: "Investidor não encontrado" },
          { status: 404 }
        )
      }

      // Verificar se o investidor pertence ao assessor
      if (investorProfile.parent_id !== profile.id) {
        return NextResponse.json(
          { success: false, error: "Acesso negado. Você só pode gerenciar investimentos dos seus investidores" },
          { status: 403 }
        )
      }
    }

    if (action === 'approve') {
      // Se for assessor, aprovar mas marcar como não aprovado pelo admin
      if (isAdvisor) {
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

        // Aprovar como assessor: alterar status para 'active' mas marcar como não aprovado pelo admin
        const updatedAt = new Date().toISOString()

        const { data, error } = await supabase
          .from("investments")
          .update({ 
            status: 'active',
            payment_date: paymentDateObj.toISOString(),
            approved_by_admin: false,
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
          message: "Investimento aprovado pelo assessor! Aguardando aprovação final do administrador.",
        })
      } else {
        // Se for admin, aprovar definitivamente
        const updatedAt = new Date().toISOString()

        const { data, error } = await supabase
          .from("investments")
          .update({ 
            approved_by_admin: true,
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
          message: "Investimento aprovado definitivamente pelo administrador!",
        })
      }
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
