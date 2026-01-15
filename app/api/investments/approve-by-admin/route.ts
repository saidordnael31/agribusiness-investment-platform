import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

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

    if (!profile || profile.user_type !== "admin") {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Apenas administradores podem aprovar investimentos." },
        { status: 403 }
      )
    }

    const { investmentId } = await request.json()

    if (!investmentId) {
      return NextResponse.json(
        { success: false, error: "ID do investimento é obrigatório" },
        { status: 400 }
      )
    }

    // Buscar o investimento
    const { data: investment, error: investmentError } = await supabase
      .from("investments")
      .select("id, status, payment_date, approved_by_admin")
      .eq("id", investmentId)
      .single()

    if (investmentError || !investment) {
      return NextResponse.json(
        { success: false, error: "Investimento não encontrado" },
        { status: 404 }
      )
    }

    // Verificar se o investimento está ativo e aguardando aprovação do admin
    if (investment.status !== "active") {
      return NextResponse.json(
        { success: false, error: "O investimento deve estar ativo para ser aprovado pelo admin" },
        { status: 400 }
      )
    }

    if (investment.approved_by_admin === true) {
      return NextResponse.json(
        { success: false, error: "Este investimento já foi aprovado pelo administrador" },
        { status: 400 }
      )
    }

    // Aprovar o investimento pelo admin
    const updatedAt = new Date().toISOString()
    const updateData = { 
      approved_by_admin: true,
      updated_at: updatedAt
    }
    
    const { data: updatedInvestment, error: updateError } = await supabase
      .from("investments")
      .update(updateData)
      .eq("id", investmentId)
      .select()
      .single()

    if (updateError) {
      console.error("Erro ao atualizar investimento:", updateError)
      return NextResponse.json(
        { success: false, error: "Erro ao aprovar investimento", details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedInvestment,
      message: "Investimento aprovado pelo administrador com sucesso"
    })

  } catch (error) {
    console.error("Erro ao aprovar investimento pelo admin:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

