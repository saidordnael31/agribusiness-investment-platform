import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()
    const { email, password, name, userType, parentId } = userData

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      // Sistema de demonstração quando Supabase não está configurado
      console.log("[v0] Supabase não configurado, usando sistema de demonstração")

      // Simular criação de usuário
      const mockUser = {
        id: `demo-${Date.now()}`,
        email,
        name,
        type: userType,
        role: userType,
        parent_id: parentId,
        created_at: new Date().toISOString(),
      }

      return NextResponse.json({
        success: true,
        data: {
          user: mockUser,
          message: "Usuário criado com sucesso no sistema de demonstração.",
        },
      })
    }

    let supabase
    try {
      supabase = createServerClient()
      if (!supabase || !supabase.auth) {
        throw new Error("Cliente Supabase não foi criado corretamente")
      }
    } catch (supabaseError) {
      console.error("[v0] Erro ao criar cliente Supabase:", supabaseError)
      return NextResponse.json(
        {
          success: false,
          error: "Erro de configuração do banco de dados",
        },
        { status: 500 },
      )
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
        data: {
          full_name: name,
          user_type: userType,
          parent_id: parentId,
        },
      },
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: data.user?.id,
          email: data.user?.email,
          name,
          type: userType,
          role: userType,
        },
        message: "Usuário criado com sucesso. Verifique seu email para confirmar a conta.",
      },
    })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro interno do servidor",
      },
      { status: 500 },
    )
  }
}
