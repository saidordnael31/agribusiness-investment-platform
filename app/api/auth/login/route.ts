import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

// Força a rota a ser dinâmica para permitir uso de cookies
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    const supabase = createServerClient()

    // Verificar credenciais de demonstração primeiro
    const demoCredentials = [
      { email: "admin@agroderi.com", password: "demo123", type: "admin", name: "Administrador" },
      { email: "escritorio@agroderi.com", password: "demo123", type: "escritorio", name: "Escritório Demo" },
      { email: "gestor@agroderi.com", password: "demo123", type: "gestor", name: "Gestor Demo" },
      { email: "lider@agroderi.com", password: "demo123", type: "lider", name: "Líder Demo" },
      { email: "assessor@agroderi.com", password: "demo123", type: "assessor", name: "Assessor Demo" },
      { email: "investidor@agroderi.com", password: "demo123", type: "investidor", name: "Investidor Demo" },
    ]

    const demoUser = demoCredentials.find((cred) => cred.email === email && cred.password === password)

    if (demoUser) {
      const userData = {
        id: `demo-${demoUser.type}`,
        email: demoUser.email,
        name: demoUser.name,
        type: demoUser.type,
        role: demoUser.type,
        created_at: new Date().toISOString(),
      }

      return NextResponse.json({
        success: true,
        data: {
          user: userData,
          token: `demo-token-${demoUser.type}`,
        },
      })
    }

    // Tentar login com Supabase para usuários reais
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ success: false, error: "Credenciais inválidas" }, { status: 401 })
    }

    // Buscar perfil do usuário
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

    const userData = {
      id: data.user.id,
      email: data.user.email,
      name: profile?.full_name || data.user.email,
      type: profile?.user_type || "investidor",
      role: profile?.role || "investidor",
      created_at: data.user.created_at,
    }

    return NextResponse.json({
      success: true,
      data: {
        user: userData,
        token: data.session?.access_token,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
