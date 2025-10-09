import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email é obrigatório" },
        { status: 400 }
      )
    }

    // Criar cliente Supabase sem contexto de usuário
    const supabase = createAdminClient()

    // Enviar magic link para o email especificado
    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.agrinvest.app'}/auth/callback`,
      },
    })

    if (error) {
      console.error("Erro ao enviar magic link:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Magic link enviado com sucesso"
    })

  } catch (error: any) {
    console.error("Erro inesperado ao enviar magic link:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
