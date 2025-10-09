import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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

    console.log("Enviando magic link para:", email)

    // Criar cliente Supabase sem contexto de usuário
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Determinar URL de redirecionamento
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.agrinvest.app'}/auth/callback`
    console.log("URL de redirecionamento:", redirectUrl)

    // Enviar magic link para o email especificado
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    })

    console.log("Resposta do Supabase:", { data, error })

    if (error) {
      console.error("Erro ao enviar magic link:", error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Magic link enviado com sucesso",
      data: data
    })

  } catch (error: any) {
    console.error("Erro inesperado ao enviar magic link:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
