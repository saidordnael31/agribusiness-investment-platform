import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

/**
 * Busca histórico de renovações de um investimento
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
    const investmentId = searchParams.get('investmentId')
    const userId = searchParams.get('userId') || user.id

    if (!investmentId) {
      return NextResponse.json(
        { success: false, error: "ID do investimento é obrigatório" },
        { status: 400 }
      )
    }

    // Verificar se o investimento pertence ao usuário (ou se é admin)
    const { data: investment, error: investmentError } = await supabase
      .from("investments")
      .select("id, user_id")
      .eq("id", investmentId)
      .single()

    if (investmentError || !investment) {
      return NextResponse.json(
        { success: false, error: "Investimento não encontrado" },
        { status: 404 }
      )
    }

    // Verificar permissões
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    const isAdmin = profile?.user_type === 'admin'
    const isOwner = investment.user_id === user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      )
    }

    // Buscar histórico de renovações
    const { data: renewals, error: renewalsError } = await supabase
      .from("investment_renewals")
      .select("*")
      .eq("investment_id", investmentId)
      .order("created_at", { ascending: false })

    if (renewalsError) {
      console.error("Erro ao buscar histórico de renovações:", renewalsError)
      return NextResponse.json(
        { success: false, error: "Erro ao buscar histórico" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: renewals || [],
      count: renewals?.length || 0
    })
  } catch (error) {
    console.error("Erro ao buscar histórico de renovações:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

