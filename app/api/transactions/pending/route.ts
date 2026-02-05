import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { validateAdminAccess } from "@/lib/client-permission-utils"

// Força a rota a ser dinâmica para permitir uso de cookies
export const dynamic = "force-dynamic"

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

    // Validar se o usuário é admin
    const isAdmin = await validateAdminAccess(user.id, supabase)
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Acesso negado: apenas administradores podem ver todas as transações pendentes" },
        { status: 403 }
      )
    }

    // Buscar transações pendentes (depósitos e resgates)
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select(`*`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: transactions || [],
    })
  } catch (error) {
    console.error("Get pending transactions error:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
