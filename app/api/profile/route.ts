import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Erro ao buscar perfil:", profileError)
      return NextResponse.json(
        { success: false, error: "Erro ao buscar perfil do usuário" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: profile
    })
  } catch (error) {
    console.error("Erro na API de perfil:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      full_name,
      phone,
      address,
      profession,
      marital_status,
      nationality,
      pix_usdt_key
    } = body

    // Campos que podem ser atualizados
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (full_name !== undefined) updateData.full_name = full_name
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    if (profession !== undefined) updateData.profession = profession
    if (marital_status !== undefined) updateData.marital_status = marital_status
    if (nationality !== undefined) updateData.nationality = nationality
    if (pix_usdt_key !== undefined) updateData.pix_usdt_key = pix_usdt_key

    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single()

    if (updateError) {
      console.error("Erro ao atualizar perfil:", updateError)
      return NextResponse.json(
        { success: false, error: "Erro ao atualizar perfil do usuário" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: profile,
      message: "Perfil atualizado com sucesso"
    })
  } catch (error) {
    console.error("Erro na API de perfil:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
