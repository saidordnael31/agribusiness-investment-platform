import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()
    const { email, password, name, userType, parentId, phone, cnpj, notes } = userData

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Configuração do banco de dados não encontrada",
        },
        { status: 500 },
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data, error } = await supabase
      .from("profiles")
      .insert([
        {
          email,
          full_name: name,
          user_type: userType,
          role: userType,
          parent_id: parentId || null,
          phone: phone || null,
          cnpj: cnpj || null,
          notes: notes || null,
          hierarchy_level: userType,
          is_active: true,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[v0] Erro ao inserir na tabela profiles:", error)
      return NextResponse.json(
        {
          success: false,
          error: `Erro ao salvar usuário: ${error.message}`,
        },
        { status: 400 },
      )
    }

    console.log("[v0] Usuário salvo com sucesso na tabela profiles:", data)

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: data.id,
          email: data.email,
          name: data.full_name,
          type: data.user_type,
          role: data.role,
        },
        message: "Usuário cadastrado com sucesso no banco de dados.",
      },
    })
  } catch (error) {
    console.error("[v0] Register error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro interno do servidor",
      },
      { status: 500 },
    )
  }
}
