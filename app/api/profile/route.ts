import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      )
    }

    // Verificar se é admin para permitir buscar perfil de outros usuários
    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')

    let profileId = user.id

    // Se um userId foi fornecido e o usuário é admin, buscar perfil do usuário específico
    if (targetUserId && currentUserProfile?.user_type === 'admin') {
      profileId = targetUserId
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
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

    // Verificar se é admin para permitir editar perfil de outros usuários
    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    console.log("currentUserProfile", currentUserProfile)

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')

    let profileId = user.id

    // Se um userId foi fornecido e o usuário é admin, editar perfil do usuário específico
    if (targetUserId && currentUserProfile?.user_type === 'admin') {
      profileId = targetUserId
    }

    const body = await request.json()
    const {
      name,
      full_name,
      email,
      phone,
      address,
      profession,
      marital_status,
      nationality,
      pix_usdt_key,
      user_type,
      status,
      role,
      cnpj,
      rg,
      bank_name,
      bank_branch,
      bank_account
    } = body

    // Campos que podem ser atualizados
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.full_name = name
    if (full_name !== undefined) updateData.full_name = full_name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (address !== undefined) updateData.address = address
    if (profession !== undefined) updateData.profession = profession
    if (marital_status !== undefined) updateData.marital_status = marital_status
    if (nationality !== undefined) updateData.nationality = nationality
    if (pix_usdt_key !== undefined) updateData.pix_usdt_key = pix_usdt_key
    if (user_type !== undefined) updateData.user_type = user_type
    if (status !== undefined) updateData.is_active = status === 'active'
    if (role !== undefined) updateData.role = role
    if (cnpj !== undefined) updateData.cnpj = cnpj
    if (rg !== undefined) updateData.rg = rg
    if (bank_name !== undefined) updateData.bank_name = bank_name
    if (bank_branch !== undefined) updateData.bank_branch = bank_branch
    if (bank_account !== undefined) updateData.bank_account = bank_account

    console.log("AQUI")

    const { data: profile, error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profileId)
      .select()
      .single()

    console.log("Erro ao atualizar perfil:", updateError)

    if (updateError) {
      console.log("profile", profile)
      console.log("Erro ao atualizar perfil:", updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: profile,
      message: "Perfil atualizado com sucesso"
    })
  } catch (error) {
    console.log("Erro na API de perfil:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
