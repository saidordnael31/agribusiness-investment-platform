import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkIsAdmin, checkIsDistributor } from "@/lib/permission-utils"

export const dynamic = "force-dynamic"

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

    // Verificar tipo de usuário para permitir buscar perfil de outros usuários
    const { data: currentUserProfile } = await supabase
      .from("profiles")
      .select("user_type_id, user_type, role")
      .eq("id", user.id)
      .single()

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')

    let profileId = user.id

    // Se um userId foi fornecido, verificar permissões
    if (targetUserId && targetUserId !== user.id) {
      const isAdmin = await checkIsAdmin(supabase, user.id)
      const isDistributor = await checkIsDistributor(supabase, user.id)
      
      if (isAdmin) {
        // Admin pode ver qualquer perfil
        profileId = targetUserId
      } else if (isDistributor) {
        // Distribuidor pode ver perfis de escritórios, assessores e investidores vinculados
        // Buscar o perfil do usuário alvo para verificar relacionamento
        const { data: targetProfile } = await supabase
          .from("profiles")
          .select("user_type, role, parent_id, office_id")
          .eq("id", targetUserId)
          .single()
        
        if (targetProfile) {
          const currentRole = currentUserProfile?.role
          const isCurrentOffice = currentRole === 'escritorio'
          const isCurrentAdvisor = currentRole === 'assessor' || currentRole === 'assessor_externo'
          
          // Verificar se o usuário alvo é um escritório, assessor ou investidor vinculado
          const isTargetOffice = targetProfile.user_type === 'distributor' && targetProfile.role === 'escritorio'
          const isTargetAdvisor = targetProfile.user_type === 'distributor' && (targetProfile.role === 'assessor' || targetProfile.role === 'assessor_externo')
          const isTargetInvestor = targetProfile.user_type === 'investor'
          
          // Verificar permissões baseadas no relacionamento
          let hasAccess = false
          
          if (isTargetOffice || isTargetAdvisor) {
            // Distribuidor pode ver qualquer escritório ou assessor (hierarquia)
            hasAccess = true
          } else if (isTargetInvestor) {
            // Investidor: verificar se está vinculado ao distribuidor atual
            if (isCurrentOffice) {
              // Escritório pode ver investidores do seu office_id
              hasAccess = targetProfile.office_id === user.id
            } else if (isCurrentAdvisor) {
              // Assessor pode ver investidores com parent_id = seu id
              hasAccess = targetProfile.parent_id === user.id
            } else {
              // Distribuidor de nível superior pode ver investidores vinculados a seus escritórios/assessores
              // Verificar se o investidor está vinculado a algum escritório ou assessor do distribuidor
              if (targetProfile.office_id) {
                // Verificar se o office_id pertence ao distribuidor
                const { data: officeProfile } = await supabase
                  .from("profiles")
                  .select("id, parent_id")
                  .eq("id", targetProfile.office_id)
                  .single()
                
                if (officeProfile && (officeProfile.id === user.id || officeProfile.parent_id === user.id)) {
                  hasAccess = true
                }
              }
              
              if (!hasAccess && targetProfile.parent_id) {
                // Verificar se o parent_id (assessor) pertence ao distribuidor
                const { data: advisorProfile } = await supabase
                  .from("profiles")
                  .select("id, office_id")
                  .eq("id", targetProfile.parent_id)
                  .single()
                
                if (advisorProfile && (advisorProfile.id === user.id || advisorProfile.office_id === user.id)) {
                  hasAccess = true
                }
              }
            }
          }
          
          if (hasAccess) {
            profileId = targetUserId
          }
        }
      }
    }

    console.log('🔍 [DEBUG API] Buscando perfil:', { 
      targetUserId, 
      profileId, 
      userLoggedIn: user.id,
      isSameUser: profileId === user.id,
      currentUserType: currentUserProfile?.user_type,
      currentUserRole: currentUserProfile?.role
    })

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

    // Verificar se o perfil retornado corresponde ao solicitado
    if (targetUserId && profileId !== targetUserId) {
      console.warn('⚠️ [WARNING API] Perfil retornado não corresponde ao solicitado:', {
        requested: targetUserId,
        returned: profileId,
        profileEmail: profile?.email
      })
    }

    console.log('✅ [DEBUG API] Perfil retornado:', { 
      id: profile?.id, 
      email: profile?.email,
      name: profile?.full_name 
    })

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
      .select("user_type_id, user_type")
      .eq("id", user.id)
      .single()

    console.log("currentUserProfile", currentUserProfile)

    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')

    let profileId = user.id

    // Se um userId foi fornecido e o usuário é admin, editar perfil do usuário específico
    const isAdmin = await checkIsAdmin(supabase, user.id)
    if (targetUserId && isAdmin) {
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
